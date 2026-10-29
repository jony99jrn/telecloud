# Code Vault (Telegram storage)

Store your coursework code in your own Telegram account, for free.

- Each **folder** is a private Telegram channel (title starts with `CV · `).
- Each **entry** is the code file, plus optional question text and screenshots, saved in that channel with the date and time.
- Works in any browser on Android and Windows. You can also install it as an app from the browser menu.

## Deploy (new GitHub repo + Vercel)

1. Create a new GitHub repo, for example `codevault`, and push this folder to it.
2. On vercel.com choose **Add New, Project**, import the repo.
3. Vercel detects Vite by itself. Build command `npm run build`, output folder `dist`. Press Deploy.

To run it on your computer first: `npm install` then `npm run dev`.

## First use

1. Open https://my.telegram.org, log in, choose **API development tools**, and create an app. Copy the **API ID** and **API Hash**.
2. Open your site, enter the two keys, then your phone number and the login code Telegram sends you (plus your two-step password if you have one).
3. Create a folder, then add entries.

## Things to know

- Your API keys and login session are stored in this browser only (localStorage). Anyone with access to the browser profile has access to your Telegram account, so only sign in on your own devices.
- **Sign out** ends the Telegram session. You will need a new login code next time, and Telegram limits how often it sends them.
- Do not rename or delete the `CV · ` channels or the messages inside them in Telegram itself, or Code Vault will not find them.
- Screenshots are shrunk to at most 1600 px and sent as JPEG. Questions longer than about 3,900 characters are cut.
- If Telegram shows a security notice about a new login, that is this app signing in.

## Files

- `src/telegram.js` talks to Telegram (login, folders, entries).
- `src/main.js` is the interface, `src/styles.css` the look, `src/highlight.js` the code colours.
