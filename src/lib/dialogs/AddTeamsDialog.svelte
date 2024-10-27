<script lang="ts">
  import type { TeamInfo } from "$lib";
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import type { Survey } from "$lib/survey";

  let {
    surveyRecord,
    allTeams,
  }: {
    surveyRecord: IDBRecord<Survey>;
    allTeams: TeamInfo[];
  } = $props();

  let teamInput = $state("");
  let error = $state("");

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      teamInput = teamInput.trim();
      if (!teamInput.length) {
        error = "No input";
        return;
      }

      let teamInputs = [teamInput];

      if (teamInput.includes(",")) {
        teamInputs = teamInput.split(",").map((team) => team.trim());
      }

      for (const team of teamInputs) {
        if (allTeams.some((teamData) => teamData.team == team)) {
          error = `Team ${team} already exists`;
          return;
        }
      }

      surveyRecord.teams = [...surveyRecord.teams, ...teamInputs];
      surveyRecord.modified = new Date();
      closeDialog();
    },
  };
</script>

<label class="flex flex-col">
  Add team(s)
  <input bind:value={teamInput} class="bg-neutral-800 p-2 text-theme" />
  <small class="pt-1">Separate multiple teams with commas</small>
</label>

{#if error}
  <span>{error}</span>
{/if}
