/// <reference types="vitest" />
import { defineConfig, type PluginOption } from 'vite';
import preact from '@preact/preset-vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { VitePWA } from 'vite-plugin-pwa';

const MAX_CACHE_SIZE_MB = 50;
const MAX_CACHE_SIZE_BYTES = MAX_CACHE_SIZE_MB * 1024 * 1024;
const CACHE_MAX_ENTRIES = 10;
const CACHE_MAX_AGE_YEAR = 60 * 60 * 24 * 365;

function createRuntimeCache(urlPattern: RegExp, cacheName: string) {
  return {
    urlPattern,
    handler: 'CacheFirst' as const,
    options: {
      cacheName,
      expiration: {
        maxEntries: CACHE_MAX_ENTRIES,
        maxAgeSeconds: CACHE_MAX_AGE_YEAR,
      },
      cacheableResponse: {
        statuses: [0, 200],
      },
    },
  };
}

function sentryPlugins(): PluginOption[] {
  if (!process.env.SENTRY_AUTH_TOKEN) {
    return [];
  }

  return [
    sentryVitePlugin({
      org: process.env.SENTRY_ORG ?? 'total-reality-engineering',
      project: process.env.SENTRY_PROJECT ?? 'speako',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      release: {
        name: process.env.SENTRY_RELEASE ?? process.env.GITHUB_SHA,
      },
      sourcemaps: {
        assets: './dist/**',
        filesToDeleteAfterUpload: ['./dist/**/*.map'],
      },
      telemetry: false,
    }) as PluginOption,
  ];
}

export default defineConfig({
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Speako - Speaking Practice',
        short_name: 'Speako',
        description: 'Offline-capable English Speaking practice tool',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: MAX_CACHE_SIZE_BYTES,
        runtimeCaching: [
          createRuntimeCache(/^https:\/\/huggingface\.co\/.*/i, 'huggingface-models'),
          createRuntimeCache(/^https:\/\/cdn\.jsdelivr\.net\/.*/i, 'jsdelivr-cdn'),
        ],
      },
    }),
    ...sentryPlugins(),
  ],
  server: {
    host: true,
    allowedHosts: true,
    fs: {
      allow: ['..', './test-data'],
    },
  },
  publicDir: 'public',
  build: {
    copyPublicDir: true,
    sourcemap: Boolean(process.env.SENTRY_AUTH_TOKEN),
    rollupOptions: {
      external: [/test-data/],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: ['**/node_modules/**', '**/e2e/**'],
  },
});
