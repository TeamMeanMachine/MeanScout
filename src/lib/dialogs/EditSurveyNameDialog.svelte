<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Dialog from "$lib/components/Dialog.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import type { Survey } from "$lib/survey";

  let {
    surveyRecord = $bindable(),
  }: {
    surveyRecord: IDBRecord<Survey>;
  } = $props();

  let dialog: ReturnType<typeof Dialog>;

  let name = $state(surveyRecord.name);
  let error = $state("");

  function onconfirm() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      error = "Name can't be blank!";
      return;
    }

    surveyRecord.name = trimmedName;
    dialog.close();
  }

  function onclose() {
    name = surveyRecord.name;
    error = "";
  }
</script>

<Button onclick={() => dialog.open()}>
  <Icon name="pen" />
  <div class="flex flex-col">
    {surveyRecord.name}
    <small>Edit name</small>
  </div>
</Button>

<Dialog bind:this={dialog} {onconfirm} {onclose}>
  <span>Edit name:</span>
  <input bind:value={name} class="bg-neutral-800 p-2 text-theme" />
  {#if error}
    <span>{error}</span>
  {/if}
</Dialog>
