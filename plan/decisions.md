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

## 2026-07-12 — B-002 は保存ボタンではなく「保存済み」トーストを採用

- **問題**: 明示保存ボタン方式は persona の外部編集監視と衝突しやすい（`plan/08` B-002）。
- **採った対応**: 即時反映は維持し、保存成功時に管理画面右下へ「保存済み ✓」を短時間表示。
- **影響範囲**: 管理画面 UI のみ。

## 2026-07-12 — B-003 で `debug.enabled` を設定スキーマに追加

- **問題**: `plan/02` の AppSettings にデバッグ項目がないが、追加要件 B-003 で必要。
- **採った対応**: `debug.enabled`（既定 false）を追加。挙動タブから切替。旧 settings.json は `getSettings` でデフォルト補完。
- **影響範囲**: 設定スキーマ・挙動タブ・バルーン表示テキスト。

## 2026-07-12 — リップシンク口パラメータをモデルごとに解決

- **問題**: 春日部つむぎ等は口パラメータが `PARAM_MOUTH_OPEN_Y` で、計画記載の `ParamMouthOpenY` 固定だと口が動かない。
- **採った対応**: LipSync グループおよび候補 ID から存在するパラメータを解決して RMS リップシンクに使う。
- **影響範囲**: `mouthParam.ts` / `audio/player.ts`。ひより等の標準 ID も従来どおり動作。
