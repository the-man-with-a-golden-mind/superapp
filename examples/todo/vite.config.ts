import { defineConfig } from "vite";
import path from "path";

const root = path.resolve(__dirname, "../..");

export default defineConfig({
  resolve: {
    alias: {
      "superapp/fx": path.resolve(root, "src/fx.ts"),
      "superapp/subs": path.resolve(root, "src/subs.ts"),
      "superapp/debugger": path.resolve(root, "src/debugger.ts"),
      "superapp/router": path.resolve(root, "src/router.ts"),
      "superapp/jsx-runtime": path.resolve(root, "src/jsx-runtime.ts"),
      "superapp": path.resolve(root, "src/hyperapp.ts"),
    },
  },
});
