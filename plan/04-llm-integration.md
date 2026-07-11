# 04. LLM連携

## プロバイダ抽象化

```ts
// src/main/llm/types.ts
interface LLMProvider {
  /** 利用可能なモデル一覧(管理画面のセレクトボックス用) */
  listModels(): Promise<ModelInfo[]>;
  /** ストリーミングチャット。トークンを順次yieldする */
  chatStream(messages: ChatMessage[], options: ChatOptions): AsyncIterable<string>;
  /** 接続確認(管理画面の「接続テスト」ボタン用) */
  healthCheck(): Promise<{ ok: boolean; detail?: string }>;
}

interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string; }
```

### OllamaProvider

- `GET /api/tags` → モデル一覧
- `POST /api/chat`(`stream: true`、NDJSON)→ ストリーミング応答
- デフォルト `http://127.0.0.1:11434`

### OpenAICompatProvider

- `GET /v1/models` → モデル一覧
- `POST /v1/chat/completions`(`stream: true`、SSE)→ ストリーミング応答
- `baseUrl` と `apiKey`(任意)を設定可能に。LM Studio / llama.cpp server / vLLM 等をカバーし、将来クラウドLLMへの流用も可能

実装は `fetch` + ReadableStream で行い、追加SDKには依存しない(NDJSON/SSEのパースは軽量なので自前実装)。

## 会話パイプライン(オーケストレータ)

```
ユーザー入力 / ランダムトークトリガ
  → メッセージ履歴 + システムプロンプト組み立て
  → LLM chatStream()
  → トークンをバッファし文単位に分割(。!?\n 等で区切る)
  → 文ごとに: 感情タグ抽出 → TTSリクエスト → 完成順を保証してキューへ
  → speech:segment {text, wav, emotion} をレンダラへ順次push
  → レンダラ: バルーン表示 + 音声再生 + リップシンク + 表情切替
```

- **先読み合成**: 文Nの再生中に文N+1のTTSを進め、発話の途切れを減らす
- **中断**: ユーザーが新しい入力をしたら生成・再生キューを破棄(`AbortController`)
- **文分割**: 「。」「!」「?」「\n」で区切る。ただし短すぎる断片(数文字)は次と結合。カギ括弧内の句点は区切らない、程度の簡易ルールから始める

## プロンプトテキストの配置と読込み

システムプロンプトは「人格(ユーザーが編集する部分)」と「固定指示(アプリの動作に必要な部分)」を分離し、**プロンプト文面はすべてコードに埋め込まずテキストファイルとして外部化**する(文言調整のたびにコード変更しないため)。

### 配置

```
resources/prompts/               # アプリ同梱(読み取り専用のデフォルト)
├── persona.default.md           # 人格プロンプトのデフォルトテンプレート
├── system-rules.md              # 固定指示(応答の短さ・感情タグの付け方)
└── random-talk/                 # ランダムトーク用プロンプトのバリエーション
    ├── monologue.md             # 「独り言をひとこと」
    ├── time.md                  # 「現在時刻に触れて」
    └── ...                      # ファイル追加だけでバリエーションが増やせる

{userData}/prompts/              # ユーザー編集分 (app.getPath('userData') 配下)
└── persona.md                   # 管理画面で編集した人格プロンプトの実体
```

- ユーザーが編集した人格は electron-store のJSONに埋めず、`{userData}/prompts/persona.md` に**独立したファイルとして保存**する(テキストエディタで直接編集・バックアップ・共有ができるように)。設定JSON側は持たない
- `persona.md` が存在しない場合(初回起動)、`persona.default.md` の内容をコピーして生成する
- 管理画面の「リセット」ボタンは `persona.default.md` の内容で上書きする

### 読込み(promptLoader)

`src/main/conversation/promptLoader.ts` が担当:

1. 起動時に `resources/prompts/` と `{userData}/prompts/` を読み込みメモリにキャッシュ
2. `{userData}/prompts/persona.md` は `fs.watch` で監視し、外部エディタでの変更も即時反映(伺かのゴースト開発の感覚に近づける)
3. 管理画面からの編集は `persona:set` IPC → ファイル書き込み → キャッシュ更新(次の会話から反映)
4. テンプレート変数の展開を提供: `{name}`(キャラ名)、`{time}`(現在時刻)、`{date}`(日付)、`{os}`(OS名)。未知の変数はそのまま残す(エラーにしない)

### システムプロンプトの合成順序

会話リクエストごとにオーケストレータが以下を連結して `system` メッセージを作る:

```
persona.md(変数展開済み)
+ "\n\n" + system-rules.md(変数展開済み)
+ ランダムトーク時のみ: random-talk/*.md からランダムに1つ
```

### デフォルトテンプレートの文面

`persona.default.md`:

```
あなたはデスクトップに住むキャラクター「{name}」です。
一人称は「わたし」、口調はフランクで親しみやすい。
```

`system-rules.md`:

```
# 応答ルール
- 応答は1〜3文の短さを基本とする(音声で読み上げられるため)
- 各文の先頭に感情タグを付ける: [neutral] [happy] [sad] [angry] [surprised]
例: [happy]おかえり!今日はどうだった?
現在日時: {date} {time}
```

### 感情タグ → 表情/モーション

- `emotionParser` が文頭の `[happy]` 等を抽出してテキストから除去
- `character.emotionMap` 設定で感情→Live2D表情/モーション名にマッピング(モデルごとに持っている表情名が違うため管理画面で編集可能に)
- タグがない/不正な場合は `neutral` にフォールバック。ローカルLLMはタグ指示に従わないことも多いため、**タグはあくまでオプショナル**として全体が動く設計にする

## コンテキスト管理

- 履歴はメモリ上に保持し、直近 `contextLimit` 往復のみをLLMに送る
- システムプロンプトには現在時刻・OS等の軽い環境情報を差し込む(時報・挨拶の材料)

## ランダムトーク(自発発話)

- `behavior.randomTalkIntervalMinSec`〜`MaxSec` の一様乱数でタイマー設定
- 発火時、`resources/prompts/random-talk/` 内のファイルからランダムに1つ選んでシステムプロンプトに追記し、1〜2文生成
- ユーザーとの会話中(生成・再生中/最終対話から60秒以内)は発火をスキップして再スケジュール
- 生成結果は通常パイプラインに乗せる(音声+リップシンク付き)
