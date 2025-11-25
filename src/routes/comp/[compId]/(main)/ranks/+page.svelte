<script lang="ts">
  import type { PageProps } from "./$types";
  import Anchor from "$lib/components/Anchor.svelte";
  import { goto } from "$app/navigation";
  import Button from "$lib/components/Button.svelte";
  import { PlusIcon } from "@lucide/svelte";
  import { sessionStorageStore } from "$lib";
  import { openDialog } from "$lib/dialog";
  import NewExpressionDialog from "$lib/dialogs/NewExpressionDialog.svelte";
  import type { MatchSurvey } from "$lib/survey";
  import { type SingleFieldWithDetails } from "$lib/field";
  import { idb } from "$lib/idb";
  import NewPickListDialog from "$lib/dialogs/NewPickListDialog.svelte";

  let { data }: PageProps = $props();

  const newTab = sessionStorageStore<"entry" | "survey" | "picklist">("admin-rank-new-tab", "entry");

  const debounceTimeMillis = 500;
  let debounceTimer: number | undefined = undefined;

  let debouncedSearch = $state(sessionStorage.getItem("rank-search") || "");
  const cleanedSearch = $derived(debouncedSearch.trim().toLowerCase().replaceAll(" ", ""));

  const filteredGroupedRanks = $derived.by(() => {
    data.groupedRanks;
    return filterGroupedRanks(cleanedSearch);
  });

  function filterGroupedRanks(search: string) {
    return structuredClone(data.groupedRanks)
      .map((surveyGroups) => {
        surveyGroups.groups = surveyGroups.groups
          .map((group) => {
            if (!search) return group;

            if (group.pickLists?.length) {
              group.pickLists = group.pickLists.filter((pl) =>
                pl.name.toLowerCase().replaceAll(" ", "").includes(search),
              );
              if (group.pickLists.length) return group;
            }

            if (group.expressions?.length) {
              group.expressions = group.expressions.filter((e) =>
                e.name.toLowerCase().replaceAll(" ", "").includes(search),
              );
              if (group.expressions.length) return group;
            }

            if (group.fields?.length) {
              group.fields = group.fields.filter((f) =>
                f.detailedName.toLowerCase().replaceAll(" ", "").includes(search),
              );
              if (group.fields.length) return group;
            }
          })
          .filter((group) => group !== undefined);
        return surveyGroups;
      })
      .filter((surveyGroups) => surveyGroups.groups.length);
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

  function tabClass(matching: string) {
    return $newTab == matching ? "font-bold" : "font-light";
  }

  function newExpression(
    surveyRecord: MatchSurvey,
    orderedSingleFields: SingleFieldWithDetails[],
    groupedExpressions: any,
    constrain: { scope: "entry" | "survey"; input: "fields" | "tba" | "expressions" },
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
          const path = `#/comp/${data.compRecord.id}/rank?surveyId=${encodeURIComponent(surveyRecord.id)}`;
          goto(`${path}&expression=${encodeURIComponent(expression.name)}`, { invalidateAll: true });
        };
      },
    });
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

    {#each filteredGroupedRanks as { survey, fieldsWithDetails, sortedExpressions, groupedExpressions, groups }}
      {@const path = `comp/${data.compRecord.id}/rank?surveyId=${encodeURIComponent(survey.id)}`}

      <div class="flex flex-col gap-3">
        <h2 class="text-sm font-bold">{survey.name}</h2>

        {#each groups as group}
          <div class="flex flex-col">
            <span class="text-xs font-light">{group.category}</span>

            <div class="flex flex-wrap gap-2 text-sm">
              {#each group.pickLists || [] as pickList}
                <Anchor route="{path}&picklist={encodeURIComponent(pickList.name)}">{pickList.name}</Anchor>
              {/each}

              {#each group.expressions || [] as expression}
                <Anchor route="{path}&expression={encodeURIComponent(expression.name)}">{expression.name}</Anchor>
              {/each}

              {#each group.fields || [] as field}
                <Anchor route="{path}&field={encodeURIComponent(field.field.id)}">{field.detailedName}</Anchor>
              {/each}
            </div>
          </div>
        {/each}

        <div class="flex w-80 max-w-full flex-col gap-2 self-start border border-neutral-500 p-2 text-xs">
          <div class="flex flex-wrap justify-stretch gap-2">
            <Button onclick={() => ($newTab = "entry")} class={tabClass("entry")}>Entry</Button>
            <Button onclick={() => ($newTab = "survey")} class={tabClass("survey")}>Aggregate</Button>
            <Button onclick={() => ($newTab = "picklist")} class={tabClass("picklist")}>Pick List</Button>
          </div>

          <div class="flex flex-col">
            {#if $newTab == "entry"}
              <span>Entry Expression</span>

              <div class="flex flex-wrap gap-2">
                <Button
                  onclick={() => {
                    newExpression(survey, fieldsWithDetails.orderedSingle, groupedExpressions, {
                      scope: "entry",
                      input: "fields",
                    });
                  }}
                >
                  <PlusIcon class="text-theme size-5" />
                  Fields
                </Button>
                <Button
                  onclick={() => {
                    newExpression(survey, fieldsWithDetails.orderedSingle, groupedExpressions, {
                      scope: "entry",
                      input: "tba",
                    });
                  }}
                  disabled={!survey.tbaMetrics?.length}
                  class="text-xs"
                >
                  <PlusIcon class="text-theme size-5" />
                  TBA
                </Button>
                <Button
                  onclick={() => {
                    newExpression(survey, fieldsWithDetails.orderedSingle, groupedExpressions, {
                      scope: "entry",
                      input: "expressions",
                    });
                  }}
                  disabled={!sortedExpressions.some((e) => e.scope == "entry")}
                >
                  <PlusIcon class="text-theme size-5" />
                  Expressions
                </Button>
              </div>
            {:else if $newTab == "survey"}
              <span>Aggregate Expression</span>

              <div class="flex flex-wrap gap-2">
                <Button
                  onclick={() => {
                    newExpression(survey, fieldsWithDetails.orderedSingle, groupedExpressions, {
                      scope: "survey",
                      input: "fields",
                    });
                  }}
                >
                  <PlusIcon class="text-theme size-5" />
                  Fields
                </Button>
                <Button
                  onclick={() => {
                    newExpression(survey, fieldsWithDetails.orderedSingle, groupedExpressions, {
                      scope: "survey",
                      input: "tba",
                    });
                  }}
                  disabled={!survey.tbaMetrics?.length}
                >
                  <PlusIcon class="text-theme size-5" />
                  TBA
                </Button>
                <Button
                  onclick={() => {
                    newExpression(survey, fieldsWithDetails.orderedSingle, groupedExpressions, {
                      scope: "survey",
                      input: "expressions",
                    });
                  }}
                  disabled={!sortedExpressions.length}
                >
                  <PlusIcon class="text-theme size-5" />
                  Expressions
                </Button>
              </div>
            {:else if $newTab == "picklist"}
              <span>New</span>

              <div class="flex flex-wrap gap-2">
                <Button
                  onclick={() => {
                    openDialog(NewPickListDialog, {
                      surveyRecord: survey,
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
                          const path = `#/comp/${data.compRecord.id}/rank?surveyId=${encodeURIComponent(survey.id)}`;
                          goto(`${path}&picklist=${encodeURIComponent(pickList.name)}`, { invalidateAll: true });
                        };
                      },
                    });
                  }}
                  disabled={!sortedExpressions.length}
                >
                  <PlusIcon class="text-theme size-5" />
                  Pick list
                </Button>
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/each}
  {/if}
</div>
