import { calculateTeamData, normalizeTeamData, type PickList } from "$lib/analysis";
import type { Entry } from "$lib/entry";
import { getFieldsWithDetails } from "$lib/field";
import { loadSurveyPageData } from "../loadSurveyPageData";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const surveyId = Number(event.params.surveyId);
  const data = await loadSurveyPageData(surveyId);
  const fieldsWithDetails = getFieldsWithDetails(data.surveyRecord, data.fieldRecords);
  const columns = data.surveyType == "match" ? data.surveyRecord.pickLists.length : 0;

  if (data.surveyType != "match") {
    return {
      ...data,
      fieldsWithDetails,
      columns,
      teamsFromMatches: [] as string[],
      matchCountPerTeam: {} as Record<string, number>,
    };
  }

  const teamsFromMatches = data.surveyRecord.matches.flatMap((match) => [
    match.red1,
    match.red2,
    match.red3,
    match.blue1,
    match.blue2,
    match.blue3,
  ]);

  const matchCountPerTeam: Record<string, number> = {};
  for (const team of teamsFromMatches) {
    if (team in matchCountPerTeam) {
      matchCountPerTeam[team] += 1;
    } else {
      matchCountPerTeam[team] = 1;
    }
  }

  const entriesByTeam: Record<string, IDBRecord<Entry>[]> = {};
  for (const entry of data.entryRecords) {
    if (entry.team in entriesByTeam) {
      entriesByTeam[entry.team].push(entry);
    } else {
      entriesByTeam[entry.team] = [entry];
    }
  }

  const ranksPerPickList = data.surveyRecord.pickLists.map(createTeamPickListRanking);

  return {
    ...data,
    fieldsWithDetails,
    columns,
    teamsFromMatches,
    matchCountPerTeam,
    entriesByTeam,
    ranksPerPickList,
  };

  function createTeamPickListRanking(pickList: PickList) {
    if (data.surveyType != "match") return {};

    const pickListData: Record<string, number> = {};
    for (const team in entriesByTeam) {
      pickListData[team] = 0;
    }

    for (const { percentage, expressionName } of pickList.weights) {
      const teamData = calculateTeamData(
        expressionName,
        data.surveyRecord.expressions,
        entriesByTeam,
        fieldsWithDetails.orderedSingle,
      );
      const normalizedTeamData = normalizeTeamData(teamData, percentage);

      for (const team in normalizedTeamData) {
        pickListData[team] += normalizedTeamData[team];
      }
    }

    const normalizedPickListData = normalizeTeamData(pickListData);

    const sortedTeamRankings = Object.keys(pickListData)
      .map((team) => ({ team, percentage: normalizedPickListData[team] }))
      .toSorted((a, b) => b.percentage - a.percentage)
      .map((data, index) => ({ team: data.team, rank: index + 1 }));

    const rankPerTeam: Record<string, number> = {};
    for (const ranking of sortedTeamRankings) {
      rankPerTeam[ranking.team] = ranking.rank;
    }
    return rankPerTeam;
  }
};
