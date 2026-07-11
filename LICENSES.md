# ライセンス・配布上の注意

ukaga 本体のソースコードはリポジトリの方針に従います。
以下は同梱・接続する第三者コンポーネントについての整理です。

## Live2D Cubism Core

- **権利者**: Live2D Inc.
- **性質**: プロプライエタリ（無償利用枠あり）
- **配置**: 公式の [Cubism SDK for Web](https://www.live2d.com/download/cubism-sdk/download-web/) から入手した
  `live2dcubismcore.min.js` を `resources/live2dcubismcore.min.js` に置く
- **再配布**: アプリに Core を同梱して配布する場合、Live2D 社の
  [出版許諾契約（Publication License）](https://www.live2d.com/terms/) の確認が必要です
- **小規模/個人**: 直近会計年度の売上 1,000 万円未満などの無償枠条件は Live2D 社の案内を確認してください
- **本リポジトリ**: Core バイナリはコミットしません（`.gitignore`）

開発中の個人利用は問題になりにくい一方、**不特定多数への配布パッケージに Core を入れる前に必ず許諾条件を確認**してください。

## Live2D サンプルモデル（ひより等）

- 「無償提供マテリアル使用許諾契約」の範囲で利用できます
- 開発・デモ用です。ユーザー自身の `.model3.json` 一式を読み込める設計にしています
- サンプルモデル一式もリポジトリにはコミットしません

## pixi-live2d-display / pixi.js

- MIT License
- 内部で Cubism Core を参照するため、上記 Cubism Core の条件は残ります

## Electron / その他 OSS 依存

- Electron および npm 依存パッケージは各パッケージのライセンスに従います
- `node_modules` 内の LICENSE ファイルを参照してください

## 音声合成エンジン（VOICEVOX 等）

- アプリはローカル HTTP API を呼ぶだけです。エンジン本体は同梱しません
- 話者ごとにクレジット表記など利用規約が異なります
- **規約遵守はユーザーの責任**です

## LLM（Ollama / OpenAI 互換サーバー）

- アプリはローカル（またはユーザーが指定した）API に接続するだけです
- モデルのライセンス・利用条件は各モデル提供者の案内に従ってください
