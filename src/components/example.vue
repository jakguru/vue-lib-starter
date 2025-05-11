<template>
  <div class="example-component">
    <h1>Example Component</h1>
    <p>This is an example component.</p>
    <!--
      @slot content of the component
      @binding { string } foo just something to bind
      -->
    <slot v-bind="{ foo }" />
  </div>
</template>

<script lang="ts">
/**
 * @module @example/vue-lib/components/example
 */
import { defineComponent } from "vue";
import { version } from "../";

/**
 * ExampleComponent is a simple Vue component that displays a title and a paragraph.
 * @example
 *
 * ```vue
 * <ExampleComponent />
 * ```
 *
 * ::: details Result
 *
 * <ExampleComponent />
 *
 * :::
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
        if (typeof version === "string") {
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
     * @type { (event: MouseEvent) => void }
     * @property {MouseEvent} event - The click event.
     */
    click: (event: MouseEvent) => {
      return typeof event !== "undefined";
    },
    /**
     * Emitted when the button is right-clicked.
     * @type { (event: MouseEvent) => void }
     * @property {MouseEvent} event - The right-click event.
     */
    contextmenu: (event: MouseEvent) => {
      return typeof event !== "undefined";
    },
  },
  expose: [
    /**
     * Just a simple sliver
     * @public
     */
    "foo",
  ],
  setup(_props, { expose }) {
    expose({
      /**
       * Just a simple sliver
       * @public
       */
      foo: "bar",
    });
    return {
      foo: "bar",
      version,
    };
  },
  methods: {
    /**
     * Just a simple sliver
     * @public
     */
    baz() {
      return "bar";
    },
  },
});
</script>

<style lang="scss">
.example-component {
  h1 {
    font-weight: bold;
    color: #17335b;
  }
}
</style>
