import { writable } from "svelte/store";
import MainOptions from "../routes/MainOptions.svelte";
import MainPage from "../routes/MainPage.svelte";
import SurveyConfigs from "../routes/SurveyConfigs.svelte";
import SurveyOptions from "../routes/SurveyOptions.svelte";
import SurveyPage from "../routes/SurveyPage.svelte";

export const locations = ["Red 1", "Red 2", "Red 3", "Blue 1", "Blue 2", "Blue 3"] as const;
type Location = (typeof locations)[number];

export const metricTypes = ["team", "match", "toggle", "number", "select", "text", "rating", "timer"] as const;
export type MetricType = (typeof metricTypes)[number];

type BaseConfig = {
  name: string;
  type: MetricType;
  group?: string;
  required?: boolean;
};

interface TeamConfig extends BaseConfig {
  type: "team";
}

interface MatchConfig extends BaseConfig {
  type: "match";
}

interface ToggleConfig extends BaseConfig {
  type: "toggle";
}

interface NumberConfig extends BaseConfig {
  type: "number";
}

interface SelectConfig extends BaseConfig {
  type: "select";
  values: string[];
}

interface TextConfig extends BaseConfig {
  type: "text";
  long?: boolean;
  tip?: string;
}

interface RatingConfig extends BaseConfig {
  type: "rating";
}

interface TimerConfig extends BaseConfig {
  type: "timer";
}

interface MetricConfigTypeMap {
  team: TeamConfig;
  match: MatchConfig;
  toggle: ToggleConfig;
  number: NumberConfig;
  select: SelectConfig;
  text: TextConfig;
  rating: RatingConfig;
  timer: TimerConfig;
}

export type MetricConfig = MetricConfigTypeMap[MetricType];

export type Entry = any[];

export type Survey = {
  name: string;
  configs: MetricConfig[];
  teams: string[];
  entries: Entry[];
};

function localStorageStore<T>(key: string, start: T, subscriber?: (val: T) => void) {
  try {
    if (typeof start == "string") {
      start = localStorage[key] ?? start;
    } else {
      start = JSON.parse(localStorage[key]);
    }
  } finally {
    let store = writable(start);
    store.subscribe((value) => {
      if (typeof value == "string") {
        localStorage[key] = value;
      } else {
        localStorage[key] = JSON.stringify(value);
      }
      if (subscriber) subscriber(value);
    });
    return store;
  }
}

export const surveys = localStorageStore<Survey[]>("surveys", []);
export const location = localStorageStore<Location>("location", "Red 1", (location) => {
  let newTheme = location.split(" ")[0].toLowerCase();
  document.documentElement.style.setProperty("--theme-color", `var(--${newTheme})`);
});

export function parseSurvey(surveyString: string): string | Survey {
  let result: Survey;
  let error = "";
  try {
    result = JSON.parse(surveyString) as Survey;
  } catch (e) {
    return "\nInvalid survey string";
  }
  if (!result.name) {
    error += "\nSurvey has no name";
  }
  if (!Array.isArray(result.teams ?? [])) {
    error += "\nSurvey has invalid teams";
  }
  if (!result.configs) {
    error += "\nSurvey has no metrics";
  } else {
    result.configs.forEach((metric, i) => {
      if (!metric.name) {
        error += `\nMetric ${i + 1} has no name`;
      }
      if (metric.type == "select" && !Array.isArray(metric.values ?? [])) {
        error += `\nMetric ${metric.name ?? i + 1} has invalid values`;
      }
      if (!metricTypes.includes(metric.type)) {
        error += `\nMetric ${metric.name ?? i + 1} has invalid type`;
      }
    });
  }
  if (error) {
    return error;
  }
  return result;
}

function entryToCSV(values: Entry) {
  let csv = "";
  values.forEach((value) => {
    if (typeof value == "string") {
      csv += `,${value.replaceAll(",", "").replaceAll("\n", ". ").trim()}`;
    } else {
      csv += `,${value}`;
    }
  });
  return csv;
}

function surveyToCSV(survey: Survey) {
  let csv = "";
  survey.configs.forEach((config) => {
    csv += `,${config.name}`;
  });
  csv += "\n";
  survey.entries.forEach((entry) => {
    csv += `${entryToCSV(entry)}\n`;
  });
  return csv;
}

export function downloadSurveyEntries(survey: Survey) {
  const anchor = document.createElement("a");
  anchor.download = "surveys.csv";
  anchor.href = "data:text/plain;charset=utf-8," + encodeURIComponent(surveyToCSV(survey));
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

export function getMetricDefaultValue(config: MetricConfig) {
  switch (config.type) {
    case "team":
      return "";
    case "match":
      return 1;
    case "toggle":
      return false;
    case "number":
      return 0;
    case "select":
      return config.values[0];
    case "text":
      return "";
    case "rating":
      return 0;
    case "timer":
      return 0;
    default:
      return undefined;
  }
}

export function validateEntry(survey: Survey, entry: Entry) {
  let error = "";
  entry.forEach((value, i) => {
    switch (survey.configs[i].type) {
      case "team":
        if (!/^\d{1,4}[A-Z]?$/.test(value)) {
          error = `Invalid value for ${survey.configs[i].name}`;
        }
        if (survey.teams.length && !survey.teams.includes(value)) {
          error = `Invalid value for ${survey.configs[i].name} (team not whitelisted)`;
        }
        break;
      case "match":
        if (!/\d{1,3}/.test(`${value}`)) {
          error = `Invalid value for ${survey.configs[i].name}`;
        }
        break;
      case "text":
        if (!value.trim()) error = `Invalid value for ${survey.configs[i].name}`;
        break;
    }
    if (typeof value == "undefined" || typeof value !== typeof getMetricDefaultValue(survey.configs[i])) {
      error = `Invalid value for ${survey.configs[i].name}`;
    }
  });
  return error;
}