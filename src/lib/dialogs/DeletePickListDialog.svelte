<script lang="ts">
  import Dialog from "$lib/components/Dialog.svelte";
  import type { MatchSurvey } from "$lib/survey";

  let {
    surveyRecord = $bindable(),
    ondelete,
  }: {
    surveyRecord: IDBRecord<MatchSurvey>;
    ondelete: () => void;
  } = $props();

  let dialog: Dialog;

  let pickListIndex: number | undefined = undefined;

  export function open(index: number) {
    pickListIndex = index;
    dialog.open();
  }

  function onconfirm() {
    if (pickListIndex !== undefined) {
      surveyRecord.pickLists = surveyRecord.pickLists.toSpliced(pickListIndex, 1);
      surveyRecord.modified = new Date();
    }
    dialog.close();
    ondelete();
  }

  function onclose() {
    pickListIndex = undefined;
  }
</script>

<Dialog bind:this={dialog} {onconfirm} {onclose}>
  <span>Delete pick list?</span>
</Dialog>
