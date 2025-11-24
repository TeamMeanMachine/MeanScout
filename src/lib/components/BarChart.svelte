<script lang="ts">
  import { colors, type RankData, type TeamRank } from "$lib/rank";
  import { allianceTeamLabels, getOrdinal, sessionStorageStore } from "$lib";
  import type { CompPageData } from "$lib/comp";
  import Anchor from "./Anchor.svelte";
  import { getFieldsWithDetails } from "$lib/field";
  import Button from "./Button.svelte";
  import {
    ArrowRightIcon,
    CornerDownRightIcon,
    CornerUpRightIcon,
    EraserIcon,
    MoveDownIcon,
    MoveUpIcon,
    MoveVerticalIcon,
    UserPenIcon,
    UserPlusIcon,
    XIcon,
  } from "@lucide/svelte";
  import { slide } from "svelte/transition";
  import { flip } from "svelte/animate";
  import { openDialog } from "$lib/dialog";
  import AddTeamToAllianceDialog from "$lib/dialogs/AddTeamToAllianceDialog.svelte";
  import { idb } from "$lib/idb";
  import { invalidateAll } from "$app/navigation";
  import OmitTeamFromPickListDialog from "$lib/dialogs/OmitTeamFromPickListDialog.svelte";
  import { IndexGenerator } from "fractional-indexing-jittered";
  import { untrack } from "svelte";

  let {
    pageData,
    rankData,
    hideAlliances,
    hideOmitted,
    useCustomRanks,
  }: {
    pageData: CompPageData;
    rankData: RankData;
    hideAlliances: boolean;
    hideOmitted: boolean;
    useCustomRanks: boolean;
  } = $props();

  const indexGen = new IndexGenerator([]);

  const alliancesWithIndexes = $derived(pageData.compRecord.alliances?.map((a, i) => ({ ...a, i })));
  const allianceTeams = $derived(pageData.compRecord.alliances?.flatMap((a) => a.teams) || []);

  const sortedTeams = $derived(
    hideAlliances || hideOmitted || useCustomRanks ? rankData.teams.toSorted(sortTeams) : rankData.teams,
  );

  const reorderableTeams = $derived(
    useCustomRanks
      ? sortedTeams.filter((t) => {
          if (hideAlliances && allianceTeams.includes(t.team)) {
            return false;
          }

          if (hideOmitted && rankData.type == "picklist" && t.team in (rankData.pickList.omittedTeams || {})) {
            return false;
          }

          return true;
        })
      : rankData.teams,
  );

  const flipTeamDuration = 500;

  const orderedSingleFields = $derived(
    getFieldsWithDetails(
      rankData.survey,
      pageData.fieldRecords.filter((f) => f.surveyId == rankData.survey.id),
    ).orderedSingle,
  );

  const inputNames = $derived.by(() => {
    if (rankData.type == "picklist") {
      return rankData.pickList.weights.map((w) => w.expressionName);
    } else if (rankData.type == "expression") {
      if (rankData.expression.input.from == "expressions") {
        return rankData.expression.input.expressionNames;
      } else if (rankData.expression.input.from == "fields") {
        return rankData.expression.input.fieldIds
          .map((id) => orderedSingleFields.find((f) => f.field.id == id)?.detailedName)
          .filter((f) => f !== undefined);
      }
    }
    return [];
  });

  const highlightedTeam = sessionStorageStore<string>("team-highlight", "");

  const highlightedTeamRank = $derived(rankData.teams.find((t) => t.team == $highlightedTeam)?.rank);

  let movingTeam = $state<string | undefined>();
  const movingIndex = $derived(
    rankData.type == "picklist" && rankData.pickList.customRanks && movingTeam
      ? rankData.pickList.customRanks[movingTeam]
      : undefined,
  );

  $effect(() => {
    indexGen.updateList(rankData.type == "picklist" ? Object.values(rankData.pickList.customRanks || {}) : []);
  });

  $effect(() => {
    if (!useCustomRanks) {
      untrack(() => {
        movingTeam = undefined;
      });
    }
  });

  function inputUrl(name: string, i: number) {
    const path = `comp/${pageData.compRecord.id}/rank?surveyId=${encodeURIComponent(rankData.survey.id)}`;

    if (rankData.type == "picklist") {
      return `${path}&expression=${encodeURIComponent(name)}`;
    } else if (rankData.type == "expression") {
      if (rankData.expression.input.from == "expressions") {
        return `${path}&expression=${encodeURIComponent(name)}`;
      } else if (rankData.expression.input.from == "fields") {
        return `${path}&field=${encodeURIComponent(rankData.expression.input.fieldIds[i])}`;
      }
    }

    return location.hash;
  }

  function sortTeams(a: TeamRank, b: TeamRank) {
    const aIsAlliance = allianceTeams.includes(a.team);
    const bIsAlliance = allianceTeams.includes(b.team);

    let aIsOmitted = false;
    let bIsOmitted = false;

    if (rankData.type == "picklist" && rankData.pickList.omittedTeams) {
      aIsOmitted = a.team in rankData.pickList.omittedTeams;
      bIsOmitted = b.team in rankData.pickList.omittedTeams;
    }

    let aIndex = "";
    let bIndex = "";

    if (rankData.type == "picklist" && rankData.pickList.customRanks) {
      aIndex = rankData.pickList.customRanks[a.team];
      bIndex = rankData.pickList.customRanks[b.team];
    }

    const whetherOmittedSort = Number(aIsOmitted) - Number(bIsOmitted);
    const whetherAllianceSort = Number(aIsAlliance) - Number(bIsAlliance);
    const whetherIndexSort = aIndex < bIndex ? -1 : aIndex > bIndex ? 1 : 0;

    return (
      (hideOmitted ? whetherOmittedSort : 0) ||
      (hideAlliances ? whetherAllianceSort : 0) ||
      (useCustomRanks ? whetherIndexSort : 0) ||
      0
    );
  }
