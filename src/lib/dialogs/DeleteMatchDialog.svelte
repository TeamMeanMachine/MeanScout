<script lang="ts">
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import type { MatchSurvey } from "$lib/survey";

  let {
    surveyRecord,
    number,
    ondelete,
  }: {
    surveyRecord: IDBRecord<MatchSurvey>;
    number: number;
    ondelete?: (() => void) | undefined;
  } = $props();

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      surveyRecord.modified = new Date();
      surveyRecord.matches = surveyRecord.matches.filter((m) => m.number != number);
      ondelete?.();
      closeDialog();
    },
  };
</script>

<span>Delete match {number}?</span>
