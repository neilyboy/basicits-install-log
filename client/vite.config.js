import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['logo.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable.png', 'apple-touch-icon.png', 'favicon-32.png'],
      manifest: {
        id: '/basicits-install-log',
        name: 'Basic ITS Install Log',
        short_name: 'ITS Log',
        description: 'Document Verkada security installations — devices, photos, locations, and reports.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui', 'browser'],
        orientation: 'portrait-primary',
        start_url: '/?pwa=1',
        scope: '/',
        lang: 'en-US',
        categories: ['business', 'productivity', 'utilities'],
        icons: [
          { src: '/icon-192.png',     sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png',     sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
        shortcuts: [
          {
            name: 'New Job',
            short_name: 'New Job',
            description: 'Start a new installation job',
            url: '/jobs/new?pwa=1',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Archive',
            short_name: 'Archive',
            description: 'View archived jobs',
            url: '/archive?pwa=1',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 24 * 60 * 60 },
              networkTimeoutSeconds: 5,
            },
          },
          {
            urlPattern: /^\/(uploads|thumbnails)\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: { maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    proxy: {
      '/api':        { target: 'http://localhost:3000', changeOrigin: true },
      '/uploads':    { target: 'http://localhost:3000', changeOrigin: true },
      '/thumbnails': { target: 'http://localhost:3000', changeOrigin: true },
      '/share':      { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
