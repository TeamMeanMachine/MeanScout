<script lang="ts">
  import { CircleCheckBigIcon, CircleIcon } from "@lucide/svelte";
  import { sessionStorageStore } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import type { ClientInfo, RTCMessage } from "$lib/online-transfer.svelte";

  let {
    message,
    client,
    onhandle,
  }: {
    message: RTCMessage;
    client: ClientInfo;
    onhandle(action: "accept" | "ignore"): void;
  } = $props();

  let action = sessionStorageStore<"accept" | "ignore">("handle-rtc-message-action", "accept");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      onhandle($action);
      closeDialog();
    },
  };
</script>

<span>From: {client.name} {client.team ? `(${client.team})` : ""}</span>

{#if message.type == "request"}
  <span>Requesting: {message.request}</span>
{:else}
  {#if message.comps?.length}
    <span>Comps: {message.comps?.length}</span>
  {/if}

  {#if message.surveys?.length}
    <span>Surveys: {message.surveys?.length}</span>
  {/if}

  {#if message.fields?.length}
    <span>Fields: {message.fields?.length}</span>
  {/if}

  {#if message.entries?.length}
    <span>Entries: {message.entries?.length}</span>
  {/if}
{/if}

<div class="flex flex-wrap gap-2">
  <Button
    onclick={() => ($action = "accept")}
    class={["grow basis-52", $action == "accept" ? "font-bold" : "font-light"]}
  >
    {#if $action == "accept"}
      <CircleCheckBigIcon class="text-theme" />
    {:else}
      <CircleIcon class="text-theme" />
    {/if}
    Accept
  </Button>
  <Button
    onclick={() => ($action = "ignore")}
    class={["grow basis-52", $action == "ignore" ? "font-bold" : "font-light"]}
  >
    {#if $action == "ignore"}
      <CircleCheckBigIcon class="text-theme" />
    {:else}
      <CircleIcon class="text-theme" />
    {/if}
    Ignore
  </Button>
</div>
