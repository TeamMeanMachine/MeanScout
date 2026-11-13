<script lang="ts">
  import { CheckIcon, CloudDownloadIcon, LoaderIcon } from "@lucide/svelte";
  import { rerunAllContextLoads } from "#lib";
  import type { CompPageData } from "#lib/comp.ts";
  import Button from "#lib/components/Button.svelte";
  import type { Entry } from "#lib/entry.ts";
  import { idb } from "#lib/idb.ts";
  import { compareMatches } from "#lib/match.ts";
  import {
    tbaGetEvent,
    tbaGetEventAlliances,
    tbaGetEventMatches,
    tbaGetEventTeamInsights,
    tbaGetEventTeams,
  } from "#lib/tba/index.ts";

  const {
    pageData,
  }: {
    pageData: CompPageData;
  } = $props();

  let getTbaDataError = $state("");
  let isLoadingTbaData = $state(false);
  let showCheck = $state(false);
  let showCheckTimeout = $state<number | undefined>();

  function getDataFromTbaEvent() {
    if (!pageData.compRecord.tbaEventKey) return;

    showCheck = false;
    window.clearTimeout(showCheckTimeout);

    getTbaDataError = "";
    isLoadingTbaData = true;

    Promise.allSettled([
      tbaGetEvent(pageData.compRecord.tbaEventKey),
      tbaGetEventMatches(pageData.compRecord.tbaEventKey),
      tbaGetEventTeams(pageData.compRecord.tbaEventKey),
      tbaGetEventTeamInsights(pageData.compRecord.tbaEventKey),
      tbaGetEventAlliances(pageData.compRecord.tbaEventKey),
    ])
      .then((results) => {
        const [eventResult, matchesResult, teamsResult, insightsResult, alliancesResult] = results;

        const comp = $state.snapshot(pageData.compRecord);
        let entries: Entry[] | undefined = undefined;

        if (eventResult.status == "fulfilled" && eventResult.value?.remap_teams) {
          comp.teamsRemaps ??= {};
          for (const frcFromTeam in eventResult.value.remap_teams) {
            const fromTeam = frcFromTeam.replace("frc", "");
            const toTeam = eventResult.value.remap_teams[frcFromTeam].replace("frc", "");
            comp.teamsRemaps[fromTeam] = toTeam;
          }
        }

        if (matchesResult.status == "fulfilled" && matchesResult.value?.length) {
          for (const { match } of matchesResult.value) {
            const similarMatches = comp.matches.filter((existingMatch) => compareMatches(existingMatch, match) == 0);
            if (similarMatches.length > 1) {
              comp.matches = comp.matches.filter((m) => compareMatches(m, match) != 0);
              comp.matches.push(match);
              continue;
            }
            const matchIndex = comp.matches.findIndex((existingMatch) => compareMatches(existingMatch, match) == 0);
            if (matchIndex == -1) {
              comp.matches.push(match);
            } else {
              comp.matches[matchIndex] = match;
            }
          }
          comp.matches.sort(compareMatches);

          if (pageData.entryRecords.length) {
            entries = [];
            for (const { match, breakdowns } of matchesResult.value) {
              if (!breakdowns) continue;
              for (const { team, tbaMetrics } of breakdowns) {
                entries.push(
                  ...pageData.entryRecords
                    .filter((e) => e.team == team && e.type == "match" && compareMatches(match, e) == 0)
                    .map((e) => ({ ...e, tbaMetrics })),
                );
              }
            }
          }
        }

        if (teamsResult.status == "fulfilled" && teamsResult.value?.length) {
          for (let team of teamsResult.value) {
            const remap = comp.teamsRemaps?.[team.number];
            if (remap) team = { number: remap, name: team.name };
            const existingTeam = comp.teams.find((t) => t.number == team.number);
            if (!existingTeam) {
              comp.teams.push(team);
            } else {
              if (team.name && !existingTeam.name) {
                existingTeam.name = team.name;
              }
            }
          }
        }

        if (insightsResult.status == "fulfilled" && insightsResult.value) {
          comp.teamsInsights = insightsResult.value;
        }

        if (alliancesResult.status == "fulfilled" && alliancesResult.value?.length) {
          comp.alliances = alliancesResult.value;
        }

        if (!results.some((r) => r.status == "fulfilled" && r.value)) {
          return;
        }

        showCheck = true;

        comp.modified = Date.now();

        return new Promise<void>((resolve, reject) => {
          const tx = idb.transaction(["comps", "entries"], "readwrite");
          tx.oncomplete = () => resolve();
          tx.onabort = () => reject(tx.error);
          tx.objectStore("comps").put($state.snapshot(comp));
          if (entries?.length) {
            for (const entry of $state.snapshot(entries)) {
              tx.objectStore("entries").put(entry);
            }
          }
        });
      })
      .catch((e) => {
        getTbaDataError = "Error while trying to get data";
        console.error(e);
      })
      .finally(() => {
        if (showCheck) {
          rerunAllContextLoads();
          showCheckTimeout = window.setTimeout(() => (showCheck = false), 1000);
        } else {
          window.clearTimeout(showCheckTimeout);
        }

        isLoadingTbaData = false;
      });
  }
</script>

<Button onclick={getDataFromTbaEvent}>
  {#if isLoadingTbaData}
    <LoaderIcon class="animate-spin text-theme" />
  {:else if showCheck && !getTbaDataError}
    <CheckIcon class="text-theme" />
  {:else}
    <CloudDownloadIcon class="text-theme" />
  {/if}
  Fetch TBA data
</Button>

{#if getTbaDataError}
  <span>{getTbaDataError}</span>
{/if}
