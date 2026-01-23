import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      x: path.resolve(__dirname, "../src/index.ts"),
    },
  },
  optimizeDeps: {
    exclude: ["x"],
  },
});
