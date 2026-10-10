import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import { ViewerApp } from './ViewerApp'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { parseViewerRoute } from '@/core/share/viewerRoute'
import { loadViewerRoute } from './loadViewerRoute'

void loadViewerRoute(parseViewerRoute(window.location))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ViewerApp />
    </ErrorBoundary>
  </StrictMode>,
)
