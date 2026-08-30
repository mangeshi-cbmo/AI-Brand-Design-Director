# Project Architecture & System Design

This document outlines the complete architectural blueprints, component interactions, data pipelines, and design systems powering the **LogoForge AI Brand Design Director** platform.

---

## 1. High-Level System Architecture

The application is built on a full-stack Next.js App Router architecture integrated with Google Cloud Platform Vertex AI (Gemini Models), MongoDB Atlas, and Google Cloud Storage.

```mermaid
graph TD
    Client["Client Browser (React 19 / Next.js 16)"]
    
    subgraph Frontend["Frontend Layer (App Router)"]
        UI_Home["Landing Page (Dark Theme)"]
        UI_Studio["Studio / Generator (/generate)"]
        UI_History["Logo Gallery & History (/history)"]
        UI_Editor["SVG Interactive Canvas Editor (/editor)"]
        UI_BrandKit["Brand Guidelines Modal & Viewer"]
    end

    subgraph API_Routes["Next.js API Layer (/api)"]
        API_Agent["/api/ai/agent-chat (Conversational LLM)"]
        API_SVG["/api/ai/generate-svg-logo (Direct SVG Synthesis)"]
        API_Logos["/api/logos (CRUD & Batch Operations)"]
        API_Usage["/api/usage (Token Cost & Usage Telemetry)"]
        API_Auth["/api/auth (2FA TOTP & Session Security)"]
    end

    subgraph AI_Core["AI & Design Intelligence Core"]
        AgentOrch["Agent Orchestrator (Intent & Reasoning)"]
        SVGGen["Structured SVG Generator (Gemini 2.5)"]
        BrandGuideEngine["Brand Guidelines Engine (Typography & Palette)"]
        SVGRenderer["SVG Renderer & Path Normalizer"]
    end

    subgraph Data_Storage["Data & Asset Persistence"]
        Mongo["MongoDB Atlas ('agent_brand_db')"]
        Mongo_Logos[("Logos Collection")]
        Mongo_Conv[("Conversations Collection")]
        Mongo_Usage[("Token Usage Collection")]
        GCS["Google Cloud Storage (Buckets)"]
    end

    Client --> UI_Home
    Client --> UI_Studio
    Client --> UI_History
    Client --> UI_Editor
    Client --> UI_BrandKit

    UI_Studio --> API_Agent
    UI_Studio --> API_SVG
    UI_History --> API_Logos
    UI_Studio --> API_Usage

    API_Agent --> AgentOrch
    API_SVG --> SVGGen
    AgentOrch --> SVGGen
    AgentOrch --> BrandGuideEngine

    SVGGen --> SVGRenderer
    SVGRenderer --> Mongo_Logos
    API_Agent --> Mongo_Conv
    API_Usage --> Mongo_Usage
    API_Logos --> Mongo_Logos
    SVGGen -.-> GCS
```

---

## 2. AI Reasoning & SVG Synthesis Pipeline

The platform uses a two-stage generative design loop:

1. **Conversational Stage**: Analyzes client requirements, extracts brand parameters (name, industry, style, color palette), and manages conversation context.
2. **Deterministic SVG Generation Stage**: Generates structured vector JSON schemas and transforms them into clean, scalable SVG markup.

```mermaid
sequenceDiagram
    autonumber
    actor User as Client / User
    participant ChatUI as AgentChat UI
    participant Route as /api/ai/agent-chat
    participant Orch as AgentOrchestrator
    participant Gemini as Google Vertex AI (Gemini)
    participant SVG as Structured SVG Engine
    participant DB as MongoDB Atlas

    User->>ChatUI: Sends message ("Apex Labs, AI Infrastructure, 3D style")
    ChatUI->>Route: POST /api/ai/agent-chat (message, context, sessionId)
    Route->>Orch: processMessage(message, context)
    
    rect rgb(20, 25, 35)
        note over Orch,Gemini: Stage 1: Intent Analysis & Spec Gathering
        Orch->>Gemini: Prompt with current spec & conversation history
        Gemini-->>Orch: Structured JSON (assistantMessage, updatedContext, flags)
    end

    alt shouldGenerateLogo == true
        rect rgb(25, 35, 25)
            note over Orch,SVG: Stage 2: Multi-Concept SVG Generation
            Orch->>SVG: generateStructuredLogos(spec, count: 4)
            SVG->>Gemini: Request vector layer primitives (paths, text, colors)
            Gemini-->>SVG: 4 Distinct LogoData concept objects
            SVG->>DB: Save 4 concepts to logos collection
            DB-->>SVG: Saved logo IDs & metadata
        end
    end

    alt shouldGenerateGuidelines == true
        rect rgb(35, 30, 20)
            note over Orch,Gemini: Stage 3: Brand Guidelines Formulation
            Orch->>Gemini: Synthesize Brand Story, Personality Traits, Do's & Don'ts
            Gemini-->>Orch: Narrative Copy
            Orch->>Orch: Combine with deterministic typography & palette rules
        end
    end

    Orch->>DB: Append conversation turn (userMessage, assistantMessage, logoIds)
    Orch-->>Route: Return orchestration result
    Route-->>ChatUI: Display dynamic response, Concept variations, or Guidelines Card
    ChatUI-->>User: Interactive visual preview & options
```

