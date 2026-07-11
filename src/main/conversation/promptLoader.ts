import { app } from 'electron'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  watch,
  writeFileSync,
} from 'fs'
import { join } from 'path'
import type { FSWatcher } from 'fs'
import { expandTemplate, type PromptVariables } from './template'

export type { PromptVariables }

/**
 * プロンプトファイルの読込・変数展開・合成
 */
export class PromptLoader {
  private personaDefault = ''
  private systemRules = ''
  private randomTalkPrompts: string[] = []
  private persona = ''
  private personaWatcher: FSWatcher | null = null
  private onPersonaChanged: ((content: string) => void) | null = null

  constructor(
    private readonly bundledPromptsDir: string,
    private readonly userPromptsDir: string,
  ) {}

  /** 起動時に同梱・ユーザープロンプトを読み込む */
  init(): void {
    mkdirSync(this.userPromptsDir, { recursive: true })

    this.personaDefault = this.readBundled('persona.default.md')
    this.systemRules = this.readBundled('system-rules.md')
    this.randomTalkPrompts = this.readRandomTalkDir()

    const personaPath = this.personaPath()
    if (!existsSync(personaPath)) {
      writeFileSync(personaPath, this.personaDefault, 'utf8')
    }
    this.persona = readFileSync(personaPath, 'utf8')

    this.personaWatcher?.close()
    this.personaWatcher = watch(personaPath, () => {
      try {
        if (!existsSync(personaPath)) return
        this.persona = readFileSync(personaPath, 'utf8')
        this.onPersonaChanged?.(this.persona)
      } catch {
        // エディタ保存中の一時的な失敗は無視
      }
    })
  }

  setPersonaChangedHandler(handler: (content: string) => void): void {
    this.onPersonaChanged = handler
  }

  getPersona(): string {
    return this.persona
  }

  getPersonaDefault(): string {
    return this.personaDefault
  }

  setPersona(content: string): void {
    writeFileSync(this.personaPath(), content, 'utf8')
    this.persona = content
  }

  resetPersona(): string {
    this.setPersona(this.personaDefault)
    return this.persona
  }

  /**
   * システムプロンプトを合成する。
   * persona + system-rules (+ ランダムトーク時は追加)
   */
  buildSystemPrompt(
    vars: PromptVariables,
    options?: { randomTalk?: boolean },
  ): string {
    const parts = [
      expandTemplate(this.persona, vars),
      expandTemplate(this.systemRules, vars),
    ]
    if (options?.randomTalk && this.randomTalkPrompts.length > 0) {
      const pick =
        this.randomTalkPrompts[
          Math.floor(Math.random() * this.randomTalkPrompts.length)
        ]
      parts.push(expandTemplate(pick, vars))
    }
    return parts.join('\n\n')
  }

  dispose(): void {
    this.personaWatcher?.close()
    this.personaWatcher = null
  }

  private personaPath(): string {
    return join(this.userPromptsDir, 'persona.md')
  }

  private readBundled(name: string): string {
    const path = join(this.bundledPromptsDir, name)
    if (!existsSync(path)) {
      console.warn(`[promptLoader] 同梱プロンプトがありません: ${path}`)
      return ''
    }
    return readFileSync(path, 'utf8')
  }

  private readRandomTalkDir(): string[] {
    const dir = join(this.bundledPromptsDir, 'random-talk')
    if (!existsSync(dir)) return []
    return readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => readFileSync(join(dir, f), 'utf8'))
  }
}

export function createDefaultPromptLoader(
  resolveResource: (...parts: string[]) => string,
): PromptLoader {
  const bundled = resolveResource('prompts')
  const userDir = join(app.getPath('userData'), 'prompts')
  const loader = new PromptLoader(bundled, userDir)
  loader.init()
  return loader
}
