import { join } from 'node:path'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import * as td from 'typedoc'
import { default as color } from 'cli-color'
import { processVueEntries } from './components'

export const getEntries = async (SRC_DIR: string, LIB_NAME: string) => {
  const regex = /@module\s+(@?[\w\/.-]+)/gm
  const entries: Record<string, string> = {}
  const filesInSrc = await readdir(SRC_DIR, {
    withFileTypes: true,
    recursive: true,
  })
  await Promise.all(
    filesInSrc.map(async (file) => {
      if (!file.isFile()) {
        return
      }
      if (!file.name.endsWith('.ts') && !file.name.endsWith('.vue')) {
        return
      }
      const absPath = join(file.parentPath, file.name)
      const content = await readFile(absPath, 'utf-8')
      let m
      while ((m = regex.exec(content)) !== null) {
        if (m.index === regex.lastIndex) {
          regex.lastIndex++
        }
        m.forEach((match, gi) => {
          if (gi === 1) {
            const libMod = match.replace(LIB_NAME, '')
            let key = libMod.length === 0 ? 'index' : libMod
            while (key.startsWith('/')) {
              key = key.slice(1)
            }
            if (entries[key]) {
              throw new Error(`Duplicate entry: ${key}`)
            }
            entries[key] = absPath
          }
        })
      }
    })
  )
  return entries
}

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

const childToNav = (child: Child): NavItem => {
  if (child.children) {
    return {
      text: child.title,
      items: child.children.map(childToNav),
      collapsed: true,
    }
  }
  return {
    text: child.title,
    link: `/api/${child.path}`.replace(/\.md$/, ''),
  }
}

export const makeApiDocs = async (cwd: string, LIB_NAME: string) => {
  // this is where we build the markdown for the docs
  const entries = await getEntries(join(cwd, 'src'), LIB_NAME)
  const entryPoints = Object.values(entries).filter((e) => e.endsWith('.ts'))
  const sidebar = {
    text: 'API',
    items: [] as NavItem[],
  }
  try {
    const { app, project } = await makeApiDocsProjectForEntrypoints(
      entryPoints,
      join(cwd, 'tsconfig.json'),
      cwd,
      LIB_NAME,
      async (renderer) => {
        // The navigation JSON structure is available on the navigation object.
        // @ts-ignore
        sidebar.items = renderer.navigation.map((section) => {
          if (!section.children) {
            return {
              text: section.title,
              link: `/api/${section.path}`.replace(/\.md$/, ''),
            }
          }
          section.children = section.children.map(childToNav)
          if (entryPoints.length > 1) {
            section.children.unshift({
              text: 'Package Exports',
              link: `/api/${section.path}`.replace(/\.md$/, ''),
            })
          }
          return {
            text: section.title,
            items: section.children,
            collapsed: true,
          }
        })
        if (entryPoints.length === 1) {
          sidebar.items.unshift({ text: 'Package Exports', link: '/api' })
        }
      }
    )
    if (!project) {
      console.error(color.red('Typedoc failed to generate project'))
      return
    }
    app.validate(project)
    if (app.logger.hasErrors()) {
      console.error(color.red('Typedoc failed to generate project'))
      return
    }
    await app.generateOutputs(project)
    if (app.logger.hasErrors()) {
      console.error(color.red('Typedoc failed to generate project output'))
      return
    }
  } catch (error) {
    console.error(color.red(`Typedoc exited with an unexpected error`))
    console.error(error)
  }
  // this is where we create the markdown for the vue components
  const vueEntries = await processVueEntries(cwd, LIB_NAME, entries)
  sidebar.items.push(...vueEntries)
  sidebar.items.sort((a, b) => {
    return a.text.localeCompare(b.text)
  })

  const dst = join(cwd, 'docs', '.vitepress', 'sidebar.json')
  await writeFile(dst, JSON.stringify(sidebar, null, 2))
  console.log(color.green('Sidebar JSON generated'))
}

