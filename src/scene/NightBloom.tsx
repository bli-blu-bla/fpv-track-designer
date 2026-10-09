import { Bloom, EffectComposer } from '@react-three/postprocessing'

/** Neon glow for the night theme. Loaded lazily so other themes skip the postprocessing bundle. */
export function NightBloom() {
  return (
    <EffectComposer>
      <Bloom mipmapBlur intensity={1.6} luminanceThreshold={1} luminanceSmoothing={0.2} />
    </EffectComposer>
  )
}
