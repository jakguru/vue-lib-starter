import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'path'
import { readFile } from 'fs/promises'
import { getEntries } from './bin/utils'
import type { UserConfig } from 'vite'

const LIB_NAME = '@example/lib'
const BASE_DIR = resolve(__dirname)
const SRC_DIR = resolve(BASE_DIR, 'src')
const externals = new Set<string>([
  'node:util',
  'node:path',
  'node:url',
  'node:fs',
  'node:fs/promises',
])
const nonExternal = new Set<string>([])

export default defineConfig(async ({ mode }) => {
  // Load app-level env vars to node-level env vars.
  process.env = {
    ...process.env,
    ...loadEnv(mode, process.cwd(), ['VITE_', 'CI', 'CI_', 'GITLAB_']),
  }

  const entries = await getEntries(SRC_DIR, LIB_NAME)
  const rawPackageJson = await readFile(resolve(BASE_DIR, 'package.json'), 'utf-8')
  const packageJson = JSON.parse(rawPackageJson.toString())
  if (packageJson.dependencies) {
    Object.keys(packageJson.dependencies).forEach((dep) => {
      externals.add(dep)
    })
  }
  if (packageJson.nonExternal) {
    packageJson.nonExternal.forEach((mod: string) => {
      nonExternal.add(mod)
    })
  }
  const external = Array.from(externals).filter((ext) => !nonExternal.has(ext))
  return {
    plugins: [],
    build: {
      sourcemap: true,
      minify: true,
      lib: {
        entry: {
          ...entries,
        },
        name: LIB_NAME,
        formats: ['es', 'cjs'],
        fileName: (format: string, entry: string) => {
          switch (format) {
            case 'es':
              return `${entry}.mjs`
            case 'cjs':
              return `${entry}.cjs`
            default:
              return `${entry}.${format}.js`
          }
        },
      },
      rollupOptions: {
        external,
        output: {
          exports: 'named',
        },
        treeshake: 'safest',
      },
      emptyOutDir: false,
    },
    resolve: {
      alias: {
        [LIB_NAME]: resolve(BASE_DIR, 'src'),
        '@': resolve(BASE_DIR, 'src'),
      },
      mainFields: ['module', 'jsnext:main', 'jsnext'],
    },
    define: {
      __VERSION__: JSON.stringify(packageJson.version),
    },
    test: {
      dangerouslyIgnoreUnhandledErrors: true,
      reporters: process.env.CI ? ['default', 'junit'] : ['default'],
      outputFile: {
        junit: resolve(BASE_DIR, 'junit.xml'),
      },
      typecheck: {
        enabled: true,
      },
      testTimeout: 60_000,
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/cypress/**',
        '**/.{idea,git,cache,output,temp}/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
        '**/.gitlab-ci-local/**',
      ],
    },
  } as UserConfig
})
