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
  // See https://svelte.dev/docs/kit/adapters for more information about adapters.
  kit: {
    adapter: adapter({
      fallback: "index.html",
    }),
    csrf: {
      checkOrigin: false,
    },
  },
};

export default config;
