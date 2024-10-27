<script lang="ts">
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import { tbaAuthKeyStore } from "$lib/settings";
  import { tbaAuthKeyIsValid } from "$lib/tba";

  let tbaAuthKey = $state($tbaAuthKeyStore);
  let error = $state("");

  export const { onconfirm }: DialogExports = {
    async onconfirm() {
      tbaAuthKey = tbaAuthKey.trim();

      if (!tbaAuthKey) {
        $tbaAuthKeyStore = tbaAuthKey;
        return;
      }

      if (!(await tbaAuthKeyIsValid(tbaAuthKey))) {
        error = "unauthorized!";
        return;
      }

      $tbaAuthKeyStore = tbaAuthKey;
      closeDialog();
    },
  };
</script>

<span>{$tbaAuthKeyStore ? "Edit" : "Add"} TBA API auth key</span>

<input bind:value={tbaAuthKey} class="bg-neutral-800 p-2 text-theme" />

{#if error}
  <span>Error: {error}</span>
{/if}
