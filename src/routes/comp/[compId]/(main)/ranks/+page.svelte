<script lang="ts">
  import type { PageProps } from "./$types";
  import Anchor from "$lib/components/Anchor.svelte";
  import { goto } from "$app/navigation";

  let { data }: PageProps = $props();

  const debounceTimeMillis = 500;
  let debounceTimer: number | undefined = undefined;

  let debouncedSearch = $state(sessionStorage.getItem("rank-search") || "");

  let filteredGroupedRanks = $derived.by(() => {
    data.groupedRanks;
    return filterGroupedRanks(debouncedSearch);
  });

  function filterGroupedRanks(search: string) {
    return structuredClone(data.groupedRanks)
      .map((group) => {
        if (!search) return group;

        if (group.pickLists?.length) {
          group.pickLists = group.pickLists.filter((pl) => pl.name.toLowerCase().replaceAll(" ", "").includes(search));
          if (group.pickLists.length) return group;
        }

        if (group.expressions?.length) {
          group.expressions = group.expressions.filter((e) =>
            e.name.toLowerCase().replaceAll(" ", "").includes(search),
          );
          if (group.expressions.length) return group;
        }

        if (group.fields?.length) {
          group.fields = group.fields.filter((f) => f.detailedName.toLowerCase().replaceAll(" ", "").includes(search));
          if (group.fields.length) return group;
        }
      })
      .filter((group) => group !== undefined);
  }

  function onsearchinput(value: string) {
    window.clearTimeout(debounceTimer);

    debounceTimer = window.setTimeout(() => {
      debouncedSearch = value.trim().toLowerCase().replaceAll(" ", "");
      sessionStorage.setItem("rank-search", debouncedSearch);
    }, debounceTimeMillis);
  }

  function onsearchenter() {
    if (filteredGroupedRanks.length) {
      const group = filteredGroupedRanks[0];
      const path = `#/comp/${data.compRecord.id}/rank?surveyId=${encodeURIComponent(group.survey.id)}`;
      if (group.pickLists?.length) {
        goto(`${path}&picklist=${encodeURIComponent(group.pickLists[0].name)}`);
      } else if (group.expressions?.length) {
        goto(`${path}&expression=${encodeURIComponent(group.expressions[0].name)}`);
      } else if (group.fields?.length) {
        goto(`${path}&field=${encodeURIComponent(group.fields[0].field.id)}`);
      }
    }
  }
</script>

<div class="flex flex-col gap-6">
  {#if !data.showRanking}
    <div class="flex flex-col gap-3">
      <h2 class="font-bold">Ranks</h2>
      <span class="text-sm">No rankings available.</span>
    </div>
  {:else}
    <div class="flex flex-col gap-2">
      <h2 class="font-bold">Ranks</h2>
      <label class="flex flex-col text-sm">
        Search
        <input
          {@attach (input) => {
            if (sessionStorage.getItem("rank-search")) {
              input.focus();
              input.select();
            }
          }}
          value={debouncedSearch}
          oninput={(e) => onsearchinput(e.currentTarget.value)}
          onkeypress={(e) => e.key == "Enter" && onsearchenter()}
          class="text-theme bg-neutral-800 p-2"
        />
      </label>
    </div>

    {#each filteredGroupedRanks as group}
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
          {#each group.fields || [] as field}
            <Anchor
              route="comp/{data.compRecord.id}/rank?surveyId={encodeURIComponent(
                group.survey.id,
              )}&field={encodeURIComponent(field.field.id)}"
            >
              {field.detailedName}
            </Anchor>
          {/each}
        </div>
      </div>
    {/each}
  {/if}
</div>
