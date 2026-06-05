# Plum OPD Claim Adjudication Tool

An AI-powered full-stack application that automates the adjudication (approval/rejection) of Outpatient Department (OPD) insurance claims. Built for the Plum AI Automation Engineer Intern Assignment.

## Architecture

- **Frontend**: React (Vite) with custom glassmorphism CSS
- **Backend**: Node.js & Express.js
- **AI/LLM**: Google Gemini 2.0 Flash API (for multimodal document extraction and medical necessity checks)
- **Database**: Stateless (Uses local JSON files for policy terms and test cases)

## Setup Instructions

### 1. Install Dependencies

You will need to install the dependencies for both the frontend and backend.

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Configure Environment Variables

The application requires a Google Gemini API Key to process document uploads and run the AI medical necessity checks.

1. Navigate to the `server` directory.
2. Create a `.env` file (or copy from `.env.example` if available).
3. Add your Gemini API key and desired port:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
```

> **Note:** You can get a free Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

### 3. Run the Application

You need to run both the backend server and the frontend development server simultaneously.

**Terminal 1 (Backend):**
```bash
cd server
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd client
npm run dev
```

The application will now be running at:
- **Frontend UI**: http://localhost:5173
- **Backend API**: http://localhost:5000/api

## Documentation

Comprehensive technical documentation can be found in `TECHNICAL_DOCUMENTATION.md`, which includes:
- Architecture diagrams
- API specifications
- Decision logic flowcharts
- Foundational assumptions and rule limits
