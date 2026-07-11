import type { Live2DModel } from 'pixi-live2d-display'
import {
  resolveMouthOpenParamId as resolveId,
  setMouthOpenById,
  type MouthParamCoreModel,
  type MouthParamSettings,
} from '../../../shared/mouthParam'

/**
 * モデルの LipSync グループまたは候補 ID から口パクパラメータを解決する。
 */
export function resolveMouthOpenParamId(model: Live2DModel): string | null {
  const coreModel = model.internalModel.coreModel as MouthParamCoreModel
  const settings = model.internalModel.settings as MouthParamSettings
  return resolveId(coreModel, settings)
}

export function setMouthOpen(
  model: Live2DModel,
  mouthParamId: string | null,
  value: number,
): void {
  const coreModel = model.internalModel.coreModel as MouthParamCoreModel
  setMouthOpenById(coreModel, mouthParamId, value)
}
