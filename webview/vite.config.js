import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
export default defineConfig({
    plugins: [vue()],
    build: {
        outDir: '../dist/webview',
        emptyOutDir: true,
        rollupOptions: {
            output: {
                entryFileNames: 'assets/index.js',
                chunkFileNames: 'assets/[name].js',
                assetFileNames: 'assets/[name].[ext]'
            }
        }
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
            '@shared': path.resolve(__dirname, '../shared')
        }
    }
});
