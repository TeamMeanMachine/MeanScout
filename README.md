# MeanScout

A lightweight FRC scouting web app built with SvelteKit.

https://meanscout.team2471.org

## Features

- Full offline support (progressive web app)
- Lightweight mobile-first design
- Red/blue color theme variants
- Customizable fields: toggles, numbers, selectors, textfields, ratings, and timers
- Optional team allowlisting
- Uses browser storage
- Export entries as CSV

## Built with

- [SvelteKit](https://kit.svelte.dev/)
- [FontAwesome](https://fontawesome.com/)
- [Fira Code](https://github.com/tonsky/FiraCode)

## Target

The target selector is used to remind your scouts which team/alliance they should scout. You can customize this in the main options page.

## Customization

Do you find it annoying to reprogram your team's scouting app for every competition? MeanScout solves that problem.

Simply create a new survey and give it a good name (e.g. District Champs 2023). Then, in the fields page, set up whatever fields you need. Give each a short, descriptive name, select the right type, and configure any additional settings for each field. For selectors, make sure to add some values in the additional settings.

Group fields can be created for organizing your fields. Additionally, fields (as well as group fields) can be duplicated; for instance, when you have multiple similar fields for Auto and Teleop.

In the options page, you can add teams to the survey's allowlist to prevent entering any teams not in the particular event.

## Exporting

You can export data from the survey options page.

After customizing your survey's fields, you can export the survey as a JSON file. Then, on another device, you can import that JSON file. You can also download all entries from one survey as a CSV file.

You'll have to manually send over the survey JSON file or entry CSV files between devices. Use Nearby Share, AirDrop, USB, email, messaging, or whatever else works best for your scouting system.

## Contributing

Find a problem? Make an issue!

Fix a problem? Make a pull request!

To develop MeanScout (or a fork), you will need Node.js/npm, a text editor, a terminal, and a browser. After cloning, use `npm install` and then `npm run dev` in the root folder to start tinkering.

[View the SvelteKit docs](https://kit.svelte.dev/docs/building-your-app) to learn how to build and deploy MeanScout.
