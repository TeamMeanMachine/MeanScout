import { browser } from "$app/environment";

class AppUpdate {
  available = $state(false);

  constructor() {
    if (!(browser && "serviceWorker" in navigator)) return;

    navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting) {
        this.available = true;
      }

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;

        worker.addEventListener("statechange", () => {
          if (worker.state == "installed" && navigator.serviceWorker.controller) {
            this.available = true;
          }
        });
      });
    });
  }
}

export const appUpdate = new AppUpdate();
