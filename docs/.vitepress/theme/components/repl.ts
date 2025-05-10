import { defineComponent, h, computed, ref, onMounted } from 'vue'
import { Repl, useStore, useVueImportMap } from '@vue/repl'
import { useData } from 'vitepress'
import { default as Monaco } from '@vue/repl/monaco-editor'
import type { PropType } from 'vue'

const headHTML = ''

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
    const bindings = computed(() => ({
      store,
      editor: Monaco,
      showCompileOutput: false,
      showTsConfig: false,
      showImportMap: true,
      clearConsole: false,
      theme: vitePressData.isDark.value ? ('dark' as const) : ('light' as const),
      layout: 'vertical' as const,
      layoutReverse: true,
      previewOptions: {
        headHTML,
        customCode: {
          importCode: importCode.value,
          useCode: useCode.value,
        },
      },
    }))
    onMounted(() => {
      if ('undefined' !== typeof window) {
        hasWindow.value = true
      }
    })
    return () =>
      h(
        'div',
        {
          class: 'docs-repl',
          style: {
            width: '100%',
            height: '120dvh',
            marginTop: '10px',
            border: 'solid 1px var(--vp-c-text-3)',
          },
        },
        hasWindow.value ? h(Repl, { ...bindings.value }) : []
      )
  },
})
