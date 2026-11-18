# growth board

track up to six skills, log practice, run a focus timer and save learning resources. built with next.js, react and typescript.

open `/growth-board` to use the app.

everything stays in your browser for now. there is no database or authentication.

to run locally:

```sh
npm ci
npm run dev
```

the app folder contains the screens and components. the docs folder has the proposed database schema.

to check and build:

```sh
npm run lint
npm run build
```

## Growth Focus extension

A Momentum-inspired Chrome new-tab dashboard can start skill timers, record completed sessions in Growth Board, and block distractions during focus (including incognito when explicitly enabled). Load `extension/growth-focus` as an unpacked extension in Chrome, then connect your app address in its Settings.

See [the installation and implementation guide](docs/growth-focus-extension.md) for setup, features, sync/recovery behavior, incognito limits, privacy, and the exact scope compared with Momentum.

```sh
npm run test:growth-focus
npm run package:growth-focus
```
