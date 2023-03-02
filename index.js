if ("serviceWorker" in navigator) {
  window.onload = () => navigator.serviceWorker.register("./sw.js");
}

const CLIENT_ID = "155768213524-qjadle6fmokbb21i5rjanf050a99l3je.apps.googleusercontent.com";

const DISCOVERY_DOC = "https://sheets.googleapis.com/$discovery/rest?version=v4";
const SCOPES = "https://www.googleapis.com/auth/spreadsheets";

let tokenClient;
let gapiInited = false;
let gisInited = false;
let authorized = false;
if(localStorage.storedToken == null) localStorage.storedToken = "";
if(localStorage.surveys == null) localStorage.surveys = "[]";
if(localStorage.pendingUploadSurveys == null) localStorage.pendingUploadSurveys = "[]";

const authorizeButton = document.getElementById("authorize-btn");
const signOutButton = document.getElementById("signout-btn");
const uploadButton = document.getElementById("surveys-upload-btn");
const sheetStatusIcon = document.getElementById("sheet-icn");

authorizeButton.onclick = () => {
  tokenClient.requestAccessToken();
};

signOutButton.onclick = () => {
  const token = gapi.client.getToken();
  if (token !== null) {
    google.accounts.oauth2.revoke(token.access_token);
    gapi.client.setToken("");
    authorizeButton.innerHTML = "<i class='auth text-icon'></i>Authorize";
    refreshIcons(authorizeButton);
    sheetStatusIcon.innerHTML = "<i class='hide'></i>";
    refreshIcons(sheetStatusIcon);
    signOutButton.style.display = "none";
    uploadButton.style.display = "none";
    localStorage.storedToken = "";
    authorized = false;
  }
};

uploadButton.onclick = () => {
  try {
    if(localStorage.getItem("pendingUploadSurveys") == "[]") {
      alert("No surveys are pending upload.");
    } else {
      let numUp = JSON.parse(localStorage.pendingUploadSurveys).length;
      const body = (JSON.parse(localStorage.getItem("pendingUploadSurveys")) || []).map((pendingUploadSurveys) => pendingUploadSurveys.map((obj) => obj.value));
      gapi.client.sheets.spreadsheets.values
        .append({
          spreadsheetId: SPREADSHEET_ID,
          resource: { values: body },
          range: SPREADSHEET_SHEET + "!" + SPREADSHEET_RANGE,
          valueInputOption: "RAW",
        })
        .then((response) => {
          const result = response.result;
          console.log(`${result.updates.updatedCells} cells appended.`);
          localStorage.pendingUploadSurveys = "[]";
          alert(numUp + " survey(s) uploaded");
        });
    }
  } catch (err) {
    console.log(err);
    alert("Could not upload:\n" + err);
  }
};

authorizeButton.style.display = "none";
signOutButton.style.display = "none";
uploadButton.style.display = "none";

function gapiLoaded() {
  gapi.load("client", async () => {
    await gapi.client.init({
      apiKey: API_KEY,
      discoveryDocs: [DISCOVERY_DOC],
    });
    gapiInited = true;
    if(localStorage.storedToken !== "") {
      gapi.client.setToken(JSON.parse(localStorage.storedToken));
      signOutButton.style.display = "initial";
      authorizeButton.innerHTML = "<i class='undo text-icon'></i>Reload";
      refreshIcons(authorizeButton);
      sheetStatusIcon.innerHTML = "<i class='sheet text-icon'></i>";
      refreshIcons(sheetStatusIcon);
      uploadButton.style.display = "initial";
      authorized = true;
    }
    maybeEnableButtons();
  });
}

function gisLoaded() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    prompt: "",
    callback: async (resp) => {
      if (resp.error !== undefined) {
        throw resp;
      }
      localStorage.storedToken = JSON.stringify(gapi.client.getToken());
      signOutButton.style.display = "initial";
      authorizeButton.innerHTML = "<i class='undo text-icon'></i>Reload";
      refreshIcons(authorizeButton);
      sheetStatusIcon.innerHTML = "<i class='sheet text-icon'></i>";
      refreshIcons(sheetStatusIcon);
      uploadButton.style.display = "initial";
      authorized = true;
    },
  });
  gisInited = true;
  maybeEnableButtons();
}

function maybeEnableButtons() {
  if (gapiInited && gisInited) {
    authorizeButton.style.display = "initial";
  }
}

