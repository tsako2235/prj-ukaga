# 計画ドキュメント

伺か風 Live2D デスクトップマスコットアプリ(仮称: **ukaga**)の開発計画。

## ドキュメント一覧

| ファイル | 内容 |
|---|---|
| [00-implementer-instructions.md](00-implementer-instructions.md) | 実装担当モデルへの指示書(作業ルール・完了報告フォーマット) |
| [01-overview.md](01-overview.md) | プロジェクト概要・技術選定・ライセンス注意点 |
| [02-architecture.md](02-architecture.md) | プロセス構成・IPC・ディレクトリ構造 |
| [03-mascot-live2d.md](03-mascot-live2d.md) | 透過ウィンドウ・Live2D表示・リップシンク・モーション |
| [04-llm-integration.md](04-llm-integration.md) | LLMプロバイダ抽象化(Ollama / OpenAI互換)・会話パイプライン |
| [05-voice-synthesis.md](05-voice-synthesis.md) | 音声エンジン抽象化(VOICEVOX互換)・再生パイプライン |
| [06-admin-ui.md](06-admin-ui.md) | 管理画面(設定UI)の仕様 |
| [07-roadmap.md](07-roadmap.md) | フェーズ分けと実装順序 |
| [08-additional-requirements.md](08-additional-requirements.md) | 追加要件・バックログ（実装中に出た要望） |

## 決定事項サマリ

- **技術スタック**: Electron + TypeScript(メイン/レンダラ/管理画面すべてTSで統一、OS非依存)
- **Live2D**: Cubism SDK for Web + pixi-live2d-display(pixi.js)
- **LLM接続**: Ollama ネイティブAPI + OpenAI互換API(LM Studio / llama.cpp server / vLLM 等)の両対応
- **音声合成**: エンジン抽象化レイヤーを設け、VOICEVOX / COEIROINK / AivisSpeech 等を管理画面から切替可能に
- **初期スコープ**: 透過・最前面マスコット表示 / 吹き出し会話UI / リップシンク・モーション連動 / ランダムトーク(自発発話)
