import { initIDB } from "$lib/idb";
import type { ClientInit } from "@sveltejs/kit";

export const init: ClientInit = async () => {
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
