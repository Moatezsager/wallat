
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: '',
      filename: 'sw.js',
      registerType: 'prompt',
      injectRegister: 'auto',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
      },
      manifest: {
        name: "محفظتي الاكترونية - الإدارة المالية الذكية",
        short_name: "محفظتي",
        description: "تطبيق متطور لإدارة الشؤون المالية الشخصية، تتبع المصاريف، الديون، والأهداف الادخارية بذكاء.",
        theme_color: "#020617",
        background_color: "#020617",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          {
            src: "https://vgosloxhrahixrduuzkt.supabase.co/storage/v1/object/public/assets/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "https://vgosloxhrahixrduuzkt.supabase.co/storage/v1/object/public/assets/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable"
          },
          {
            src: "https://vgosloxhrahixrduuzkt.supabase.co/storage/v1/object/public/assets/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          }
        ]
      }
    })
  ],
  define: {
    'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY),
    'process.env': process.env
  }
});
