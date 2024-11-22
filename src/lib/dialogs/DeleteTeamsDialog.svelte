<script lang="ts">
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import type { Survey } from "$lib/survey";

  let {
    surveyRecord,
    teams,
  }: {
    surveyRecord: IDBRecord<Survey>;
    teams: string[];
  } = $props();

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      surveyRecord.teams = surveyRecord.teams.filter((team) => !teams.includes(team));
      surveyRecord.modified = new Date();
      closeDialog();
    },
  };
</script>

<span>Delete {teams.length} {teams.length == 1 ? "team" : "teams"}?</span>
