# 03. マスコット表示(透過ウィンドウ + Live2D)

## 透過・最前面ウィンドウ

```ts
new BrowserWindow({
  transparent: true,
  frame: false,
  alwaysOnTop: true,
  hasShadow: false,
  resizable: false,
  skipTaskbar: true,        // タスクバーには出さない(トレイ常駐)
  webPreferences: { preload, contextIsolation: true },
});
```

### OS別の注意点

| OS | 注意点 |
|---|---|
| Windows | 透過は安定。`alwaysOnTop` はレベル指定 `'screen-saver'` で全画面アプリより手前も可 |
| macOS | `win.setAlwaysOnTop(true, 'floating')`。Spaces間の追従は `setVisibleOnAllWorkspaces(true)` |
| Linux | コンポジタ必須(X11はピクトグラム崩れの報告あり、Wayland環境差大)。「動けば儲けもの」扱いとし、既知の制約としてREADMEに明記 |

### クリック透過(キャラ以外の領域を透過)

伺かの体験の要。ウィンドウは矩形だが、キャラの描画されていない部分はクリックを下のアプリへ通す:

1. マスコットレンダラで `mousemove` ごとにカーソル座標のLive2Dヒットテスト(またはWebGLキャンバスのアルファ値読み取り)を行う
2. キャラ上なら `setIgnoreMouseEvents(false)`、キャラ外なら `setIgnoreMouseEvents(true, { forward: true })` をIPCで切替
3. `forward: true` により透過中も `mousemove` は受け取れるため、キャラ上に戻った瞬間に復帰できる

※ アルファ値読み取り(`gl.readPixels`)は毎フレームだと重いので、mousemoveのスロットリング(~30ms)で行う。

### ドラッグ移動

CSSの `-webkit-app-region: drag` は透過+クリック透過と相性が悪いため、自前実装する:
キャラ上での `mousedown` → `mousemove` の差分を `mascot:setPosition` でメインに送り `win.setPosition()`。

## Live2D描画

### ライブラリ構成

- `pixi.js` v7 系 + `pixi-live2d-display`(Cubism 4ランタイム対応。moc3モデルを読み込む)
- Cubism Core(`live2dcubismcore.min.js`)はLive2D公式サイトから取得し `resources/` に配置(npmでは配布されていない)

### モデル制御

```ts
const model = await Live2DModel.from('path/to/model.model3.json');
app.stage.addChild(model);

// パラメータ直接制御(リップシンク等)
model.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', value);

// モーション・表情
model.motion('TapBody');
model.expression('happy');
```

### 実装する挙動

| 挙動 | 実装 |
|---|---|
| アイドルモーション | モデル定義の `Idle` グループをループ再生(pixi-live2d-displayのデフォルト) |
| 目パチ | Cubism標準の自動まばたき |
| 視線追従 | カーソル位置を `focus()` に渡す(画面全体を追うため、透過中もforwardされるmousemoveを利用) |
| リップシンク | 音声再生の振幅→`ParamMouthOpenY`(05参照) |
| 感情表現 | LLM応答の感情タグ→ `expression()` / `motion()`(04参照) |
| クリック反応 | ヒットエリア(Head/Body)タップ→専用モーション+LLMに「触られた」コンテキストで一言生成させる |

### モデルの差し替え

- 設定 `character.modelPath` で任意の `.model3.json` を指定可能に
- 管理画面からファイル選択ダイアログ(`dialog.showOpenDialog`)で変更
- 開発・デモ用にLive2D公式サンプルモデル(例: ひより)を `resources/models/` に同梱(配布時はライセンス確認)

## バルーン(吹き出し)UI

- マスコットと**同一ウィンドウ内のDOM**として実装(ウィンドウを分けるとOS間の位置同期が面倒になるため)
- ウィンドウサイズはキャラ+バルーン分を確保し、バルーン非表示時はその領域をクリック透過にする
- 構成:
  - **発話バルーン**: キャラの発話テキストを文単位で追記表示。音声再生と同期して表示
  - **入力欄**: バルーン下部に常設 or キャラクリックで表示。Enterで `chat:send`
  - **状態表示**: 思考中インジケータ(LLM生成中)、エラー表示(LLM/TTS接続失敗)
- 一定時間操作がなければバルーンをフェードアウト
