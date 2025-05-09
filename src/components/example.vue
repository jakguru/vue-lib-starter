<template>
  <div class="example-component">
    <h1>Example Component</h1>
    <p>This is an example component.</p>
    <!-- @slot content of the component -->
    <slot />
  </div>
</template>

<script lang="ts">
/**
 * @module @example/vue-lib/components/example
 */
import { defineComponent } from "vue";

/**
 * ExampleComponent is a simple Vue component that displays a title and a paragraph.
 */
export default defineComponent({
  name: "ExampleComponent",
  props: {
    /**
     * A test for default function Object
     */
    propObjectDefault: {
      type: Object,
      default: () => ({}),
    },
    /**
     * A test for default function Array
     */
    propArrayDefault: {
      type: Array,
      default: () => [1, 2, 3],
    },
    /**
     * A test for default function more complex
     */
    propComplexDefault: {
      type: Array,
      default: () => {
        if (typeof window === "function") {
          return [];
        } else {
          return undefined;
        }
      },
    },
    /**
     * The color for the button.
     */
    color: {
      type: String,
      default: "#333",
    },
  },
  emits: {
    /**
     * Emitted when the button is clicked.
     */
    click: (event: MouseEvent) => {
      return typeof event !== "undefined";
    },
  },
  setup() {
    // Component logic goes here
  },
});
</script>

<style lang="scss">
.example-component {
  h1 {
    font-weight: bold;
  }
}
</style>
