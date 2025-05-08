/* eslint-disable @unicorn/prefer-module */
import { execa } from 'execa'
import { resolve } from 'node:path'
import { readFile } from 'node:fs/promises'
import { makeApiDocs } from './utils'

const cwd = resolve(__dirname, '..')
const color = require('cli-color')
const packageJsonPath = resolve(cwd, 'package.json')
console.log(color.yellow('Starting Documentation Process...'))
readFile(packageJsonPath, 'utf-8')
  .then(async (packageJson) => {
    const parsedPackageJson = JSON.parse(packageJson)
    await makeApiDocs(cwd, parsedPackageJson.name)
    await execa('npm', ['run', 'docs:build'], {
      cwd,
      stdio: 'inherit',
      reject: false,
    })
    console.log(color.green('Documentation Process has finished'))
  })
  .catch((err) => console.warn(color.red(err.message)))
