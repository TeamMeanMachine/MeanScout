<script lang="ts">
  import { closeDialog, type DialogExports } from "$lib/dialog";

  let {
    teams,
    ondelete,
  }: {
    teams: string[];
    ondelete: (teams: string[]) => void;
  } = $props();

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      ondelete(teams);
      closeDialog();
    },
  };
</script>

<span>Delete {teams.length} {teams.length == 1 ? "team" : "teams"}?</span>
