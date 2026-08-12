<script lang="ts">
  import { CalendarDaysIcon, LoaderIcon, SquareCheckBigIcon, SquareIcon } from "@lucide/svelte";
  import { goto } from "$app/navigation";
  import { nowSeconds, rerunOtherContextLoads } from "$lib";
  import Button from "$lib/components/Button.svelte";
  import { EventDB, MetaDB } from "$lib/db";
  import { openDialog, type DialogExports } from "$lib/dialog";
  import SelectEventKeyDialog from "$lib/dialogs/beta/SelectEventKeyDialog.svelte";
  import { idb } from "$lib/idb";
  import { scoutStore, teamStore } from "$lib/settings";
  import { Statbotics } from "$lib/statbotics";
  import { TBA } from "$lib/tba";
  import type { components } from "$lib/tba/schema";
  import { SvelteMap } from "svelte/reactivity";

  let event = $state<MetaDB.Event>({
    id: idb.generateId({ randomChars: 0 }),
    name: "",
    made: { at: 0, by: $scoutStore, team: $teamStore },
  });

  let metaTeams = new SvelteMap<string, MetaDB.Team>();

  let eventTeams = new SvelteMap<string, EventDB.Team>();
  let matches = new SvelteMap<string, EventDB.Match>();

  let forms = $state({ id: idb.generateId({ randomChars: 0 }), match: true, pit: true });

  let error = $state("");

  let loading = $state(false);

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      event.name = event.name.trim();
      if (!event.name) {
        error = "Name can't be blank!";
        return;
      }

      const now = nowSeconds();
      event.made.at = now;

      if (metaTeams.size) {
        MetaDB.teams.setMap(metaTeams);
      }

      Promise.all([MetaDB.events.set(event), EventDB.open(event.id)])
        .catch((reason) => {
          error = `Could not create event: ${reason}`;
        })
        .then(() => {
          const existingForms = EventDB.forms.read.values();

          const matchForm: EventDB.Form | undefined =
            forms.match && !existingForms.some((f) => f.type == "match")
              ? {
                  id: "match-" + forms.id,
                  name: "Match Form",
                  type: "match",
                  controls: [],
                  made: { at: now, by: $scoutStore, team: $teamStore },
                }
              : undefined;

          const pitForm: EventDB.Form | undefined =
            forms.pit && !existingForms.some((f) => f.type == "pit")
              ? {
                  id: "pit-" + forms.id,
                  name: "Pit Form",
                  type: "pit",
                  controls: [],
                  made: { at: now, by: $scoutStore, team: $teamStore },
                }
              : undefined;

          return Promise.all([
            EventDB.teams.setMap(eventTeams),
            EventDB.matches.setMap(matches),
            (matchForm || pitForm) &&
              EventDB.forms.set([matchForm, pitForm].filter((f) => f !== undefined)).catch(console.error),
          ]).finally(() => {
            rerunOtherContextLoads();
            goto(`#/beta/event/${event.id}`, { invalidateAll: true });
          });
        })
        .catch((reason) => {
          console.error("Event was created, but an error still occured:", reason);
        });
    },
  };

  function getDataFromTbaEvent(tbaEvent: components["schemas"]["Event"] | undefined) {
    delete event.remapTeams;
    delete event.alliances;
    metaTeams.clear();
    eventTeams.clear();
    matches.clear();

    if (!tbaEvent) {
      delete event.key;
      event.id = idb.generateId({ randomChars: 0 });
      event.name = "";
      return;
    }

    event.key = tbaEvent.key;
    event.id = tbaEvent.key;
    event.name = `${tbaEvent.year} ${tbaEvent.short_name || tbaEvent.name}`;

    if (tbaEvent.remap_teams) {
      event.remapTeams = {};
      for (const frcTeam in tbaEvent.remap_teams) {
        event.remapTeams[frcTeam.replace("frc", "")] = tbaEvent.remap_teams[frcTeam].replace("frc", "");
      }
    }

    loading = true;

    const params = { params: { path: { event_key: event.key } } };

    const getAlliances = TBA.GET("/event/{event_key}/alliances", params).then((response) => {
      if (!response.data?.length) return;
      event.alliances = response.data.map((alliance) => ({ teams: alliance.picks.map(parseTeam) }));
    });

    const getTeams = TBA.GET("/event/{event_key}/teams/simple", params).then((response) => {
      if (!response.data?.length) return;
      for (const team of response.data) {
        const eventTeamId = parseTeam(team.key);
        if (!eventTeams.has(eventTeamId)) {
          eventTeams.set(eventTeamId, { id: eventTeamId });
        }
        const metaTeamId = parseInt(eventTeamId).toString();
        const existingMetaTeam = metaTeams.get(metaTeamId);
        metaTeams.set(metaTeamId, {
          id: metaTeamId,
          ...metaTeams.get(metaTeamId),
          name: existingMetaTeam?.name || team.nickname,
        });
      }
    });

    const getMatches = TBA.GET("/event/{event_key}/matches", params).then((response) => {
      if (!response.data?.length) return;
      for (const match of response.data) {
        const matchId = match.key.split("_")[1];
        matches.set(matchId, {
          id: matchId,
          red: {
            teams: match.alliances.red.team_keys.map(parseTeam),
            score: match.alliances.red.score < 0 ? undefined : match.alliances.red.score,
            breakdown: match.score_breakdown?.red,
          },
          blue: {
            teams: match.alliances.blue.team_keys.map(parseTeam),
            score: match.alliances.blue.score < 0 ? undefined : match.alliances.blue.score,
            breakdown: match.score_breakdown?.blue,
          },
          started: match.actual_time || undefined,
          winner: match.winning_alliance || undefined,
          videos: match.videos.length ? match.videos.map((v) => v.key) : undefined,
        });
      }
    });

    const getRankings = TBA.GET("/event/{event_key}/rankings", params).then((response) => {
      if (!response.data) return;
      for (const ranking of response.data.rankings) {
        const teamId = parseTeam(ranking.team_key);
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

    const getOprs = TBA.GET("/event/{event_key}/oprs", params).then((response) => {
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
          const teamId = parseTeam(frcTeam);
          const value = +response.data[type][frcTeam].toFixed(2);
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

    const getCoprs = TBA.GET("/event/{event_key}/coprs", params).then((response) => {
      if (!response.data) return;
      for (const type in response.data) {
        if (!response.data[type]) continue;
        for (const frcTeam in response.data[type]) {
          const teamId = parseTeam(frcTeam);
          const value = +response.data[type][frcTeam].toFixed(2);
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

    const getMedia = TBA.GET("/event/{event_key}/team_media", params).then((response) => {
      if (!response.data?.length) return;
      for (const media of response.data) {
        const eventTeamId = parseTeam(media.team_keys[0]);
        if (media.type == "avatar" && media.details?.base64Image) {
          const metaTeamId = parseInt(eventTeamId).toString();
          metaTeams.set(metaTeamId, {
            id: metaTeamId,
            name: "",
            ...metaTeams.get(metaTeamId),
            avatar: media.details.base64Image,
          });
          continue;
        }
        if (media.type == "imgur" && media.direct_url) {
          const existingTeam = eventTeams.get(eventTeamId);
          if (!existingTeam) {
            eventTeams.set(eventTeamId, { id: eventTeamId, images: [media.direct_url] });
          } else if (!existingTeam.images) {
            existingTeam.images = [media.direct_url];
          } else {
            existingTeam.images.push(media.direct_url);
          }
          continue;
        }
      }
    });

    const getStatboticsTeams = Statbotics.GET("/v3/team_events", { params: { query: { event: event.key } } }).then(
      (response) => {
        if (!response.data?.length) return;
        for (const team of response.data as Statbotics.TeamEvent[]) {
          let teamId = team.team.toString();
          if (event.remapTeams && Object.values(event.remapTeams).includes(team.team_name)) {
            teamId = team.team_name;
            event.remapTeams[team.team] = teamId;
          }
          const existingTeam = eventTeams.get(teamId);
          if (!existingTeam) continue;
          existingTeam.epa = team.epa || existingTeam.epa;
        }
      },
    );

    const getStatboticsMatches = Statbotics.GET("/v3/matches", { params: { query: { event: event.key } } }).then(
      (response) => {
        if (!response.data?.length) return;
        for (const match of response.data as Statbotics.Match[]) {
          const matchId = match.key.split("_")[1];
          const existingMatch = matches.get(matchId);
          if (!existingMatch) continue;
          existingMatch.prediction = match.pred || existingMatch.prediction;
        }
      },
    );

    Promise.allSettled([getAlliances, getTeams, getMatches, getRankings, getOprs, getCoprs, getMedia])
      .catch(console.error)
      .then(() => Promise.allSettled([getStatboticsTeams, getStatboticsMatches]))
      .catch(console.error)
      .finally(() => (loading = false));
  }

  function parseTeam(frcTeam: string | number) {
    let team = frcTeam.toString().replace("frc", "");
    return event.remapTeams?.[team] || team;
  }
</script>

<span>New event</span>

<Button
  onclick={() => {
    openDialog(SelectEventKeyDialog, {
      current: event.key,
      onselect: getDataFromTbaEvent,
    });
  }}
  class="min-h-16"
>
  {#if loading}
    <LoaderIcon class="animate-spin text-theme" />
  {:else}
    <CalendarDaysIcon class="text-theme" />
  {/if}

  <div class="flex grow flex-col">
    {#if event.key}
      {event.key}
      <span class="text-xs font-light">Edit event key</span>
    {:else}
      Select event key
      <span class="text-xs font-light">The Blue Alliance</span>
    {/if}
  </div>

  {#if eventTeams.size || matches.size || event.alliances?.length}
    <div class="flex flex-col items-end text-xs font-light">
      {#if eventTeams.size}
        <div>{eventTeams.size} teams</div>
      {/if}
      {#if matches.size}
        <div>{matches.size} matches</div>
      {/if}
      {#if event.alliances?.length}
        <div>{event.alliances.length} alliances</div>
      {/if}
    </div>
  {/if}
</Button>

<label class="flex flex-col">
  Name
  <input bind:value={event.name} class="bg-neutral-800 p-2 text-theme" />
</label>

<div class="flex flex-wrap items-end gap-2 text-sm">
  <label class="flex grow flex-col">
    ID
    <input bind:value={event.id} class="bg-neutral-800 p-2 text-theme" />
  </label>
  <div class="flex gap-2">
    {#if event.key}
      <Button
        onclick={() => {
          event.id = event.key!;
          forms.id = idb.generateId({ randomChars: 0 });
        }}
      >
        <span class={event.id == event.key ? "font-bold" : "font-light"}>Event</span>
      </Button>
    {/if}
    <Button
      onclick={() => {
        event.id = idb.generateId({ randomChars: 0 });
        forms.id = event.id;
      }}
    >
      <span class={event.id != event.key ? "font-bold" : "font-light"}>Random</span>
    </Button>
  </div>
</div>

<div class="flex flex-col">
  Forms
  <div class="flex flex-wrap gap-2">
    <Button onclick={() => (forms.match = !forms.match)} class="grow basis-26">
      {#if forms.match}
        <SquareCheckBigIcon class="text-theme" />
      {:else}
        <SquareIcon class="text-neutral-500" />
      {/if}
      <span class={forms.match ? "font-bold" : "font-light"}>Match</span>
    </Button>
    <Button onclick={() => (forms.pit = !forms.pit)} class="grow basis-26">
      {#if forms.pit}
        <SquareCheckBigIcon class="text-theme" />
      {:else}
        <SquareIcon class="text-neutral-500" />
      {/if}
      <span class={forms.pit ? "font-bold" : "font-light"}>Pit</span>
    </Button>
  </div>
</div>

{#if error}
  <span>{error}</span>
{/if}
