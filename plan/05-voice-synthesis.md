# 05. 音声合成

## エンジン抽象化

```ts
// src/main/voice/types.ts
interface VoiceEngine {
  /** 話者一覧(管理画面のセレクトボックス用) */
  listSpeakers(): Promise<SpeakerInfo[]>;
  /** テキスト→WAV (ArrayBuffer) */
  synthesize(text: string, params: SynthesisParams): Promise<ArrayBuffer>;
  healthCheck(): Promise<{ ok: boolean; detail?: string }>;
}

interface SpeakerInfo { id: number; name: string; styleName: string; }
interface SynthesisParams {
  speakerId: number;
  speedScale: number; pitchScale: number; volumeScale: number;
}
```

## VOICEVOX互換アダプタ

幸い、主要なローカル音声合成エンジンの多くはVOICEVOX互換HTTP APIを持つため、
**アダプタ実装は1つ(`voicevoxCompat.ts`)+ エンジンごとのプリセット** で済む:

| エンジン | デフォルトURL | 備考 |
|---|---|---|
| VOICEVOX | `http://127.0.0.1:50021` | 本家 |
| AivisSpeech | `http://127.0.0.1:10101` | VOICEVOX互換API |
| COEIROINK v2 | `http://127.0.0.1:50032` | v2は独自API。互換でない部分が出たら専用アダプタを追加(初期はVOICEVOX互換分のみサポート) |
| カスタム | 任意URL | SHAREVOX等、その他の互換エンジン用 |

### API呼び出しフロー(VOICEVOX互換)

```
GET  /speakers                          → 話者・スタイル一覧
POST /audio_query?text=...&speaker=N    → 音声合成用クエリ(JSON)
     クエリの speedScale / pitchScale / volumeScale を設定値で上書き
POST /synthesis?speaker=N (body=query)  → WAVバイナリ
```

## 再生パイプライン(マスコットレンダラ側)

```
speech:segment {text, wav, emotion} 受信
  → 再生キューへ追加(順次再生、並行しない)
  → AudioContext.decodeAudioData(wav)
  → AudioBufferSourceNode → AnalyserNode → destination
  → requestAnimationFrame毎: AnalyserNodeから時間領域データ取得
     → RMS振幅を計算 → 平滑化(attack/release)
     → ParamMouthOpenY = clamp(rms * gain, 0, 1)
  → 再生開始と同時にバルーンへ該当文を表示、感情タグで表情切替
  → 再生終了で口を閉じ、次のセグメントへ
```

- リップシンクは**再生波形のRMS振幅ベース**(母音解析はやらない。Live2Dの口パクには振幅で十分)
- `voice.enabled = false` の場合、音声をスキップしテキスト表示のみ(表示時間は文字数比例で確保)
- TTSエンジン未起動・エラー時は**音声なしにフォールバック**して会話は継続(バルーンに小さく警告表示)

## パフォーマンス・品質メモ

- 合成は文単位の細切れなので、VOICEVOXでも実用的なレイテンシで返る(最初の一文が返れば発話開始できる)
- 長文はLLM側プロンプトで「1〜3文」に抑制しているため、キュー溢れの心配は小さい
- 音量はOSミキサー任せにせず `volumeScale`(クエリ側)+ GainNode(再生側)の二段で調整可能に
