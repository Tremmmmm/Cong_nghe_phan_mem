import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'FastFood Delivery',
        short_name: 'FastFood',
        description: 'Đặt món ăn nhanh chóng và tiện lợi',
        theme_color: '#ffffff',
        background_color: '#ffffff',
         
        //Dòng này giúp ẩn thanh địa chỉ
        display: 'standalone', 
        
        // Khóa xoay màn hình (chỉ hiện dọc giống app thường - Tuỳ chọn)
        orientation: 'portrait', 
        
        icons: [
          {
            src: '/assets/images/favicon.png', // Đảm bảo bạn có file ảnh này trong public
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/assets/images/favicon.png', // Đảm bảo bạn có file ảnh này trong public
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/assets/images/favicon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // Giúp icon đẹp hơn trên Android
          }
        ]
      }
    })
  ],
  server: { port: 5173 }
})