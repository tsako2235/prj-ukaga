import type { Live2DModel } from 'pixi-live2d-display'
import type { SpeechSegmentPayload } from '../../../shared/ipc'

const MOUTH_PARAM = 'ParamMouthOpenY'
const RMS_GAIN = 8
const ATTACK = 0.45
const RELEASE = 0.18
/** 音声なし時: 1文字あたりの表示時間(ms) */
const MS_PER_CHAR = 80
const MIN_TEXT_MS = 800
const MAX_TEXT_MS = 6000

export type SpeechPlayerOptions = {
  getModel: () => Live2DModel
  getVolumeScale: () => number
  onSegmentStart: (segment: SpeechSegmentPayload) => void
  onQueueEmpty?: () => void
}

/**
 * 文単位の再生キュー + RMS リップシンク
 */
export function createSpeechPlayer(options: SpeechPlayerOptions) {
  const queue: SpeechSegmentPayload[] = []
  let playing = false
  let audioContext: AudioContext | null = null
  let currentSource: AudioBufferSourceNode | null = null
  let rafId = 0
  let smoothed = 0
  let generation = 0

  function getContext(): AudioContext {
    if (!audioContext) {
      audioContext = new AudioContext()
    }
    return audioContext
  }

  function setMouth(value: number): void {
    try {
      const coreModel = options.getModel().internalModel.coreModel as {
        setParameterValueById: (id: string, value: number) => void
      }
      coreModel.setParameterValueById(
        MOUTH_PARAM,
        Math.max(0, Math.min(1, value)),
      )
    } catch {
      // パラメータが無いモデルもある
    }
  }

  function stopLipSync(): void {
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
    smoothed = 0
    setMouth(0)
  }

  function startLipSync(analyser: AnalyserNode): void {
    const data = new Uint8Array(analyser.fftSize)
    const tick = () => {
      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128
        sum += v * v
      }
      const rms = Math.sqrt(sum / data.length)
      const target = Math.min(1, rms * RMS_GAIN)
      const coeff = target > smoothed ? ATTACK : RELEASE
      smoothed = smoothed + (target - smoothed) * coeff
      setMouth(smoothed)
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
  }

  async function playWav(
    wav: ArrayBuffer,
    volumeScale: number,
  ): Promise<void> {
    const ctx = getContext()
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }
    const buffer = await ctx.decodeAudioData(wav.slice(0))
    const source = ctx.createBufferSource()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    const gain = ctx.createGain()
    gain.gain.value = volumeScale

    source.buffer = buffer
    source.connect(analyser)
    analyser.connect(gain)
    gain.connect(ctx.destination)

    currentSource = source
    startLipSync(analyser)

    await new Promise<void>((resolve) => {
      source.onended = () => resolve()
      source.start(0)
    })

    currentSource = null
    stopLipSync()
  }

  function playTextOnly(text: string): Promise<void> {
    const ms = Math.min(
      MAX_TEXT_MS,
      Math.max(MIN_TEXT_MS, text.length * MS_PER_CHAR),
    )
    return new Promise((resolve) => {
      setTimeout(resolve, ms)
    })
  }

  async function pump(gen: number): Promise<void> {
    while (queue.length > 0 && gen === generation) {
      const segment = queue.shift()!
      options.onSegmentStart(segment)

      try {
        if (segment.wav && segment.wav.byteLength > 0) {
          await playWav(segment.wav, options.getVolumeScale())
        } else {
          await playTextOnly(segment.text)
        }
      } catch (error) {
        console.warn('[speechPlayer] 再生失敗、テキスト表示のみ:', error)
        await playTextOnly(segment.text)
      }

      if (gen !== generation) return
    }

    playing = false
    stopLipSync()
    if (gen === generation) {
      options.onQueueEmpty?.()
    }
  }

  return {
    enqueue(segment: SpeechSegmentPayload): void {
      // IPC 経由で Uint8Array になる場合がある
      const normalized = normalizeSegment(segment)
      queue.push(normalized)
      if (!playing) {
        playing = true
        const gen = generation
        void pump(gen)
      }
    },

    clear(): void {
      generation += 1
      queue.length = 0
      playing = false
      try {
        currentSource?.stop()
      } catch {
        // 既に停止済み
      }
      currentSource = null
      stopLipSync()
    },

    dispose(): void {
      this.clear()
      void audioContext?.close()
      audioContext = null
    },
  }
}

function normalizeSegment(segment: SpeechSegmentPayload): SpeechSegmentPayload {
  if (!segment.wav) return segment
  if (segment.wav instanceof ArrayBuffer) return segment
  // Electron IPC で Uint8Array になるケース
  const maybe = segment.wav as unknown
  if (maybe instanceof Uint8Array) {
    const copy = new Uint8Array(maybe.byteLength)
    copy.set(maybe)
    return {
      ...segment,
      wav: copy.buffer,
    }
  }
  return segment
}

export type SpeechPlayer = ReturnType<typeof createSpeechPlayer>
