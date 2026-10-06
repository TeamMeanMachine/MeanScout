import type { ClientInit } from "@sveltejs/kit/hooks";
import { idb } from "#lib/idb.js";
import { onlineTransfer } from "#lib/online-transfer.svelte.js";
import {
  scoutStore,
  teamStore,
  webRtcActiveStore,
  webRtcForceFallbackStore,
  webRtcRoomIdStore,
} from "#lib/settings.js";
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
