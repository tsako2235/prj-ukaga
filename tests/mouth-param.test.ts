import { describe, expect, it } from 'vitest'
import {
  resolveMouthOpenParamId,
  setMouthOpenById,
  type MouthParamCoreModel,
} from '../src/shared/mouthParam'

function mockCore(ids: string[]): MouthParamCoreModel {
  const index = new Map(ids.map((id, i) => [id, i]))
  return {
    getParameterIndex: (id: string) => index.get(id) ?? -1,
    setParameterValueById: () => undefined,
  }
}

describe('resolveMouthOpenParamId', () => {
  it('LipSync グループの ID を優先する', () => {
    expect(
      resolveMouthOpenParamId(mockCore(['PARAM_MOUTH_OPEN_Y', 'ParamMouthOpenY']), {
        getLipSyncParameters: () => ['PARAM_MOUTH_OPEN_Y'],
      }),
    ).toBe('PARAM_MOUTH_OPEN_Y')
  })

  it('グループが空なら標準 ID を試す', () => {
    expect(
      resolveMouthOpenParamId(mockCore(['ParamMouthOpenY']), {
        getLipSyncParameters: () => [],
      }),
    ).toBe('ParamMouthOpenY')
  })

  it('見つからなければ null', () => {
    expect(
      resolveMouthOpenParamId(mockCore(['PARAM_ANGLE_X']), {
        getLipSyncParameters: () => [],
      }),
    ).toBeNull()
  })
})

describe('setMouthOpenById', () => {
  it('ID が無いときは何もしない', () => {
    expect(() => setMouthOpenById(mockCore([]), null, 0.5)).not.toThrow()
  })
})
