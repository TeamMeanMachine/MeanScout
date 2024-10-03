<script lang="ts">
  import type { TeamInfo } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import Dialog from "$lib/components/Dialog.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { modeStore } from "$lib/settings";
  import type { Survey } from "$lib/survey";

  let {
    surveyRecord = $bindable(),
  }: {
    surveyRecord: IDBRecord<Survey>;
  } = $props();

  let dialog: Dialog;
  let teamInfo = $state<TeamInfo>({ team: "", entryCount: 0, matchCount: 0, isCustom: false });

  export function open(info: TeamInfo) {
    teamInfo = info;
    dialog.open();
  }

  function removeTeam() {
    surveyRecord.teams = surveyRecord.teams.filter((team) => teamInfo.team != team);
    dialog.close();
  }

  function onclose() {
    teamInfo = { team: "", entryCount: 0, matchCount: 0, isCustom: false };
  }
</script>

<Dialog bind:this={dialog} {onclose}>
  <span>Team {teamInfo.team}</span>
  {#if $modeStore == "admin" && teamInfo.isCustom}
    <Button onclick={removeTeam}>
      <Icon name="trash" />
      Delete
    </Button>
  {/if}
</Dialog>
