import * as child_process from "node:child_process";
import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

process.env.VITE_GIT_COMMIT_DATE = child_process.execSync("git log -1 --format=%cI").toString().trimEnd();
process.env.VITE_GIT_COMMIT_HASH = child_process.execSync("git rev-parse --short HEAD").toString().trimEnd();

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit({
      // Consult https://svelte.dev/docs/kit/integrations#preprocessors
      // for more information about preprocessors
      preprocess: vitePreprocess(),
      compilerOptions: { runes: true },
      adapter: adapter({ fallback: "index.html" }),
      output: { bundleStrategy: "single" },
      router: { type: "hash" },
      serviceWorker: { register: process.env.NODE_ENV !== "development" },
    }),
  ],
});
