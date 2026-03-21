<script lang="ts">
  import { SquareCheckBigIcon, SquareIcon } from "@lucide/svelte";
  import Button from "$lib/components/Button.svelte";
  import { type DialogExports } from "$lib/dialog";
  import { type Entry } from "$lib/entry";
  import { getDefaultFieldValue, type SingleFieldWithDetails } from "$lib/field";
  import { onlineTransfer } from "$lib/online-transfer.svelte";
  import { webRtcActiveStore, webRtcAutoSendStore } from "$lib/settings";

  let {
    orderedSingleFields,
    entryRecord,
    onsubmit,
  }: {
    orderedSingleFields: SingleFieldWithDetails[];
    entryRecord: Entry;
    onsubmit: (entry: Entry) => void;
  } = $props();

  const defaultValues = orderedSingleFields.map((field) => getDefaultFieldValue(field.field));

  let error = $state("");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      if (error) {
        return;
      }

      const submittedEntry: Entry = {
        ...$state.snapshot(entryRecord),
        status: onlineTransfer.clients.some((c) => c.channel?.readyState == "open") ? "exported" : "submitted",
        modified: new Date(),
      };

      if (submittedEntry.type == "match" && submittedEntry.absent) {
        submittedEntry.values = defaultValues;
      }
      onsubmit(submittedEntry);
    },
  };
</script>

<span>Complete this entry?</span>

{#if $webRtcActiveStore}
  <Button onclick={() => ($webRtcAutoSendStore = $webRtcAutoSendStore ? "" : "entries")}>
    {#if $webRtcAutoSendStore}
      <SquareCheckBigIcon class="text-theme" />
    {:else}
      <SquareIcon class="text-theme" />
    {/if}
    <div class={["flex flex-col", $webRtcAutoSendStore ? "font-bold" : "font-light"]}>
      Auto-send
      <span class="text-xs font-light">This entry will be sent to everyone in the room.</span>
    </div>
  </Button>
{/if}

{#if error}
  <span>{error}</span>
{/if}
