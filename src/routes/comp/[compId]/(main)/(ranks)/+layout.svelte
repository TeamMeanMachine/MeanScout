<script lang="ts">
  import { PlusIcon, SearchIcon } from "@lucide/svelte";
  import { goto } from "$app/navigation";
  import { rerunOtherContextLoads } from "$lib";
  import Anchor from "$lib/components/Anchor.svelte";
  import Button from "$lib/components/Button.svelte";
  import { openDialog } from "$lib/dialog";
  import NewExpressionDialog from "$lib/dialogs/NewExpressionDialog.svelte";
  import NewPickListDialog from "$lib/dialogs/NewPickListDialog.svelte";
  import type { EntryExpression, SurveyExpression } from "$lib/expression";
  import { type SingleFieldWithDetails } from "$lib/field";
  import { idb } from "$lib/idb";
  import type { MatchSurvey } from "$lib/survey";
  import type { LayoutProps } from "./$types";

  let { data, children }: LayoutProps = $props();

  const debounceTimeMillis = 500;
  let debounceTimer: number | undefined = undefined;

  let debouncedSearch = $state(sessionStorage.getItem("rank-search") || "");
  const cleanedSearch = $derived(debouncedSearch.trim().toLowerCase().replaceAll(" ", ""));

  const filteredGroupedRanks = $derived.by(() => {
    data.groupedRanks;
    return filterGroupedRanks(cleanedSearch);
  });

  function filterGroupedRanks(search: string) {
    return structuredClone(data.groupedRanks).map((surveyGroups) => {
      surveyGroups.groups = surveyGroups.groups.map((group) => {
        if (!search) return group;

        if (group.pickLists?.length) {
          group.pickLists = group.pickLists.filter((pl) => pl.name.toLowerCase().replaceAll(" ", "").includes(search));
        }

        if (group.expressions?.length) {
          group.expressions = group.expressions.filter((e) =>
            e.name.toLowerCase().replaceAll(" ", "").includes(search),
          ) as SurveyExpression[] | EntryExpression[];
        }

        if (group.fields?.length) {
          group.fields = group.fields.filter((f) => f.detailedName.toLowerCase().replaceAll(" ", "").includes(search));
        }

        return group;
      });
      return surveyGroups;
    });
  }

  function onsearchinput(value: string) {
    window.clearTimeout(debounceTimer);

    debounceTimer = window.setTimeout(() => {
      debouncedSearch = value;
      sessionStorage.setItem("rank-search", debouncedSearch);
    }, debounceTimeMillis);
  }

  function onsearchenter() {
    if (filteredGroupedRanks.length) {
      const group = filteredGroupedRanks[0].groups[0];
      const path = `#/comp/${data.compRecord.id}/rank?surveyId=${encodeURIComponent(filteredGroupedRanks[0].survey.id)}`;

      if (group.pickLists?.length) {
        goto(`${path}&picklist=${encodeURIComponent(group.pickLists[0].name)}`);
      } else if (group.expressions?.length) {
        goto(`${path}&expression=${encodeURIComponent(group.expressions[0].name)}`);
      } else if (group.fields?.length) {
        goto(`${path}&field=${encodeURIComponent(group.fields[0].field.id)}`);
      }
    }
  }

  function newExpression(
    surveyRecord: MatchSurvey,
    orderedSingleFields: SingleFieldWithDetails[],
    groupedExpressions: { entry: EntryExpression[]; survey: SurveyExpression[] },
    constrain: { scope: "entry" | "survey" },
  ) {
    openDialog(NewExpressionDialog, {
      surveyRecord,
      orderedSingleFields,
      expressions: groupedExpressions,
      constrain,
      oncreate(expression) {
        idb.put(
          "surveys",
          $state.snapshot({
            ...surveyRecord,
            expressions: [...surveyRecord.expressions, expression],
            modified: new Date(),
          }),
        ).onsuccess = () => {
          rerunOtherContextLoads();
          const path = `#/comp/${data.compRecord.id}/rank?surveyId=${encodeURIComponent(surveyRecord.id)}`;
          goto(`${path}&expression=${encodeURIComponent(expression.name)}`, { invalidateAll: true });
        };
      },
    });
  }
</script>

<div
  class={[
    "lg:fixed lg:top-[57px] lg:h-[calc(100vh-57px)] lg:w-72 lg:overflow-y-auto lg:overscroll-y-contain lg:border-r lg:border-neutral-600",
    "max-lg:mx-auto max-lg:w-full max-lg:max-w-(--breakpoint-lg)",
    data.surveyId ? "max-lg:hidden" : "max-lg:mb-[65px]",
  ]}
