# AI Email Sorting App (Node.js + Express)

Features:
- Sign in with Google (OAuth2) and Gmail scopes
- Define custom categories with descriptions
- Polls new emails, uses AI to categorize + summarize, then archives in Gmail
- Category pages show summarized emails, with bulk delete and unsubscribe actions
- View original email content (HTML/text)
- MongoDB for persistence

## Prerequisites
- Node.js 18+
- MongoDB running locally or in the cloud
- Google Cloud project with OAuth client (Web) and Gmail API enabled
- OpenAI API key

## Environment Variables (.env)
```
PORT=3000
BASE_URL=http://localhost:3000
SESSION_SECRET=replace_with_random_string
MONGODB_URI=mongodb://localhost:27017/email_reader_app
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
OPENAI_API_KEY=your_openai_api_key
POLL_INTERVAL_CRON=*/2 * * * *
```

## Google OAuth Setup
- Create OAuth Client ID (type: Web)
- Authorized redirect URI: `http://localhost:3000/auth/google/callback`
- Add your Gmail as a Test User in Google Cloud Console (App Publishing Status: Testing)
- Scopes requested: `openid`, `email`, `profile`, `https://www.googleapis.com/auth/gmail.modify`

## Install and Run
```
npm install
npm run dev
```
Then visit `http://localhost:3000`.

## Notes
- MVP supports multiple Gmail accounts by authenticating in a separate session and accounts are associated to the same user by email. You can extend to a proper account linking UI.
- The poller fetches recent inbox emails (`newer_than:3d`) and archives them after import.
- Unsubscribe automation is best-effort using Puppeteer heuristics.
