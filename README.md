# ukaga

伺か風の Live2D デスクトップマスコットアプリです。  
透過・最前面のウィンドウにキャラクターを常駐表示し、ローカル LLM と会話します。

スクリーンショット例は [`docs/screenshots/`](docs/screenshots/) を参照（撮影手順あり）。

## できること

- 透過・最前面の Live2D マスコット（ドラッグ移動・クリック透過）
- 吹き出しでの会話（Ollama / OpenAI 互換 API）
- VOICEVOX 互換エンジンによる音声合成とリップシンク
- ランダムトーク・タップ反応・感情タグ連動
- 管理画面（LLM / 音声 / キャラ / 挙動）

## 前提ソフトウェア（同梱しません）

| 用途 | ソフト | 既定エンドポイント |
|---|---|---|
| LLM | [Ollama](https://ollama.com/) など | `http://127.0.0.1:11434` |
| 音声 | [VOICEVOX](https://voicevox.hiroshiba.jp/) など | `http://127.0.0.1:50021` |
| 描画 | Live2D Cubism Core | `resources/live2dcubismcore.min.js` |

初回起動時にセットアップガイドが開きます。トレイから「はじめかたを開く」でも再表示できます。

## セットアップ（開発）

### 1. 依存パッケージ

```bash
npm install
```

### 2. Live2D Cubism Core

1. [Cubism SDK for Web](https://www.live2d.com/download/cubism-sdk/download-web/) を公式から入手
2. `live2dcubismcore.min.js` を次へ配置:

```
resources/live2dcubismcore.min.js
```

詳細は [LICENSES.md](LICENSES.md) を参照。

### 3. サンプルモデル

`.model3.json` 一式を `resources/models/` 配下へ（例: `resources/models/Hiyori/`）。  
別パスを使う場合は `resources/models/model-path.txt` に 1 行で書いてください。

### 4. 起動

```bash
npm run dev
```

Ollama / VOICEVOX を起動したうえで、バルーンから話しかけてください。

## 使い方

- **トレイ**（またはキャラ右クリック）: 管理画面 / はじめかた / 表示・非表示 / 終了
- **タップ**: 頭・体に反応（モーション＋一言）
- **ランダムトーク**: 管理画面の挙動タブで ON
- **バルーン**: Escape で閉じる

## 配布パッケージの作成

事前に `resources/live2dcubismcore.min.js`（とデモ用モデル）を配置してからビルドしてください。  
**Cubism Core を同梱して配布する場合は Live2D の出版許諾契約を確認してください**（[LICENSES.md](LICENSES.md)）。

```bash
# 現在の OS 向け
npm run dist

# OS 別
npm run dist:mac    # dmg
npm run dist:win    # NSIS
npm run dist:linux  # AppImage

# インストーラなしのディレクトリ出力（動作確認用）
npm run pack
```

成果物は `release/` に出力されます。

| 成果物 | 形式 |
|---|---|
| Windows | NSIS インストーラ |
| macOS | dmg |
| Linux | AppImage |

> Linux の透過ウィンドウはコンポジタや Wayland / X11 の環境差が大きく、動作しない場合があります。

## 開発コマンド

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発モード起動 |
| `npm run build` | 本番ビルド（electron-vite） |
| `npm run preview` | ビルド結果のプレビュー |
| `npm run dist` / `dist:*` | electron-builder でパッケージ |
| `npm run pack` | ディレクトリのみパッケージ |
| `npm run test` | ユニットテスト (vitest) |
| `npm run typecheck` | TypeScript 型チェック |

> Cursor 等で `ELECTRON_RUN_AS_NODE=1` が付いている環境では Electron が壊れるため、`npm run dev` / `preview` は自動でこの変数を外します。

設定ファイルの例（macOS）: `~/Library/Application Support/ukaga/settings.json`

## 既知の制約・検討事項

- 会話履歴はメモリ保持のみ（再起動でリセット）。永続化・複数キャラプリセットは今後の検討事項です
- Cubism Core / モデル未配置時はウィンドウ内に日本語の案内を表示します
- VOICEVOX 等の話者規約（クレジット表記など）の遵守はユーザー責任です

## ライセンス

第三者コンポーネントの条件は [LICENSES.md](LICENSES.md) を参照してください。
