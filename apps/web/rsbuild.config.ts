import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: {
      index: "./src/main.tsx",
    },
  },
  html: {
    title: "TailStreamer",
  },
  output: {
    cleanDistPath: true,
    distPath: {
      root: "../../dist/web",
    },
  },
});
