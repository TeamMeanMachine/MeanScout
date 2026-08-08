<script lang="ts">
  import { CalendarDaysIcon, LoaderIcon, SquareCheckBigIcon, SquareIcon } from "@lucide/svelte";
  import { goto } from "$app/navigation";
  import { nowSeconds, rerunOtherContextLoads } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { EventDB, MetaDB } from "$lib/db";
  import { openDialog, type DialogExports } from "$lib/dialog";
  import EditCompTbaEventKeyDialog from "$lib/dialogs/EditCompTbaEventKeyDialog.svelte";
  import { idb } from "$lib/idb";
  import { scoutStore, teamStore } from "$lib/settings";
  import type { MatchSurvey, PitSurvey } from "$lib/survey";
  import { TBA } from "$lib/tba";
  import { SvelteMap } from "svelte/reactivity";

  let id = $state("");
  let name = $state("");
  let key = $state<string | undefined>();
  let alliances = $state<MetaDB.Event["alliances"]>(undefined);

  let metaTeams = new SvelteMap<string, MetaDB.Team>();

  let eventTeams = new SvelteMap<string, EventDB.Team>();
  let matches = $state<EventDB.Match[]>([]);

  let createForms = $state({ match: true, pit: true });

  let error = $state("");

  let isLoadingTbaData = $state(false);

  $effect(() => {
    id = key || idb.generateId({ randomChars: 0 });
  });

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      if (isLoadingTbaData || error) return;

      name = name.trim();
      if (!name) {
        error = "Name can't be blank!";
        return;
      }

      const now = nowSeconds();

      const event: MetaDB.Event = {
        id,
        name,
        made: { at: now, by: $scoutStore, team: $teamStore },
      };

      if (key) event.key = key;

      Promise.all([MetaDB.events.set(event), EventDB.open(id)])
        .then()
        .catch((reason) => {
          error = `Could not create event: ${reason}`;
        });

      MetaDB.events
        .set(event)
        .catch((reason) => {
          error = `Could not create event: ${reason}`;
        })
        .then(() => EventDB.open(id))
        .catch((reason) => {
          error = `Could not create event: ${reason}`;
          MetaDB.events.delete(id);
        })
        .then(() => {});

      const tx = idb.transaction(["comps", "surveys"], "readwrite");
      const surveyStore = tx.objectStore("surveys");

      tx.objectStore("comps").add($state.snapshot(event)).onerror = () => {
        tx.abort();
      };

      if (createForms.match) {
        const matchSurvey: MatchSurvey = {
          id: `${id}-match`,
          compId: id,
          name: "Match Survey",
          type: "match",
          fieldIds: [],
          expressions: [],
          pickLists: [],
          created: now,
          modified: now,
        };

        surveyStore.add($state.snapshot(matchSurvey)).onerror = () => {
          error = "Could not create match survey";
          tx.abort();
        };
      }

      if (createForms.pit) {
        const pitSurvey: PitSurvey = {
          id: `${id}-pit`,
          compId: id,
          name: "Pit Survey",
          type: "pit",
          fieldIds: [],
          created: now,
          modified: now,
        };

        surveyStore.add($state.snapshot(pitSurvey)).onerror = () => {
          error = "Could not create pit survey";
          tx.abort();
        };
      }

      tx.onerror = () => {
        error ||= `Could not create comp: ${tx.error?.message}`;
      };

      tx.oncomplete = () => {
        rerunOtherContextLoads();
        goto(`#/comp/${event.id}/admin`, { invalidateAll: true });
      };
    },
  };

  function getDataFromTbaEvent() {
    if (!key) return;

    isLoadingTbaData = true;

    const params = { path: { event_key: key } };

    const getEvent = TBA.GET("/event/{event_key}/simple", { params }).then((response) => {
      if (!response.data) return;
      name = response.data.name + " " + response.data.year;
    });

    const getAlliances = TBA.GET("/event/{event_key}/alliances", { params }).then((response) => {
      if (!response.data) return;
      alliances = response.data.map((alliance) => ({ teams: alliance.picks }));
    });

    const getTeams = TBA.GET("/event/{event_key}/teams/simple", { params }).then((response) => {
      if (!response.data) return;

      for (const team of response.data) {
        const teamId = team.key.replace("frc", "");

        if (!eventTeams.has(teamId)) {
          eventTeams.set(teamId, { id: teamId });
        }

        metaTeams.set(teamId, { id: teamId, ...metaTeams.get(teamId), name: team.nickname });
      }
    });

    const getMatches = TBA.GET("/event/{event_key}/matches", { params }).then((response) => {
      if (!response.data) return;

      matches = response.data.map((match) => ({
        id: match.key.split("_")[1],
        number: match.match_number,
        level: match.comp_level,
        red: {
          teams: match.alliances.red.team_keys.map((frcTeam) => frcTeam.replace("frc", "")),
          score: match.alliances.red.score < 0 ? undefined : match.alliances.red.score,
          breakdown: match.score_breakdown?.red,
        },
        blue: {
          teams: match.alliances.blue.team_keys.map((frcTeam) => frcTeam.replace("frc", "")),
          score: match.alliances.blue.score < 0 ? undefined : match.alliances.blue.score,
          breakdown: match.score_breakdown?.blue,
        },
        start: match.actual_time || undefined,
        videos: match.videos.map((v) => v.key),
      }));
    });

    const getRankings = TBA.GET("/event/{event_key}/rankings", { params }).then((response) => {
      if (!response.data) return;

      for (const ranking of response.data.rankings) {
        const teamId = ranking.team_key.replace("frc", "");

        let team = eventTeams.get(teamId);
        if (!team) {
          team = { id: teamId };
          eventTeams.set(teamId, team);
        }

        if (ranking.rank) {
          team.rank = ranking.rank;
        }

        if (response.data.sort_order_info?.length) {
          for (let i = 0; i < response.data.sort_order_info.length; i++) {
            if (!team.stats) {
              team.stats = { [response.data.sort_order_info[i].name]: ranking.sort_orders[i] };
            } else {
              team.stats[response.data.sort_order_info[i].name] = ranking.sort_orders[i];
            }
          }
        }

        if (response.data.extra_stats_info?.length) {
          for (let i = 0; i < response.data.extra_stats_info.length; i++) {
            if (!team.stats) {
              team.stats = { [response.data.extra_stats_info[i].name]: ranking.extra_stats[i] };
            } else {
              team.stats[response.data.extra_stats_info[i].name] = ranking.extra_stats[i];
            }
          }
        }
      }
    });

    const getOprs = TBA.GET("/event/{event_key}/oprs", { params }).then((response) => {
      if (!response.data) return;

      const types = {
        oprs: "opr",
        dprs: "dpr",
        ccwms: "ccwm",
      } as const;

      for (const type of ["oprs", "dprs", "ccwms"] as const) {
        if (!response.data[type]) continue;
        const singularType = types[type];

        for (const frcTeam in response.data[type]) {
          const teamId = frcTeam.replace("frc", "");
          const value = response.data[type][frcTeam];

          const existingTeam = eventTeams.get(teamId);
          if (!existingTeam) {
            eventTeams.set(teamId, { id: teamId, oprs: { [singularType]: value } });
          } else if (!existingTeam.oprs) {
            existingTeam.oprs = { [singularType]: value };
          } else {
            existingTeam.oprs[singularType] = value;
          }
        }
      }
    });

    const getCoprs = TBA.GET("/event/{event_key}/coprs", { params }).then((response) => {
      if (!response.data) return;

      for (const type in response.data) {
        if (!response.data[type]) continue;

        for (const frcTeam in response.data[type]) {
          const teamId = frcTeam.replace("frc", "");
          const value = response.data[type][frcTeam];

          const existingTeam = eventTeams.get(teamId);
          if (!existingTeam) {
            eventTeams.set(teamId, { id: teamId, oprs: { [type]: value } });
          } else if (!existingTeam.oprs) {
            existingTeam.oprs = { [type]: value };
          } else {
            existingTeam.oprs[type] = value;
          }
        }
      }
    });

    const getMedia = TBA.GET("/event/{event_key}/team_media", { params }).then((response) => {
      if (!response.data) return;

      for (const media of response.data) {
        const teamId = media.team_keys[0].replace("frc", "");

        if (media.type == "avatar" && media.details?.base64Image) {
          metaTeams.set(teamId, { id: teamId, name: "", ...metaTeams.get(teamId), avatar: media.details.base64Image });
          continue;
        }

        if (media.type == "imgur" && media.direct_url) {
          const existingTeam = eventTeams.get(teamId);
          if (!existingTeam) {
            eventTeams.set(teamId, { id: teamId, images: [media.direct_url] });
          } else if (!existingTeam.images) {
            existingTeam.images = [media.direct_url];
          } else {
            existingTeam.images.push(media.direct_url);
          }

          continue;
        }
      }
    });

    Promise.allSettled([getEvent, getAlliances, getTeams, getMatches, getRankings, getOprs, getCoprs, getMedia])
      .catch(console.error)
      .finally(() => (isLoadingTbaData = false));
  }
