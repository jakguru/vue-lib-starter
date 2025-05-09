// https://vitepress.dev/guide/custom-theme
import { h } from 'vue'
import { ReadEvalPrintLoop } from './components/repl'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // https://vitepress.dev/guide/extending-default-theme#layout-slots
    })
  },
  enhanceApp({ app }) {
    app.component('ReadEvalPrintLoop', ReadEvalPrintLoop)
  },
} satisfies Theme