const menuToggleButton = document.querySelector("#menu-toggle-btn");
const locationText = document.querySelector("#location-text");
const menuDiv = document.querySelector("#menu");
const locationSelect = document.querySelector("#location-select");
const templateCopyButton = document.querySelector("#template-copy-btn");
const templateEditButton = document.querySelector("#template-edit-btn");
const downloadSelect = document.querySelector("#download-type-sel");
const surveysDownloadButton = document.querySelector("#surveys-download-btn");
const surveysEraseButton = document.querySelector("#surveys-erase-btn");
const teamMetric = document.querySelector("#metric-team");
const teamMetricList = document.querySelector("#teams-list");
const matchMetric = document.querySelector("#metric-match");
const absentMetric = document.querySelector("#metric-absent");
const customMetricsDiv = document.querySelector("#metrics-custom");
const surveySaveButton = document.querySelector("#survey-save-btn");
const surveyResetButton = document.querySelector("#survey-reset-btn");

menuToggleButton.onclick = () => toggleMenu();
locationSelect.onchange = (e) => setLocation(e.target.value);
templateCopyButton.onclick = () => copyTemplate();
templateEditButton.onclick = () => editTemplate();
surveysDownloadButton.onclick = () => downloadSurveys();
surveysEraseButton.onclick = () => eraseSurveys();
teamMetric.oninput = () => backupSurvey();
matchMetric.oninput = () => backupSurvey();
absentMetric.onclick = () => toggleAbsent();
surveySaveButton.onclick = () => saveSurvey();
surveyResetButton.onclick = () => resetSurvey();

let scoutLocation = "Red Near";
let matchCount = 1;
let isAbsent = false;
let gameMetrics = [];

var current = new Date();

// If you make a new type, be sure to add it here
const metricTypes = {
  toggle: ToggleMetric,
  number: NumberMetric,
  select: SelectMetric,
  text: TextMetric,
  rating: RatingMetric,
  timer: TimerMetric,
};

// The default template showcases each metric type
// TODO XMLHttpRequest is deprecated replace with more elegant solution later
let defaultTemplate;
let xhr = new XMLHttpRequest();
xhr.open("GET", "./DEFAULT-TEMPLATE.json", false);
xhr.send();
if (xhr.status === 200) {
  try {
    const data = JSON.parse(xhr.responseText);
    defaultTemplate = {
      metrics: data.metrics,
    };
  } catch(err) {
    console.error("Failed to load DEFAULT-TEMPLATE.json, falling back to stock template\n" + err);
    defaultTemplate = {
      metrics: [
        { name: "Toggle", type: "toggle", group: "Group" },
        { name: "Number", type: "number" },
        { name: "Select", type: "select", values: ["Value 1", "Value 2", "Value 3"] },
        { name: "Text", type: "text", tip: "Tip" },
        { name: "Rating", type: "rating" },
        { name: "Timer", type: "timer" },
      ],
    };
  } 
} else {
  console.error("Failed to load DEFAULT-TEMPLATE.json, falling back to stock template\n" + xhr.statusText);
  defaultTemplate = {
    metrics: [
      { name: "Toggle", type: "toggle", group: "Group" },
      { name: "Number", type: "number" },
      { name: "Select", type: "select", values: ["Value 1", "Value 2", "Value 3"] },
      { name: "Text", type: "text", tip: "Tip" },
      { name: "Rating", type: "rating" },
      { name: "Timer", type: "timer" },
    ],
  };
}

let currentTemplate = JSON.parse(localStorage.template ?? JSON.stringify(defaultTemplate));
loadTemplate(currentTemplate);
setLocation(localStorage.location ?? "Red Near");

if (localStorage.backup) {
  const backup = JSON.parse(localStorage.backup);
  teamMetric.value = backup.find((metric) => metric.name == "Team").value;
  matchCount = backup.find((metric) => metric.name == "Match").value;
  matchMetric.value = matchCount;
  isAbsent = backup.find((metric) => metric.name == "Absent").value;
  if (isAbsent) {
    absentMetric.innerHTML = "<i class='square-checked text-icon'></i>Absent";
    customMetricsDiv.classList.toggle("hide");
    refreshIcons(absentMetric);
  }
  gameMetrics.forEach((metric) => {
    metric.update(backup.find((m) => m.name == metric.name).value);
  });
}

