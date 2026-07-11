import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { VoicevoxCompatEngine } from '../src/main/voice/voicevoxCompat'

describe('VoicevoxCompatEngine', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('listSpeakers は話者とスタイルを平坦化する', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            name: 'ずんだもん',
            styles: [
              { id: 3, name: 'ノーマル' },
              { id: 1, name: 'あまあま' },
            ],
          },
        ]),
        { status: 200 },
      ),
    )
    const engine = new VoicevoxCompatEngine({
      baseUrl: 'http://127.0.0.1:50021',
    })
    const speakers = await engine.listSpeakers()
    expect(speakers).toEqual([
      { id: 3, name: 'ずんだもん', styleName: 'ノーマル' },
      { id: 1, name: 'ずんだもん', styleName: 'あまあま' },
    ])
  })

  it('synthesize は audio_query → パラメータ上書き → synthesis', async () => {
    const wavBytes = new Uint8Array([1, 2, 3, 4]).buffer
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            speedScale: 1,
            pitchScale: 0,
            volumeScale: 1,
            accent_phrases: [],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(wavBytes, { status: 200 }))

    const engine = new VoicevoxCompatEngine({
      baseUrl: 'http://127.0.0.1:50021',
    })
    const result = await engine.synthesize('こんにちは', {
      speakerId: 3,
      speedScale: 1.2,
      pitchScale: 0.1,
      volumeScale: 0.8,
    })

    expect(result.byteLength).toBe(4)

    const queryCall = vi.mocked(fetch).mock.calls[0]
    expect(String(queryCall[0])).toContain('/audio_query')
    expect(String(queryCall[0])).toContain('speaker=3')

    const synthCall = vi.mocked(fetch).mock.calls[1]
    expect(String(synthCall[0])).toContain('/synthesis')
    const body = JSON.parse(String((synthCall[1] as RequestInit).body))
    expect(body.speedScale).toBe(1.2)
    expect(body.pitchScale).toBe(0.1)
    expect(body.volumeScale).toBe(0.8)
  })

  it('healthCheck 失敗時は起動案内を返す', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('ECONNREFUSED'))
    const engine = new VoicevoxCompatEngine({
      baseUrl: 'http://127.0.0.1:50021',
    })
    const result = await engine.healthCheck()
    expect(result.ok).toBe(false)
    expect(result.detail).toContain('音声エンジンが起動していません')
  })
})
