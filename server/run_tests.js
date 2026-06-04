const fs = require('fs');
const path = require('path');
const t = JSON.parse(fs.readFileSync('../test_cases.json', 'utf8'));
const adjudicationEngine = require('./services/adjudicationEngine');
const processor = require('./services/documentProcessor');

async function run() {
  let passed = 0;
  for (const tc of t.test_cases) {
    const p = tc.input_data.documents?.prescription || {};
    // Map snake_case to camelCase for the processor
    const claimData = processor.normalizeClaimData({
      ...tc.input_data,
      claimAmount: tc.input_data.claim_amount,
      memberJoinDate: tc.input_data.member_join_date || '2024-01-01',
      treatmentDate: tc.input_data.treatment_date,
      hospital: tc.input_data.hospital,
      cashlessRequest: tc.input_data.cashless_request,
      submissionDate: tc.input_data.submission_date || '2024-11-05',
      previousClaimsSameDay: tc.input_data.previous_claims_same_day || 0,
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
        bill: tc.input_data.documents?.bill || {}
      }
    });

    const expectedDecision = tc.expected_output.decision;
    const result = await adjudicationEngine.adjudicate(claimData);
    const success = result.decision === expectedDecision;
    
    console.log(`${tc.case_id}: ${success ? '✅ PASS' : '❌ FAIL'} - Expected: ${expectedDecision}, Got: ${result.decision}`);
    
    if (!success) {
      console.log('   Expected Notes:', tc.expected_output.notes || tc.expected_output.rejection_reasons || []);
      console.log('   Actual Notes:', result.notes);
      console.log('   Rejection Reasons:', result.rejectionReasons);
      console.log('   Approved Amount:', result.approvedAmount);
      console.log('   Expected Amount:', tc.expected_output.approved_amount);
    } else {
      passed++;
    }
  }
  console.log(`\nPassed ${passed}/${t.test_cases.length}`);
}

run();
