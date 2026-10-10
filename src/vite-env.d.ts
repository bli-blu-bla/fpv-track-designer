/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_VIEWER_DOMAIN?: string
  readonly VITE_TRACK_SHORTENER_ENDPOINT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