>
  <div class={["flex flex-col gap-3 bg-neutral-900 px-3 py-6", "sticky top-[57px] z-20 lg:top-0", "max-lg:mt-[57px]"]}>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="font-bold">Ranks</h2>

      {#if data.showRanking}
        <label
          class={[
            "flex cursor-text items-center gap-2 bg-neutral-800 p-2 text-sm text-theme outline-neutral-300",
            "focus-within:z-10 focus-within:outline-2",
          ]}
        >
          <SearchIcon class="size-5 text-theme" />
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
            class="w-full max-w-32 min-w-8 font-bold outline-0"
          />
        </label>
      {:else}
        <span class="text-xs">No rankings.</span>
      {/if}
    </div>
  </div>

  {#if data.showRanking}
    <div class="mb-6 flex flex-col gap-6 px-3 pt-1">
      {#each filteredGroupedRanks as { survey, fieldsWithDetails, sortedExpressions, groupedExpressions, groups }}
        {@const path = `comp/${data.compRecord.id}/rank?surveyId=${encodeURIComponent(survey.id)}`}

        <div class="flex flex-col gap-3">
          <h2 class="text-sm font-bold">{survey.name}</h2>

          {#each groups as group}
            <div class="flex flex-col">
              <span class="text-xs font-light">{group.category}</span>

              <div class="flex flex-col gap-2 text-sm">
                {#if group.category != "Fields"}
                  <Button
                    onclick={() => {
                      if (group.category == "Pick Lists") {
                        openDialog(NewPickListDialog, {
                          surveyRecord: survey,
                          orderedSingleFields: fieldsWithDetails.orderedSingle,
                          expressions: groupedExpressions,
                          oncreate(pickList) {
                            idb.put(
                              "surveys",
                              $state.snapshot({
                                ...survey,
                                pickLists: [...survey.pickLists, pickList],
                                modified: new Date(),
                              }),
                            ).onsuccess = () => {
                              rerunOtherContextLoads();
                              const path = `#/comp/${data.compRecord.id}/rank?surveyId=${encodeURIComponent(survey.id)}`;
                              goto(`${path}&picklist=${encodeURIComponent(pickList.name)}`, { invalidateAll: true });
                            };
                          },
                        });
                      } else if (group.category == "Aggregate Expressions") {
                        newExpression(survey, fieldsWithDetails.orderedSingle, groupedExpressions, { scope: "survey" });
                      } else if (group.category == "Entry Expressions") {
                        newExpression(survey, fieldsWithDetails.orderedSingle, groupedExpressions, { scope: "entry" });
                      }
                    }}
                    disabled={group.category == "Pick Lists" && !sortedExpressions.length}
                    class="size-9 justify-center p-1!"
                  >
                    <PlusIcon class="text-theme" />
                  </Button>
                {/if}

                {#if group.category == "Pick Lists"}
                  {#each group.pickLists as pickList}
                    {@const viewing = survey.id == data.surveyId && pickList.name == data.pickListName}
                    <Anchor
                      route="{path}&picklist={encodeURIComponent(pickList.name)}"
                      class={viewing ? "font-bold underline" : ""}
                    >
                      {pickList.name}
                    </Anchor>
                  {/each}
                {/if}

                {#if group.category == "Aggregate Expressions" || group.category == "Entry Expressions"}
                  {#each group.expressions as expression}
                    {@const viewing = survey.id == data.surveyId && expression.name == data.expressionName}
                    <Anchor
                      route="{path}&expression={encodeURIComponent(expression.name)}"
                      class={viewing ? "font-bold underline" : ""}
                    >
                      {expression.name}
                    </Anchor>
                  {/each}
                {/if}

                {#if group.category == "Fields"}
                  {#each group.fields as field}
                    {@const viewing = survey.id == data.surveyId && field.field.id == data.fieldId}
                    <Anchor
                      route="{path}&field={encodeURIComponent(field.field.id)}"
                      class={viewing ? "font-bold underline" : ""}
                    >
                      {field.detailedName}
                    </Anchor>
                  {/each}
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/each}

      <div class="flex flex-col gap-2 text-xs font-light text-pretty">
        <span>
          Entry expressions act like derived/computed fields, e.g. getting a team's point contribution every match.
        </span>
        <span>
          Aggregate expressions combine data across matches, e.g. getting a team's highest point contribution.
        </span>
        <span>Pick lists apply percentage weights to selected expressions/fields.</span>
      </div>
    </div>
  {/if}
</div>

{@render children()}
