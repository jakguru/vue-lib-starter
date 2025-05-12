/* eslint-disable @unicorn/prefer-module */

import { Logger } from '@nhtio/logger'
import { execa } from 'execa'
import { resolve, join, relative } from 'node:path'
import { readFile, cp, mkdir } from 'node:fs/promises'
import { watch } from 'node:fs'
import { makeApiDocs, makePlaygroundMd } from './utils/'
import type { ResultPromise } from 'execa'
import type { FSWatcher } from 'node:fs'

const args = process.argv.slice(2)

interface ChangedRecord {
  relative: string
  absolute: string
}

const logger = new Logger('debug', { process: 'dev:docs' })
const cwd = resolve(__dirname, '..')
const color = require('cli-color')
const controller: AbortController = new AbortController()

const packageJsonPath = resolve(cwd, 'package.json')
const viteConfigPath = resolve(cwd, 'vite.config.mts')
const tsConfigPath = resolve(cwd, 'tsconfig.json')
const docsSidebarJsonPath = join(cwd, 'docs', '.vitepress', 'sidebar.json')

const matchers = [
  (v: string) => v === 'vite.config.mts',
  (v: string) => v === 'tsconfig.json',
  (v: string) => v === 'package.json',
  (v: string) => v.match(/\.(ts|json|scss|vue|md|yml|stub)$/),
]

const isMatch = (v: string) => matchers.some((matcher) => matcher(v))

const changed: Map<string, ChangedRecord> = new Map()
let processChangeTimeout: NodeJS.Timeout | undefined
let processChangeAbort: AbortController | undefined
let subprocess: ResultPromise | undefined
let docsSidebarWatcher: FSWatcher | undefined

const readPackageJson = async () => {
  const rawPackageJson = await readFile(packageJsonPath, 'utf-8')
  try {
    const packageJson = JSON.parse(rawPackageJson.toString())
    return packageJson
  } catch {
    throw new Error('Unable to parse package.json')
  }
}

const startDevDocs = () => {
  if (subprocess) {
    return
  }
  subprocess = execa('npm', ['run', 'docs:dev', ...args], {
    cwd,
    cancelSignal: controller.signal,
    stdio: 'overlapped',
    reject: false,
  })
  subprocess.stdout?.pipe(process.stdout)
  subprocess.stderr?.pipe(process.stderr)
  if (!docsSidebarWatcher) {
    docsSidebarWatcher = watch(
      docsSidebarJsonPath,
      {
        persistent: true,
        recursive: false,
        encoding: 'utf8',
        signal: controller.signal,
      },
      restartDevDocs
    )
  }
}

const restartDevDocs = async () => {
  if (subprocess) {
    logger.info(color.yellow('Stopping VitePress Process'))
    subprocess.kill('SIGINT')
    await subprocess
    subprocess = undefined
    await new Promise((doAwait) => setTimeout(doAwait, 1000, void 0))
  }
  logger.info(color.cyan('Starting new VitePress Process'))
  startDevDocs()
}

const processChanges = async (starting: boolean = false) => {
  if (changed.size === 0 && !starting) return
  if (processChangeAbort) {
    processChangeAbort.abort()
  }
  processChangeAbort = new AbortController()
  try {
    const parsedPackageJson = await readPackageJson()
    const replDir = join(cwd, 'docs', 'public', 'repl', parsedPackageJson.name)
    logger.debug('Compiling Update...')
    await Promise.all([
      makeApiDocs(cwd, parsedPackageJson.name),
      execa('npm', ['run', 'generate:repl'], {
        cwd,
        cancelSignal: processChangeAbort.signal,
        stdio: 'inherit',
        reject: false,
      }),
    ])
    logger.debug('Update Compiled')
    logger.debug('Copying Files...')
    await mkdir(replDir, { recursive: true })
    await cp(join(cwd, 'dist'), replDir, {
      recursive: true,
    })
    await makePlaygroundMd(cwd, parsedPackageJson.name)
    restartDevDocs()
  } catch (error) {
    if (error instanceof Error) {
      logger.crit(`${color.red('An unexpected error occured:')} ${String(error.stack)}`)
    } else {
      logger.crit(`${color.red('An unexpected error occured:')} ${String(error)}`)
    }
    controller.abort()
    logger.crit(color.yellow('Stopping process...'))
  } finally {
    changed.clear()
  }
}

const onChangeDetected = (pwd: string, _eventType: string, filename: string | Buffer | null) => {
  if ('string' !== typeof filename) return
  const abs = join(pwd, filename)
  const rel = relative(cwd, abs)
  const match = isMatch(rel)
  if (!match) return
  changed.set(rel, { relative: rel, absolute: abs })
  if (processChangeTimeout) {
    clearTimeout(processChangeTimeout)
  }
  if (processChangeAbort) {
    processChangeAbort.abort()
    processChangeAbort = undefined
    logger.debug(`New Changes Detected. Stopping current update...`)
  }
  processChangeTimeout = setTimeout(() => processChanges(), 1000)
}

watch(
  join(cwd, 'src'),
  {
    persistent: true,
    recursive: true,
    encoding: 'utf8',
    signal: controller.signal,
  },
  onChangeDetected.bind(null, join(cwd, 'src'))
)

watch(
  packageJsonPath,
  {
    persistent: true,
    recursive: false,
    encoding: 'utf8',
    signal: controller.signal,
  },
  onChangeDetected.bind(null, cwd)
)

watch(
  viteConfigPath,
  {
    persistent: true,
    recursive: false,
    encoding: 'utf8',
    signal: controller.signal,
  },
  onChangeDetected.bind(null, cwd)
)

watch(
  tsConfigPath,
  {
    persistent: true,
    recursive: false,
    encoding: 'utf8',
    signal: controller.signal,
  },
  onChangeDetected.bind(null, cwd)
)

logger.info(color.green('Library Dev & Docs Process has Started'))
logger.info(color.yellow('Press Ctrl+C to exit'))

processChanges(true)
