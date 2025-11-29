<script lang="ts">
  import { closeDialog, type DialogExports } from "$lib/dialog";

  let {
    ondelete,
  }: {
    ondelete: () => void;
  } = $props();

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      ondelete();
      closeDialog();
    },
  };
</script>

<span>Delete expression?</span>
