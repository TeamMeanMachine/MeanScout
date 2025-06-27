<script lang="ts">
  import { goto } from "$app/navigation";
  import type { Comp } from "$lib/comp";
  import type { DialogExports } from "$lib/dialog";
  import { idb } from "$lib/idb";

  let name = $state("");
  let error = $state("");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      name = name.trim();
      if (!name) {
        error = "Name can't be blank!";
        return;
      }

      const comp: Comp = {
        name,
        matches: [],
        teams: [],
        created: new Date(),
        modified: new Date(),
      };

      const addRequest = idb.objectStore("comps", "readwrite").add(comp);
      addRequest.onerror = () => {
        error = `Could not add comp: ${addRequest.error?.message}`;
      };

      addRequest.onsuccess = () => {
        const id = addRequest.result;
        if (id == undefined) {
          error = "Could not add comp";
          return;
        }

        goto(`#/comp/${id}`);
      };
    },
  };
</script>

<span>New comp</span>

<label class="flex flex-col">
  Comp name
  <input bind:value={name} class="text-theme bg-neutral-800 p-2" />
</label>

{#if error}
  <span>{error}</span>
{/if}
