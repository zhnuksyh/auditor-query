import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Fully static, client-side SPA. `base` is relative so the build works
// on GitHub Pages project sites, Netlify, and Vercel alike.
export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      // Two pages: the game at / and the kinetic-typography trailer at
      // /trailer/. A real second HTML entry (not a route) so it works on any
      // static host without SPA-fallback rewrites.
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        trailer: fileURLToPath(new URL('./trailer/index.html', import.meta.url)),
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      // Precache the app shell plus the big wasm binary so it works offline and
      // installs cleanly to a home screen.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,wasm}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Drop precaches from previous builds as soon as the new SW activates,
        // so deleted chunk hashes don't linger and 404 on next navigation.
        cleanupOutdatedCaches: true,
        // Serve index.html network-first: a returning, online visitor gets the
        // freshly deployed HTML (and current chunk hashes) instead of a stale
        // cached shell that points at chunks the server has already deleted.
        // Falls back to the precached shell only when the network is unavailable.
        runtimeCaching: [
          {
            urlPattern: ({ request, sameOrigin }) =>
              sameOrigin && request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-shell',
              networkTimeoutSeconds: 3,
            },
          },
        ],
      },
      manifest: {
        name: 'Auditor Query',
        short_name: 'Auditor Query',
        description:
          'A browser-based deduction game where you write raw SQL to work IT audit engagements and find control exceptions.',
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  optimizeDeps: {
    // Pre-bundle the sql.js dist entry so Vite converts its CJS/UMD form into a
    // clean ESM module with a proper default export. Excluding it (the old
    // setup) left the default export unwired in dev, so initSqlJs was missing.
    include: ['sql.js/dist/sql-wasm.js'],
  },
})
