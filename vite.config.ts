import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import fs from 'fs'

// ============================================
// 應用程式設定（可公開，不含敏感資訊）
// ============================================
const APP_CONFIG = {
  // Google OAuth Client ID（公開資訊）
  GOOGLE_CLIENT_ID: '576507381215-hnfsve4itb9euqlh6r1rt64kt3lp504r.apps.googleusercontent.com',
}

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages 部署路徑
  base: '/THSR-Ticket-Manager/',
  // 注入環境變數
  define: {
    'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(APP_CONFIG.GOOGLE_CLIENT_ID),
  },
  server: {
    allowedHosts: ['localhost', '.ngrok-free.app', '.ngrok.io'],
  },
  plugins: [
    // 自訂 plugin 來服務 downloads 資料夾
    {
      name: 'serve-downloads',
      configureServer(server) {
        server.middlewares.use('/downloads', (req, res) => {
          const filePath = path.join(process.cwd(), 'downloads', decodeURIComponent(req.url || ''));
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            res.setHeader('Content-Type', 'application/pdf');
            fs.createReadStream(filePath).pipe(res);
          } else {
            res.statusCode = 404;
            res.end('Not Found');
          }
        });
      },
    },
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg', 'icons/icon.svg'],
      manifest: {
        name: 'THSR Ticket Manager',
        short_name: 'THSR Manager',
        description: 'High Speed Rail ticket management tool for expense reporting',
        theme_color: '#ea580c',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        lang: 'zh-TW',
        categories: ['productivity', 'utilities'],
        icons: [
          {
            src: 'icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        // Cache strategies for offline support
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            // Cache API responses and images at runtime
            urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|svg|gif)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          {
            // Cache Google APIs
            urlPattern: /^https:\/\/www\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'google-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              networkTimeoutSeconds: 10
            }
          },
          {
            // Cache fonts
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            // Cache font files
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true // Enable PWA in development for testing
      }
    })
  ],
})
