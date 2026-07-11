import { describe, expect, it } from 'vitest'
import { parseEmotion } from '../src/main/conversation/emotionParser'
import { SentenceSplitter } from '../src/main/conversation/sentenceSplitter'
import { expandTemplate } from '../src/main/conversation/template'

describe('SentenceSplitter', () => {
  it('句点で文を分割する', () => {
    const s = new SentenceSplitter()
    expect(s.push('こんにちは。元気')).toEqual(['こんにちは。'])
    expect(s.push('ですか？はい！')).toEqual(['元気ですか？'])
    // 「はい！」は短いため保留され、flush で返る
    expect(s.flush()).toBe('はい！')
  })

  it('短すぎる断片は次の文と結合する', () => {
    const s = new SentenceSplitter()
    expect(s.push('あ。')).toEqual([])
    expect(s.push('これは続きの文です。')).toEqual(['あ。これは続きの文です。'])
  })

  it('カギ括弧内の句点では区切らない', () => {
    const s = new SentenceSplitter()
    expect(s.push('彼は「こんにちは。よろしく」と言った。')).toEqual([
      '彼は「こんにちは。よろしく」と言った。',
    ])
  })

  it('flush で残バッファを返す', () => {
    const s = new SentenceSplitter()
    expect(s.push('終わりのない文')).toEqual([])
    expect(s.flush()).toBe('終わりのない文')
  })
})

describe('parseEmotion', () => {
  it('文頭タグを抽出し除去する', () => {
    expect(parseEmotion('[happy]おかえり!')).toEqual({
      emotion: 'happy',
      text: 'おかえり!',
    })
  })

  it('タグなしは neutral', () => {
    expect(parseEmotion('ただの文')).toEqual({
      emotion: 'neutral',
      text: 'ただの文',
    })
  })

  it('不正タグは neutral にフォールバック', () => {
    expect(parseEmotion('[unknown]テスト')).toEqual({
      emotion: 'neutral',
      text: '[unknown]テスト',
    })
  })
})

describe('expandTemplate', () => {
  it('既知変数を展開し未知は残す', () => {
    const result = expandTemplate('名前={name} 謎={foo}', {
      name: 'うかが',
      os: 'darwin',
      date: '2026年7月12日',
      time: '01:00',
    })
    expect(result).toBe('名前=うかが 謎={foo}')
  })
})
