<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Dialog from "$lib/components/Dialog.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { tbaAuthKeyStore } from "$lib/settings";
  import { tbaAuthKeyIsValid } from "$lib/tba";

  let dialog: ReturnType<typeof Dialog>;
  let tbaAuthKey = $state($tbaAuthKeyStore);
  let error = $state("");

  async function onconfirm() {
    tbaAuthKey = tbaAuthKey.trim();

    if (!tbaAuthKey) {
      $tbaAuthKeyStore = tbaAuthKey;
      dialog.close();
      return;
    }

    if (await tbaAuthKeyIsValid(tbaAuthKey)) {
      $tbaAuthKeyStore = tbaAuthKey;
      dialog.close();
    } else {
      error = `unauthorized!`;
    }
  }

  function onclose() {
    tbaAuthKey = $tbaAuthKeyStore;
    error = "";
  }
</script>

<Button onclick={() => dialog.open()}>
  <Icon name="key" />
  {#if $tbaAuthKeyStore}
    <div class="flex flex-col">
      ********
      <small>Edit API auth key</small>
    </div>
  {:else}
    Add API auth key
  {/if}
</Button>

<Dialog bind:this={dialog} {onconfirm} {onclose}>
  <span>
    {#if $tbaAuthKeyStore}
      Edit TBA API auth key
    {:else}
      Add TBA API auth key
    {/if}
  </span>
  <input bind:value={tbaAuthKey} class="bg-neutral-800 p-2 text-theme" />
  {#if error}
    <span>Error: {error}</span>
  {/if}
</Dialog>
