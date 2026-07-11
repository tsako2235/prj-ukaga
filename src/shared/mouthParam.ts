/** Cubism 標準およびよくある別名 */
export const MOUTH_PARAM_CANDIDATES = [
  'ParamMouthOpenY',
  'PARAM_MOUTH_OPEN_Y',
  'Param_mouth_open_y',
] as const

export type MouthParamCoreModel = {
  setParameterValueById: (id: string, value: number) => void
  getParameterIndex?: (id: string) => number
}

export type MouthParamSettings = {
  getLipSyncParameters?: () => string[] | undefined
}

/**
 * LipSync グループまたは候補 ID から口パクパラメータを解決する。
 */
export function resolveMouthOpenParamId(
  coreModel: MouthParamCoreModel,
  settings?: MouthParamSettings,
): string | null {
  const fromGroup = settings?.getLipSyncParameters?.() ?? []
  const candidates = [
    ...fromGroup.filter(Boolean),
    ...MOUTH_PARAM_CANDIDATES,
  ]

  const seen = new Set<string>()
  for (const id of candidates) {
    if (seen.has(id)) continue
    seen.add(id)
    if (hasParameter(coreModel, id)) return id
  }
  return null
}

function hasParameter(coreModel: MouthParamCoreModel, id: string): boolean {
  if (typeof coreModel.getParameterIndex === 'function') {
    try {
      return coreModel.getParameterIndex(id) >= 0
    } catch {
      return false
    }
  }
  return (MOUTH_PARAM_CANDIDATES as readonly string[]).includes(id)
}

export function setMouthOpenById(
  coreModel: MouthParamCoreModel,
  mouthParamId: string | null,
  value: number,
): void {
  if (!mouthParamId) return
  try {
    coreModel.setParameterValueById(
      mouthParamId,
      Math.max(0, Math.min(1, value)),
    )
  } catch {
    // パラメータが無いモデルもある
  }
}
