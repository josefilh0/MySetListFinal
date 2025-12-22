// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa' // <--- Importação nova

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Atualiza automaticamente quando você fizer deploy de nova versão
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'], // Ícones extras
      
      // Configuração do Cache (O que faz funcionar offline)
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'], // Cacheia tudo
        maximumFileSizeToCacheInBytes: 5000000, // Aumenta limite de tamanho (5MB) para evitar erros
      },

      // Dados do aplicativo (Substitui/Complementa o seu manifest.json)
      manifest: {
        name: 'MySetList',
        short_name: 'MySetList',
        description: 'Gerenciador de repertórios para músicos',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone', // Faz parecer um app nativo (sem barra de URL)
        icons: [
          {
            src: 'icon-192.png', // Certifique-se que este arquivo está na pasta public
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png', // Certifique-se que este arquivo está na pasta public
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})