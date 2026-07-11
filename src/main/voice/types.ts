export interface SpeakerInfo {
  id: number
  name: string
  styleName: string
}

export interface SynthesisParams {
  speakerId: number
  speedScale: number
  pitchScale: number
  volumeScale: number
}

export interface VoiceEngine {
  /** 話者一覧(管理画面のセレクトボックス用) */
  listSpeakers(): Promise<SpeakerInfo[]>
  /** テキスト→WAV (ArrayBuffer) */
  synthesize(text: string, params: SynthesisParams): Promise<ArrayBuffer>
  healthCheck(): Promise<{ ok: boolean; detail?: string }>
}
