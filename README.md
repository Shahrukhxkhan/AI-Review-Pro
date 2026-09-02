# AI Review Pro – Smart Code Audit & Analytics Platform

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Gemini_AI-2.5_Flash-8E75FF?logo=google&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4.0-38BDF8?logo=tailwindcss&logoColor=white)

**An enterprise-grade, AI-powered code auditing, quality scoring, and analytics workspace.**

[Features](#-key-features) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [Database Setup](#-database-setup) • [Environment Variables](#-environment-variables)

</div>

---

## 📌 Overview

**AI Review Pro** is a full-stack, automated code review and analytics platform designed to analyze source code and technical documents in real time. Powered by **Google Gemini 2.5 Flash**, it identifies security vulnerabilities, performance bottlenecks, syntax bugs, and maintainability concerns while offering refactored code suggestions with interactive diff visualization.

Built with a responsive, modern glassmorphism aesthetic, AI Review Pro includes an integrated **Monaco Code Editor**, real-time **Supabase PostgreSQL** synchronization, **Recharts** analytics dashboards, review streak tracking, and exportable **PDF audit reports**.

---

## ✨ Key Features

- 🤖 **AI-Powered Code Auditing**: Instant, detailed evaluation of source code across multiple languages using Google's Gemini 2.5 Flash API.
- ⚡ **Real-Time Streaming AI**: Live Server-Sent Events (SSE) streaming progressive evaluation feedback directly as the model reasons.
- 💬 **Interactive Follow-up Chat ("Ask AI")**: In-depth conversational assistant to clarify bugs, generate unit tests, or request alternative refactorings.
- 🎭 **Review Personas & Team Guidelines**: Switch between *Security Auditor*, *Performance Ninja*, *Junior Mentor*, and *Balanced Generalist*, plus custom organizational rule injection.
- 🔀 **Direct Git Diff & GitHub PR Ingestion**: Paste raw unified diffs or input public GitHub Pull Request URLs (`https://github.com/:owner/:repo/pull/:id`) for instant PR delta analysis.
- 📁 **Multi-File Project Workspace**: Drag-and-drop or select connected components (e.g. controller + service + types) for comprehensive cross-file architectural audits.
- 🔗 **Shareable Permalinks (`/share/:id`)**: Generate unlisted, public report URLs that teammates or stakeholders can view without requiring authentication.
- 💻 **Standalone CLI & GitHub Actions**: Run `npx ai-review-pro <file>` or automated CI/CD PR review bots that post comments directly on GitHub Pull Requests.
- 🎯 **Multi-Dimensional Quality Scoring**: Categorized metric scoring (0–100) for **Security**, **Performance**, **Readability**, **Bug Risk**, and **Complexity**.
- 💻 **Integrated Monaco Code Editor**: IDE-like editor experience with 1-click **"Apply Suggestion"** into the editor buffer.
- 📊 **Interactive Analytics Dashboard**: Visual graphs and trend analysis powered by Recharts to track code health and review frequency over time.
- 🔥 **Streak & Gamification Tracking**: System to encourage consistent review practices through daily streaks and milestone rewards.
- 📄 **Exportable PDF & Markdown Reports**: Download professional, formatted audit summaries via `jsPDF` for documentation and team sharing.

---

## 🛠️ Tech Stack

### **Frontend**
- **Core**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Framer Motion (animations), Lucide React (icons)
- **Editor**: `@monaco-editor/react`
- **Charts & Export**: Recharts, `jsPDF`

### **Backend**
- **Server**: Node.js, Express
- **AI Integration**: `@google/genai` (Google GenAI SDK)
- **Middleware**: `express-rate-limit`, `dotenv`
- **Build & Execution**: `tsx`, `esbuild`

### **Database & Services**
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (integrated schema)

---

## 📁 Project Structure

```text
AI-Review-Pro/
├── server.ts                 # Express backend server with Gemini & Supabase APIs
├── index.html                # Application entry HTML
├── supabase-setup.sql        # Database schema, tables, policies, & functions
├── vite.config.ts            # Vite configuration
├── tsconfig.json             # TypeScript settings
├── package.json              # Dependencies and build scripts
└── src/
    ├── App.tsx               # Main application component & routing
    ├── main.tsx              # React mounting point
    ├── index.css             # Global styles & Tailwind configuration
    ├── components/           # Feature UI components
    │   ├── AnalyticsView.tsx # Analytics & trends dashboard
    │   ├── ComparisonView.tsx# Side-by-side diff comparison
    │   ├── DashboardView.tsx # Overview dashboard
    │   ├── HistoryView.tsx   # Review history table & filters
    │   ├── NewReviewView.tsx # Monaco editor & review submission
    │   ├── ReportsView.tsx   # Report generator & exporter
    │   ├── ReviewResult.tsx  # Detailed AI review feedback display
    │   ├── SettingsView.tsx  # User preferences & API configuration
    │   └── Sidebar.tsx       # Main navigation sidebar
    ├── context/              # React state context providers
    ├── hooks/                # Custom React hooks
    ├── lib/                  # Supabase & client utilities
    └── types/                # TypeScript type definitions
```

---

## 🚀 Getting Started

### **Prerequisites**
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Gemini API Key**: Obtainable from [Google AI Studio](https://aistudio.google.com/)
- **Supabase Account**: (Optional, for full database functionality) [Supabase Console](https://supabase.com/)

---

### **1. Clone & Install Dependencies**

```bash
# Clone the repository
git clone https://github.com/Shahrukhxkhan/AI-Review-Pro.git

# Navigate into the project directory
cd AI-Review-Pro

# Install dependencies
npm install
```

---

### **2. Configure Environment Variables**

Create a `.env` file in the root directory (or copy from `.env.example`):

```bash
cp .env.example .env
```

Add your credentials:

```env
# Gemini API Key (Required for AI code reviews)
GEMINI_API_KEY="your-gemini-api-key"

# App URL
APP_URL="http://localhost:3000"

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
```

---

### **3. Run Database Migrations (Supabase)**

If using Supabase, execute the contents of `supabase-setup.sql` in your Supabase SQL Editor to set up:
- `users`, `reviews`, `streaks`, and `reports` tables
- Row Level Security (RLS) policies
- Automated triggers for streak calculations

---

### **4. Start the Application**

#### **Development Mode**
Starts the Express server with Vite dev middleware:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

#### **Production Build**
Builds the Vite static client and bundles `server.ts` with `esbuild`:
```bash
npm run build
npm start
```

---

## 💻 CLI & CI/CD Integration

### **Local CLI Audits**
Execute quality audits directly from your terminal or pipes:

```bash
# Audit any local source file
node bin/cli.mjs src/index.ts

# Audit with a specific persona (security, performance, mentor)
node bin/cli.mjs src/index.ts --persona security

# Audit your current uncommitted git changes
git diff | node bin/cli.mjs --stdin

# CI/CD Gatekeeping: exit with error code 1 if score < 80
node bin/cli.mjs src/index.ts --fail-under 80

# Output as GitHub PR comment in Markdown
node bin/cli.mjs src/index.ts --markdown
```

### **Automated GitHub Actions PR Bot**
AI Review Pro includes a ready-to-use GitHub Action workflow in `.github/workflows/ai-review.yml` that audits every incoming pull request and posts an executive summary comment directly onto the PR.

---

## 🔑 Environment Variables Reference

| Variable | Required | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | **Yes** | API Key for Google Gemini 2.5 Flash model access |
| `APP_URL` | No | Base application URL for self-referential endpoints |
| `NEXT_PUBLIC_SUPABASE_URL` | No | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Your Supabase public anonymous API key |

---

## 📜 Available NPM Scripts

- `npm run dev` – Starts the development server (`server.ts` with `tsx`).
- `npm run build` – Builds client assets with Vite and bundles server to `dist/server.cjs`.
- `npm start` – Runs the compiled production server (`dist/server.cjs`).
- `npm run lint` – Runs TypeScript type checks (`tsc --noEmit`).
- `npm run clean` – Removes build artifacts (`dist` folder).

---

## 📄 License

This project is licensed under the **MIT License**.
