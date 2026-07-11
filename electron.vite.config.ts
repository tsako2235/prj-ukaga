import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    root: resolve('src/renderer/mascot'),
    // Cubism Core / Live2D モデルを / 配下で配信する
    publicDir: resolve('resources'),
    build: {
      rollupOptions: {
        input: {
          mascot: resolve('src/renderer/mascot/index.html'),
        },
      },
    },
  },
})
