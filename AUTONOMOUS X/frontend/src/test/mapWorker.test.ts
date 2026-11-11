import { beforeEach, describe, expect, it, vi } from 'vitest'

const { setWorkerUrl } = vi.hoisted(() => ({ setWorkerUrl: vi.fn() }))
vi.mock('maplibre-gl', () => ({ setWorkerUrl }))

import { configureMapLibreWorker } from '../mapWorker'

describe('MapLibre bundler worker setup', () => {
  beforeEach(() => setWorkerUrl.mockClear())
  it('registers the bundled module worker URL before map creation', () => {
    configureMapLibreWorker()
    expect(setWorkerUrl).toHaveBeenCalledTimes(1)
    expect(setWorkerUrl.mock.calls[0][0]).toContain('maplibre-gl-worker')
  })
})
