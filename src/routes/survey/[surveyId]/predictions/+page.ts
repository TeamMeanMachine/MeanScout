import { loadSurveyPageData } from "../loadSurveyPageData";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const surveyId = Number(event.params.surveyId);
  const data = await loadSurveyPageData(surveyId);

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
      const entries = data.entryRecords.filter(
        (entry) => entry.status != "draft" && entry.scout == scout && entry.prediction,
      );
      let correctGuesses = 0;
      let points = 0;

      for (const entry of entries) {
        const match = data.surveyRecord.matches.find((m) => m.number == entry.match);
        if (!match || !match.redScore || !match.blueScore) {
          continue;
        }

        if (match.redScore > match.blueScore && entry.prediction == "red") {
          const otherCorrectEntriesCount = data.entryRecords.filter(
            (e) => e.scout != scout && e.match == match.number && e.prediction == "red",
          ).length;
          points += 1 + otherCorrectEntriesCount * 0.2;
          correctGuesses++;
        }

        if (match.blueScore > match.redScore && entry.prediction == "blue") {
          const otherCorrectEntriesCount = data.entryRecords.filter(
            (e) => e.scout != scout && e.match == match.number && e.prediction == "blue",
          ).length;
          points += 1 + otherCorrectEntriesCount * 0.2;
          correctGuesses++;
        }
      }

      return {
        scout,
        points,
        correctGuesses,
      };
    })
    .toSorted((a, b) => b.points - a.points);

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
  return { ...data, scouts, matches };
};
