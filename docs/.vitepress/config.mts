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
  title: '@example/lib',
  description: 'An example library',
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

    sidebar: [{ text: 'Quick Start', link: '/quickstart' }, sidebar],

    socialLinks: [{ icon: 'npm', link: 'https://www.npmjs.com/package/@example/lib' }],

    outline: {
      level: [2, 3],
    },

    footer: {
      copyright: 'Copyright © 2025-present Jak Guru LLC',
    },
  },
})
