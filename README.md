# LogoForge AI — Autonomous Brand & Logo Design Agent

A modern, production-grade full-stack AI Brand Architect web application. LogoForge pairs conversational AI orchestration with real-time vector image generation and an interactive canvas editor.

---

## ⚡ Features

- 🤖 **AI Brand Architect Chatbot**: Conversational agent powered by **OpenAI GPT-4o** that interviews users, extracts branding parameters, engineers master prompts, and generates commercial-ready logo marks.
- 🎨 **Interactive Canvas Editor (Fabric.js)**: Drag, scale, rotate, add custom typography layers (Google Fonts), geometric framing elements (badges, circles, rectangles), background toggles, and color adjustments.
- 🍃 **MongoDB Atlas Persistence**: Automatically connects to your Atlas cluster (`logo` database) to save generation history, metadata, prompts, and user designs.
- 🔐 **Secure 2FA & Authentication**: Built-in Google Authenticator (RFC 6238 TOTP) and NextAuth session integration.
- 🖤 **Monochrome Design System**: Pure black & white minimalist UI built with Tailwind CSS and Framer Motion spring micro-interactions.
- 📦 **High-Resolution Exports**: Download 2x Multiplier PNGs or Transparent PNGs ready for web, mobile, and merchandise.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/) + [React 19](https://react.dev/)
- **Language**: TypeScript
- **AI Brain & Generation**: OpenAI SDK (`gpt-4o-mini`, `gpt-image-1` / DALL-E)
- **Database & ORM**: MongoDB Atlas + Mongoose
- **Canvas Engine**: [Fabric.js](http://fabricjs.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Authentication**: NextAuth.js + `otplib` (Google Authenticator TOTP) + `qrcode`
- **Styling**: Tailwind CSS + Lucide Icons

---

## 📁 Architecture Overview

```
logo-genrator/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── ai/
│   │   │   │   ├── agent-chat/route.ts   # OpenAI Agent conversational reasoning & generation
│   │   │   │   └── generate-logo/route.ts# Core logo synthesis endpoint
│   │   │   ├── auth/
│   │   │   │   ├── [...nextauth]/route.ts# NextAuth handler
│   │   │   │   └── totp/setup/route.ts   # Google Authenticator QR generator
│   │   │   └── logos/route.ts            # MongoDB Atlas CRUD endpoints
│   │   ├── generate/page.tsx             # Studio: Agent Chat & Live Preview / Canvas Editor
│   │   ├── history/page.tsx              # My Logos gallery (fetched from MongoDB)
│   │   └── page.tsx                      # Minimalist Landing page with 2FA TOTP login
│   │
│   ├── components/
│   │   ├── canvas-editor/
│   │   │   └── logo-editor.tsx           # Fabric.js interactive canvas editor
│   │   ├── logo-generator/
│   │   │   ├── agent-chat.tsx            # Conversational Brand Architect chatbot
│   │   │   └── logo-canvas.tsx           # Live preview & inspector
│   │   ├── layout/                       # Minimal Navbar & Footer
│   │   └── ui/                           # Reusable UI primitives (Button, Card, Badge)
│   │
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── agent-orchestrator.ts     # OpenAI GPT-4o + Image Model reasoning engine
│   │   │   ├── prompts.ts                # Master prompt engineering templates
│   │   │   └── service.ts                # AI Provider abstraction layer
│   │   ├── auth/
│   │   │   ├── auth-options.ts           # NextAuth options & session strategy
│   │   │   └── totp.ts                   # TOTP generation & verification service
│   │   └── db/
│   │       ├── client.ts                 # MongoDB Atlas connection singleton
│   │       └── models/logo.model.ts      # Mongoose Logo Schema
│   │
│   ├── services/
│   │   └── logo.service.ts               # Database CRUD repository layer
│   └── types/                            # TypeScript interfaces (Logo, Chat, API)
│
├── .env.example                          # Environment variables template
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/HimanshuDoyeCBMO/brand-agent.git
cd brand-agent
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory:
```bash
cp .env.example .env.local
```
Fill in your credentials:
```env
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_string

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/logo?retryWrites=true&w=majority
DATABASE_URL=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/logo?retryWrites=true&w=majority
MONGODB_DB=logo

# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here
AI_API_KEY=your_openai_api_key_here
AI_PROVIDER=openai
```

### 4. Run the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📄 License
MIT License &copy; 2026 LogoForge AI.
