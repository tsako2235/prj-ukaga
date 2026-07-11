export type PromptVariables = {
  name: string
  time?: string
  date?: string
  os?: string
}

/** テンプレート変数を展開。未知の変数はそのまま残す */
export function expandTemplate(
  template: string,
  vars: PromptVariables,
): string {
  const now = new Date()
  const values: Record<string, string> = {
    name: vars.name,
    time:
      vars.time ??
      now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
    date:
      vars.date ??
      now.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      }),
    os: vars.os ?? process.platform,
  }

  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (full, key: string) => {
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      return values[key]
    }
    return full
  })
}
