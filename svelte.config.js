import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://svelte.dev/docs/kit/integrations#preprocessors
  // for more information about preprocessors
  preprocess: vitePreprocess(),
  compilerOptions: {
    runes: true,
  },
  // adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
  // If your environment is not supported, or you settled on a specific environment, switch out the adapter.
  // See https://svelte.dev/docs/kit/adapters for more information about adapters.
  kit: {
    adapter: adapter({
      fallback: "index.html",
    }),
    output: {
      bundleStrategy: "single",
    },
    router: {
      type: "hash",
    },
    serviceWorker: {
      register: process.env.NODE_ENV !== "development",
    },
  },
};

export default config;
