import { getDetailedSingleFields } from "$lib/field";
import { loadSurveyPageData } from "../loadSurveyPageData";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const surveyId = Number(event.params.surveyId);
  const data = await loadSurveyPageData(surveyId);
  const fields = getDetailedSingleFields(data.surveyRecord, data.fieldRecords);

  if (data.surveyType != "match") {
    throw new Error("Survey type is not a match!");
  }

  const allScoutNames = [
    ...new Set([
      ...data.entryRecords.map((entry) => entry.scout).filter((scout) => scout !== undefined),
      ...(data.surveyRecord.scouts || []),
    ]),
  ];

  const scouts = allScoutNames
    .map((scout) => {
      const entries = data.entryRecords
        .filter((entry) => entry.status != "draft" && entry.scout == scout && entry.prediction)
        .toSorted((a, b) => b.match - a.match);

      let correctGuesses = 0;
      let coopPoints = 0;

      for (const entry of entries) {
        const match = data.surveyRecord.matches.find((m) => m.number == entry.match);
        if (!match || !match.redScore || !match.blueScore) {
          continue;
        }

        if (match.redScore > match.blueScore && entry.prediction == "red") {
          correctGuesses++;

          const otherCorrectEntriesCount = data.entryRecords.filter(
            (e) => e.scout != scout && e.match == match.number && e.prediction == "red",
          ).length;
          coopPoints += otherCorrectEntriesCount;
        }

        if (match.blueScore > match.redScore && entry.prediction == "blue") {
          correctGuesses++;

          const otherCorrectEntriesCount = data.entryRecords.filter(
            (e) => e.scout != scout && e.match == match.number && e.prediction == "blue",
          ).length;
          coopPoints += otherCorrectEntriesCount;
        }
      }

      const points = correctGuesses + coopPoints;
      const accuracy = entries.length > 0 ? correctGuesses / entries.length : 0;
      const adjustedPoints = accuracy > 0 ? points * accuracy : 0;

      return {
        scout,
        entries,
        points,
        coopPoints,
        correctGuesses,
        accuracy,
        adjustedPoints,
      };
    })
    .filter((scout) => scout.entries.length)
    .toSorted((a, b) => b.adjustedPoints - a.adjustedPoints);

  const totalAdjustedPoints = scouts.reduce((prev, curr) => curr.adjustedPoints + prev, 0);
  const totalPoints = scouts.reduce((prev, curr) => curr.points + prev, 0);
  const totalCoopPoints = scouts.reduce((prev, curr) => curr.coopPoints + prev, 0);
  const totalCorrectGuesses = scouts.reduce((prev, curr) => curr.correctGuesses + prev, 0);
  const overallAccuracy = totalCorrectGuesses / data.entryRecords.length;

  const matches = data.surveyRecord.matches
    .filter((match) => match.redScore !== undefined && match.blueScore !== undefined)
    .toSorted((a, b) => b.number - a.number)
    .map((match) => {
      const entries = data.entryRecords
        .filter((entry) => entry.status != "draft" && entry.match == match.number && entry.scout && entry.prediction)
        /*
        .map((entry) => {
          if (!entry.scout && !entry.prediction) {
            entry.scout = "Scout";
            entry.prediction = Math.random() > 0.5 ? "blue" : "red";
          }
          return entry;
        })
        //*/
        .toSorted((a, b) => a.scout?.localeCompare(b.scout || "") || 0);

      const redEntries = entries.filter((entry) => entry.prediction == "red");
      const blueEntries = entries.filter((entry) => entry.prediction == "blue");
      const predictedEntryCount = redEntries.length + blueEntries.length;

      const redScore = Number(match.redScore);
      const blueScore = Number(match.blueScore);
      const winner: "red" | "blue" | undefined =
        redScore > blueScore ? "red" : blueScore > redScore ? "blue" : undefined;

      return { ...match, redScore, blueScore, winner, redEntries, blueEntries, predictedEntryCount };
    })
    .filter((match) => match.predictedEntryCount);

  return {
    ...data,
    fields,
    scouts,
    totalAdjustedPoints,
    totalPoints,
    totalCoopPoints,
    totalCorrectGuesses,
    overallAccuracy,
    matches,
  };
};
