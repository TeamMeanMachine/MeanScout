<script lang="ts">
  import { closeDialog, type DialogExports } from "$lib/dialog";
  import type { MatchSurvey } from "$lib/survey";

  let {
    surveyRecord,
    index,
    ondelete,
  }: {
    surveyRecord: IDBRecord<MatchSurvey>;
    index: number;
    ondelete: () => void;
  } = $props();

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      surveyRecord.pickLists = surveyRecord.pickLists.toSpliced(index, 1);
      surveyRecord.modified = new Date();
      ondelete();
      closeDialog();
    },
  };
</script>

<span>Delete pick list?</span>
