import { setWorkerUrl } from 'maplibre-gl'
import bundledWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

let configured = false

export function configureMapLibreWorker() {
  if (configured) return
  setWorkerUrl(bundledWorkerUrl)
  configured = true
}
