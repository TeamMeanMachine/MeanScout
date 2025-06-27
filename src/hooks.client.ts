import { idb } from "$lib/idb";
import type { ClientInit } from "@sveltejs/kit";

export const init: ClientInit = async () => {
  if (!localStorage.getItem("init") && !location.hash.includes("about")) {
    location.hash = `/settings`;
  } else if (localStorage.getItem("comp") && location.hash.replaceAll("/", "") == "") {
    location.hash = `/comp/${localStorage.getItem("comp")}`;
  } else if (localStorage.getItem("survey") && location.hash.replaceAll("/", "") == "") {
    location.hash = `/survey/${localStorage.getItem("survey")}`;
  }

  await new Promise<void>((resolve, reject) => {
    idb.init((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
};
