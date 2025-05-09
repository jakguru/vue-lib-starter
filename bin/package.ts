/* eslint-disable @unicorn/prefer-module */
import { readFile, writeFile, copyFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { getEntries } from './utils'

const BASE_DIR = resolve(__dirname, '..')
const SRC_DIR = resolve(BASE_DIR, 'src')
const packageJsonPath = resolve(BASE_DIR, 'package.json')
const destPackageJsonPath = resolve(BASE_DIR, 'dist/package.json')

const srcReadmePath = resolve(BASE_DIR, 'README.md')
const destReadmePath = resolve(BASE_DIR, 'dist/README.md')
const srcLicensePath = resolve(BASE_DIR, 'LICENSE.md')
const destLicensePath = resolve(BASE_DIR, 'dist/LICENSE.md')

const doCopyFile = async (src: string, dest: string) => {
  if (!existsSync(src)) return
  return await copyFile(src, dest)
}

readFile(packageJsonPath, 'utf-8').then(async (packageJson) => {
  const parsedPackageJson = JSON.parse(packageJson)
  parsedPackageJson.type = 'module'
  if (!parsedPackageJson.dependencies) {
    parsedPackageJson.dependencies = {}
  }
  if (parsedPackageJson.nonExternal) {
    parsedPackageJson.nonExternal.forEach((mod: string) => {
      delete parsedPackageJson.dependencies[mod]
    })
  }
  delete parsedPackageJson.devDependencies
  delete parsedPackageJson.scripts
  const entries = await getEntries(SRC_DIR, parsedPackageJson.name)
  if (!('index' in entries)) {
    throw new Error('You cannot package a library without an index entry')
  }
  const exportKeys = Object.keys(entries)
  parsedPackageJson.module = './index.mjs'
  parsedPackageJson.main = './index.cjs'
  const exports: Record<string, { import: string; types: string }> = {
    '.': {
      import: './index.mjs',
      types: './index.d.ts',
    },
  }
  exportKeys.forEach((key) => {
    if (key === 'index') return
    const exportKey = `./${key}`
    exports[exportKey] = {
      import: `./${key}.mjs`,
      types: `./${key}.d.ts`,
    }
  })
  parsedPackageJson.exports = exports
  delete parsedPackageJson.files
  delete parsedPackageJson.resolutions
  delete parsedPackageJson.nonExternal
  await Promise.all([
    writeFile(destPackageJsonPath, JSON.stringify(parsedPackageJson, null, 2)),
    doCopyFile(srcReadmePath, destReadmePath),
    doCopyFile(srcLicensePath, destLicensePath),
  ])
})
