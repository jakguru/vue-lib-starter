import { dirname, join } from 'node:path'
import { writeFile, mkdir } from 'node:fs/promises'
import { parse as parseVue } from 'vue-docgen-api'
import { inspect } from 'node:util'
import type {
  ComponentDoc,
  PropDescriptor,
  MethodDescriptor,
  SlotDescriptor,
  EventDescriptor,
} from 'vue-docgen-api'

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
  const alias: Record<string, string> = {}
  Object.entries(entries).forEach(([k, v]) => {
    const mod = join(LIB_NAME, k)
    alias[mod] = v
  })
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
        alias,
        modules: [join(cwd, 'src')],
        validExtends: () => true,
      })
      return {
        ...entry,
        documentation: parsed,
      }
    })
  )
  const toWrite: Record<string, string> = {}
  parsedVueEntries.forEach((entry) => {
    const navPath = join('api', entry.module)
    const absPath = join(cwd, 'docs', navPath) + '.md'
    const navItem: NavItem = {
      text: entry.module,
      link: navPath,
    }
    toWrite[absPath] = vueEntryToMarkdown(entry)
    ret.push(navItem)
  })
  for (const [path, content] of Object.entries(toWrite)) {
    const dir = dirname(path)
    try {
      await mkdir(dir, { recursive: true })
    } catch {
      // ignore
    }
    try {
      await writeFile(path, content)
    } catch (e) {
      console.error('Error writing file: %s. %s', path, e)
    }
  }
  return ret
}

interface VueEntry {
  documentation: ComponentDoc
  export: string
  module: string
  src: string
}

const vueEntryToMarkdown = (entry: VueEntry) => {
  let ret = `<script setup>
import ${entry.documentation.displayName} from '${entry.module}.vue'
</script>\n`
  // Add the page title
  ret += `# Component: ${entry.documentation.displayName}\n\n`
  // Add the description, if it exists
  if (entry.documentation.description) {
    ret += `\n${entry.documentation.description}\n\n`
  }
  // Add example import
  ret +=
    '\n```typescript' +
    '\n' +
    `import ${entry.documentation.displayName} from '${entry.module}'` +
    '\n' +
    '```\n'
  // Add <doc> blocks
  if (entry.documentation.docsBlocks) {
    entry.documentation.docsBlocks.forEach((block) => {
      ret += `\n${block}\n`
    })
  }
  if (Array.isArray(entry.documentation.tags.examples)) {
    ret += '\n## Examples\n'
    entry.documentation.tags.examples.forEach((example) => {
      if ('content' in example) {
        ret += `\n${example.content}\n`
      }
    })
  }
  const hasReference = ['props', 'methods', 'slots', 'events'].some(
    (k) =>
      k in entry.documentation &&
      Array.isArray(entry.documentation[k]) &&
      entry.documentation[k].length > 0
  )
  if (hasReference) {
    ret += '\n## Reference\n'
    if (Array.isArray(entry.documentation.props)) {
      ret += makePropsTable(entry.documentation.props)
    }
    if (Array.isArray(entry.documentation.methods)) {
      ret += makeMethodsTable(entry.documentation.methods)
    }
    if (Array.isArray(entry.documentation.slots)) {
      ret += makeSlotsTable(entry.documentation.slots)
    }
    if (Array.isArray(entry.documentation.events)) {
      ret += makeEventsTable(entry.documentation.events)
    }
  }
  return ret
}

const makeHtmlForPropDescriptorType = (type: PropDescriptor['type']) => {
  let ret = type!.func ? `<pre>\n` : `<code>`
  ret += type!.name
  ret += type!.func ? `\n</pre>` : `</code>`
  return ret
}

const makeHtmlForPropDescriptorDefaultValue = (type: PropDescriptor['defaultValue']) => {
  let ret = type!.func ? `<pre>\n` : `<code>`
  ret += type!.value
  ret += type!.func ? `\n</pre>` : `</code>`
  return ret
}

const makePropsTable = (items: PropDescriptor[]) => {
  if (items.length === 0) return ''
  let ret = '\n### Props\n\n'

  ret += `<div style="overflow-x: auto; min-width: 100%; max-width: 100%;" v-pre>
  <table width="100%" style="width: 100%; max-width: 100%; display: table;">
  <thead>
    <tr>
      <th>Name</th>
      <th>Type</th>
      <th>Default</th>
      <th>Required</th>
    </tr>
  </thead>
  <tbody>
`
  items.forEach((item) => {
    ret += `    <tr>
      <td><code>${item.name}</code></td>
      <td>${item.type ? makeHtmlForPropDescriptorType(item.type) : '<code>any</code>'}</td>
      <td>${item.defaultValue ? makeHtmlForPropDescriptorDefaultValue(item.defaultValue) : ''}</td>
      <td>${item.required === true ? '⚠️' : ''}</td>
    </tr>\n`
    if (item.description) {
      ret += `    <tr>
      <td colspan="4">${item.description}</td>
    </tr>\n`
    }
  })
  ret += `</tbody>
</table>
</div>\n`
  return ret
}

