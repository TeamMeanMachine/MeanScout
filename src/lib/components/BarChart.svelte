<script lang="ts">
  import { colors, type RankData, type TeamRank } from "$lib/rank";
  import { allianceTeamLabels, getOrdinal, sessionStorageStore } from "$lib";
  import type { CompPageData } from "$lib/comp";
  import Anchor from "./Anchor.svelte";
  import { getFieldsWithDetails } from "$lib/field";
  import Button from "./Button.svelte";
  import { ArrowRightIcon, PenLineIcon, UserPenIcon, UserPlusIcon, XIcon } from "@lucide/svelte";
  import { slide } from "svelte/transition";
  import { flip } from "svelte/animate";
  import { openDialog } from "$lib/dialog";
  import AddTeamToAllianceDialog from "$lib/dialogs/AddTeamToAllianceDialog.svelte";
  import { idb } from "$lib/idb";
  import { invalidateAll } from "$app/navigation";
  import OmitTeamFromPickListDialog from "$lib/dialogs/OmitTeamFromPickListDialog.svelte";

  let {
    pageData,
    rankData,
    hideAlliances,
    hideOmitted,
  }: {
    pageData: CompPageData;
    rankData: RankData;
    hideAlliances: boolean;
    hideOmitted: boolean;
  } = $props();

  const alliancesWithIndexes = $derived(pageData.compRecord.alliances?.map((a, i) => ({ ...a, i })));

  const allianceTeams = $derived(pageData.compRecord.alliances?.flatMap((a) => a.teams) || []);

  const sortedTeams = $derived(hideAlliances || hideOmitted ? rankData.teams.toSorted(sortTeams) : rankData.teams);

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

    const whetherOmittedSort = Number(aIsOmitted) - Number(bIsOmitted);
    const whetherAllianceSort = Number(aIsAlliance) - Number(bIsAlliance);
    return (hideOmitted ? whetherOmittedSort : 0) || (hideAlliances ? whetherAllianceSort : 0) || 0;
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
    {@const allianceWithIndex = alliancesWithIndexes?.find((a) => a.teams.includes(teamRank.team))}
    {@const isOmitted =
      rankData.type == "picklist" &&
      rankData.pickList.omittedTeams != undefined &&
      teamRank.team in rankData.pickList.omittedTeams}
    {@const omitReason =
      rankData.type == "picklist" && rankData.pickList.omittedTeams && teamRank.team in rankData.pickList.omittedTeams
        ? rankData.pickList.omittedTeams[teamRank.team]?.reason
        : undefined}

    <div
      id={teamRank.team}
      animate:flip={{ duration: flipTeamDuration, delay: 0 }}
      class="col-span-full grid grid-cols-subgrid"
    >
      <Button
        onclick={() => ($highlightedTeam = isHighlighted ? "" : teamRank.team)}
        class="h-[46px] justify-center text-sm"
      >
        <div class="flex items-baseline {isOmitted ? 'line-through opacity-50' : ''}">
          <span class="font-bold">{teamRank.rank}</span>
          <span class="hidden text-xs font-light sm:inline">{getOrdinal(teamRank.rank)}</span>
        </div>
      </Button>

      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
      <div onclick={() => ($highlightedTeam = teamRank.team)} class="min-w-0">
        <div
          class={[
            "border-neutral-700 p-0 transition-[border,padding]",
            isHighlighted && "border-x-[4px] border-t-[4px] px-1",
          ]}
        >
          <div class="flex items-end justify-between gap-3">
            <div class="flex flex-col truncate {isOmitted ? 'line-through opacity-50' : ''}">
              <div class="font-bold">{teamRank.team}</div>
              {#if teamRank.teamName}
                <div class="truncate text-xs font-light tracking-tighter">{teamRank.teamName}</div>
              {/if}
            </div>

            <div class="flex flex-col text-end {isOmitted ? 'line-through opacity-50' : ''}">
              {#if allianceWithIndex}
                <div class="truncate text-xs font-light tracking-tighter">
                  a{allianceWithIndex.i + 1}
                  {(allianceTeamLabels[allianceWithIndex.teams.indexOf(teamRank.team)] || "Backup").slice(0, 4)}
                </div>
              {/if}
              {#if "value" in teamRank}
                {teamRank.value.toFixed(2)}
              {:else}
                <span>{teamRank.percentage.toFixed(1)}<span class="text-xs font-light">%</span></span>
              {/if}
            </div>
          </div>

          {#if isHighlighted}
            <div transition:slide>
              <div class="flex flex-wrap items-center justify-between gap-2 py-1 text-sm">
                <Anchor route="comp/{pageData.compRecord.id}/team/{teamRank.team}">
                  View team
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
                    Alliance
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
                      <PenLineIcon class="text-theme size-5" />
                      Omit
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
