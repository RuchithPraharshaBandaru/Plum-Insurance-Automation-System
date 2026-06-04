const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const Claim = require('../models/Claim');
const adjudicationEngine = require('../services/adjudicationEngine');
const documentProcessor = require('../services/documentProcessor');
const llmService = require('../services/llmService');
const testCases = require('../data/testCases.json');

// Multer config for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    cb(null, allowed.includes(file.mimetype));
  },
});

/**
 * POST /api/claims/extract — Extract data from uploaded documents (auto-fill)
 * Returns structured JSON for the frontend to populate form fields.
 */
router.post('/extract', upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }

    if (!llmService.isAvailable()) {
      return res.status(400).json({
        success: false,
        error: 'AI extraction requires a Gemini API key. Please configure GEMINI_API_KEY in .env',
      });
    }

    // Process all uploaded files through LLM
    const extractions = await documentProcessor.processUploadedFiles(req.files);
    console.log('📄 RAW EXTRACTIONS:', JSON.stringify(extractions, null, 2));

    // Merge extractions into a single structured form-ready object
    const formData = {
      memberName: '',
      doctorName: '',
      doctorReg: '',
      diagnosis: '',
      treatment: '',
      medicines: [],
      procedures: [],
      tests: [],
      hospital: '',
      claimAmount: 0,
      treatmentDate: '',
      billItems: {},
      consultationFee: 0,
      diagnosticTests: 0,
      medicinesCost: 0,
      otherChargesLabel: '',
      otherCharges: 0,
      isLegible: true,
      legibilityIssues: null,
      warnings: [],
      rawExtractions: extractions,
    };

    for (const ext of extractions) {
      const data = ext.extracted;
      if (!data || data.error) continue;

      // Patient info
      if (data.patientName) formData.memberName = data.patientName;
      if (data.memberJoinDate) formData.memberJoinDate = data.memberJoinDate;
      if (data.date) formData.treatmentDate = data.date;
      if (data.clinicHospitalName) formData.hospital = data.clinicHospitalName;

      // Prescription data
      if (data.doctorName) formData.doctorName = data.doctorName;
      if (data.doctorRegistration) formData.doctorReg = data.doctorRegistration;
      if (data.diagnosis) formData.diagnosis = data.diagnosis;

      // Medicines
      if (data.medicinesPrescribed && data.medicinesPrescribed.length > 0) {
        formData.medicines = [...formData.medicines, ...data.medicinesPrescribed];
      }

      // Procedures
      if (data.proceduresDone && data.proceduresDone.length > 0) {
        formData.procedures = [...formData.procedures, ...data.proceduresDone];
      }

      // Tests
      if (data.testsOrdered && data.testsOrdered.length > 0) {
        formData.tests = [...formData.tests, ...data.testsOrdered];
      }

      // Bill amounts
      if (data.totalAmount) formData.claimAmount = data.totalAmount;
      if (data.billItems && data.billItems.length > 0) {
        formData.rawBillItems = data.billItems; // Pass the raw array to the frontend
        for (const item of data.billItems) {
          const label = (item.label || item.item || '').toLowerCase();
          if (label.includes('consult')) {
            formData.consultationFee += item.amount || 0;
            formData.billItems.consultation_fee = (formData.billItems.consultation_fee || 0) + (item.amount || 0);
          } else if (label.includes('diagnos') || label.includes('test') || label.includes('lab')) {
            formData.diagnosticTests += item.amount || 0;
            formData.billItems.diagnostic_tests = (formData.billItems.diagnostic_tests || 0) + (item.amount || 0);
          } else if (label.includes('pharma') || label.includes('medicine') || label.includes('drug')) {
            formData.medicinesCost += item.amount || 0;
            formData.billItems.medicines = (formData.billItems.medicines || 0) + (item.amount || 0);
          } else {
            formData.otherChargesLabel = item.label || item.item || 'Other';
            formData.otherCharges += item.amount || 0;
            formData.billItems[label.replace(/\s+/g, '_') || 'other'] = item.amount || 0;
          }
        }
      }

      // Legibility
      if (data.isLegible === false) {
        formData.isLegible = false;
        formData.legibilityIssues = data.legibilityIssues;
      }

      // Warnings
      if (data.warnings) {
        formData.warnings = [...formData.warnings, ...data.warnings];
      }
    }

    // Deduplicate arrays
    formData.medicines = [...new Set(formData.medicines)];
    formData.procedures = [...new Set(formData.procedures)];
    formData.tests = [...new Set(formData.tests)];

    // Auto-calculate claim amount from bill items if not set
    if (!formData.claimAmount || formData.claimAmount === 0) {
      formData.claimAmount = formData.consultationFee + formData.diagnosticTests + formData.medicinesCost + formData.otherCharges;
    }

    // Check if extraction actually got any meaningful data
    const hasData = formData.memberName || formData.doctorName || formData.diagnosis ||
                    formData.claimAmount > 0 || formData.medicines.length > 0 ||
                    formData.hospital;

    // Check if there were extraction errors
    const extractionErrors = extractions.filter(e => e.extracted?.error || e.error);
    
    if (!hasData && extractionErrors.length > 0) {
      const errMsg = extractionErrors[0].extracted?.error || extractionErrors[0].error;
      return res.status(422).json({
        success: false,
        error: errMsg.includes('quota') || errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')
          ? 'Gemini API rate limit reached. Please wait a minute and try again, or fill the form manually.'
          : `AI extraction failed: ${errMsg}. Please fill the form manually.`,
      });
    }

    console.log('📋 FORM DATA:', JSON.stringify(formData, null, 2));

    res.json({
      success: true,
      formData,
      message: formData.isLegible
        ? `Extracted data from ${extractions.length} document(s). Please review and submit.`
        : '⚠️ Some documents were difficult to read. Please verify the extracted data carefully.',
    });
  } catch (error) {
    console.error('Extraction error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/claims — Submit a new claim
 */
router.post('/', upload.array('files', 5), async (req, res) => {
  try {
    let claimData;

    // Parse JSON body (form data may come as string)
    if (typeof req.body.claimData === 'string') {
      claimData = JSON.parse(req.body.claimData);
    } else {
      claimData = req.body;
    }

    // Normalize input
    const normalized = documentProcessor.normalizeClaimData(claimData);

    // Auto-calculate previous claims on the same day from the database
    if (normalized.treatmentDate) {
      const startOfDay = new Date(normalized.treatmentDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(normalized.treatmentDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      const previousClaimsCount = await Claim.countDocuments({
        memberId: normalized.memberId,
        treatmentDate: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      });
      normalized.previousClaimsSameDay = previousClaimsCount;
    }

    // Process uploaded files if any
    let fileExtractions = [];
    if (req.files && req.files.length > 0) {
      fileExtractions = await documentProcessor.processUploadedFiles(req.files);
    }

    // Get LLM analysis if available — run fraud detection + medical necessity in parallel
    let llmAnalysis = null;
    let llmContextAnalysis = null;
    let fraudAnalysis = null;

    if (llmService.isAvailable()) {
      try {
        const [medNecessity, context, fraud] = await Promise.all([
          llmService.assessMedicalNecessity(
            normalized.documents.prescription.diagnosis,
            normalized.documents.prescription.treatment || normalized.documents.prescription.procedures?.join(', '),
            normalized.documents.prescription.medicinesPrescribed
          ),
          llmService.analyzeClaimContext(normalized),
          llmService.detectFraudAnomalies(normalized),
        ]);
        llmAnalysis = medNecessity;
        llmContextAnalysis = context;
        fraudAnalysis = fraud;
      } catch (err) {
        console.error('LLM analysis failed, continuing with rule-based only:', err.message);
      }
    }

    // Run adjudication engine
    const decision = await adjudicationEngine.adjudicate(normalized, llmAnalysis);

    // Merge fraud analysis into decision
    if (fraudAnalysis && fraudAnalysis.anomaliesDetected) {
      decision.fraudAnalysis = fraudAnalysis;
      fraudAnalysis.anomalies.forEach(a => {
        decision.flags = decision.flags || [];
        decision.flags.push(`🚨 ${a.type}: ${a.description}`);
      });
      // Only escalate to manual review if the anomalies indicate actual fraud 
      // (like overpriced items or mismatches), rather than standard cosmetic exclusions.
      const hasSevereFraud = fraudAnalysis.anomalies.some(a => 
        ['overpriced', 'mismatch', 'altered'].includes(a.type) || 
        (a.type === 'suspicious_pattern' && !a.description.toLowerCase().includes('cosmetic'))
      );

      if (fraudAnalysis.riskScore >= 0.7 && decision.decision !== 'REJECTED' && hasSevereFraud) {
        decision.decision = 'MANUAL_REVIEW';
        decision.notes += ' Escalated due to AI-detected anomalies.';
      }
    }

    // Attach confidence reasoning from LLM
    if (llmAnalysis && llmAnalysis.confidenceReasoning) {
      decision.confidenceReasoning = llmAnalysis.confidenceReasoning;
    }

    // Generate claim ID
    const claimId = `CLM_${uuidv4().slice(0, 8).toUpperCase()}`;

    // Save to database
    const claim = new Claim({
      claimId,
      memberId: normalized.memberId,
      memberName: normalized.memberName,
      memberJoinDate: normalized.memberJoinDate,
      treatmentDate: normalized.treatmentDate,
      claimAmount: normalized.claimAmount,
      hospital: normalized.hospital,
      cashlessRequest: normalized.cashlessRequest,
      previousClaimsSameDay: normalized.previousClaimsSameDay,
      documents: {
        ...normalized.documents,
        uploadedFiles: req.files ? req.files.map(f => ({
          filename: f.filename,
          originalName: f.originalname,
          mimetype: f.mimetype,
          size: f.size,
        })) : [],
      },
      decision: decision.decision,
      approvedAmount: decision.approvedAmount,
      rejectionReasons: decision.rejectionReasons,
      rejectedItems: decision.rejectedItems,
      confidenceScore: decision.confidenceScore,
      notes: decision.notes,
      nextSteps: decision.nextSteps,
      flags: decision.flags,
      deductions: decision.deductions,
      networkDiscount: decision.networkDiscount,
      cashlessApproved: decision.cashlessApproved,
      extractedData: fileExtractions,
      llmAnalysis: llmContextAnalysis || '',
      confidenceReasoning: decision.confidenceReasoning || '',
      fraudAnalysis: decision.fraudAnalysis || null,
    });

    await claim.save();

    res.status(201).json({
      success: true,
      claim: {
        claimId: claim.claimId,
        decision: claim.decision,
        approvedAmount: claim.approvedAmount,
        rejectionReasons: claim.rejectionReasons,
        rejectedItems: claim.rejectedItems,
        confidenceScore: claim.confidenceScore,
        notes: claim.notes,
        nextSteps: claim.nextSteps,
        flags: claim.flags,
        deductions: claim.deductions,
        networkDiscount: claim.networkDiscount,
        cashlessApproved: claim.cashlessApproved,
        claimAmount: claim.claimAmount,
        memberName: claim.memberName,
        llmAnalysis: claim.llmAnalysis,
        confidenceReasoning: claim.confidenceReasoning,
        fraudAnalysis: claim.fraudAnalysis,
        createdAt: claim.createdAt,
      },
    });
  } catch (error) {
    console.error('Claim submission error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/claims — List all claims
 */
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.decision = status;

    const claims = await Claim.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Claim.countDocuments(query);

    res.json({
      success: true,
      claims,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/claims/:id — Get single claim
 */
router.get('/:id', async (req, res) => {
  try {
    const claim = await Claim.findOne({ claimId: req.params.id });
    if (!claim) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }
    res.json({ success: true, claim });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/claims/test/:caseId — Run a specific test case
 */
router.post('/test/:caseId', async (req, res) => {
  try {
    const caseId = req.params.caseId.toUpperCase();
    const testCase = testCases.test_cases.find(tc => tc.case_id === caseId);

    if (!testCase) {
      return res.status(404).json({
        success: false,
        error: `Test case ${caseId} not found. Available: ${testCases.test_cases.map(t => t.case_id).join(', ')}`,
      });
    }

    const p = testCase.input_data.documents?.prescription || {};
    
    // Build claim data from test case, explicitly mapping snake_case to camelCase
    const claimData = {
      memberId: testCase.input_data.member_id,
      memberName: testCase.input_data.member_name,
      memberJoinDate: testCase.input_data.member_join_date || '2024-01-01',
      treatmentDate: testCase.input_data.treatment_date,
      claimAmount: testCase.input_data.claim_amount,
      hospital: testCase.input_data.hospital || '',
      cashlessRequest: testCase.input_data.cashless_request || false,
      previousClaimsSameDay: testCase.input_data.previous_claims_same_day || 0,
      documents: {
        prescription: {
          doctorName: p.doctor_name,
          doctorReg: p.doctor_reg,
          diagnosis: p.diagnosis,
          medicinesPrescribed: p.medicines_prescribed || p.medicines,
          procedures: p.procedures,
          treatment: p.treatment,
          testsPrescribed: p.tests_prescribed
        },
        bill: testCase.input_data.documents?.bill || {}
      }
    };

    const normalized = documentProcessor.normalizeClaimData(claimData);

    // Run adjudication (no LLM for test cases — pure rule-based)
    const decision = await adjudicationEngine.adjudicate(normalized);

    const claimId = `CLM_TEST_${caseId}`;

    // Upsert to DB (allows re-running test cases)
    const claim = await Claim.findOneAndUpdate(
      { claimId },
      {
        claimId,
        memberId: normalized.memberId,
        memberName: normalized.memberName,
        memberJoinDate: normalized.memberJoinDate,
        treatmentDate: normalized.treatmentDate,
        claimAmount: normalized.claimAmount,
        hospital: normalized.hospital,
        cashlessRequest: normalized.cashlessRequest,
        previousClaimsSameDay: normalized.previousClaimsSameDay,
        documents: normalized.documents,
        decision: decision.decision,
        approvedAmount: decision.approvedAmount,
        rejectionReasons: decision.rejectionReasons,
        rejectedItems: decision.rejectedItems,
        confidenceScore: decision.confidenceScore,
        notes: decision.notes,
        nextSteps: decision.nextSteps,
        flags: decision.flags,
        deductions: decision.deductions,
        networkDiscount: decision.networkDiscount,
        cashlessApproved: decision.cashlessApproved,
      },
      { upsert: true, new: true }
    );

    res.status(201).json({
      success: true,
      testCase: {
        caseId: testCase.case_id,
        caseName: testCase.case_name,
        description: testCase.description,
      },
      actualResult: {
        claimId,
        decision: decision.decision,
        approvedAmount: decision.approvedAmount,
        rejectionReasons: decision.rejectionReasons,
        rejectedItems: decision.rejectedItems,
        confidenceScore: decision.confidenceScore,
        notes: decision.notes,
        flags: decision.flags,
        deductions: decision.deductions,
        networkDiscount: decision.networkDiscount,
        cashlessApproved: decision.cashlessApproved,
      },
      expectedResult: testCase.expected_output,
      match: decision.decision === testCase.expected_output.decision,
    });
  } catch (error) {
    console.error('Test case error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
