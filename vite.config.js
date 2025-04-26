import {defineConfig} from 'vite'
import {svelte} from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
    base: 'http://assets.dashbot.jianong.me/', // Aliyun CDN
    plugins: [
        svelte(),
        tailwindcss(),
    ],
})
