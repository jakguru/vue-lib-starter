---
layout: doc
aside: false
lastUpdated: false
footer: false
---

<script setup>
const headHTML = '<link rel=\"stylesheet\" href=\"/repl/@example/vue-lib/style.css\" />'
const importMap = {"@example/vue-lib":"/repl/@example/vue-lib/index.mjs","@example/vue-lib/components/example":"/repl/@example/vue-lib/components/example.mjs","@example/vue-lib/test":"/repl/@example/vue-lib/test.mjs"}
</script>

# Playground

-----

<ReadEvalPrintLoop :imports="importMap" :headHTML="headHTML" />
