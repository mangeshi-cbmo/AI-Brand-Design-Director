# LogoForge AI

LogoForge AI is a Next.js application for generating, editing, and exporting AI-assisted brand logos. It includes a guided authentication flow, an AI logo generation studio, a canvas editor, logo history, and brand guideline tooling.

## Features

- AI logo generation with prompt-based brand direction
- Conversational design assistant for refining logo concepts
- Canvas-based logo editor for visual adjustments
- Logo history backed by MongoDB
- TOTP authentication with authenticator app setup
- PNG/SVG-oriented export workflow
- Docker and Google Cloud Build configuration

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- NextAuth
- MongoDB with Mongoose
- Google GenAI
- Fabric.js
- Framer Motion

## Getting Started

### Prerequisites

- Node.js `>=22 <23`
- pnpm `>=10.33.2 <11`
- MongoDB database
- AI provider API key

### Installation

```bash
pnpm install
```

### Environment Variables

Create a local environment file from the example:

```bash
cp .env.example .env.local
```

Then update the values:

```env
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_key_here

MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/logo?retryWrites=true&w=majority
DATABASE_URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/logo?retryWrites=true&w=majority
MONGODB_DB=logo

OPENAI_API_KEY=your_openai_api_key_here
AI_API_KEY=your_openai_api_key_here
AI_PROVIDER=openai

GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GCP_PROJECT_ID=
```

### Development

```bash
pnpm dev
```

Open `http://localhost:3000` in your browser.

## Available Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
```

## Project Structure

```text
src/app                 Next.js app routes and API endpoints
src/components          UI, layout, logo generator, brand kit, and canvas editor components
src/config              Site metadata, palettes, presets, and brand kit configuration
src/lib                 Shared utilities, auth, database, AI, and rendering helpers
src/services            Conversation and logo services
src/types               Shared TypeScript types
src/validators          Zod schemas
public                  Static assets
```

## API Routes

- `GET /api/health`
- `/api/auth/[...nextauth]`
- `POST /api/auth/totp/setup`
- `/api/logos`
- `/api/ai/generate-logo`
- `/api/ai/generate-svg-logo`
- `/api/ai/agent-chat`

## Deployment

This project includes a `Dockerfile` and `cloudbuild.yaml` for containerized deployment. Make sure all required environment variables are configured in the target environment before building and running the app.

## Notes

The app is private and currently configured as `logo-genrator` in `package.json`.
