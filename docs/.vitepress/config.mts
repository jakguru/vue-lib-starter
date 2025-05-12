import { defineConfig } from 'vitepress'
import { resolve, join } from 'path'
import { readFileSync } from 'fs'
// https://vitepress.dev/reference/site-config

const BASE_DIR = resolve(__dirname, '..', '..')
const DOCS_DIR = resolve(BASE_DIR, 'docs')

const sidebarJson = readFileSync(join(DOCS_DIR, '.vitepress', 'sidebar.json'), {
  encoding: 'utf-8',
})
const sidebar = JSON.parse(sidebarJson)

export default defineConfig({
  title: '@example/vue-lib',
  description: 'An example Vue + TS Library',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Quick Start', link: '/quickstart' },
      { text: 'API', link: '/api/index.html' },
    ],

    search: {
      provider: 'local',
    },

    sidebar: [
      { text: 'Quick Start', link: '/quickstart' },
      { text: 'Playground', link: '/playground' },
      sidebar,
    ],

    socialLinks: [{ icon: 'npm', link: 'https://www.npmjs.com/package/@example/vue-lib' }],

    outline: {
      level: [2, 4],
    },

    footer: {
      copyright: 'Copyright © 2025-present Jak Guru LLC',
    },
  },

  vite: {
    resolve: {
      alias: {
        '@example/vue-lib': resolve(BASE_DIR, 'src'),
        '@': resolve(BASE_DIR, 'src'),
      },
      mainFields: ['module', 'jsnext:main', 'jsnext'],
    },
    define: {
      __VERSION__: JSON.stringify('0.0.1'),
    },
    ssr: {
      noExternal: ['@vue/repl', 'monaco-editor-core'],
    },
    server: {
      fs: {
        allow: ['../..'],
      },
    },
    optimizeDeps: {
      exclude: ['@vue/repl'],
    },
  },
})
