# Jak Guru's Vue + Typescript Library Starter

A starter template which can be used as a quick and easy starter for getting a project up and running.

## Usage

From your command line, run:

```bash
curl -sL https://raw.githubusercontent.com/jakguru/vue-lib-starter/refs/heads/main/bin/init.cjs -o /tmp/vue-lib-starter-initializer.cjs && \
node /tmp/vue-lib-starter-initializer.cjs && \
rm /tmp/vue-lib-starter-initializer.cjs
```

Provide the script with the answers and let it create the folder and initialise the dependancies for you

## Customization

You can search and replace all instances of `@example/vue-lib` within the project, but the main files which should be customized are:

* `./package.json`
* `./vite.config.mts`
