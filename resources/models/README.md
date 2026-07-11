# Live2D モデル配置用ディレクトリ

`.model3.json` 一式をこのディレクトリ配下に置いてください。  
詳細はリポジトリ直下の README.md を参照してください。

## 差し替え

`model-path.txt` に `/models/フォルダ/xxx.model3.json` を 1 行書くと、そのモデルを優先して読み込みます（同梱サンプルの候補より先）。

## 春日部つむぎ（`Tsumugi/`）

`prj-vTuber/live2d-models/tsumugi` 由来の調整版（ASCII ファイル名・表情・Idle モーション付き）を置いています。

| 項目 | 内容 |
|---|---|
| エントリ | `tsumugi.model3.json` |
| 表情 | `kira` / `blush` / `tear` / `shock` |
| モーション | `Idle`（03）、`TapHead`（02）、`TapBody`（01） |
| LipSync | `PARAM_MOUTH_OPEN_Y` |
| EyeBlink | `PARAM_EYE_L_OPEN` / `PARAM_EYE_R_OPEN` |
| 感情マップ推奨 | `emotion-map.recommended.json` |
| VOICEVOX | 話者 ID `8`（春日部つむぎ・ノーマル）。既定の speed/pitch/volume は 1 / 0 / 1 |

管理画面の「つむぎ推奨マップを適用」でも同じマップを設定できます。  
利用規約は同梱の `readme.txt` を確認してください。
