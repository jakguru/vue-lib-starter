/* eslint-disable @unicorn/prefer-module */
import { execa } from 'execa'
import { resolve, join } from 'node:path'
import { readFile, cp, mkdir } from 'node:fs/promises'
import { makeApiDocs, makePlaygroundMd } from './utils'

const cwd = resolve(__dirname, '..')
const color = require('cli-color')
const packageJsonPath = resolve(cwd, 'package.json')
console.log(color.yellow('Starting Documentation Process...'))
readFile(packageJsonPath, 'utf-8')
  .then(async (packageJson) => {
    const parsedPackageJson = JSON.parse(packageJson)
    const replDir = join(cwd, 'docs', 'public', 'repl', parsedPackageJson.name)
    await Promise.all([
      await makeApiDocs(cwd, parsedPackageJson.name),
      execa('npm', ['run', 'generate:repl'], {
        cwd,
        stdio: 'inherit',
        reject: false,
      }),
    ])
    await mkdir(replDir, { recursive: true })
    await cp(join(cwd, 'dist'), replDir, {
      recursive: true,
    })
    await makePlaygroundMd(cwd, parsedPackageJson.name)
    await execa('npm', ['run', 'docs:build'], {
      cwd,
      stdio: 'inherit',
      reject: false,
    })
    console.log(color.green('Documentation Process has finished'))
  })
  .catch((err) => console.warn(color.red(err.stack)))
