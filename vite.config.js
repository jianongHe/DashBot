import {defineConfig} from 'vite'
import {svelte} from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr';

// https://vite.dev/config/
export default defineConfig({
    base: './',
    plugins: [
        svelte(),
        tailwindcss(),
        svgr({
            exportAsDefault: true, // 放这里就对了
        }),
    ],
})
