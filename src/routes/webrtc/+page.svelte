<script lang="ts">
  import Header from "$lib/components/Header.svelte";
  import RoomWidget from "$lib/components/RoomWidget.svelte";
  import { onlineTransfer } from "$lib/online-transfer.svelte";

  const backLink = sessionStorage.getItem("home") || "";
</script>

<Header
  title="{onlineTransfer.localId ? 'Room' : 'Join Room'} - MeanScout"
  heading={onlineTransfer.localId ? "Room" : "Join Room"}
  {backLink}
  class="max-w-(--breakpoint-sm)"
/>

<div class="mx-auto mt-[69px] mb-3 flex w-full max-w-(--breakpoint-sm) grow flex-col gap-6 p-3">
  <RoomWidget />
</div>
