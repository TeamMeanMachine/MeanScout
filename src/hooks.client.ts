import type { ClientInit } from "@sveltejs/kit";
import { idb } from "$lib/idb";
import { onlineTransfer } from "$lib/online-transfer.svelte";
import { scoutStore, teamStore, webRtcActiveStore, webRtcForceFallbackStore, webRtcRoomIdStore } from "$lib/settings";
import { get } from "svelte/store";

export const init: ClientInit = async () => {
  const webRtcActive = get(webRtcActiveStore);
  const room = get(webRtcRoomIdStore);
  const name = get(scoutStore);
  const team = get(teamStore);
  if (webRtcActive && room && name) {
    onlineTransfer.joinRoom({ room, name, team, forceFallback: get(webRtcForceFallbackStore) == "true" });
  }

  await idb.initAsync();
};