---

## 3. Brand Guidelines & Identity System Architecture

The Brand Guidelines system produces exportable corporate identity books with fixed typographic hierarchy, accessibility checks, and dynamic mark rendering.

```mermaid
graph LR
    Input["Brand Context (Name, Industry, Style, Palette)"] --> Engine["Brand Guidelines Engine"]

    subgraph DeterministicRules["Design Tokens & Rules"]
        TypeMaps["Typography Pairings Map (Heading / Body)"]
        PaletteRules["Color Palette Specifications & Usage Rules"]
        SpaceRules["Clear Space (¼×) & Min Size Rules"]
    end

    subgraph AICopy["AI Narrative Generation (Gemini)"]
        Story["Brand Mission & Origin Story"]
        Traits["4 Core Brand Personality Adjectives"]
        Dos["4 Logo Usage Do's"]
        Donts["4 Logo Usage Don'ts"]
    end

    DeterministicRules --> Engine
    AICopy --> Engine

    Engine --> DocOutput["BrandGuidelines Object"]
    DocOutput --> UI_Modal["Interactive React Modal (BrandGuidelinesModal)"]
    DocOutput --> PDF_Exp["Print-Ready PDF Export"]
    DocOutput --> HTML_Exp["Standalone Single-File HTML Export"]
```

---

## 4. Frontend Component Hierarchy

The interface is divided into modular, stateful components that synchronize through reactive callbacks:

```mermaid
graph TD
    App["App Root Layout (app/layout.tsx)"]
    App --> ThemeProvider["ThemeProvider (Dark / Light Context)"]
    ThemeProvider --> Navbar["Global Navigation Bar (navbar.tsx)"]
    
    ThemeProvider --> GeneratePage["Studio Generator (app/generate/page.tsx)"]
    GeneratePage --> AgentChat["Conversational Interface (agent-chat.tsx)"]
    AgentChat --> ThinkingBanner["Dynamic Reasoning Steps Indicator"]
    AgentChat --> QuickOptions["Interactive Prompt Chips"]
    AgentChat --> ConceptPicker["4-Concept Variation Grid"]
    AgentChat --> GuidelinesCard["Brand Guidelines Showcase Card"]
    
    GeneratePage --> LogoCanvas["Live Synchronized Canvas (logo-canvas.tsx)"]
    LogoCanvas --> CanvasBgSwitch["Background Mode Switcher (Dark/Light/Grid)"]
    LogoCanvas --> SvgRasterizer["PNG Rasterizer (1024x1024)"]

    ThemeProvider --> HistoryPage["My Logos Gallery (app/history/page.tsx)"]
    HistoryPage --> MultiSelect["Multi-Select Engine"]
    HistoryPage --> BulkBar["Floating Bulk Action Bar (Download / Delete)"]
    HistoryPage --> DeleteOverlay["In-Card Delete Confirmation Overlay"]
    HistoryPage --> PreviewModal["Full Preview Lightbox"]

    AgentChat -.-> GuidelinesModal["Brand Guidelines Modal (brand-guidelines.tsx)"]
```

---

## 5. Database Schema & Data Models

The system persists data using **MongoDB Atlas** across three primary collections:

```mermaid
erDiagram
    CONVERSATIONS ||--o{ MESSAGES : contains
    CONVERSATIONS {
        string sessionId PK
        string userId
        object brandContext
        date createdAt
        date updatedAt
    }

    MESSAGES {
        string id PK
        string role
        string content
        array quickOptions
        object logoData
        object brandGuidelines
        date createdAt
    }

    LOGOS {
        string id PK
        string brandName
        string industry
        string style
        string colorPalette
        string imageUrl
        string promptUsed
        string userEmail
        object logoData
        date createdAt
    }

    TOKEN_USAGES {
        string id PK
        string userEmail
        string modelName
        int promptTokens
        int completionTokens
        int totalTokens
        double costUsd
        date timestamp
    }
```

---

## 6. Security, Deployment & Infrastructure

- **Authentication**: Stateless session handling with optional TOTP-based Two-Factor Authentication.
- **Cloud Build & Deployment**: Automated container builds deployed to **Google Cloud Run**.
- **Asset Storage**: Scalable cloud storage for exported brand assets, logos, and vector assets.
- **Environment Isolation**: Production and development configurations separated through environment variables.
