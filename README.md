# MeanScout

A lightweight FRC scouting web app with Google Sheets API integration.

## Features

- Full offline support (progressive web app)
- Lightweight mobile-first design
- Red/blue color variants, auto dark/light themes
- Customizable metrics: toggles, numbers, selectors, textfields, ratings, and timers
- Optional team whitelisting
- Uses browser storage to store surveys
- Different export methods (i.e. JSON and CSV)
- Can append data from every match to a Google Sheets spreadsheet
- Backups failed uploads to be uploaded later
- Verifies via OAuth

## Libraries

- [FontAwesome Icons](https://fontawesome.com/)
- [Workbox](https://developers.google.com/web/tools/workbox)
- [Google Sheets API](https://developers.google.com/sheets/api/guides/concepts)

Otherwise, MeanScout is built with native HTML/CSS/JS.

## Location

The location selector is used to remind your scouts which robot they should scout based on the robot's starting position.

## Customization

It can be annoying to reprogram your scouting app every year to change scouting metrics. To make things easier, metrics in MeanScout can be customized with templates.

To change the metrics present, simply copy and paste JSON-based templates into MeanScout. MeanScout comes with an example template to get you started. Here is its JSON:

```json
{
  "metrics": [
    { "name": "Toggle", "type": "toggle", "group": "Group" },
    { "name": "Number", "type": "number" },
    { "name": "Select", "type": "select", "values": ["Value 1", "Value 2", "Value 3"] },
    { "name": "Text", "type": "text", "tip": "Tip" },
    { "name": "Rating", "type": "rating" },
    { "name": "Timer", "type": "timer" }
  ]
}
```

The only metrics that can't be changed are team, match, and absent.

Each template should have an array of `metrics`. Optionally, a whitelist of `teams` can be included to help scouts correctly identify teams.

Each metric must have a `name` and a `type`. Use short/concise names for metrics to save space.

Types:

- `toggle`: A toggleable button. Value is a boolean.
- `number`: A number input with increment/decrement buttons. Value is an integer.
- `select`: A dropdown selector. Value is a string (selected option). There must be an array of string `values` to create options for the selector.
- `text`: A text input. Value is a string. Setting a `tip` value will add a placeholder within the input field.
- `rating`: A star rating bar. Value is a number (0-4).
- `timer`: A number input with timing controls. Value is a decimal.

Setting `group` to a string adds a label before the metric and moves the metric to a new line. Metrics after will appear to be grouped together.

## Exporting

When setting up MeanScout on your web server, paste your own API Key (with access to the Google Sheets API), your Spreadsheet ID, which Sheet you would like to access in your Spreadsheet, and what cell to start appending data at. For now you should also replace the Client ID with your own OAuth Client ID as the TMM OAuth is not public.

Once everything is setup and you are authenticated MeanScout will attempt to upload every single survey to your spreadsheet when the user submits it. If an upload fails it is saved to local storage to be uploaded later. In addition all data is backed up if you wish to use this version of the app offline and manually download surveys.

Surveys are stored in a JSON array. Each survey is also an array containing metric objects with names and values.

Currently, you can export surveys either as JSON or CSV. Here are some samples:

JSON:

```json
[
  [
    { "name": "Team", "value": "2471" },
    { "name": "Match", "value": "1" },
    { "name": "Absent", "value": false },
    { "name": "Toggle", "value": false },
    { "name": "Number", "value": 3 },
    { "name": "Select", "value": "Value 1" },
    { "name": "Text", "value": "MeanScout is cool" },
    { "name": "Rating", "value": 5 }
    { "name": "Timer", "value": 4.2 }
    // ... metrics
  ]
  // ... surveys
]
```

CSV:

```csv
"2471",1,false,false,3,"Value 1","MeanScout is cool",5,4.2, ... metrics
... surveys
```

## Contributing

Find a problem? Make an issue!

Fix a problem? Make a pull request!

All you'll need to develop MeanScout (or your own fork) is a text editor and a browser.
