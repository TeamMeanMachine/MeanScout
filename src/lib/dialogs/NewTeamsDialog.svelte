<script lang="ts">
  import type { Team } from "$lib";
  import { closeDialog, type DialogExports } from "$lib/dialog";

  let {
    teams,
    onadd,
  }: {
    teams: Team[];
    onadd: (teams: string[]) => void;
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

      teamInputs = [...new Set(teamInputs)];

      for (const team of teamInputs) {
        if (teams.some((teamData) => teamData.number == team)) {
          error = `Team ${team} already exists`;
          return;
        }

        const teamHasInvalidFormat = !/^\d{1,5}[A-Z]?$/.test(team);
        if (teamHasInvalidFormat) {
          error = `Invalid value for team ${team}`;
          return;
        }
      }

      onadd(teamInputs);
      closeDialog();
    },
  };
</script>

<label class="flex flex-col">
  New team number(s)
  <input bind:value={teamInput} class="bg-neutral-800 p-2 text-theme" />
  <span class="pt-1 text-xs font-light">Separate multiple teams with commas</span>
</label>

{#if error}
  <span>{error}</span>
{/if}
