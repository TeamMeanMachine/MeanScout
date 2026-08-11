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
  import { Statbotics } from "$lib/statbotics";
  import { TBA } from "$lib/tba";
  import { SvelteMap } from "svelte/reactivity";

  let id = $state("");
  let name = $state("");
  let key = $state<string | undefined>();
  let alliances = $state<MetaDB.Event["alliances"]>(undefined);

  let metaTeams = new SvelteMap<string, MetaDB.Team>();

  let eventTeams = new SvelteMap<string, EventDB.Team>();
  let matches = new SvelteMap<string, EventDB.Match>();

  let createForms = $state({ match: true, pit: true });

  let error = $state("");

  let isLoadingTbaData = $state(false);

  $effect(() => {
    id = key || idb.generateId({ randomChars: 0 });
  });

  export const { onconfirm }: DialogExports = {
    onconfirm() {
      if (isLoadingTbaData) return;

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

      if (alliances?.length) {
        event.alliances = alliances;
      }

      if (metaTeams.size) {
        MetaDB.teams.setMap(metaTeams);
      }

      Promise.all([MetaDB.events.set(event), EventDB.open(id)])
        .catch((reason) => {
          error = `Could not create event: ${reason}`;
        })
        .then(() => {
          const formId = idb.generateId({ randomChars: 0 });

          const matchForm: EventDB.Form | undefined = createForms.match
            ? {
                id: "match-" + formId,
                name: "Match Form",
                type: "match",
                controls: [],
                made: { at: now, by: $scoutStore, team: $teamStore },
              }
            : undefined;

          const pitForm: EventDB.Form | undefined = createForms.pit
            ? {
                id: "pit-" + formId,
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

  function getDataFromTbaEvent() {
    if (!key) return;

    isLoadingTbaData = true;

    const params = { params: { path: { event_key: key } } };

    const getEvent = TBA.GET("/event/{event_key}/simple", params).then((response) => {
      if (!response.data) return;
      name = response.data.name + " " + response.data.year;
    });

    const getAlliances = TBA.GET("/event/{event_key}/alliances", params).then((response) => {
      if (!response.data) return;
      alliances = response.data.map((alliance) => ({ teams: alliance.picks }));
    });

    const getTeams = TBA.GET("/event/{event_key}/teams/simple", params).then((response) => {
      if (!response.data) return;

      for (const team of response.data) {
        const teamId = team.key.replace("frc", "");

        if (!eventTeams.has(teamId)) {
          eventTeams.set(teamId, { id: teamId });
        }

        metaTeams.set(teamId, { id: teamId, ...metaTeams.get(teamId), name: team.nickname });
      }
    });

    const getMatches = TBA.GET("/event/{event_key}/matches", params).then((response) => {
      if (!response.data) return;

      for (const match of response.data) {
        const matchId = match.key.split("_")[1];
        const existingMatch = matches.get(matchId);

        matches.set(matchId, {
          id: matchId,
          red: {
            teams: match.alliances.red.team_keys.map((frcTeam) => frcTeam.replace("frc", "")),
            score: (match.alliances.red.score < 0 && existingMatch?.red.score) || match.alliances.red.score,
            breakdown:
              existingMatch?.red.breakdown || match.score_breakdown?.red
                ? { ...existingMatch?.red.breakdown, ...match.score_breakdown?.red }
                : undefined,
          },
          blue: {
            teams: match.alliances.blue.team_keys.map((frcTeam) => frcTeam.replace("frc", "")),
            score: (match.alliances.blue.score < 0 && existingMatch?.blue.score) || match.alliances.blue.score,
            breakdown:
              existingMatch?.blue.breakdown || match.score_breakdown?.blue
                ? { ...existingMatch?.blue.breakdown, ...match.score_breakdown?.blue }
                : undefined,
          },
          prediction: existingMatch?.prediction,
          started: match.actual_time || existingMatch?.started,
          winner: match.winning_alliance || existingMatch?.winner,
          videos: [...new Set([...match.videos.map((v) => v.key), ...(existingMatch?.videos || [])])],
        });
      }
    });

    const getRankings = TBA.GET("/event/{event_key}/rankings", params).then((response) => {
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
          const teamId = frcTeam.replace("frc", "");
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
          const teamId = frcTeam.replace("frc", "");
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

    const getStatboticsTeams = Statbotics.GET("/v3/team_events", { params: { query: { event: key } } }).then(
      (response) => {
        if (!response.data) return;

        for (const team of response.data as {
          team: number;
          year: number;
          event: string;
          time: number;
          team_name: string;
          event_name: string;
          country: string;
          state: string;
          district: string;
          type: string;
          week: number;
          status: string;
          first_event: boolean;
          epa: Record<string, any>;
          record: { qual?: { rank?: number } };
        }[]) {
          const teamId = team.team.toString();
          const existingTeam = eventTeams.get(teamId);

          if (!existingTeam) {
            eventTeams.set(teamId, { id: teamId, rank: team.record?.qual?.rank || undefined, epa: team.epa });
          } else {
            eventTeams.set(teamId, { ...existingTeam, epa: team.epa || existingTeam.epa });
          }

          metaTeams.set(teamId, { id: teamId, ...metaTeams.get(teamId), name: team.team_name });
        }
      },
    );

    const getStatboticsMatches = Statbotics.GET("/v3/matches", { params: { query: { event: key } } }).then(
      (response) => {
        if (!response.data) return;

        for (const match of response.data as {
          key: string;
          year: number;
          event: string;
          week: number;
          elim: boolean;
          comp_level: string;
          set_number: number;
          match_number: number;
          match_name: string;
          time: number;
          predicted_time: number;
          status: string;
          video: string;
          alliances: { red: { team_keys: number[] }; blue: { team_keys: number[] } };
          pred: {
            winner: "red" | "blue" | undefined;
            red_win_prob: number;
            red_score: number;
            blue_score: number;
            [key: `${"red" | "blue"}_${string}`]: any;
          };
          result: {
            winner: "red" | "blue" | undefined;
            red_score: number;
            blue_score: number;
            [key: `${"red" | "blue"}_${string}`]: any;
          };
        }[]) {
          const matchId = match.key.split("_")[1];
          const existingMatch = matches.get(matchId);

          matches.set(matchId, {
            id: matchId,
            red: {
              teams:
                existingMatch?.red.teams || match.alliances.red.team_keys.map((teamNumber) => teamNumber.toString()),
              score: existingMatch?.red.score || (match.result?.red_score != -1 && match.result.red_score) || undefined,
              breakdown: existingMatch?.red.breakdown,
            },
            blue: {
              teams:
                existingMatch?.blue.teams || match.alliances.blue.team_keys.map((teamNumber) => teamNumber.toString()),
              score:
                existingMatch?.blue.score || (match.result?.blue_score != -1 && match.result.blue_score) || undefined,
              breakdown: existingMatch?.blue.breakdown,
            },
            prediction: match.pred || existingMatch?.prediction,
            started: existingMatch?.started,
            winner: match.result.winner || existingMatch?.winner,
            videos: match.video ? [...new Set([match.video, ...(existingMatch?.videos || [])])] : existingMatch?.videos,
          });
        }
      },
    );

    Promise.allSettled([
      getEvent,
      getAlliances,
      getTeams,
      getMatches,
      getRankings,
      getOprs,
      getCoprs,
      getMedia,
      getStatboticsTeams,
      getStatboticsMatches,
    ])
      .catch(console.error)
      .finally(() => (isLoadingTbaData = false));
  }
</script>

<span>New event</span>

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

<label class="flex flex-col">
  Name
  <input bind:value={name} class="bg-neutral-800 p-2 text-theme" />
</label>

{#if matches.size || eventTeams.size || alliances?.length}
  <div class="flex flex-col gap-1 text-sm">
    {#if matches.size}
      <span>Matches: {matches.size}</span>
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
