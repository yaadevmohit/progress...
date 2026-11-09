# LearnersLog

A single dashboard with local mock data. The header buttons are visual placeholders, and the mobile menu opens and closes locally.

## Run locally

```bash
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000).

## Read the UI

- `app/layout.tsx` renders the shared header.
- `app/page.tsx` lays out the dashboard and supplies the skill card examples.
- `app/ui/components/` contains the cards, heatmap, and recent sessions. The remaining mock values live in the components that render them.
