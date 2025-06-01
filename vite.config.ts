import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import * as child_process from "node:child_process";

process.env.VITE_GIT_COMMIT_DATE = child_process.execSync("git log -1 --format=%cI").toString().trimEnd();
process.env.VITE_GIT_COMMIT_HASH = child_process.execSync("git rev-parse --short HEAD").toString().trimEnd();

export default defineConfig({
  plugins: [
    sveltekit(),
    {
      name: "full-reload-always",
      handleHotUpdate({ server }) {
        server.ws.send({ type: "full-reload" });
        return [];
      },
    },
  ],
});
