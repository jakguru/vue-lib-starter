/* eslint-disable @unicorn/prefer-module */

import { execa } from 'execa'
import { resolve, join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { watch } from 'node:fs'
import { makeApiDocs } from './utils/'
import type { ResultPromise } from 'execa'

const cwd = resolve(__dirname, '..')
const nodemon = require('nodemon')
const color = require('cli-color')

const packageJsonPath = resolve(cwd, 'package.json')
const docsSidebarJsonPath = join(cwd, 'docs', '.vitepress', 'sidebar.json')

const nodemonConfig = {
  watch: ['src/**/*', 'package.json', 'vite.config.mts', 'tsconfig.json'],
  ext: 'ts,json,env,scss,vue,md,yml,stub',
  ignore: ['node_modules'],
  exec: 'npx jiti bin/noop.ts',
  delay: '2500',
}

let subprocess: ResultPromise | undefined
const abortController: AbortController = new AbortController()

const cleanup = async () => {
  console.log(color.yellow('Cleaning up...'))
  abortController.abort()
  if (subprocess) {
    subprocess.kill('SIGINT')
    await subprocess
    subprocess = undefined
  }
}

process
  .on('unhandledRejection', (reason, p) => {
    console.error(reason, 'Unhandled Rejection at Promise', p)
  })
  .on('uncaughtException', (err) => {
    console.error(err.stack)
    cleanup().finally(() => process.exit(1))
  })
  .on('SIGINT', () => {
    cleanup().finally(() => process.exit(255))
  })
  .on('SIGTERM', () => {
    cleanup().finally(() => process.exit(255))
  })

nodemon(nodemonConfig)
let timeout: NodeJS.Timeout | undefined
let devDocsTimeout: NodeJS.Timeout | undefined

const startDevDocs = () => {
  subprocess = execa('npm', ['run', 'docs:dev'], {
    cwd,
    cancelSignal: abortController.signal,
    stdio: 'overlapped',
    reject: false,
  })
  subprocess.stdout?.pipe(process.stdout)
  subprocess.stderr?.pipe(process.stderr)
}

const restartDevDocs = async () => {
  if (subprocess) {
    console.log(color.yellow('Stopping DevDocs Process'))
    subprocess.kill('SIGINT')
    await subprocess
    subprocess = undefined
  }
  console.log(color.cyan('Starting new DevDocs Process'))
  startDevDocs()
}

readFile(packageJsonPath, 'utf-8')
  .then(async (packageJson) => {
    const parsedPackageJson = JSON.parse(packageJson)
    startDevDocs()
    nodemon
      .on('start', function () {
        console.log(color.green('Documentation Process has started'))
        makeApiDocs(cwd, parsedPackageJson.name)
      })
      .on('quit', function () {
        console.log(color.red('Documentation Process has quit'))
        process.exit()
      })
      .on('restart', function (files: string[]) {
        console.log('App restarted due to: ', files)
        clearTimeout(timeout)
        timeout = setTimeout(() => makeApiDocs(cwd, parsedPackageJson.name), 1000)
      })
    watch(docsSidebarJsonPath, { signal: abortController.signal }, () => {
      clearTimeout(devDocsTimeout)
      devDocsTimeout = setTimeout(restartDevDocs, 1000)
    })
  })
  .catch((err) => console.warn(color.red(err.message)))
