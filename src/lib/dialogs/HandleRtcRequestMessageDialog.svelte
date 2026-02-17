<script lang="ts">
  import { CircleCheckBigIcon, CircleIcon } from "@lucide/svelte";
  import Button from "$lib/components/Button.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import type { ClientInfo, RTCRequestMessage } from "$lib/online-transfer.svelte";

  let {
    message,
    client,
    onhandle,
  }: {
    message: RTCRequestMessage;
    client: ClientInfo;
    onhandle(action: "accept" | "ignore"): void;
  } = $props();

  let action = $state<"accept" | "ignore">("accept");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      onhandle(action);
      closeDialog();
    },
  };
</script>

<span>From: {client.name} {client.team ? `(${client.team})` : ""}</span>

<span>Requesting: {message.request}</span>

<div class="flex flex-wrap gap-2">
  <Button
    onclick={() => (action = "accept")}
    class={["grow basis-52", action == "accept" ? "font-bold" : "font-light"]}
  >
    {#if action == "accept"}
      <CircleCheckBigIcon class="text-theme" />
    {:else}
      <CircleIcon class="text-theme" />
    {/if}
    <div class="flex flex-col">
      Accept
      <span class="text-xs font-light">and send requested data</span>
    </div>
  </Button>
  <Button
    onclick={() => (action = "ignore")}
    class={["grow basis-52", action == "ignore" ? "font-bold" : "font-light"]}
  >
    {#if action == "ignore"}
      <CircleCheckBigIcon class="text-theme" />
    {:else}
      <CircleIcon class="text-theme" />
    {/if}
    <div class="flex flex-col">
      Ignore
      <span class="text-xs font-light">and dismiss</span>
    </div>
  </Button>
</div>
