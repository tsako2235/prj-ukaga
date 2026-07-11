# ukaga

伺か風の Live2D デスクトップマスコットアプリです。  
透過・最前面のウィンドウにキャラクターを常駐表示します。

## 前提

- Node.js (LTS)
- パッケージマネージャは npm

アプリ本体には次のものを**同梱しません**（各自で配置・起動してください）。

- Live2D Cubism Core（描画に必須）
- Live2D サンプルモデル（開発・デモ用）
- （後続フェーズ）Ollama / VOICEVOX などの外部ソフト

## セットアップ

### 1. 依存パッケージ

```bash
npm install
```

### 2. Live2D Cubism Core の配置

1. [Live2D Cubism SDK for Web](https://www.live2d.com/download/cubism-sdk/download-web/) を公式サイトから入手する
2. 配布物内の `live2dcubismcore.min.js`（Core）を取得する
3. プロジェクトの次のパスに置く:

```
resources/live2dcubismcore.min.js
```

> Cubism Core はプロプライエタリです。再配布条件・出版許諾契約は Live2D 社の案内を確認してください。  
> このリポジトリには Core バイナリをコミットしません。

### 3. サンプルモデルの配置

1. Live2D 公式の無償サンプル（例: ひより / Haru など）を入手する
2. `.model3.json` と関連ファイル一式を `resources/models/` 配下に置く

例:

```
resources/models/Hiyori/Hiyori.model3.json
resources/models/Hiyori/...（moc3 / テクスチャ等）
```

アプリは次の候補パスを順に探します。

- `/models/Hiyori/Hiyori.model3.json`
- `/models/hiyori/hiyori_pro_t11.model3.json`
- `/models/Haru/Haru.model3.json`
- ほか数パターン

別パスを使う場合は、`resources/models/model-path.txt` に  
`/models/あなたのフォルダ/xxx.model3.json` のように 1 行で書いてください。

> サンプルモデルの利用は「無償提供マテリアル使用許諾契約」の範囲で行ってください。

### 4. 起動

```bash
npm run dev
```

## 会話（フェーズ2〜3）

1. ローカルで Ollama を起動し、モデルを用意する

```bash
ollama serve
```

2. （音声を使う場合）VOICEVOX 等を起動する（デフォルト `http://127.0.0.1:50021`）

3. アプリを起動し、バルーンの入力欄から話しかけてください
4. Ollama / VOICEVOX 未起動時はバルーンにエラーまたは警告が表示されます（TTS 失敗時もテキスト会話は継続）

トレイ（またはキャラ右クリック）から「管理画面を開く」で LLM / 音声 / キャラ / 挙動を設定できます。変更は即時反映されます。

## 使い方（フェーズ5）

- キャラをクリック（タップ）するとモーション＋一言反応します（ドラッグ移動と区別）
- 管理画面の「ランダムトーク」を ON にすると、放置中に自発発話します
- バルーンは起動時は閉じており、発話やクリックで開きます。Escape で閉じられます

## 既知の制約

- **Linux**: 透過ウィンドウはコンポジタや Wayland / X11 の環境差が大きく、動作しない場合があります
- Cubism Core またはモデル未配置のときは、ウィンドウ内に日本語の案内を表示します

## ライセンス上の注意

- Live2D Cubism Core / サンプルモデルは各自の責任で入手・利用規約を守ってください
- （後続フェーズ）VOICEVOX 等の合成音声は話者ごとの規約（クレジット表記など）が異なります。アプリはローカル API を呼ぶだけであり、規約遵守はユーザー責任です

## 開発コマンド

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発モード起動 |
| `npm run build` | 本番ビルド |
| `npm run preview` | ビルド結果のプレビュー |
| `npm run test` | ユニットテスト (vitest) |
| `npm run typecheck` | TypeScript 型チェック |

> Cursor 等で `ELECTRON_RUN_AS_NODE=1` が付いている環境では Electron が壊れるため、`npm run dev` / `preview` は自動でこの変数を外します。

デフォルトの LLM モデル名は `qwen3:8b` です。別モデルを使う場合は、ユーザー設定ファイル  
`~/Library/Application Support/ukaga/settings.json` の `llm.model` を編集してください（管理画面はフェーズ4）。
