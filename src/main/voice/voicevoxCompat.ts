import type {
  SpeakerInfo,
  SynthesisParams,
  VoiceEngine,
} from './types'

export type VoicevoxCompatOptions = {
  baseUrl: string
}

type VoicevoxSpeaker = {
  name: string
  styles: Array<{ id: number; name: string }>
}

/**
 * VOICEVOX 互換 HTTP API アダプタ
 * VOICEVOX / AivisSpeech / SHAREVOX 等で利用
 */
export class VoicevoxCompatEngine implements VoiceEngine {
  private readonly baseUrl: string

  constructor(options: VoicevoxCompatOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '')
  }

  async listSpeakers(): Promise<SpeakerInfo[]> {
    const res = await fetch(`${this.baseUrl}/speakers`)
    if (!res.ok) {
      throw new Error(`話者一覧の取得に失敗しました (${res.status})`)
    }
    const speakers = (await res.json()) as VoicevoxSpeaker[]
    const list: SpeakerInfo[] = []
    for (const speaker of speakers) {
      for (const style of speaker.styles ?? []) {
        list.push({
          id: style.id,
          name: speaker.name,
          styleName: style.name,
        })
      }
    }
    return list
  }

  async synthesize(
    text: string,
    params: SynthesisParams,
  ): Promise<ArrayBuffer> {
    const queryUrl = new URL(`${this.baseUrl}/audio_query`)
    queryUrl.searchParams.set('text', text)
    queryUrl.searchParams.set('speaker', String(params.speakerId))

    const queryRes = await fetch(queryUrl, { method: 'POST' })
    if (!queryRes.ok) {
      const body = await queryRes.text().catch(() => '')
      throw new Error(
        `audio_query に失敗しました (${queryRes.status})${body ? `: ${body}` : ''}`,
      )
    }

    const query = (await queryRes.json()) as Record<string, unknown>
    query.speedScale = params.speedScale
    query.pitchScale = params.pitchScale
    query.volumeScale = params.volumeScale

    const synthUrl = new URL(`${this.baseUrl}/synthesis`)
    synthUrl.searchParams.set('speaker', String(params.speakerId))

    const synthRes = await fetch(synthUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
    })
    if (!synthRes.ok) {
      const body = await synthRes.text().catch(() => '')
      throw new Error(
        `synthesis に失敗しました (${synthRes.status})${body ? `: ${body}` : ''}`,
      )
    }

    return synthRes.arrayBuffer()
  }

  async healthCheck(): Promise<{ ok: boolean; detail?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/speakers`, {
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) {
        return {
          ok: false,
          detail: `音声エンジンが応答しましたがエラーです (${res.status})`,
        }
      }
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        detail: `音声エンジンが起動していません (${this.baseUrl}): ${String(error)}`,
      }
    }
  }
}
