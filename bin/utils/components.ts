import { parse as parseVue } from 'vue-docgen-api'
import { inspect } from 'node:util'

interface Child {
  title: string
  kind: number
  path: string
  isDeprecated: boolean
  children?: Child[]
}

interface NavItem {
  text: string
  link?: string
  items?: NavItem[]
  collapsed?: boolean
}

export const processVueEntries = async (
  cwd: string,
  LIB_NAME: string,
  entries: Record<string, string>
) => {
  const ret: NavItem[] = []
  const vueEntries = Object.entries(entries)
    .filter(([, e]) => e.endsWith('.vue'))
    .map(([k, v]) => ({
      export: k,
      module: [LIB_NAME, k].join('/'),
      src: v,
    }))
  const parsedVueEntries = await Promise.all(
    vueEntries.map(async (entry) => {
      const parsed = await parseVue(entry.src, {
        validExtends: () => true,
      })
      return {
        ...entry,
        documentation: parsed,
      }
    })
  )
  console.log(inspect(parsedVueEntries, { depth: 30 }))
  return ret
}
