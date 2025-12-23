<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import type { PageProps } from "./$types";
  import { sessionStorageStore } from "$lib";
  import RaceChart from "$lib/components/RaceChart.svelte";
  import { ClipboardCopy, Share2Icon, SquarePenIcon } from "@lucide/svelte";
  import BarChart from "$lib/components/BarChart.svelte";
  import { type Expression } from "$lib/expression";
  import { openDialog } from "$lib/dialog";
  import EditPickListDialog from "$lib/dialogs/EditPickListDialog.svelte";
  import EditExpressionDialog from "$lib/dialogs/EditExpressionDialog.svelte";
  import { idb } from "$lib/idb";
  import { goto, invalidateAll } from "$app/navigation";

  let { data }: PageProps = $props();

  const chartType = sessionStorageStore<"bar" | "race">("rank-chart-type", "bar");

  function editRank() {
    if (data.output.type == "picklist") {
      const pickList = data.output.pickList;
      const index = data.surveyRecord.pickLists.findIndex((pl) => pl.name == pickList.name);

      openDialog(EditPickListDialog, {
        surveyRecord: data.surveyRecord,
        orderedSingleFields: data.fieldsWithDetails.orderedSingle,
        expressions: data.expressions,
        pickList,
        index,
        onupdate(pickList) {
          const pickLists = $state.snapshot(data.surveyRecord.pickLists);
          pickLists[index] = pickList;
          idb.put(
            "surveys",
            $state.snapshot({
              ...data.surveyRecord,
              pickLists,
              modified: new Date(),
            }),
          ).onsuccess = () => {
            const path = `#/comp/${data.compRecord.id}/rank?surveyId=${encodeURIComponent(data.surveyRecord.id)}`;
            goto(`${path}&picklist=${encodeURIComponent(pickList.name)}`, { replaceState: true, invalidateAll: true });
          };
        },
        onreset() {
          const pickLists = $state.snapshot(data.surveyRecord.pickLists);
          delete pickLists[index].customRanks;
          delete pickLists[index].omittedTeams;
          idb.put(
            "surveys",
            $state.snapshot({
              ...data.surveyRecord,
              pickLists,
              modified: new Date(),
            }),
          ).onsuccess = invalidateAll;
        },
        ondelete() {
          idb.put(
            "surveys",
            $state.snapshot({
              ...data.surveyRecord,
              pickLists: data.surveyRecord.pickLists.filter((pl) => pl.name != pickList.name),
              modified: new Date(),
            }),
          ).onsuccess = () => {
            goto(`#/comp/${data.compRecord.id}/ranks`, { replaceState: true, invalidateAll: true });
          };
        },
      });
    } else if (data.output.type == "expression") {
      const expression = data.output.expression;
      const index = data.surveyRecord.expressions.findIndex((e) => e.name == expression.name);

      openDialog(EditExpressionDialog, {
        surveyRecord: data.surveyRecord,
        orderedSingleFields: data.fieldsWithDetails.orderedSingle,
        expressions: getExpressionsAvailableTo(expression),
        expression,
        index,
        usedExpressionNames: data.usedExpressionNames,
        onupdate(expression) {
          let pickLists = $state.snapshot(data.surveyRecord.pickLists);
          let expressions = $state.snapshot(data.surveyRecord.expressions);

          const previousName = expressions[index].name;
          if (expression.name != previousName) {
            pickLists = pickLists.map((pickList) => {
              pickList.weights = pickList.weights.map((weight) => {
                if (weight.from != "field" && weight.expressionName == previousName) {
                  weight.expressionName = expression.name;
                }
                return weight;
              });
              return pickList;
            });

            expressions = expressions.map((e) => {
              if (e.input.from == "expressions") {
                e.input.expressionNames = e.input.expressionNames.map((expressionName) => {
                  if (expressionName == previousName) {
                    return expression.name;
                  }
                  return expressionName;
                });
              }
              if (e.inputs?.length) {
                e.inputs = e.inputs.map((i) => {
                  if (i.from == "expression" && i.expressionName == previousName) {
                    i.expressionName = expression.name;
                  }
                  return i;
                });
              }
              return e;
            });
          }

          expressions[index] = expression;

          idb.put(
            "surveys",
            $state.snapshot({
              ...data.surveyRecord,
              pickLists,
              expressions,
              modified: new Date(),
            }),
          ).onsuccess = () => {
            const path = `#/comp/${data.compRecord.id}/rank?surveyId=${encodeURIComponent(data.surveyRecord.id)}`;
            goto(`${path}&expression=${encodeURIComponent(expression.name)}`, {
              replaceState: true,
              invalidateAll: true,
            });
          };
        },
        ondelete() {
          idb.put(
            "surveys",
            $state.snapshot({
              ...data.surveyRecord,
              expressions: data.surveyRecord.expressions.filter((e) => e.name != expression.name),
              modified: new Date(),
            }),
          ).onsuccess = () => {
            goto(`#/comp/${data.compRecord.id}/ranks`, { replaceState: true, invalidateAll: true });
          };
        },
      });
    }
  }

  function expressionReferencesOther(e: Expression, other: Expression) {
    const expressionNames: string[] = [];

    if (e.input.from == "expressions") {
      expressionNames.push(...e.input.expressionNames);
    }
    if (e.inputs?.length) {
      expressionNames.push(...e.inputs.filter((i) => i.from == "expression").map((i) => i.expressionName));
    }

    if (!expressionNames.length) {
      return false;
    }

    for (const expressionName of expressionNames) {
      if (expressionName == other.name) {
        return true;
      }

      const newExp = data.surveyRecord.expressions.find((newExp) => newExp.name == expressionName);
      if (newExp && expressionReferencesOther(newExp, e)) {
        return true;
      }
    }

    return false;
  }

  function getExpressionsAvailableTo(expression: Expression) {
    return {
      entry: data.expressions.entry.filter(
        (e) => expression.name != e.name && !expressionReferencesOther(e, expression),
      ),
      survey: data.expressions.survey.filter(
        (e) => expression.name != e.name && !expressionReferencesOther(e, expression),
      ),
    };
  }