/** Stores the current unsaved survey to `localStorage` */
function backupSurvey() {
  localStorage.backup = JSON.stringify([
    { name: "Team", value: teamMetric.value },
    { name: "Match", value: matchMetric.value },
    { name: "Absent", value: isAbsent },
    ...gameMetrics.map((metric) => {
      return { name: metric.name, value: metric.value };
    }),
  ]);
}

/** Toggles the options menu */
function toggleMenu() {
  menuDiv.classList.toggle("hide");
}

/** Toggles whether the team is absent */
function toggleAbsent() {
  customMetricsDiv.classList.toggle("hide");
  absentMetric.innerHTML = `<i class="square-${isAbsent ? "empty" : "checked"} text-icon"></i>Absent`;
  refreshIcons(absentMetric);
  isAbsent = !isAbsent;
  backupSurvey();
}

/** Copies the current template to clipboard */
function copyTemplate() {
  const input = document.createElement("input");
  input.value = JSON.stringify(currentTemplate);
  document.body.append(input);
  input.select();
  input.setSelectionRange(0, input.value.length);
  document.execCommand("copy");
  input.remove();
  alert("Copied template");
}

/** Requests a new template and checks if the template is valid */
function editTemplate() {
  const newPrompt = prompt("Paste new template (you can also 'reset' the template):");
  if (newPrompt) {
    if (newPrompt == "reset") {
      setTemplate();
    } else {
      const newTemplate = JSON.parse(newPrompt);
      let error;
      if (newTemplate.metrics) {
        newTemplate.metrics.forEach((metric) => {
          if (!metric.name) error = "Metric has no name";
          if (!Array.isArray(metric.values ?? [])) error = "Metric has invalid values";
          if (!metricTypes.hasOwnProperty(metric.type)) error = "Metric has invalid type";
        });
      } else error = "Template has no metrics";
      if (error) {
        alert(`Could not set template! ${error}`);
        return;
      }
      setTemplate(newTemplate);
    }
  }
}

/**
 * Sets a new template or to example template
 * @param {object} newTemplate An object that contains template data
 */
function setTemplate(newTemplate = defaultTemplate) {
  currentTemplate = JSON.parse(JSON.stringify(newTemplate));
  localStorage.template = JSON.stringify(currentTemplate ?? "");
  loadTemplate(currentTemplate);
  backupSurvey();
  refreshIcons();
}

/**
 * Loads a template into the UI
 * @param {object} newTemplate An object that contains template data
 */
function loadTemplate(newTemplate = defaultTemplate) {
  teamMetricList.innerHTML = "";
  if (newTemplate.teams) {
    newTemplate.teams.forEach((team) => {
      teamMetricList.innerHTML += `<option value="${team}">`;
    });
  }
  customMetricsDiv.innerHTML = "";
  gameMetrics = [];
  let metricObject;
  newTemplate.metrics.forEach((metric) => {
    metricObject = new metricTypes[metric.type](metric);
    if (metric.group) {
      let groupSpan = document.createElement("span");
      groupSpan.classList.add("group");
      groupSpan.innerHTML = metric.group;
      customMetricsDiv.append(groupSpan);
    }
    customMetricsDiv.append(metricObject.element);
    gameMetrics.push(metricObject);
  });
}

/**
 * Sets a new scout location
 * @param {string} newLocation A string that includes alliance color and robot position
 */
function setLocation(newLocation = "Red Near") {
  scoutLocation = newLocation;
  let newTheme = "red";
  if (/blue/.test(newLocation.toLowerCase())) newTheme = "blue";
  document.documentElement.style.setProperty("--theme-color", `var(--${newTheme})`);
  localStorage.location = newLocation;
  locationText.innerHTML = newLocation;
  locationSelect.value = newLocation;
  refreshIcons();
}

