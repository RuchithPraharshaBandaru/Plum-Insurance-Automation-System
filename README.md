# Plum OPD Claim Adjudication Tool

An AI-powered full-stack application that automates the adjudication (approval/rejection) of Outpatient Department (OPD) insurance claims. Built for the Plum AI Automation Engineer Intern Assignment.

## Architecture

- **Frontend**: React (Vite) with custom glassmorphism CSS
- **Backend**: Node.js & Express.js
- **AI/LLM**: Google Gemini 2.0 Flash API (for multimodal document extraction and medical necessity checks)
- **Database**: Stateless (Uses local JSON files for policy terms and test cases)

### Key Features

- **5-Step Adjudication Engine** — Rule-based decision logic covering eligibility, document validation, coverage, limits, and medical necessity
- **AI Document Extraction** — Upload medical documents (images/PDFs) and extract structured data using Gemini
- **AI Fraud & Anomaly Detection** — LLM detects billing anomalies, medication-diagnosis mismatches, and suspicious patterns
- **Confidence Score Explainability** — Not just a number; the AI explains WHY the confidence is what it is
- **RAG-Powered Policy Chatbot** — Floating chat widget lets users ask natural-language questions about their coverage
- **Illegible Document Handling** — AI explicitly avoids hallucinating data from blurry documents
- **10 Pre-built Test Cases** — Run TC001–TC010 with one click and compare expected vs actual results
- **Premium Dark UI** — Glassmorphism design with micro-animations

### Decision Types

| Decision | Description |
|----------|-------------|
| ✅ APPROVED | All checks passed, claim fully covered |
| ❌ REJECTED | Failed one or more adjudication rules |
| ⚠️ PARTIAL | Some items covered, some excluded (e.g. cosmetic) |
| 🔍 MANUAL_REVIEW | Flagged for human review (fraud, high-value, low confidence) |

## Prerequisites

- **Node.js** 18+
- **Google Gemini API Key** (free tier works) — [Get one here](https://aistudio.google.com/app/apikey)

## Setup & Run

### 1. Clone and install dependencies

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Configure environment variables

```bash
cd server
cp .env.example .env
```

Edit `server/.env` with your credentials:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
```

> **Note:** The application works without the Gemini API key (rule-based only mode), but AI features like fraud detection, confidence reasoning, document extraction, and the policy chatbot require it.

### 3. Start the application

```bash
# Terminal 1 — Start backend
cd server
npm run dev

# Terminal 2 — Start frontend
cd client
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Submit Claim | `/` | Submit new claims via form or run test cases |
| Dashboard | `/dashboard` | View all claims with status filters and expandable details |
| Policy | `/policy` | Browse coverage limits, exclusions, and waiting periods |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/claims/extract` | Extract document info via Vision LLM |
| `POST` | `/api/claims` | Submit a new claim for Adjudication |
| `POST` | `/api/claims/test/:caseId` | Run a test case (TC001–TC010) |
| `GET` | `/api/policy` | Get full policy terms |
| `POST` | `/api/policy/chat` | Chat with policy assistant |
| `GET` | `/api/test-cases` | List available test cases |
| `GET` | `/api/health` | Server health check |

## Test Cases

| ID | Scenario | Expected Decision |
|----|----------|-------------------|
| TC001 | Simple consultation — all valid | ✅ APPROVED (₹1,350) |
| TC002 | Root canal + teeth whitening | ⚠️ PARTIAL (₹8,000) |
| TC003 | Amount exceeds per-claim limit | ❌ REJECTED |
| TC004 | Missing prescription | ❌ REJECTED |
| TC005 | Diabetes during waiting period | ❌ REJECTED |
| TC006 | Ayurvedic treatment | ✅ APPROVED (₹4,000) |
| TC007 | MRI without pre-authorization | ❌ REJECTED |
| TC008 | Multiple claims same day (fraud) | 🔍 MANUAL_REVIEW |
| TC009 | Weight loss (excluded) | ❌ REJECTED |
| TC010 | Network hospital cashless | ✅ APPROVED (₹3,600) |

## Assumptions

1. Policy effective date is 2024-01-01; all members with no explicit join date default to this
2. Doctor registration format: `[STATE_CODE]/[NUMBER]/[YEAR]` (regex validated)
3. MRI and CT Scan require pre-authorization when claim > ₹10,000
4. Co-payment applies only to consultation fees (10%)
5. Network discount (20%) applies to full claim amount at network hospitals
6. Claims with 3+ prior claims on the same day are flagged for fraud review
7. LLM features degrade gracefully when API key is not configured
8. No user authentication (demo mode)

## Tech Stack

- **Frontend**: React 19 (Vite), React Router, Axios
- **Backend**: Express.js, Multer, UUID
- **AI**: Google Gemini 2.0 Flash
- **Database**: Local JSON Files (Stateless MVP)
- **Design**: Custom CSS with glassmorphism, Inter font
