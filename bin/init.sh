#!/bin/bash
curl -sL https://raw.githubusercontent.com/jakguru/vue-lib-starter/refs/heads/main/bin/init.cjs -o /tmp/vue-lib-starter-initializer.cjs 
node /tmp/vue-lib-starter-initializer.cjs 
rm /tmp/vue-lib-starter-initializer.cjs
