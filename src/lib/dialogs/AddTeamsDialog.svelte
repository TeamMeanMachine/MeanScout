<script lang="ts">
  import type { TeamInfo } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Dialog from "$lib/components/Dialog.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import type { Survey } from "$lib/survey";

  let {
    surveyRecord = $bindable(),
    allTeams,
  }: {
    surveyRecord: IDBRecord<Survey>;
    allTeams: TeamInfo[];
  } = $props();

  let dialog: ReturnType<typeof Dialog>;

  let teamInput = $state("");
  let error = $state("");

  function onconfirm() {
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
    dialog.close();
  }

  function onclose() {
    teamInput = "";
    error = "";
  }
</script>

<Button onclick={() => dialog.open()}>
  <Icon name="plus" />
  Add custom team(s)
</Button>

<Dialog bind:this={dialog} {onconfirm} {onclose}>
  <label class="flex flex-col">
    Add team(s)
    <input bind:value={teamInput} class="bg-neutral-800 p-2 text-theme" />
    <small class="pt-1">Separate multiple teams with commas</small>
  </label>

  {#if error}
    <span>{error}</span>
  {/if}
</Dialog>
