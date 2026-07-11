# 決定事項ログ

計画どおり実装できない事情や、計画間の矛盾への対応を記録する。

## 2026-07-12 — pixi-live2d-display を 0.5.0-beta に固定

- **問題**: `pixi-live2d-display@0.4.0` の peerDependencies は PixiJS v6 向け。計画（`plan/01` / `plan/03`）は pixi.js v7 系を指定している。
- **採った対応**: PixiJS v7 を peer に持つ `pixi-live2d-display@0.5.0-beta` を採用して固定した。
- **影響範囲**: フェーズ1の Live2D 描画依存のみ。API（`Live2DModel.from` / `hitTest` / `focus` / `motion`）は計画記載どおり利用可能。

## 2026-07-12 — `@pixi/core` / `@pixi/display` を直接依存に追加

- **問題**: `pixi-live2d-display` が `@pixi/core` と `@pixi/display` を直接 import するが、npm ではこれらが `pixi.js` 配下にネストされ Vite が解決できない。
- **採った対応**: 計画の pixi.js v7 と同バージョンの `@pixi/core` / `@pixi/display` を直接依存として追加した（新機能ではなく解決用）。
- **影響範囲**: レンダラのビルド解決のみ。

## 2026-07-12 — 初回ガイド状態を AppSettings 外の store に分離

- **問題**: フェーズ6の初回起動ガイド完了フラグが `plan/02` の `AppSettings` スキーマにない。
- **採った対応**: `electron-store` の別ファイル（`onboarding`）に `completedFirstRun` を保持。設定スキーマは変更しない。
- **影響範囲**: メインの起動時分岐・トレイ「はじめかた」・setup ウィンドウのみ。

## 2026-07-12 — 配布時アセット URL を相対解決に変更

- **問題**: マスコットが `/live2dcubismcore.min.js` 等のルート絶対パスを使うと、`file://` 配布時に解決できない。
- **採った対応**: `mascot/` からの相対 URL（`../...`）で Cubism Core / モデルを解決する。
- **影響範囲**: `src/renderer/mascot/live2d/loader.ts`。開発サーバーでも同等に動作。
