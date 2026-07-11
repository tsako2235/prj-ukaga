# 02. アーキテクチャ

## プロセス構成

```
┌─────────────────────────────────────────────┐
│ メインプロセス (Node.js / TypeScript)          │
│  - ウィンドウ管理(マスコット / 管理画面)        │
│  - 設定永続化 (electron-store)                │
│  - LLMプロバイダ層(Ollama / OpenAI互換)       │
│  - 音声エンジン層(VOICEVOX互換)               │
│  - 会話オーケストレータ                        │
│    (LLMストリーム→文分割→TTS→再生指示)        │
│  - ランダムトークスケジューラ                   │
└──────────┬────────────────────┬─────────────┘
           │ IPC (typed)        │ IPC (typed)
┌──────────▼──────────┐ ┌───────▼─────────────┐
│ マスコットウィンドウ    │ │ 管理画面ウィンドウ      │
│ (透過・フレームレス・   │ │ (通常ウィンドウ、       │
│  最前面)              │ │  React)              │
│  - Live2D描画(pixi)  │ │  - LLM設定           │
│  - バルーンUI(DOM)    │ │  - 音声設定           │
│  - 音声再生+リップシンク │ │  - キャラ/人格設定     │
└─────────────────────┘ └─────────────────────┘
```

### 設計方針

- **LLM/TTSへのHTTPアクセスはメインプロセスに集約する**
  - レンダラのCORS/CSP制約を回避でき、APIキーや接続先の管理が一元化される
  - レンダラは「表示と入力」に徹する
- **会話オーケストレータ**がパイプライン全体を制御し、レンダラへはイベントをpushする
  - `speech:segment`(文単位のテキスト+音声データ)、`emotion:change`、`state:thinking` など
- **音声再生はマスコットレンダラ側**(Web Audio API)で行う
  - 再生波形の振幅からリップシンク値を計算し、そのままLive2Dの口パラメータへ流すため

## IPCチャンネル設計(型付き)

`src/shared/ipc.ts` にチャンネル名とペイロード型を定義し、preload経由で `contextBridge` 公開する。

| チャンネル | 方向 | 内容 |
|---|---|---|
| `chat:send` | renderer→main | ユーザー発話テキスト送信 |
| `chat:interrupt` | renderer→main | 生成中断 |
| `speech:segment` | main→renderer | 文単位の {text, wav, emotion} を順次push |
| `speech:end` | main→renderer | 一連の発話終了 |
| `mascot:setPosition` 他 | renderer→main | ウィンドウドラッグ移動・リサイズ |
| `settings:get` / `settings:set` | renderer↔main | 設定の読み書き |
| `persona:get` / `persona:set` | renderer↔main | 人格プロンプト(`{userData}/prompts/persona.md`)の読み書き(管理画面のテキストエリア用) |
| `persona:reset` | renderer→main | `persona.default.md` の内容で人格プロンプトを初期化 |
| `persona:changed` | main→renderer | ファイル外部編集の検知を管理画面へ通知(開いているテキストエリアに反映) |
| `llm:listModels` | renderer→main | 利用可能モデル一覧(管理画面用) |
| `voice:listSpeakers` | renderer→main | 話者一覧(管理画面用) |
| `voice:testPlay` | renderer→main | 話者テスト再生 |

## ディレクトリ構造(アプリ本体)

```
ukaga/
├── package.json
├── electron.vite.config.ts
├── src/
│   ├── main/                  # メインプロセス
│   │   ├── index.ts           # エントリ、ウィンドウ生成
│   │   ├── windows/           # mascotWindow.ts, adminWindow.ts
│   │   ├── llm/               # プロバイダ抽象化
│   │   │   ├── types.ts       # LLMProvider インターフェース
│   │   │   ├── ollama.ts
│   │   │   └── openaiCompat.ts
│   │   ├── voice/             # 音声エンジン抽象化
│   │   │   ├── types.ts       # VoiceEngine インターフェース
│   │   │   └── voicevoxCompat.ts
│   │   ├── conversation/      # オーケストレータ
│   │   │   ├── orchestrator.ts
│   │   │   ├── promptLoader.ts  # プロンプトファイル読込・変数展開・合成(04参照)
│   │   │   ├── sentenceSplitter.ts
│   │   │   ├── emotionParser.ts
│   │   │   └── randomTalk.ts
│   │   └── settings/          # electron-store スキーマ
│   ├── preload/               # contextBridge定義
│   ├── renderer/
│   │   ├── mascot/            # マスコットウィンドウ
│   │   │   ├── live2d/        # モデルロード・パラメータ制御
│   │   │   ├── balloon/       # 吹き出しUI
│   │   │   └── audio/         # 再生+リップシンク解析
│   │   └── admin/             # 管理画面 (React)
│   └── shared/                # IPC型、設定型、ユーティリティ
├── resources/
│   ├── models/                # サンプルLive2Dモデル(開発用)
│   └── prompts/               # 同梱プロンプトテキスト(persona.default.md / system-rules.md / random-talk/)
└── tests/
```

このほか実行時に `{userData}/prompts/persona.md`(ユーザー編集の人格プロンプト)を生成・読込する。詳細は04参照。

## 設定スキーマ(electron-store)

```ts
interface AppSettings {
  llm: {
    provider: 'ollama' | 'openai-compat';
    baseUrl: string;            // 例: http://127.0.0.1:11434
    model: string;              // 例: 'qwen3:8b'
    apiKey?: string;            // OpenAI互換用(LM Studio等は不要な場合も)
    temperature: number;
    contextLimit: number;       // 履歴として送る往復数
  };
  voice: {
    enabled: boolean;
    engine: 'voicevox' | 'aivisspeech' | 'coeiroink' | 'custom';
    baseUrl: string;            // 例: http://127.0.0.1:50021
    speakerId: number;
    speedScale: number;
    pitchScale: number;
    volumeScale: number;
  };
  character: {
    name: string;
    modelPath: string;          // .model3.json のパス
    scale: number;
    // 人格プロンプト本文はJSONに持たず {userData}/prompts/persona.md に置く(04参照)
    emotionMap: Record<string, string>; // 感情タグ→表情/モーション名
  };
  behavior: {
    randomTalk: boolean;
    randomTalkIntervalMinSec: number;  // 例: 180
    randomTalkIntervalMaxSec: number;  // 例: 600
    alwaysOnTop: boolean;
    openAtLogin: boolean;
  };
  debug: {
    enabled: boolean;           // ON時はバルーンに感情タグを表示(08 B-003)
  };
  balloon: {
    x: number; y: number;       // マスコットウィンドウ内の吹き出し位置px(08 B-006)
  };
  window: {
    x?: number; y?: number; width: number; height: number;
  };
}
```

注意: `llm.baseUrl` / `voice.baseUrl` にはパス(`/v1` 等)を含めない。プロバイダ/エンジン実装側が `/api/...` `/v1/...` を付与する。

会話履歴は当面メモリ保持のみ(アプリ再起動でリセット)。永続化はフェーズ6以降の検討事項。
