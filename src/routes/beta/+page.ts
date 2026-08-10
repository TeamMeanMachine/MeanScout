import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  // Only needed while `/beta/` path is in use.
  sessionStorage.setItem("home", event.url.hash);
};
