import type { Comp } from "./comp";
import type { Entry, MatchEntry } from "./entry";

export function getAllScoutNames(comp: Comp, entries: Entry[]) {
  return [
    ...new Set([...entries.map((entry) => entry.scout).filter((scout) => scout !== undefined), ...(comp.scouts || [])]),
  ];
}

export function getPredictionsPerScout(comp: Comp, entries: MatchEntry[]) {
  const allScoutNames = getAllScoutNames(comp, entries);

  const predictionsPerScout = allScoutNames
    .map((scout) => {
      const scoutEntries = entries
        .filter((entry) => entry.status != "draft" && entry.scout == scout && entry.prediction)
        .toSorted((a, b) => b.match - a.match);

      let correctGuesses = 0;
      let coopPoints = 0;

      for (const entry of scoutEntries) {
        const match = comp.matches.find((m) => m.number == entry.match);
        if (!match || !match.redScore || !match.blueScore) {
          continue;
        }

        if (match.redScore > match.blueScore && entry.prediction == "red") {
          correctGuesses++;

          const otherCorrectEntriesCount = entries.filter(
            (e) => e.scout != scout && e.match == match.number && e.prediction == "red",
          ).length;
          coopPoints += otherCorrectEntriesCount;
        }

        if (match.blueScore > match.redScore && entry.prediction == "blue") {
          correctGuesses++;

          const otherCorrectEntriesCount = entries.filter(
            (e) => e.scout != scout && e.match == match.number && e.prediction == "blue",
          ).length;
          coopPoints += otherCorrectEntriesCount;
        }
      }

      const points = correctGuesses + coopPoints;
      const accuracy = scoutEntries.length > 0 ? correctGuesses / scoutEntries.length : 0;
      const adjustedPoints = accuracy > 0 ? points * accuracy : 0;

      return {
        scout,
        entries: scoutEntries,
        points,
        coopPoints,
        correctGuesses,
        accuracy,
        adjustedPoints,
      };
    })
    .filter((scout) => scout.entries.length)
    .toSorted((a, b) => b.adjustedPoints - a.adjustedPoints);

  const totalAdjustedPoints = predictionsPerScout.reduce((prev, curr) => curr.adjustedPoints + prev, 0);
  const totalPoints = predictionsPerScout.reduce((prev, curr) => curr.points + prev, 0);
  const totalCoopPoints = predictionsPerScout.reduce((prev, curr) => curr.coopPoints + prev, 0);
  const totalCorrectGuesses = predictionsPerScout.reduce((prev, curr) => curr.correctGuesses + prev, 0);
  const overallAccuracy = totalCorrectGuesses / entries.length;

  return {
    predictionsPerScout,
    totalAdjustedPoints,
    totalPoints,
    totalCoopPoints,
    totalCorrectGuesses,
    overallAccuracy,
  };
}

export function getPredictionsPerMatch(comp: Comp, entries: MatchEntry[]) {
  return comp.matches
    .filter((match) => match.redScore !== undefined && match.blueScore !== undefined)
    .toSorted((a, b) => b.number - a.number)
    .map((match) => {
      const matchEntries = entries
        .filter((entry) => entry.status != "draft" && entry.match == match.number && entry.scout && entry.prediction)
        .toSorted((a, b) => a.scout?.localeCompare(b.scout || "") || 0);

      const redEntries = matchEntries.filter((entry) => entry.prediction == "red");
      const blueEntries = matchEntries.filter((entry) => entry.prediction == "blue");
      const predictedEntryCount = redEntries.length + blueEntries.length;

      const redScore = Number(match.redScore);
      const blueScore = Number(match.blueScore);
      const winner: "red" | "blue" | undefined =
        redScore > blueScore ? "red" : blueScore > redScore ? "blue" : undefined;

      return { ...match, redScore, blueScore, winner, redEntries, blueEntries, predictedEntryCount };
    })
    .filter((match) => match.predictedEntryCount);
}
