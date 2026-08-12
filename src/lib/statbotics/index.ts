import createClient from "openapi-fetch";
import type { paths } from "./schema";

const API_URL = "https://api-statbotics.iterativerefinement.com";

export const Statbotics = createClient<paths>({ baseUrl: API_URL });

export namespace Statbotics {
  /** Copied over from [Statbotics frontend types](https://github.com/avgupta456/statbotics/blob/master/frontend/src/types/api.tsx). */
  export type TeamEvent = {
    team: number;
    year: number;
    event: string;
    time: number;
    team_name: string;
    event_name: string;
    country: string;
    state?: string;
    district?: string;
    type: string;
    week: number;
    status: string;
    first_event: boolean;
    epa: {
      total_points: { mean: number; sd: number };
      unitless: number;
      norm: number;
      conf: [number, number];
      breakdown: { [key: string]: number };
      stats: { start: number; pre_elim: number; mean: number; max: number };
    };
    record: {
      qual: {
        wins: number;
        losses: number;
        ties: number;
        count: number;
        winrate: number;
        rps: number;
        rps_per_match: number;
        rank: number;
        num_teams: number;
      };
      elim: {
        wins: number;
        losses: number;
        ties: number;
        count: number;
        winrate: number;
        alliance?: string;
        is_captain: boolean;
      };
      total: {
        wins: number;
        losses: number;
        ties: number;
        count: number;
        winrate: number;
      };
    };
  };

  /** Copied over from [Statbotics frontend types](https://github.com/avgupta456/statbotics/blob/master/frontend/src/types/api.tsx). */
  export type Match = {
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
    video?: string;
    alliances: {
      red: {
        team_keys: number[];
        surrogate_team_keys: number[];
        dq_team_keys: number[];
      };
      blue: {
        team_keys: number[];
        surrogate_team_keys: number[];
        dq_team_keys: number[];
      };
    };
    pred: {
      winner: string;
      red_win_prob: number;
      red_score: number;
      blue_score: number;
      [key: string]: any; // number
    };
    result: {
      winner: string;
      red_score: number;
      blue_score: number;
      red_no_foul: number;
      blue_no_foul: number;
      [key: string]: any; // boolean
    };
  };
}
