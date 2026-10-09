import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Editor-only: the viewer has no monospace UI, so its single-file bundle skips this font.
import '@fontsource-variable/geist-mono'
import App from '@/editor/App'
import { ErrorBoundary } from './components/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
