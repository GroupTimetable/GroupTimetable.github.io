import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import path from 'node:path'

const projDir: string = (import.meta as any).dirname

export default defineConfig(() => {
    return {
        root: path.join(projDir, 'src'),
        plugins: [
            react(),
            tailwind(),
        ]
    }
})
