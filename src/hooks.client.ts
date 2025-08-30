import { idb } from "$lib/idb";
import type { ClientInit } from "@sveltejs/kit";

export const init: ClientInit = async () => {
  if (!localStorage.getItem("init") && !location.hash.includes("about")) {
    location.hash = `/settings`;
  } else if (location.hash.replaceAll("/", "") == "") {
    let home = localStorage.getItem("home");

    if (home && !home.startsWith("#/")) {
      home = "#/" + home;
    }

    if (home) {
      location.hash = home;
    }
  }

  await idb.initAsync();
};
