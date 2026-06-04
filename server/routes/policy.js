const express = require('express');
const router = express.Router();
const policyTerms = require('../data/policyTerms.json');
const llmService = require('../services/llmService');

/**
 * GET /api/policy — Returns the full policy terms
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    policy: policyTerms,
  });
});

/**
 * GET /api/policy/coverage — Returns coverage summary
 */
router.get('/coverage', (req, res) => {
  const { coverage_details } = policyTerms;
  res.json({
    success: true,
    coverage: coverage_details,
    limits: {
      annual: coverage_details.annual_limit,
      perClaim: coverage_details.per_claim_limit,
      familyFloater: coverage_details.family_floater_limit,
    },
  });
});

/**
 * GET /api/policy/exclusions — Returns exclusions list
 */
router.get('/exclusions', (req, res) => {
  res.json({
    success: true,
    exclusions: policyTerms.exclusions,
  });
});

/**
 * POST /api/policy/chat — RAG-powered policy assistant chatbot
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    if (!llmService.isAvailable()) {
      return res.json({
        success: true,
        reply: 'The AI policy assistant requires a Gemini API key. Please configure GEMINI_API_KEY in the server .env file to enable this feature.',
      });
    }

    const response = await llmService.chatWithPolicy(message, policyTerms, history || []);

    res.json({
      success: true,
      reply: response.reply,
    });
  } catch (error) {
    console.error('Policy chat error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
