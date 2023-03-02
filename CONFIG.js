const API_KEY = ""; //Paste your own API key here

const SPREADSHEET_ID = ""; //Paste your spreadsheet ID here
const SPREADSHEET_SHEET = ""; //This is the sheet we will send data to in your spreadsheet
const SPREADSHEET_RANGE = ""; //This is the cell we will start appending data to

const defaultTemplate = {
  metrics: [
    { name: "Toggle", type: "toggle", group: "Group" },
    { name: "Number", type: "number" },
    { name: "Select", type: "select", values: ["Value 1", "Value 2", "Value 3"] },
    { name: "Text", type: "text", tip: "Tip" },
    { name: "Rating", type: "rating" },
    { name: "Timer", type: "timer" },
  ],
};
