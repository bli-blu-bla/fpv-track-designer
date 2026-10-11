import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Inlines the emitted JS/CSS into the viewer HTML and emits it as index.html,
// so the share viewer ships as one static file.
function inlineViewerBundle(): Plugin {
  return {
    name: 'inline-viewer-bundle',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const htmlAsset = bundle['viewer.html']
      if (!htmlAsset || htmlAsset.type !== 'asset') return

      let html = String(htmlAsset.source)

      for (const [fileName, output] of Object.entries(bundle)) {
        const name = escapeRegExp(fileName)

        if (output.type === 'chunk' && fileName.endsWith('.js')) {
          // Dynamic imports (lazy NightBloom) are inlined, so Vite never fills in their preload
          // list; the leftover marker would throw on night tracks. `void 0` = nothing to preload.
          const code = output.code
            .replace(/\b__VITE_PRELOAD__\b/g, 'void 0')
            .replace(/<(\/script>|!--)/g, '\\x3C$1')
            .trim()
          html = html.replace(
            new RegExp(`<script([^>]*?) src="(?:[^"]*?/)?${name}"([^>]*)></script>`),
            (_match, before: string, after: string) => `<script${before}${after}>${code}</script>`,
          )
          delete bundle[fileName]
        } else if (output.type === 'asset' && fileName.endsWith('.css')) {
          const css = String(output.source).replace('@charset "UTF-8";', '').trim()
          html = html.replace(
            new RegExp(`<link([^>]*?) href="(?:[^"]*?/)?${name}"([^>]*)>`),
            (_match, before: string, after: string) => `<style${before}${after}>${css}</style>`,
          )
          delete bundle[fileName]
        }
      }

      delete bundle['viewer.html']
      this.emitFile({ type: 'asset', fileName: 'index.html', source: html })
    },
  }
}

export default defineConfig({
  // Root-relative so the favicon resolves on nested routes like /s/<id> and /t/<ns>.
  base: '/',
  plugins: [react(), tailwindcss(), inlineViewerBundle()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist-viewer',
    assetsDir: '',
    assetsInlineLimit: () => true,
    chunkSizeWarningLimit: 100_000_000,
    cssCodeSplit: false,
    rollupOptions: {
      input: fileURLToPath(new URL('./viewer.html', import.meta.url)),
      output: {
        codeSplitting: false,
      },
    },
  },
})
