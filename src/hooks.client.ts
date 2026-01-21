import type { ClientInit } from "@sveltejs/kit";
import { idb } from "$lib/idb";
import { onlineTransfer } from "$lib/online-transfer.svelte";
import { scoutStore, teamStore, webRtcActiveStore, webRtcRoomIdStore } from "$lib/settings";
import { get } from "svelte/store";

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

  const webRtcActive = get(webRtcActiveStore);
  const room = get(webRtcRoomIdStore);
  const name = get(scoutStore);
  const team = get(teamStore);
  if (webRtcActive && room && name) {
    onlineTransfer.joinRoom({ room, name, team });
  }

  await idb.initAsync();
};
