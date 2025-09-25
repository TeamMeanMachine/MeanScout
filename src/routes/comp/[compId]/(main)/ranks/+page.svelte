<script lang="ts">
  import type { PageProps } from "./$types";
  import Anchor from "$lib/components/Anchor.svelte";

  let { data }: PageProps = $props();
</script>

<div class="flex flex-col gap-6">
  {#if !data.showRanking}
    <div class="flex flex-col gap-3">
      <h2 class="font-bold">Ranks</h2>
      <span class="text-sm">No rankings available.</span>
    </div>
  {:else}
    <div class="flex flex-col gap-3">
      <h2 class="font-bold">Ranks</h2>
    </div>

    {#each data.groupedRanks as group}
      <div class="flex flex-col gap-2">
        <div class="flex flex-col">
          <h2 class="text-sm">{group.survey.name}</h2>
          <span class="text-xs font-light">{group.category}</span>
        </div>

        <div class="flex flex-wrap gap-2 text-sm">
          {#each group.pickLists || [] as pickList}
            <Anchor
              route="comp/{data.compRecord.id}/rank?surveyId={encodeURIComponent(
                group.survey.id,
              )}&picklist={encodeURIComponent(pickList.name)}"
            >
              {pickList.name}
            </Anchor>
          {/each}
          {#each group.expressions || [] as expression}
            <Anchor
              route="comp/{data.compRecord.id}/rank?surveyId={encodeURIComponent(
                group.survey.id,
              )}&expression={encodeURIComponent(expression.name)}"
            >
              {expression.name}
            </Anchor>
          {/each}
        </div>
      </div>
    {/each}
  {/if}
</div>