/** Validates and saves the current survey to `localStorage` */
function saveSurvey() {
  // Matches a 1-4 long sequence of numbers and an optional character
  if (!/^\d{1,4}[A-Z]?$/.test(teamMetric.value)) {
    alert("Invalid team value");
    teamMetric.focus();
    return;
  }
  if (currentTemplate.teams) {
    if (!currentTemplate.teams.some((team) => team == teamMetric.value)) {
      alert("Invalid team value");
      teamMetric.focus();
      return;
    }
  }
  // Matches a 1-3 long sequence of numbers
  if (!/\d{1,3}/.test(matchMetric.value)) {
    alert("Invalid match value");
    matchMetric.focus();
    return;
  }
  if (!confirm("Confirm save?")) return;
  let surveys = JSON.parse(localStorage.surveys ?? "[]");
  surveys.push([
    { name: "Team", value: teamMetric.value },
    { name: "Match", value: matchMetric.value },
    { name: "Absent", value: isAbsent },
    ...gameMetrics.map((metric) => {
      return { name: metric.name, value: metric.value };
    }),
  ]);
  localStorage.surveys = JSON.stringify(surveys);
  resetSurvey(false);
  if(authorized) {
    try {
      const body = [JSON.parse(localStorage.getItem("surveys"))[surveys.length - 1].map(obj => obj.value)];
      gapi.client.sheets.spreadsheets.values
        .append({
          spreadsheetId: SPREADSHEET_ID,
          resource: { values: body },
          range: SPREADSHEET_SHEET + "!" + SPREADSHEET_RANGE,
          valueInputOption: "RAW",
        })
        .then((response) => {
          const result = response.result;
          console.log(`${result.updates.updatedCells} cells appended.`);
        });
    } catch (err) {
      console.log(err);
      let pendingUploadSurveys = JSON.parse(localStorage.pendingUploadSurveys ?? "[]");
      pendingUploadSurveys.push(JSON.parse(localStorage.getItem("surveys"))[surveys.length - 1]);
      localStorage.pendingUploadSurveys = JSON.stringify(pendingUploadSurveys);
      alert("Survey failed to upload, use the manual \"Upload\" button later to try again.");
    }
  }
}

/**
 * Resets the current survey
 * @param {boolean} askUser A boolean that represents whether to prompt the user
 */
function resetSurvey(askUser = true) {
  if (askUser) if (prompt("Type 'reset' to reset the survey") != "reset") return;
  teamMetric.value = "";
  teamMetric.focus();
  if (!askUser) {
    matchCount = parseInt(matchMetric.value) + 1;
    matchMetric.value = matchCount;
  }
  if (isAbsent) toggleAbsent();
  gameMetrics.forEach((metric) => metric.reset());
  refreshIcons();
  localStorage.backup = "";
}

/**
 * Downloads all surveys from `localStorage` either as JSON or CSV
 * @param {boolean} askUser A boolean that represents whether to prompt the user
 */
function downloadSurveys(askUser = true) {
  let downloadFrom = localStorage.surveys;
  if(localStorage.surveys == "[]" && localStorage.pendingUploadSurveys == "[]") { alert("There are no surveys to download"); return; }
  if(localStorage.pendingUploadSurveys !== "[]" && confirm("There are currently " + JSON.parse(localStorage.pendingUploadSurveys).length + " survey(s) pending upload... download them instead?")) {
    downloadFrom = localStorage.pendingUploadSurveys;
  } else {
    if(askUser) if(!confirm("There is a total of " + JSON.parse(localStorage.surveys).length + " offline survey(s)... download them?")) return;  
  }
  const anchor = document.createElement("a");
  anchor.href = "data:text/plain;charset=utf-8,";
  switch (downloadSelect.value) {
    case "JSON":
      anchor.href += encodeURIComponent(downloadFrom);
      anchor.download =
        scoutLocation + " Surveys " + current.toLocaleDateString() + "@" + current.toLocaleTimeString() + ".json";
      break;
    case "CSV":
      let surveys = JSON.parse(downloadFrom);
      let csv = "";
      if (surveys) {
        surveys.forEach((survey) => {
          let surveyAsCSV = "";
          survey.forEach((metric) => {
            if (typeof metric.value == "string") surveyAsCSV += '"' + metric.value + '",';
            else surveyAsCSV += metric.value + ",";
          });
          csv += surveyAsCSV + "\n";
        });
      }
      anchor.href += encodeURIComponent(csv);
      anchor.download =
        scoutLocation + " Surveys " + current.toLocaleDateString() + "@" + current.toLocaleTimeString() + ".csv";
      break;
  }
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

/** Erases all surveys from `localStorage` after prompting the user */
function eraseSurveys() {
  if(prompt("Type 'erase' to erase saved surveys") == "erase") { localStorage.surveys = "[]"; localStorage.pendingUploadSurveys = "[]" }
}