</script>

<span>New comp</span>

<label class="flex flex-col">
  Name
  <input bind:value={name} class="bg-neutral-800 p-2 text-theme" />
</label>

<div class="flex flex-col">
  The Blue Alliance
  <Button
    onclick={() => {
      openDialog(EditCompTbaEventKeyDialog, {
        tbaEventKey: key,
        onedit(tbaEventKey) {
          key = tbaEventKey;
          getDataFromTbaEvent();
        },
      });
    }}
  >
    <CalendarDaysIcon class="text-theme" />
    <div class="flex grow flex-col">
      {#if key}
        {key}
        <span class="text-xs font-light">Edit event</span>
      {:else}
        Add event
      {/if}
    </div>
    {#if isLoadingTbaData}
      <LoaderIcon class="animate-spin text-theme" />
    {/if}
  </Button>
</div>

{#if matches.length || eventTeams.size || alliances?.length}
  <div class="flex flex-col gap-1 text-sm">
    {#if matches.length}
      <span>Matches: {matches.length}</span>
    {/if}
    {#if eventTeams.size}
      <span>Teams: {eventTeams.size}</span>
    {/if}
    {#if alliances?.length}
      <span>Alliances: {alliances.length}</span>
    {/if}
  </div>
{/if}

<div class="flex flex-wrap items-end gap-2 text-sm">
  <label class="flex grow flex-col">
    ID
    <input bind:value={id} class="bg-neutral-800 p-2 text-theme" />
  </label>
  <div class="flex gap-2">
    {#if key}
      <Button onclick={() => (id = key!)}>
        <span class={id == key ? "font-bold" : "font-light"}>Event</span>
      </Button>
    {/if}
    <Button onclick={() => (id = idb.generateId({ randomChars: 0 }))}>
      <span class={id != key ? "font-bold" : "font-light"}>Random</span>
    </Button>
  </div>
</div>

<div class="flex flex-col">
  <span>Create Surveys</span>
  <div class="flex flex-wrap gap-2">
    <Button onclick={() => (createForms.match = !createForms.match)} class="grow basis-26">
      {#if createForms.match}
        <SquareCheckBigIcon class="text-theme" />
      {:else}
        <SquareIcon class="text-neutral-500" />
      {/if}
      <div class="flex flex-col">
        <span class={createForms.match ? "font-bold" : "font-light"}>Match</span>
        <span class="text-xs font-light">{id}-match</span>
      </div>
    </Button>
    <Button onclick={() => (createForms.pit = !createForms.pit)} class="grow basis-26">
      {#if createForms.pit}
        <SquareCheckBigIcon class="text-theme" />
      {:else}
        <SquareIcon class="text-neutral-500" />
      {/if}
      <div class="flex flex-col">
        <span class={createForms.pit ? "font-bold" : "font-light"}>Pit</span>
        <span class="text-xs font-light">{id}-pit</span>
      </div>
    </Button>
  </div>
</div>

{#if error}
  <span>{error}</span>
{/if}
