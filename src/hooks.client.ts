import { initIDB } from "$lib/idb";
import type { ClientInit } from "@sveltejs/kit";

export const init: ClientInit = async () => {
  if (localStorage.length == 0) {
    location.hash = `/settings`;
  }

  if (localStorage.getItem("survey") && location.hash.replaceAll("/", "") == "") {
    location.hash = `/survey/${localStorage.getItem("survey")}`;
  }

  await new Promise<void>((resolve, reject) => {
    initIDB((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
};
