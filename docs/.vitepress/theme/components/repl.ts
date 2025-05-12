import { defineComponent, h, computed, ref, shallowRef, onMounted, watch } from 'vue'
import { Repl, useStore, useVueImportMap } from '@vue/repl'
import { useData } from 'vitepress'
import type { default as Monaco } from '@vue/repl/monaco-editor'
import { default as CodeMirror } from '@vue/repl/codemirror-editor'
import type { PropType } from 'vue'

declare global {
  interface ImportMeta {
    readonly env: {
      SSR: boolean
    }
  }
}

export const ReadEvalPrintLoop = defineComponent({
  name: 'ReadEvalPrintLoop',
  components: {
    VueRepl: Repl,
  },
  props: {
    headHTML: {
      type: String,
      default: '',
    },
    imports: {
      type: Object as PropType<Record<string, string>>,
      default: () => ({}),
    },
    importCode: {
      type: String,
      default: '',
    },
    useCode: {
      type: String,
      default: '',
    },
  },
  setup(props) {
    const headHTML = computed(() => props.headHTML)
    const imports = computed(() => props.imports)
    const importCode = computed(() => props.importCode)
    const useCode = computed(() => props.useCode)
    const { importMap: builtinImportMap, vueVersion, productionMode } = useVueImportMap()
    const store = useStore({
      builtinImportMap: ref({
        imports: {
          ...builtinImportMap.value.imports,
          ...imports.value,
        },
      }),
      vueVersion,
    })
    productionMode.value = true
    const hasWindow = ref(false)
    const vitePressData = useData()
    const editor = shallowRef<typeof Monaco | typeof CodeMirror | undefined>(undefined)
    const bindings = computed(() => ({
      store,
      editor: editor.value as typeof Monaco,
      showCompileOutput: false,
      showTsConfig: true,
      showImportMap: true,
      clearConsole: false,
      theme: vitePressData.isDark.value ? ('dark' as const) : ('light' as const),
      layout: 'horizontal' as const,
      layoutReverse: true,
      previewOptions: {
        headHTML: headHTML.value,
        customCode: {
          importCode: importCode.value,
          useCode: useCode.value,
        },
      },
    }))
    onMounted(() => {
      import('@vue/repl/codemirror-editor').then(async (mod) => {
        editor.value = mod.default
        hasWindow.value = true
      })
    })
    return () =>
      h(
        'div',
        {
          class: 'docs-repl',
          style: {
            width: '100%',
            height: '60dvh',
            marginTop: '10px',
            border: 'solid 1px var(--vp-c-text-3)',
          },
        },
        hasWindow.value ? h(Repl, { ...bindings.value }) : []
      )
  },
})
