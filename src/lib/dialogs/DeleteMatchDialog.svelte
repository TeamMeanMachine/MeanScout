<script lang="ts">
  import { closeDialog, type DialogExports } from "$lib/dialog";

  let {
    number,
    ondelete,
  }: {
    number: number;
    ondelete: () => void;
  } = $props();

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      ondelete();
      closeDialog();
    },
  };
</script>

<span>Delete match {number}?</span>
