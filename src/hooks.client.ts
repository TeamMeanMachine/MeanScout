import { idb } from "$lib/idb";
import type { ClientInit } from "@sveltejs/kit";

export const init: ClientInit = async () => {
  if (!localStorage.getItem("init") && !location.hash.includes("about")) {
    location.hash = `/settings`;
  } else if (localStorage.getItem("home") && location.hash.replaceAll("/", "") == "") {
    location.hash = `/${localStorage.getItem("home")}`;
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
