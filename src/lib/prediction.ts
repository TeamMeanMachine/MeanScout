import { compareMatches } from "$lib";
import type { Comp } from "./comp";
import type { Entry, MatchEntry } from "./entry";

export function getAllScouts(comp: Comp, entries: Entry[]) {
  const scouts: { name: string; team?: string | undefined }[] = [];

  for (const entry of entries) {
    if (entry.scout && !scouts.some((s) => s.name == entry.scout && s.team == entry.scoutTeam)) {
      scouts.push({ name: entry.scout, team: entry.scoutTeam });
    }
  }

  for (const scout of comp.scouts || []) {
    if (!scouts.some((s) => s.name == scout && !s.team)) {
      scouts.push({ name: scout });
    }
  }

  return scouts;
}

export function getPredictionsPerScout(comp: Comp, entries: MatchEntry[]) {
  const allScouts = getAllScouts(comp, entries);

  const predictionsPerScout = allScouts
    .map((scout) => {
      const scoutEntries = entries
        .filter(
          (entry) =>
            entry.status != "draft" && entry.scout == scout.name && entry.scoutTeam == scout.team && entry.prediction,
        )
        .toSorted((a, b) => b.match - a.match);

      let correctGuesses = 0;
      let coopPoints = 0;

      for (const entry of scoutEntries) {
        const match = comp.matches.find((m) => compareMatches(m, entry) == 0);
        if (!match || !match.redScore || !match.blueScore) {
          continue;
        }

        if (match.redScore > match.blueScore && entry.prediction == "red") {
          correctGuesses++;

          const otherCorrectEntriesCount = entries.filter(
            (e) =>
              e.scout != scout.name &&
              e.scoutTeam != scout.team &&
              compareMatches(match, e) == 0 &&
              e.prediction == "red",
          ).length;
          coopPoints += otherCorrectEntriesCount;
        }

        if (match.blueScore > match.redScore && entry.prediction == "blue") {
          correctGuesses++;

          const otherCorrectEntriesCount = entries.filter(
            (e) =>
              e.scout != scout.name &&
              e.scoutTeam != scout.team &&
              compareMatches(match, e) == 0 &&
              e.prediction == "blue",
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
    .toSorted((a, b) => compareMatches(b, a))
    .map((match) => {
      const matchEntries = entries
        .filter(
          (entry) => entry.status != "draft" && compareMatches(match, entry) == 0 && entry.scout && entry.prediction,
        )
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