</script>

<div class="flex flex-col space-y-4 grow overflow-x-hidden lg:ml-72 px-3 py-6 mt-[57px] max-lg:mb-[65px]">
  <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
    <div class="flex grow flex-col">
      <h2 class="font-bold">{data.title}</h2>
      <span class="text-xs font-light">{data.surveyRecord.name}</span>
    </div>

    <div class="flex gap-x-4 gap-y-2 text-sm">
      <div class="flex gap-2 text-sm">
        <Button onclick={() => ($chartType = "bar")} class={$chartType == "bar" ? "font-bold" : "font-light"}>
          Bar
        </Button>
        <Button onclick={() => ($chartType = "race")} class={$chartType == "race" ? "font-bold" : "font-light"}>
          Race
        </Button>
      </div>

      {#if "canShare" in navigator || "clipboard" in navigator || data.output.type != "field"}
        <div class="flex gap-2">
          {#if "canShare" in navigator}
            <Button onclick={() => navigator.share({ text: data.output.text })}>
              <Share2Icon class="text-theme size-5" />
            </Button>
          {/if}

          {#if "clipboard" in navigator}
            <Button onclick={() => navigator.clipboard.writeText(data.output.text)}>
              <ClipboardCopy class="text-theme size-5" />
            </Button>
          {/if}

          {#if data.output.type != "field"}
            <Button onclick={editRank}>
              <SquarePenIcon class="text-theme size-5" />
            </Button>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  {#if $chartType == "bar"}
    <BarChart pageData={data} rankData={data.output} />
  {:else if $chartType == "race"}
    <RaceChart
      pageData={data}
      surveyRecord={data.surveyRecord}
      entriesByTeam={data.entriesByTeam}
      rankData={data.output}
    />
  {/if}
</div>
