import type { EventDB, MetaDB } from "./db";
import type { Schema } from "./schema";
import { Statbotics } from "./statbotics";
import { TBA } from "./tba";

export function fetchEventData({
  eventKey,
  remapTeams,
  fetchEvent,
}: {
  eventKey: string;
  remapTeams?: MetaDB.Event["remapTeams"];
  fetchEvent?: true;
}) {
  const data: {
    remapTeams: MetaDB.Event["remapTeams"];
    alliances: MetaDB.Event["alliances"];
    metaTeams: Map<string, MetaDB.Team>;
    eventTeams: Map<string, EventDB.Team>;
    matches: Map<Schema.MatchId, EventDB.Match>;
  } = {
    remapTeams: structuredClone(remapTeams),
    alliances: undefined,
    metaTeams: new Map(),
    eventTeams: new Map(),
    matches: new Map(),
  };

  function parseTeam(frcTeam: string | number) {
    let team = frcTeam.toString().replace("frc", "");
    return data.remapTeams?.[team] || team;
  }

  const tbaParams = { params: { path: { event_key: eventKey } } };
  const statboticsParams = { params: { query: { event: eventKey } } };

  const getEvent = fetchEvent
    ? TBA.GET("/event/{event_key}", tbaParams).then((response) => {
        if (!response.data?.remap_teams) return;
        data.remapTeams ||= {};
        for (const frcTeam in response.data.remap_teams) {
          data.remapTeams[frcTeam.replace("frc", "")] = response.data.remap_teams[frcTeam].replace("frc", "");
        }
      })
    : Promise.resolve();

  const getTeams = TBA.GET("/event/{event_key}/teams/simple", tbaParams);
  const getMatches = TBA.GET("/event/{event_key}/matches", tbaParams);
  const getRankings = TBA.GET("/event/{event_key}/rankings", tbaParams);
  const getOprs = TBA.GET("/event/{event_key}/oprs", tbaParams);
  const getCoprs = TBA.GET("/event/{event_key}/coprs", tbaParams);
  const getAlliances = TBA.GET("/event/{event_key}/alliances", tbaParams);
  const getMedia = TBA.GET("/event/{event_key}/team_media", tbaParams);

  const getStatboticsTeams = Statbotics.GET("/v3/team_events", statboticsParams);
  const getStatboticsMatches = Statbotics.GET("/v3/matches", statboticsParams);

  return new Promise<typeof data>((resolve) => {
    getEvent
      .finally(() => {
        return Promise.allSettled([
          getTeams,
          getMatches,
          getRankings,
          getOprs,
          getCoprs,
          getAlliances,
          getMedia,
          getStatboticsTeams,
          getStatboticsMatches,
        ]).then(
          ([
            resultTeams,
            resultMatches,
            resultRankings,
            resultOprs,
            resultCoprs,
            resultAlliances,
            resultMedia,
            resultStatboticsTeams,
            resultStatboticsMatches,
          ]) => {
            if (resultTeams.status == "fulfilled" && resultTeams.value.data?.length) {
              for (const team of resultTeams.value.data) {
                const eventTeamId = parseTeam(team.key);
                if (!data.eventTeams.has(eventTeamId)) {
                  data.eventTeams.set(eventTeamId, { id: eventTeamId });
                }
                const metaTeamId = parseInt(eventTeamId).toString();
                const existingMetaTeam = data.metaTeams.get(metaTeamId);
                data.metaTeams.set(metaTeamId, {
                  id: metaTeamId,
                  ...data.metaTeams.get(metaTeamId),
                  name: existingMetaTeam?.name || team.nickname,
                });
              }
            }

            if (resultMatches.status == "fulfilled" && resultMatches.value.data?.length) {
              for (const match of resultMatches.value.data) {
                const matchId = match.key.split("_")[1] as Schema.MatchId;
                data.matches.set(matchId, {
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
            }

            if (resultRankings.status == "fulfilled" && resultRankings.value.data) {
              for (const ranking of resultRankings.value.data.rankings) {
                const teamId = parseTeam(ranking.team_key);
                let team = data.eventTeams.get(teamId);
                if (!team) {
                  team = { id: teamId };
                  data.eventTeams.set(teamId, team);
                }
                if (ranking.rank) {
                  team.rank = ranking.rank;
                }
                if (resultRankings.value.data.sort_order_info?.length) {
                  for (let i = 0; i < resultRankings.value.data.sort_order_info.length; i++) {
                    if (!team.stats) {
                      team.stats = { [resultRankings.value.data.sort_order_info[i].name]: ranking.sort_orders[i] };
                    } else {
                      team.stats[resultRankings.value.data.sort_order_info[i].name] = ranking.sort_orders[i];
                    }
                  }
                }
                if (resultRankings.value.data.extra_stats_info?.length) {
                  for (let i = 0; i < resultRankings.value.data.extra_stats_info.length; i++) {
                    if (!team.stats) {
                      team.stats = { [resultRankings.value.data.extra_stats_info[i].name]: ranking.extra_stats[i] };
                    } else {
                      team.stats[resultRankings.value.data.extra_stats_info[i].name] = ranking.extra_stats[i];
                    }
                  }
                }
              }
            }

            if (resultOprs.status == "fulfilled" && resultOprs.value.data) {
              const types = {
                oprs: "opr",
                dprs: "dpr",
                ccwms: "ccwm",
              } as const;
              for (const type of ["oprs", "dprs", "ccwms"] as const) {
                if (!resultOprs.value.data[type]) continue;
                const singularType = types[type];
                for (const frcTeam in resultOprs.value.data[type]) {
                  const teamId = parseTeam(frcTeam);
                  const value = +resultOprs.value.data[type][frcTeam].toFixed(2);
                  const existingTeam = data.eventTeams.get(teamId);
                  if (!existingTeam) {
                    data.eventTeams.set(teamId, { id: teamId, oprs: { [singularType]: value } });
                  } else if (!existingTeam.oprs) {
                    existingTeam.oprs = { [singularType]: value };
                  } else {
                    existingTeam.oprs[singularType] = value;
                  }
                }
              }
            }

            if (resultCoprs.status == "fulfilled" && resultCoprs.value.data?.length) {
              for (const type in resultCoprs.value.data) {
                if (!resultCoprs.value.data[type]) continue;
                for (const frcTeam in resultCoprs.value.data[type]) {
                  const teamId = parseTeam(frcTeam);
                  const value = +resultCoprs.value.data[type][frcTeam].toFixed(2);
                  const existingTeam = data.eventTeams.get(teamId);
                  if (!existingTeam) {
                    data.eventTeams.set(teamId, { id: teamId, oprs: { [type]: value } });
                  } else if (!existingTeam.oprs) {
                    existingTeam.oprs = { [type]: value };
                  } else {
                    existingTeam.oprs[type] = value;
                  }
                }
              }
            }

            if (resultAlliances.status == "fulfilled" && resultAlliances.value.data?.length) {
              data.alliances = resultAlliances.value.data.map((alliance) => ({ teams: alliance.picks.map(parseTeam) }));
            }

            if (resultMedia.status == "fulfilled" && resultMedia.value.data?.length) {
              for (const media of resultMedia.value.data) {
                const eventTeamId = parseTeam(media.team_keys[0]);
                if (media.type == "avatar" && media.details?.base64Image) {
                  const metaTeamId = parseInt(eventTeamId).toString();
                  data.metaTeams.set(metaTeamId, {
                    id: metaTeamId,
                    name: "",
                    ...data.metaTeams.get(metaTeamId),
                    avatar: media.details.base64Image,
                  });
                  continue;
                }
                if (media.type == "imgur" && media.direct_url) {
                  data.eventTeams.set(eventTeamId, {
                    id: eventTeamId,
                    ...data.eventTeams.get(eventTeamId),
                    images: [...(data.eventTeams.get(eventTeamId)?.images || []), media.direct_url],
                  });
                  continue;
                }
              }
            }

            if (resultStatboticsTeams.status == "fulfilled" && resultStatboticsTeams.value.data?.length) {
              for (const team of resultStatboticsTeams.value.data as Statbotics.TeamEvent[]) {
                let teamId = team.team.toString();
                if (data.remapTeams && Object.values(data.remapTeams).includes(team.team_name)) {
                  teamId = team.team_name;
                  data.remapTeams[team.team] = teamId;
                }
                const existingTeam = data.eventTeams.get(teamId);
                if (!existingTeam) continue;
                existingTeam.epa = team.epa || existingTeam.epa;
              }
            }

            if (resultStatboticsMatches.status == "fulfilled" && resultStatboticsMatches.value.data?.length) {
              for (const match of resultStatboticsMatches.value.data as Statbotics.Match[]) {
                const matchId = match.key.split("_")[1] as Schema.MatchId;
                const existingMatch = data.matches.get(matchId);
                if (!existingMatch) continue;
                existingMatch.prediction = match.pred || existingMatch.prediction;
              }
            }
          },
        );
      })
      .finally(() => resolve(data));
  });
}
