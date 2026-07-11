import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    root: resolve('src/renderer'),
    publicDir: resolve('resources'),
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          mascot: resolve('src/renderer/mascot/index.html'),
          admin: resolve('src/renderer/admin/index.html'),
          setup: resolve('src/renderer/setup/index.html'),
        },
      },
    },
  },
})
