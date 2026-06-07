import { defineConfig } from "vite";

// Builds the widget as a single self-contained IIFE bundle (dist/a11y.js).
// No code-splitting, no externals — everything inlined so the host site needs
// exactly one <script>. Keep an eye on the <40kb gzipped budget.
export default defineConfig({
  build: {
    target: "es2018",
    cssCodeSplit: false,
    lib: {
      entry: "src/index.ts",
      name: "A11yWidget",
      formats: ["iife"],
      fileName: () => "a11y.js",
    },
    rollupOptions: {
      output: {
        // No external deps — the bundle is self-contained.
        inlineDynamicImports: true,
      },
    },
    minify: "esbuild",
    reportCompressedSize: true,
  },
});
