import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import { ViewerApp } from './ViewerApp'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useViewerStore } from './store'
import { decodeTrackSharePayload } from '@/core/share/shareTrack'
import { translateOutsideReact } from '@/i18n'

function loadTrackFromHash() {
  const payload = window.location.hash.slice(1)
  const { setTrackData, setError } = useViewerStore.getState()

  if (!payload) {
    setError(translateOutsideReact('viewerMissingPayload'))
    return
  }

  const result = decodeTrackSharePayload(payload)
  if ('error' in result) {
    setError(translateOutsideReact('viewerInvalidPayload'))
    return
  }

  setTrackData(result.track, result.config)
}

loadTrackFromHash()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ViewerApp />
    </ErrorBoundary>
  </StrictMode>,
)
