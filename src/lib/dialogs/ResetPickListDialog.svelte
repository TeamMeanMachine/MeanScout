<script lang="ts">
  import { closeDialog, type DialogExports } from "$lib/dialog";

  let {
    onreset,
  }: {
    onreset: () => void;
  } = $props();

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      onreset();
      closeDialog();
    },
  };
</script>

<div class="flex flex-col">
  <span>Reset edits to pick list?</span>
  <span class="text-sm font-light">Custom ranks will be cleared, and omitted teams will be un-omitted.</span>
</div>
