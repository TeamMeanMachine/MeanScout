<script lang="ts">
  import Dialog from "$lib/components/Dialog.svelte";
  import type { MatchSurvey } from "$lib/survey";

  let {
    surveyRecord = $bindable(),
    ondelete,
  }: {
    surveyRecord: IDBRecord<MatchSurvey>;
    ondelete?: (() => void) | undefined;
  } = $props();

  let dialog: ReturnType<typeof Dialog>;

  let matchNumber = $state<number | undefined>();

  export function open(number: number) {
    matchNumber = number;
    dialog.open();
  }

  function onconfirm() {
    if (matchNumber != undefined) {
      surveyRecord.modified = new Date();
      surveyRecord.matches = surveyRecord.matches.filter((m) => m.number != matchNumber);
    }
    dialog.close();
    ondelete?.();
  }

  function onclose() {
    matchNumber = undefined;
  }
</script>

<Dialog bind:this={dialog} {onconfirm} {onclose}>
  <span>Delete match {matchNumber}?</span>
</Dialog>
