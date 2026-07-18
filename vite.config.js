import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import monacoEditorPluginModule from 'vite-plugin-monaco-editor'
const monacoEditorPlugin = monacoEditorPluginModule.default

export default defineConfig({
  plugins: [
    react(),
    monacoEditorPlugin({
      languageWorkers: ['editorWorkerService', 'typescript', 'json'],
    }),
  ],
  base: './',
  server: {
    fs: {
      allow: [
        path.resolve(__dirname, '..'),
      ],
    },
  },
  build: {
    outDir: 'dist',
  },
})
