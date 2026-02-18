<script lang="ts">
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import type { ClientInfo, RTCRequestMessage } from "$lib/online-transfer.svelte";

  let {
    message,
    client,
    onhandle,
  }: {
    message: RTCRequestMessage;
    client: ClientInfo;
    onhandle(): void;
  } = $props();

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      onhandle();
      closeDialog();
    },
  };
</script>

<span>
  {client.name}
  {#if client.team}
    <span class="text-xs font-light">({client.team})</span>
  {/if}
  requested data: {message.request}
</span>
<span>Send data?</span>
