import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 開発時は `php -S localhost:8787 -t server` を別途起動しておくと
      // フロントの fetch('/api.php') がそのまま繋がる
      '/api.php': 'http://localhost:8787',
    },
  },
})