</script>

{#if inputNames.length}
  <div class="-mx-3 -my-1 flex gap-2 overflow-x-auto px-3 py-1 text-xs">
    {#key inputNames}
      {#each inputNames as name, i}
        {@const color = inputNames.length > 1 ? colors[i % colors.length] : "var(--color-theme)"}
        <Anchor route={inputUrl(name, i)} class="flex-col items-stretch {rankData.type == 'picklist' ? 'gap-0!' : ''}">
          <div class="flex items-start justify-between font-light">
            <div class="inline-block" style="background-color:{color};height:6px;width:20px"></div>
            {#if rankData.type == "picklist"}
              {rankData.pickList.weights[i].percentage}%
            {/if}
          </div>
          <span class="text-nowrap">{name}</span>
        </Anchor>
      {/each}
    {/key}
  </div>
{/if}

<div class="grid gap-x-2 gap-y-4" style="grid-template-columns:min-content auto">
  {#each sortedTeams as teamRank (teamRank.team)}
    {@const isHighlighted = $highlightedTeam == teamRank.team}

    {@const teamIndex =
      rankData.type == "picklist" && rankData.pickList.customRanks
        ? rankData.pickList.customRanks[teamRank.team]
        : undefined}

    {@const allianceWithIndex = alliancesWithIndexes?.find((a) => a.teams.includes(teamRank.team))}
    {@const hiddenAlliance = !!allianceWithIndex && hideAlliances}

    {@const isOmitted =
      rankData.type == "picklist" &&
      rankData.pickList.omittedTeams != undefined &&
      teamRank.team in rankData.pickList.omittedTeams}
    {@const omitReason =
      rankData.type == "picklist" && rankData.pickList.omittedTeams && teamRank.team in rankData.pickList.omittedTeams
        ? rankData.pickList.omittedTeams[teamRank.team]?.reason
        : undefined}

    {@const isReorderable = reorderableTeams.some((t) => t.team == teamRank.team)}

    <div
      id={teamRank.team}
      animate:flip={{ duration: flipTeamDuration, delay: 0 }}
      class="col-span-full grid grid-cols-subgrid"
    >
      <div class="flex flex-col">
        <Button
          onclick={() => {
            if (isReorderable && movingTeam && movingTeam != teamRank.team && rankData.type == "picklist") {
              if (!teamIndex || !movingIndex) {
                return;
              }

              let customRanks: Record<string, string> = $state.snapshot(rankData.pickList.customRanks || {});

              if (teamIndex < movingIndex) {
                customRanks[movingTeam] = indexGen.keyBefore(teamIndex);
              } else if (teamIndex > movingIndex) {
                customRanks[movingTeam] = indexGen.keyAfter(teamIndex);
              } else {
                return;
              }

              indexGen.updateList(Object.values(customRanks));

              const pickLists = $state.snapshot(rankData.survey.pickLists);
              pickLists.find((pl) => pl.name == rankData.pickList.name)!.customRanks = customRanks;
              idb.put("surveys", { ...rankData.survey, pickLists, modified: new Date() }).onsuccess = invalidateAll;

              movingTeam = undefined;
            } else if (isHighlighted) {
              $highlightedTeam = "";
              movingTeam = undefined;
            } else {
              $highlightedTeam = teamRank.team;
            }
          }}
          class="relative h-[46px] w-10 justify-center text-sm sm:w-12"
        >
          {#if isReorderable && teamIndex && movingIndex && teamIndex < movingIndex}
            <CornerUpRightIcon class="text-theme" />
          {:else if isReorderable && teamIndex && movingIndex && teamIndex > movingIndex}
            <CornerDownRightIcon class="text-theme" />
          {:else}
            <div
              class={["flex items-baseline", hiddenAlliance && "opacity-75", isOmitted && "line-through opacity-50"]}
            >
              <span class="font-bold">{teamRank.rank}</span>
              <span class="hidden text-xs font-light sm:inline">{getOrdinal(teamRank.rank)}</span>
            </div>
            {#if useCustomRanks}
              <span class="absolute top-0 right-0 text-xs font-light">*</span>
            {/if}
          {/if}
        </Button>

        {#if rankData.type == "picklist" && rankData.pickList.customRanks && useCustomRanks && isHighlighted && isReorderable}
          {@const arrIndex = reorderableTeams.findIndex((t) => t.team == teamRank.team)}

          <div class="mt-2 flex flex-col gap-2" transition:slide>
            <Button
              onclick={() => {
                if (movingTeam == teamRank.team) {
                  movingTeam = undefined;
                } else {
                  movingTeam = teamRank.team;
                }
              }}
              class="h-[46px] shrink-0 justify-center"
            >
              {#if !movingTeam}
                {#if arrIndex == 0}
                  <MoveDownIcon class="text-theme" />
                {:else if arrIndex == reorderableTeams.length - 1}
                  <MoveUpIcon class="text-theme" />
                {:else}
                  <MoveVerticalIcon class="text-theme" />
                {/if}
              {:else if movingTeam == teamRank.team}
                <XIcon class="text-theme" />
              {:else}
                <MoveVerticalIcon class="text-theme" />
              {/if}
            </Button>
          </div>
        {/if}
      </div>

      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
      <div onclick={() => ($highlightedTeam = teamRank.team)} class="min-w-0">
        <div
          class={["border-neutral-700 p-0 transition-[border,padding]", isHighlighted && "border-x-4 border-t-4 px-1"]}
        >
          <div class="flex items-end justify-between gap-3">
            <div
              class={["flex flex-col truncate", hiddenAlliance && "opacity-75", isOmitted && "line-through opacity-50"]}
            >
              <div class="font-bold">{teamRank.team}</div>
              {#if teamRank.teamName}
                <div class="truncate text-xs font-light tracking-tighter">{teamRank.teamName}</div>
              {/if}
            </div>

            <div class={["flex flex-col text-end", isOmitted && "line-through opacity-50"]}>
              {#if allianceWithIndex}
                <div class={["truncate text-xs tracking-tighter", hiddenAlliance ? "font-bold" : "font-light"]}>
                  a{allianceWithIndex.i + 1}
                  {(allianceTeamLabels[allianceWithIndex.teams.indexOf(teamRank.team)] || "Backup").slice(0, 4)}
                </div>
              {/if}
              <div class={[hiddenAlliance && "opacity-75"]}>
                {#if "value" in teamRank}
                  {teamRank.value.toFixed(2)}
                {:else}
                  <span>{teamRank.percentage.toFixed(1)}<span class="text-xs font-light">%</span></span>
                {/if}
              </div>
            </div>
          </div>

          {#if isHighlighted}
            <div transition:slide>
              <div class="flex flex-wrap items-center justify-between gap-2 py-1 text-sm">
                <Anchor route="comp/{pageData.compRecord.id}/team/{teamRank.team}">
                  View
                  <ArrowRightIcon class="text-theme size-5" />
                </Anchor>

                <div class="flex gap-2">
                  <Button
                    onclick={() => {
                      openDialog(AddTeamToAllianceDialog, {
                        team: { number: teamRank.team, name: teamRank.teamName },
                        compAlliances: pageData.compRecord.alliances || [],
                        onadd(newAlliances) {
                          idb.put(
                            "comps",
                            $state.snapshot({
                              ...pageData.compRecord,
                              alliances: newAlliances,
                              modified: new Date(),
                            }),
                          ).onsuccess = invalidateAll;
                        },
                      });
                    }}
                  >
                    {#if allianceTeams.includes(teamRank.team)}
                      <UserPenIcon class="text-theme size-5" />
                    {:else}
                      <UserPlusIcon class="text-theme size-5" />
                    {/if}
                  </Button>

                  {#if rankData.type == "picklist"}
                    <Button
                      onclick={() => {
                        openDialog(OmitTeamFromPickListDialog, {
                          team: { number: teamRank.team, name: teamRank.teamName },
                          pickListName: rankData.pickList.name,
                          omitted: isOmitted,
                          omittedReason: rankData.pickList.omittedTeams?.[teamRank.team]?.reason,
                          onomit(newReason) {
                            let omittedTeams = $state.snapshot(rankData.pickList.omittedTeams);

                            const data: { reason?: string | undefined } = {};
                            if (newReason) data.reason = newReason;

                            if (!omittedTeams) {
                              omittedTeams = { [teamRank.team]: data };
                            } else {
                              omittedTeams[teamRank.team] = data;
                            }

                            const pickLists = $state.snapshot(rankData.survey.pickLists);
                            pickLists.find((pl) => pl.name == rankData.pickList.name)!.omittedTeams = omittedTeams;

                            idb.put(
                              "surveys",
                              $state.snapshot({ ...rankData.survey, pickLists, modified: new Date() }),
                            ).onsuccess = invalidateAll;
                          },
                          onunomit() {
                            const omittedTeams = $state.snapshot(rankData.pickList.omittedTeams);

                            if (omittedTeams) {
                              delete omittedTeams[teamRank.team];
                            }

                            const pickLists = $state.snapshot(rankData.survey.pickLists);
                            pickLists.find((pl) => pl.name == rankData.pickList.name)!.omittedTeams = omittedTeams;

                            idb.put(
                              "surveys",
                              $state.snapshot({ ...rankData.survey, pickLists, modified: new Date() }),
                            ).onsuccess = invalidateAll;
                          },
                        });
                      }}
                    >
                      <EraserIcon class="text-theme size-5" />
                    </Button>
                  {/if}
                </div>
              </div>

              {#if isOmitted}
                <div class="flex justify-end pt-1 text-xs font-light" transition:slide>
                  {#if omitReason}
                    Omit reason: {omitReason}
                  {:else}
                    Omitted
                  {/if}
                </div>
              {/if}

              {#if inputNames.length > 1}
                <div class="-mx-2 mt-1">
                  <div
                    class="flex text-center text-xs font-light tracking-tighter"
                    style="width:{teamRank.percentage.toFixed(2)}%"
                  >
                    {#if "value" in teamRank && rankData.type != "picklist"}
                      {#each teamRank.inputs as input, i}
                        {@const inputName = rankData.inputs[i].name}
                        {@const divWidth = input.value * teamRank.percentage}
                        {#if divWidth}
                          <div title={inputName} class="overflow-hidden" style="width:{divWidth.toFixed(2)}%">
                            <div class="truncate">{inputName}</div>
                          </div>
                        {/if}
                      {/each}
                    {:else if !("value" in teamRank) && rankData.type == "picklist"}
                      {#each rankData.pickList.weights as weight, i}
                        {@const divWidth = teamRank.inputs[i] * teamRank.percentage}
                        {#if divWidth}
                          <div
                            title={weight.expressionName}
                            class="overflow-hidden"
                            style="width:{divWidth.toFixed(2)}%"
                          >
                            <div class="truncate">{weight.expressionName}</div>
                          </div>
                        {/if}
                      {/each}
                    {/if}
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <div class={["transition-[background]", isHighlighted ? "bg-neutral-700" : "bg-neutral-800"]}>
          {#if inputNames.length > 1}
            <div class="flex" style="width:{teamRank.percentage.toFixed(2)}%">
              {#if "value" in teamRank && rankData.type != "picklist"}
                {#each teamRank.inputs as input, i}
                  {@const inputName = rankData.inputs[i].name}
                  {@const color = colors[i % colors.length]}
                  {@const opacity = input.percentage.toFixed(2)}
                  {@const divWidth = input.value * teamRank.percentage}

                  {#if divWidth}
                    <div title={inputName} class="overflow-hidden" style="width:{divWidth.toFixed(2)}%">
                      <div
                        class="border-x-2"
                        style="background-color:{color};height:6px;opacity:{opacity}%;border-color:rgba(0,0,0,0.25)"
                      ></div>
                    </div>
                  {/if}
                {/each}
              {:else if !("value" in teamRank) && rankData.type == "picklist"}
                {#each rankData.pickList.weights as weight, i}
                  {@const color = colors[i % colors.length]}
                  {@const opacity = ((teamRank.inputs[i] / weight.percentage) * 100).toFixed(2)}
                  {@const divWidth = teamRank.inputs[i] * teamRank.percentage}

                  {#if divWidth}
                    <div title={weight.expressionName} class="overflow-hidden" style="width:{divWidth.toFixed(2)}%">
                      <div
                        class="border-x-2"
                        style="background-color:{color};height:6px;opacity:{opacity}%;border-color:rgba(0,0,0,0.25)"
                      ></div>
                    </div>
                  {/if}
                {/each}
              {/if}
            </div>
          {:else}
            {@const singleColor = `rgb(var(--theme-color) / ${teamRank.percentage.toFixed(2)}%)`}
            <div style="background-color:{singleColor};width:{teamRank.percentage.toFixed(2)}%;height:6px"></div>
          {/if}
        </div>

        {#if inputNames.length > 1}
          <div
            class="flex text-center text-xs font-light tracking-tighter"
            style="width:{teamRank.percentage.toFixed(2)}%"
          >
            {#if "value" in teamRank && rankData.type != "picklist"}
              {#each teamRank.inputs as input, i}
                {@const inputName = rankData.inputs[i].name}
                {@const divWidth = input.value * teamRank.percentage}
                {#if divWidth}
                  <div title={inputName} class="overflow-hidden" style="width:{divWidth.toFixed(2)}%">
                    <div>{input.value.toFixed()}</div>
                  </div>
                {/if}
              {/each}
            {:else if !("value" in teamRank) && rankData.type == "picklist"}
              {#each rankData.pickList.weights as weight, i}
                {@const divWidth = teamRank.inputs[i] * teamRank.percentage}
                {#if divWidth}
                  <div title={weight.expressionName} class="overflow-hidden" style="width:{divWidth.toFixed(2)}%">
                    <div>{((teamRank.inputs[i] / weight.percentage) * 100).toFixed()}%</div>
                  </div>
                {/if}
              {/each}
            {/if}
          </div>
        {/if}
      </div>
    </div>
  {/each}
</div>

{#if $highlightedTeam}
  <div
    class="sticky right-3 bottom-20 z-20 mr-2 flex flex-col self-end border border-neutral-500 bg-neutral-900 p-2 shadow-2xl lg:bottom-8"
    transition:slide
  >
    <span class="text-xs font-light">Jump to</span>
    <div class="flex flex-wrap gap-2">
      <Button
        onclick={() => {
          document
            .getElementById($highlightedTeam)
            ?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        }}
        class="min-w-24 py-1 font-light"
      >
        <div class="flex flex-col">
          {$highlightedTeam}
          {#if highlightedTeamRank}
            <span class="text-xs">
              <span class="font-bold">{highlightedTeamRank}</span>{getOrdinal(highlightedTeamRank)}
              place
            </span>
          {/if}
        </div>
      </Button>
      <Button onclick={() => ($highlightedTeam = "")} class="p-1!">
        <XIcon class="size-5" />
      </Button>
    </div>
  </div>
{/if}
