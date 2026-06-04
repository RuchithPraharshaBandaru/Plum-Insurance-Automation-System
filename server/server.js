require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Create uploads dir if not exists
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Routes
app.use('/api/claims', require('./routes/claims'));
app.use('/api/policy', require('./routes/policy'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    llmAvailable: !!process.env.GEMINI_API_KEY,
    dbConnected: require('mongoose').connection.readyState === 1,
  });
});

// Test cases list endpoint
app.get('/api/test-cases', (req, res) => {
  const testCases = require('./data/testCases.json');
  res.json({
    success: true,
    testCases: testCases.test_cases.map(tc => ({
      caseId: tc.case_id,
      caseName: tc.case_name,
      description: tc.description,
      claimAmount: tc.input_data.claim_amount,
      expectedDecision: tc.expected_output.decision,
    })),
  });
});

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`\n🚀 Plum OPD Adjudication Server running on port ${PORT}`);
      console.log(`   API: http://localhost:${PORT}/api`);
      console.log(`   Health: http://localhost:${PORT}/api/health`);
      console.log(`   LLM: ${process.env.GEMINI_API_KEY ? '✅ Gemini configured' : '⚠️  No API key (rule-based only)'}`);
      console.log('');
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