const makeMethodsTable = (items: MethodDescriptor[]) => {
  if (items.length === 0) return ''
  let ret = '\n### Public Methods\n\n'

  items.forEach((item) => {
    ret += `\n#### ${item.name}\n`
    if (item.description) {
      ret += `\n${item.description}\n`
    }
    if (item.params) {
      ret += `\n##### Parameters\n`
      ret += `<div style="overflow-x: auto; min-width: 100%; max-width: 100%;" v-pre>
      <table width="100%" style="width: 100%; max-width: 100%; display: table;">
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
`
      item.params.forEach((param) => {
        ret += `        <tr>
          <td><code>${param.name}</code></td>
          <td>${param.type ? makeHtmlForPropDescriptorType(param.type) : '<code>any</code>'}</td>
          <td>${param.description ? param.description : ''}</td>
        </tr>\n`
      })
      ret += `</tbody>
</table>
</div>\n`
    }
    if (item.throws) {
      ret += `\n##### Throws\n`
      ret += `<div style="overflow-x: auto; min-width: 100%; max-width: 100%;" v-pre>
      <table width="100%" style="width: 100%; max-width: 100%; display: table;">
      <thead>
        <tr>
          <th>Type</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
`
      ret += `        <tr>
<td>${item.throws.type ? makeHtmlForPropDescriptorType(item.throws.type) : '<code>any</code>'}</td>
<td>${item.throws.description ? item.throws.description : ''}</td>
</tr>\n`
      ret += `</tbody>
</table>
</div>\n`
    }
    if (item.returns) {
      ret += `\n##### Returns\n`
      ret += `<div style="overflow-x: auto; min-width: 100%; max-width: 100%;" v-pre>
      <table width="100%" style="width: 100%; max-width: 100%; display: table;">
      <thead>
        <tr>
          <th>Type</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
`
      ret += `        <tr>
<td>${item.returns.type ? makeHtmlForPropDescriptorType(item.returns.type) : '<code>any</code>'}</td>
<td>${item.returns.description ? item.returns.description : ''}</td>
</tr>\n`
      ret += `</tbody>
</table>
</div>\n`
    }
  })

  return ret
}

const makeSlotsTable = (items: SlotDescriptor[]) => {
  if (items.length === 0) return ''
  let ret = '\n### Slots\n\n'

  ret += `<div style="overflow-x: auto; min-width: 100%; max-width: 100%;" v-pre>
  <table width="100%" style="width: 100%; max-width: 100%; display: table;">
  <tbody>`

  items.forEach((item) => {
    ret += `    <tr>
      <td><code>${item.name}</code></td>
    </tr>\n`
    if (item.bindings) {
      ret += `    <tr><td style="padding: 0;">
      <table width="100%" style="width: 100%; max-width: 100%; display: table; margin: 0; border: none;">
      <thead>
        <tr>
          <th colspan="3">Bindings:</th>
        </tr>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>`
      item.bindings.forEach((binding) => {
        ret += `        <tr>
          <td><code>${binding.name}</code></td>
          <td>${binding.type ? makeHtmlForPropDescriptorType(binding.type) : '<code>any</code>'}</td>
          <td>${binding.description ? binding.description : ''}</td>
        </tr>\n`
      })
      ret += `</tbody></table></td></tr>\n`
    }
    if (item.description) {
      ret += `    <tr>
      <td>${item.description}</td>
    </tr>\n`
    }
  })

  ret += `</tbody>
</table>
</div>\n`
  return ret
}

const makeEventsTable = (items: EventDescriptor[]) => {
  if (items.length === 0) return ''
  let ret = '\n### Events\n\n'

  ret += `<div style="overflow-x: auto; min-width: 100%; max-width: 100%;" v-pre>
  <table width="100%" style="width: 100%; max-width: 100%; display: table;">
  <thead>
    <tr>
      <th>Name</th>
      <th>Type</th>
    </tr>
  </thead>
  <tbody>`
  items.forEach((item) => {
    ret += `    <tr>
      <td><code>${item.name}</code></td>
      <td>${
        item.type
          ? item.type.names
              .map((v) =>
                makeHtmlForPropDescriptorType({
                  name: v,
                  func: true,
                })
              )
              .join('')
          : '<code>any</code>'
      }</td>
    </tr>\n`
    if (item.description) {
      ret += `    <tr>
      <td colspan="2">${item.description}</td>
    </tr>\n`
    }
    if (item.properties) {
      ret += `    <tr><td colspan="2" style="padding: 0;">
      <table width="100%" style="width: 100%; max-width: 100%; display: table; margin: 0; border: none;">
      <thead>
        <tr>
          <th colspan="3">Properties:</th>
        </tr>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>`
      item.properties.forEach((property) => {
        ret += `        <tr>
          <td><code>${property.name}</code></td>
          <td>${property.type ? `<code>${JSON.stringify(property.type.names)}</code>` : 'any'}</td>
          <td>${property.description ? property.description : ''}</td>
        </tr>\n`
      })
      ret += `</tbody></table></td></tr>\n`
    }
  })
  ret += `</tbody>
</table>
</div>\n`
  return ret
}
