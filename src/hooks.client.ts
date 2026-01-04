import type { ClientInit } from "@sveltejs/kit";
import { idb } from "$lib/idb";

export const init: ClientInit = async () => {
  if (!localStorage.getItem("init") && !location.hash.includes("about")) {
    location.hash = `/settings`;
  } else if (location.hash.replaceAll("/", "") == "") {
    let home = sessionStorage.getItem("home");

    if (home && !home.startsWith("#/")) {
      home = "#/" + home;
    }

    if (home) {
      location.hash = home;
    }
  }

  await idb.initAsync();
};
