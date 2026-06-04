/**
 * LLM Service — Handles communication with Google Gemini API
 * for document extraction, medical necessity assessment,
 * fraud detection, policy chat, and confidence explainability.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

class LLMService {
  constructor() {
    this.genAI = null;
    this.model = null;
  }

  _initialize() {
    if (!this.genAI && process.env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      this.model = this.genAI.getGenerativeModel({ model: 'models/gemini-2.5-flash' });
    }
  }

  isAvailable() {
    return !!process.env.GEMINI_API_KEY;
  }

  /**
   * Helper to rotate models on rate limit / quota exhaustion.
   */
  async _generateWithFallback(prompt, imagePart = null) {
    this._initialize();
    if (!this.genAI) throw new Error('LLM not configured');

    const FALLBACK_MODELS = [
      'gemini-2.5-flash',
      'gemini-3-flash',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-2.5-pro',
      'gemini-2-flash',
      'gemini-2-flash-lite'
    ];

    let lastError = null;
    for (let attempt = 0; attempt < FALLBACK_MODELS.length; attempt++) {
      try {
        const modelName = FALLBACK_MODELS[attempt];
        const currentModel = this.genAI.getGenerativeModel({ model: modelName });
        
        console.log(`[Attempt ${attempt + 1}] LLM request with ${modelName}...`);
        const payload = imagePart ? [prompt, imagePart] : prompt;
        const result = await currentModel.generateContent(payload);
        return result.response.text();
      } catch (error) {
        lastError = error;
        const isRateLimitOrNotFound = error.message && (
          error.message.includes('429') || 
          error.message.includes('quota') || 
          error.message.includes('RESOURCE_EXHAUSTED') || 
          error.message.includes('503') ||
          error.message.includes('404') // Also rotate if model doesn't exist
        );
        
        if (isRateLimitOrNotFound) {
          console.warn(`Rate limited, unavailable, or 404 on ${FALLBACK_MODELS[attempt]}. Rotating model...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        throw error; // non-retryable error
      }
    }
    console.error('LLM request failed after exhausting all fallback models:', lastError?.message);
    throw new Error(lastError?.message || 'Rate limit exceeded on all available models');
  }

  /**
   * Extract structured data from uploaded document (image/text).
   * Includes explicit instructions to NOT hallucinate on illegible documents.
   */
  async extractFromDocument(fileBuffer, mimeType) {
    this._initialize();
    if (!this.model) {
      return { error: 'LLM not configured. Set GEMINI_API_KEY in .env' };
    }

    try {
      const prompt = `You are a medical document analyzer for an insurance claims system.
Analyze this medical document and extract the following information in JSON format.

CRITICAL RULES:
- If any field is too blurry, faded, or illegible to read confidently, set it to null. Do NOT guess or hallucinate values.
- If the Doctor Registration Number is not clearly visible, set "doctorRegistration" to null.
- If the Total Amount is not clearly readable, set "totalAmount" to null.
- If the document is overall too blurry or damaged to extract meaningful data, set "isLegible" to false and "legibilityIssues" to describe what's wrong.
- If a formal 'Diagnosis' is not listed, extract the 'Clinical Notes' or 'Reason for Visit' into the diagnosis field.
- Carefully scan for tables or itemized lists. You MUST extract EVERY individual line item into the "billItems" array. NEVER combine items, and NEVER extract the Grand Total as a line item.

Return this JSON structure:
{
  "documentType": "prescription|bill|diagnostic_report|pharmacy_bill|unknown",
  "patientName": "" or null,
  "patientAge": "" or null,
  "memberJoinDate": "YYYY-MM-DD" or null,
  "doctorName": "" or null,
  "doctorRegistration": "" or null,
  "clinicHospitalName": "" or null,
  "isFacilityRegistered": true or false or null, // Set to false if document explicitly says "unregistered" or "unregistered facility". Set to true if registered. Null if unknown.
  "date": "YYYY-MM-DD" or null,
  "diagnosis": "" or null,
  "medicinesPrescribed": [],
  "proceduresDone": [],
  "testsOrdered": [],
  "billItems": [{"label": "", "amount": 0}],
  "totalAmount": 0 or null,
  "isLegible": true or false,
  "hasStampSignature": true or false or null,
  "legibilityIssues": "" or null,
  "extractionConfidence": 0.0 to 1.0,
  "notes": ""
}

Extract the bill breakdown as an ARRAY of objects. Each item must have a "label" and an "amount". Do NOT group them together.
Return ONLY valid JSON, no markdown formatting.`;

      const imagePart = {
        inlineData: {
          data: fileBuffer.toString('base64'),
          mimeType: mimeType,
        },
      };

      // Retry with backoff for rate limits
      try {
        const text = await this._generateWithFallback(prompt, imagePart);
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);

          // Auto-flag illegible documents
          if (parsed.isLegible === false) {
            parsed.rejectionFlag = 'ILLEGIBLE_DOCUMENTS';
          }
          if (parsed.doctorRegistration === null) {
            parsed.warnings = (parsed.warnings || []);
            parsed.warnings.push('Doctor registration number could not be verified from document');
          }
          if (parsed.totalAmount === null) {
            parsed.warnings = (parsed.warnings || []);
            parsed.warnings.push('Total amount could not be confirmed from document');
          }

          return parsed;
        }
        return { raw: text, error: 'Could not parse structured data' };
      } catch (error) {
        console.error('LLM extraction error:', error.message);
        return { error: error.message };
      }
    } catch (error) {
      console.error('LLM extraction error:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Assess medical necessity with confidence reasoning.
   */
  async assessMedicalNecessity(diagnosis, treatment, medicines) {
    this._initialize();
    if (!this.model) {
      return {
        medicallyNecessary: true,
        reasoning: 'LLM not available, defaulting to approved.',
        confidence: 0.7,
        confidenceReasoning: 'No AI assessment available — using default confidence.',
      };
    }

    try {
      const prompt = `You are a medical insurance adjudicator. Evaluate if the following treatment is medically necessary.

Diagnosis: ${diagnosis}
Treatment/Procedures: ${treatment || 'Not specified'}
Medicines Prescribed: ${Array.isArray(medicines) ? medicines.join(', ') : medicines || 'Not specified'}

IMPORTANT RULE:
If the primary therapeutic treatment is medically necessary for the diagnosis (e.g., Root Canal for Tooth Decay), return "medicallyNecessary": true. 
Even if the claim includes supplementary cosmetic or unnecessary procedures (e.g., Teeth Whitening), do NOT fail the overall medical necessity. Instead, return true and list the unnecessary items in the "flags" array. Our rule engine will handle deducting the cosmetic items.

CONTEXT:
This insurance policy explicitly covers Alternative Medicine, including Ayurveda, Homeopathy, and Unani. When evaluating 'Medical Necessity', do NOT evaluate alternative treatments against strict conventional, Allopathic, or FDA clinical guidelines. Instead, evaluate if the prescribed treatment is a recognized and standard practice WITHIN its respective medical system (e.g., Is Panchakarma a standard Ayurvedic treatment for chronic joint pain?).

Answer in JSON format:
{
  "medicallyNecessary": true/false,
  "reasoning": "Brief clinical explanation (1-2 sentences)",
  "confidence": 0.0 to 1.0,
  "confidenceReasoning": "Explain WHY the confidence is this level. Be specific.",
  "flags": ["any clinical concerns or specific unnecessary supplementary items"]
}

Return ONLY valid JSON.`;

      const text = await this._generateWithFallback(prompt);

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {
        medicallyNecessary: true,
        reasoning: 'Could not parse LLM response',
        confidence: 0.7,
        confidenceReasoning: 'LLM response parsing failed — using default.',
      };
    } catch (error) {
      console.error('LLM medical necessity error:', error.message);
      return {
        medicallyNecessary: true,
        reasoning: 'LLM assessment unavailable',
        confidence: 0.7,
        confidenceReasoning: 'LLM service unavailable — using rule-based defaults.',
      };
    }
  }

  /**
   * AI-powered fraud and anomaly detection.
   * Goes beyond rule-based checks to find subtle billing anomalies.
   */
  async detectFraudAnomalies(claimData) {
    this._initialize();
    if (!this.model) {
      return { anomaliesDetected: false, anomalies: [], riskScore: 0 };
    }

    try {
      const billItems = JSON.stringify(claimData.documents?.bill || {});
      const prompt = `You are a fraud detection AI for a health insurance company. Analyze this OPD claim for anomalies and suspicious patterns.

Claim Details:
- Patient: ${claimData.memberName} (ID: ${claimData.memberId})
- Diagnosis: ${claimData.documents?.prescription?.diagnosis || 'Not provided'}
- Doctor: ${claimData.documents?.prescription?.doctorName || 'Not provided'}
- Medicines: ${(claimData.documents?.prescription?.medicinesPrescribed || []).join(', ') || 'None'}
- Procedures: ${(claimData.documents?.prescription?.procedures || []).join(', ') || 'None'}
- Bill Items: ${billItems}
- Total Claim: ₹${claimData.claimAmount}
- Hospital: ${claimData.hospital || 'Not specified'}
- Previous claims today: ${claimData.previousClaimsSameDay || 0}

Check for these types of anomalies:
1. Overpriced items (e.g. ₹5,000 for Paracetamol, ₹3,000 for basic consultation)
2. Medication-diagnosis mismatch (e.g. strong painkillers for mild cold)
3. Unnecessary procedures for the stated diagnosis
4. Unusually high bill totals for the type of treatment
5. Any other suspicious patterns

Return JSON:
{
  "anomaliesDetected": true/false,
  "riskScore": 0.0 to 1.0 (0 = no risk, 1 = very suspicious),
  "anomalies": [
    {
      "type": "overpriced|mismatch|unnecessary|suspicious_pattern",
      "description": "What was detected",
      "severity": "low|medium|high"
    }
  ],
  "overallAssessment": "Brief 1-2 sentence summary"
}

Return ONLY valid JSON.`;

      const text = await this._generateWithFallback(prompt);

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { anomaliesDetected: false, anomalies: [], riskScore: 0 };
    } catch (error) {
      console.error('LLM fraud detection error:', error.message);
      return { anomaliesDetected: false, anomalies: [], riskScore: 0, error: error.message };
    }
  }

  /**
   * Analyze a complete claim — overall context + confidence reasoning.
   */
  async analyzeClaimContext(claimData) {
    this._initialize();
    if (!this.model) {
      return null;
    }

    try {
      const prompt = `You are an insurance claims adjudicator AI. Analyze this OPD claim and provide a brief assessment.

Claim Details:
- Patient: ${claimData.memberName} (ID: ${claimData.memberId})
- Treatment Date: ${claimData.treatmentDate}
- Claim Amount: ₹${claimData.claimAmount}
- Diagnosis: ${claimData.documents?.prescription?.diagnosis || 'Not provided'}
- Doctor: ${claimData.documents?.prescription?.doctorName || 'Not provided'} (Reg: ${claimData.documents?.prescription?.doctorReg || 'N/A'})
- Medicines: ${(claimData.documents?.prescription?.medicinesPrescribed || []).join(', ') || 'Not specified'}
- Hospital: ${claimData.hospital || 'Not specified'}

Provide a concise assessment (2-3 sentences) covering:
1. Whether the diagnosis justifies the treatment and medicines
2. Any red flags or concerns
3. Overall recommendation

Keep it concise and professional.`;

      const text = await this._generateWithFallback(prompt);
      return text;
    } catch (error) {
      console.error('LLM analysis error:', error.message);
      return null;
    }
  }

  /**
   * RAG-powered Policy Assistant — answers user questions using policy context.
   */
  async chatWithPolicy(userMessage, policyTerms, conversationHistory = []) {
    this._initialize();
    if (!this.model) {
      return { reply: 'AI assistant is not configured. Please set GEMINI_API_KEY in .env to enable the policy chatbot.' };
    }

    try {
      const policyContext = JSON.stringify(policyTerms, null, 2);

      const historyContext = conversationHistory.length > 0
        ? '\n\nPrevious conversation:\n' + conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')
        : '';

      const prompt = `You are a friendly and helpful insurance policy assistant for "Plum OPD Advantage" health plan. 
Answer the user's question ONLY based on the policy document provided below. 
If the answer is not in the policy document, say so honestly.
Be concise but helpful. Use bullet points where appropriate.
When mentioning amounts, use the ₹ symbol.

POLICY DOCUMENT:
${policyContext}
${historyContext}

USER QUESTION: ${userMessage}

Respond naturally and helpfully. Keep answers concise (2-4 sentences for simple questions, more for complex ones).`;

      const result = await this.model.generateContent(prompt);
      return { reply: result.response.text() };
    } catch (error) {
      console.error('Policy chat error:', error.message);
      return { reply: 'Sorry, I encountered an error processing your question. Please try again.' };
    }
  }
}

module.exports = new LLMService();
