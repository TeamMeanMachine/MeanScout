import { browser } from "$app/environment";
import { writable } from "svelte/store";

function localStorageStore<T extends string>(
  key: string,
  defaultValue: T,
  subscriber?: ((val: T) => void) | undefined,
) {
  const value = browser ? (localStorage.getItem(key) as T) || defaultValue : defaultValue;
  const store = writable<T>(value);
  store.subscribe((val) => browser && localStorage.setItem(key, val));
  if (subscriber) store.subscribe(subscriber);
  return store;
}

// Target setting

export const matchTargets = ["red 1", "red 2", "red 3", "blue 1", "blue 2", "blue 3"] as const;
export type MatchTarget = (typeof matchTargets)[number];

export const targets = [...matchTargets, "pit"] as const;
export type Target = (typeof targets)[number];

export const targetStore = localStorageStore<Target>("target", "red 1", (target) => {
  if (!browser) return;

  if (!targets.includes(target)) {
    target = "red 1";
    localStorage.setItem("target", target);
  }

  switch (target) {
    case "red 1":
    case "red 2":
    case "red 3":
      var newTheme = "red";
      break;
    case "blue 1":
    case "blue 2":
    case "blue 3":
      var newTheme = "blue";
      break;
    case "pit":
      var newTheme = "orange";
      break;
    default:
      var newTheme = "red";
  }

  document.documentElement.dataset.theme = newTheme;
});

// Camera setting

export const cameraStore = localStorageStore<string>("camera", "");

// Team setting

export const teamStore = localStorageStore<string>("team", "");

// TBA API key setting

export const tbaAuthKeyStore = localStorageStore<string>("tbaAuthKey", "");