export const makeApiDocsProjectForEntrypoints = async (
  entryPoints: string[],
  tsconfig: string,
  cwd: string,
  LIB_NAME: string,
  postRenderAsyncJobCallback?: (renderer: td.RendererEvent) => Promise<void>,
  alwaysCreateEntryPointModule?: boolean
) => {
  const app = await td.Application.bootstrapWithPlugins(
    {
      entryPoints: entryPoints,
      tsconfig: tsconfig,
      out: join(cwd, 'docs', 'api'),
      plugin: ['typedoc-plugin-markdown'],
      excludePrivate: true,
      excludeProtected: true,
      excludeExternals: true,
      hideGenerator: true,
      skipErrorChecking: true,
      readme: 'none',
      name: LIB_NAME,
      // @ts-ignore
      entryFileName: 'index.md',
      hidePageHeader: true,
      hideBreadcrumbs: true,
      useCodeBlocks: true,
      expandObjects: true,
      expandParameters: true,
      indexFormat: 'table',
      parametersFormat: 'table',
      interfacePropertiesFormat: 'table',
      classPropertiesFormat: 'table',
      typeAliasPropertiesFormat: 'table',
      enumMembersFormat: 'table',
      propertyMembersFormat: 'table',
      typeDeclarationFormat: 'table',
      formatWithPrettier: true,
      highlightLanguages: ['typescript', 'javascript', 'json'],
      disableSources: true,
      useTsLinkResolution: true,
      includeVersion: false,
      externalSymbolLinkMappings: {
        typescript: {
          Awaited: 'https://www.typescriptlang.org/docs/handbook/utility-types.html#awaitedtype',
          Partial: 'https://www.typescriptlang.org/docs/handbook/utility-types.html#partialtype',
          Required: 'https://www.typescriptlang.org/docs/handbook/utility-types.html#requiredtype',
          Readonly: 'https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype',
          Record: 'https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type',
          Pick: 'https://www.typescriptlang.org/docs/handbook/utility-types.html#picktype-keys',
          Omit: 'https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys',
          Exclude:
            'https://www.typescriptlang.org/docs/handbook/utility-types.html#excludetype-excludedunion',
          Extract:
            'https://www.typescriptlang.org/docs/handbook/utility-types.html#extracttype-union',
          NonNullable:
            'https://www.typescriptlang.org/docs/handbook/utility-types.html#nonnullabletype',
          Parameters:
            'https://www.typescriptlang.org/docs/handbook/utility-types.html#parameterstype',
          ConstructorParameters:
            'https://www.typescriptlang.org/docs/handbook/utility-types.html#constructorparameterstype',
          ReturnType:
            'https://www.typescriptlang.org/docs/handbook/utility-types.html#returntypetype',
          InstanceType:
            'https://www.typescriptlang.org/docs/handbook/utility-types.html#instancetypetype',
          NoInfer: 'https://www.typescriptlang.org/docs/handbook/utility-types.html#noinfertype',
          ThisParameterType:
            'https://www.typescriptlang.org/docs/handbook/utility-types.html#thisparametertypetype',
          OmitThisParameter:
            'https://www.typescriptlang.org/docs/handbook/utility-types.html#omitthisparametertypetype',
        },
      },
      blockTags: [
        '@author',
        '@category',
        '@categoryDescription',
        '@showCategories',
        '@hideCategories',
        '@defaultValue',
        '@default',
        '@deprecated',
        '@document',
        '@example',
        '@expandType',
        '@group',
        '@groupDescription',
        '@showGroups',
        '@hideGroups',
        '@disableGroups',
        '@import',
        '@inlineType',
        '@license',
        '@mergeModuleWith',
        '@module',
        '@param',
        '@preventExpand',
        '@preventInline',
        '@privateRemarks',
        '@property',
        '@prop',
        '@remarks',
        '@returns',
        '@return',
        '@see',
        '@since',
        '@summary',
        '@template',
        '@throws',
        '@typeParam',
        '@type',
        '@yields',
        '@jsx',
        '@typedef',
        '@extends',
        '@augments',
        '@satisfies',
        '@callback',
        '@info',
        '@tip',
        '@warning',
        '@danger',
        '@details',
      ],
      alwaysCreateEntryPointModule: alwaysCreateEntryPointModule ?? false,
    },
    [
      new td.ArgumentsReader(0),
      new td.TypeDocReader(),
      new td.PackageJsonReader(),
      new td.TSConfigReader(),
      new td.ArgumentsReader(300),
    ]
  )
  if (postRenderAsyncJobCallback) {
    app.renderer.postRenderAsyncJobs.push(postRenderAsyncJobCallback)
  }
  const convertCustomTag = (tag: td.CommentTag) => {
    const containerType = tag.tag.replace('@', '').trim()
    tag.content.unshift({
      kind: 'text',
      text: `::: ${containerType}\n`,
    })
    tag.content.push({
      kind: 'text',
      text: `\n:::\n`,
    })
    // @ts-ignore
    tag.tag = ''
  }

  app.converter.on(td.Converter.EVENT_CREATE_DECLARATION, (_context, reflection) => {
    if (!reflection.comment) return
    for (const tag of reflection.comment.blockTags) {
      if (['@info', '@tip', '@warning', '@danger', '@details'].includes(tag.tag)) {
        convertCustomTag(tag)
      }
    }
  })
  app.converter.on(td.Converter.EVENT_CREATE_DOCUMENT, (_context, reflection) => {
    if (!reflection.comment) return
    for (const tag of reflection.comment.blockTags) {
      if (['@info', '@tip', '@warning', '@danger', '@details'].includes(tag.tag)) {
        convertCustomTag(tag)
      }
    }
  })
  app.converter.on(td.Converter.EVENT_CREATE_SIGNATURE, (_context, reflection) => {
    if (!reflection.comment) return
    for (const tag of reflection.comment.blockTags) {
      if (['@info', '@tip', '@warning', '@danger', '@details'].includes(tag.tag)) {
        convertCustomTag(tag)
      }
    }
  })
  app.converter.on(td.Converter.EVENT_CREATE_PARAMETER, (_context, reflection) => {
    if (!reflection.comment) return
    for (const tag of reflection.comment.blockTags) {
      if (['@info', '@tip', '@warning', '@danger', '@details'].includes(tag.tag)) {
        convertCustomTag(tag)
      }
    }
  })
  app.converter.on(td.Converter.EVENT_CREATE_TYPE_PARAMETER, (_context, reflection) => {
    if (!reflection.comment) return
    for (const tag of reflection.comment.blockTags) {
      if (['@info', '@tip', '@warning', '@danger', '@details'].includes(tag.tag)) {
        convertCustomTag(tag)
      }
    }
  })
  const project = await app.convert()
  return { app, project }
}
