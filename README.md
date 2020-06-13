# progressive-budget 💲

A progressive web app for tracking expenses. The app uses Express web server and mongodb for data persistence and Mongoose ORM. The app is a progressive web app that can be installed and works offline with full functionality.

- [Deployed app URL](#Deployed-app-URL)
- [Usage](#Usage)
- [Dependencies](#Dependencies)

## Deployed app URL

https://pwa-budget-project.herokuapp.com/

## Usage

- Click on the deployed app link.
- Add expenses or deposits.

- App can be installed on desktops or mobile deices.

  - The app can be used in offline mode as it uses indexedDB to keep a copy of the online database.

  - The app checks for online / offline status every second and syncs offline database and online databases.

## Dependencies

The app uses the following node modules.

- Express
- Mongoose
- Morgan
