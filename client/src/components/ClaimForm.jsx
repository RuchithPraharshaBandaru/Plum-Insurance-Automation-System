import { useState, useEffect } from 'react';

export default function ClaimForm({ onSubmit, loading, prefillData }) {
  const [form, setForm] = useState({
    memberId: '',
    memberName: '',
    memberJoinDate: '2024-01-01',
    treatmentDate: '',
    claimAmount: '',
    hospital: '',
    cashlessRequest: false,
    previousClaimsSameDay: 0,
    doctorName: '',
    doctorReg: '',
    diagnosis: '',
    treatment: '',
    medicines: '',
    procedures: '',
    tests: '',
    consultationFee: '',
    diagnosticTests: '',
    medicinesCost: '',
    otherCharges: '',
    otherChargesLabel: '',
  });

  // Auto-fill form when prefillData changes (from AI extraction or test case)
  useEffect(() => {
    if (prefillData) {
      setForm(prev => ({
        ...prev,
        memberName: prefillData.memberName || prev.memberName,
        memberId: prefillData.memberId || prev.memberId || `EMP_${Date.now().toString(36).toUpperCase()}`,
        memberJoinDate: prefillData.memberJoinDate || prev.memberJoinDate,
        treatmentDate: prefillData.treatmentDate || '',
        claimAmount: prefillData.claimAmount ? String(prefillData.claimAmount) : '',
        hospital: prefillData.hospital || '',
        cashlessRequest: prefillData.cashlessRequest ?? false,
        previousClaimsSameDay: prefillData.previousClaimsSameDay ?? 0,
        doctorName: prefillData.doctorName || '',
        doctorReg: prefillData.doctorReg || '',
        diagnosis: prefillData.diagnosis || '',
        treatment: prefillData.treatment || '',
        medicines: Array.isArray(prefillData.medicines)
          ? prefillData.medicines.join(', ')
          : prefillData.medicines || '',
        procedures: Array.isArray(prefillData.procedures)
          ? prefillData.procedures.join(', ')
          : prefillData.procedures || '',
        tests: Array.isArray(prefillData.tests)
          ? prefillData.tests.join(', ')
          : prefillData.tests || '',
        consultationFee: prefillData.consultationFee ? String(prefillData.consultationFee) : '',
        diagnosticTests: prefillData.diagnosticTests ? String(prefillData.diagnosticTests) : '',
        medicinesCost: prefillData.medicinesCost ? String(prefillData.medicinesCost) : '',
        otherCharges: prefillData.otherCharges ? String(prefillData.otherCharges) : '',
        otherChargesLabel: prefillData.otherChargesLabel || '',
        rawBillItems: prefillData.rawBillItems || [],
      }));
    } else {
      // When prefillData is explicitly null (e.g., when uploading a new document),
      // we reset all the medical/document fields but preserve the member details
      // so the user doesn't have to re-type them for consecutive tests.
      setForm(prev => ({
        ...prev,
        treatmentDate: '',
        claimAmount: '',
        hospital: '',
        cashlessRequest: false,
        previousClaimsSameDay: 0,
        doctorName: '',
        doctorReg: '',
        diagnosis: '',
        treatment: '',
        medicines: '',
        procedures: '',
        tests: '',
        consultationFee: '',
        diagnosticTests: '',
        medicinesCost: '',
        otherCharges: '',
        otherChargesLabel: '',
        rawBillItems: [],
      }));
    }
  }, [prefillData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Auto-fill missing essentials before validation
    let submissionForm = { ...form };

    // Auto-generate member ID if empty
    if (!submissionForm.memberId) {
      submissionForm.memberId = `EMP_${Date.now().toString(36).toUpperCase()}`;
      setForm(prev => ({ ...prev, memberId: submissionForm.memberId }));
    }

    // Auto-calculate claim amount from bill breakdown if missing
    if (!submissionForm.claimAmount || parseFloat(submissionForm.claimAmount) <= 0) {
      const total = (parseFloat(submissionForm.consultationFee) || 0) +
                    (parseFloat(submissionForm.diagnosticTests) || 0) +
                    (parseFloat(submissionForm.medicinesCost) || 0) +
                    (parseFloat(submissionForm.otherCharges) || 0);
      if (total > 0) {
        submissionForm.claimAmount = String(total);
        setForm(prev => ({ ...prev, claimAmount: String(total) }));
      }
    }

    // Auto-set treatment date to today if missing
    if (!submissionForm.treatmentDate) {
      submissionForm.treatmentDate = new Date().toISOString().split('T')[0];
      setForm(prev => ({ ...prev, treatmentDate: submissionForm.treatmentDate }));
    }

    // Validation — only block if truly essential data is missing
    if (!submissionForm.claimAmount || parseFloat(submissionForm.claimAmount) <= 0) {
      alert('Could not determine claim amount. Please enter it manually.');
      return;
    }

    // Build bill object
    const bill = {};
    if (submissionForm.consultationFee) bill.consultation_fee = parseFloat(submissionForm.consultationFee);
    if (submissionForm.diagnosticTests) bill.diagnostic_tests = parseFloat(submissionForm.diagnosticTests);
    if (submissionForm.medicinesCost) bill.medicines = parseFloat(submissionForm.medicinesCost);
    
    // If we have raw extracted items, preserve them perfectly instead of squashing
    if (submissionForm.rawBillItems && submissionForm.rawBillItems.length > 0) {
      submissionForm.rawBillItems.forEach(item => {
        const rawLabel = item.label || item.item || '';
        const lblLower = rawLabel.toLowerCase();
        
        // Skip items that are already mapped to standard fields
        const isStandard = lblLower.includes('consult') || 
                           lblLower.includes('diagnos') || lblLower.includes('test') || lblLower.includes('lab') || 
                           lblLower.includes('pharma') || lblLower.includes('medicine') || lblLower.includes('drug');
                           
        if (rawLabel && !isStandard) {
          bill[lblLower.replace(/\s+/g, '_')] = parseFloat(item.amount);
        }
      });
    } else if (submissionForm.otherCharges && submissionForm.otherChargesLabel) {
      // Fallback for manual entry
      bill[submissionForm.otherChargesLabel.toLowerCase().replace(/\s+/g, '_')] = parseFloat(submissionForm.otherCharges);
    }

    const claimData = {
      memberId: submissionForm.memberId,
      memberName: submissionForm.memberName,
      memberJoinDate: submissionForm.memberJoinDate,
      treatmentDate: submissionForm.treatmentDate,
      claimAmount: parseFloat(submissionForm.claimAmount),
      hospital: submissionForm.hospital,
      cashlessRequest: submissionForm.cashlessRequest,
      previousClaimsSameDay: parseInt(submissionForm.previousClaimsSameDay) || 0,
      documents: {
        prescription: {
          doctorName: submissionForm.doctorName,
          doctorReg: submissionForm.doctorReg,
          diagnosis: submissionForm.diagnosis,
          treatment: submissionForm.treatment,
          medicinesPrescribed: submissionForm.medicines ? submissionForm.medicines.split(',').map(m => m.trim()) : [],
          procedures: submissionForm.procedures ? submissionForm.procedures.split(',').map(p => p.trim()) : [],
          testsPrescribed: submissionForm.tests ? submissionForm.tests.split(',').map(t => t.trim()) : [],
        },
        bill,
      },
    };

    onSubmit(claimData);
  };

  // Highlight fields that were auto-filled by AI
  const aiFilledStyle = (fieldName) => {
    if (!prefillData) return {};
    const val = prefillData[fieldName];
    if (val && val !== '' && val !== 0 && (!Array.isArray(val) || val.length > 0)) {
      return {
        borderColor: 'var(--accent-teal)',
        boxShadow: '0 0 0 2px rgba(20, 184, 166, 0.12)',
      };
    }
    return {};
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Member Information */}
      <div className="section-title">Member Information</div>
      <div className="form-row-3">
        <div className="form-group">
          <label className="form-label">Member ID</label>
          <input
            className="form-input"
            name="memberId"
            placeholder="Auto-generated if blank"
            value={form.memberId}
            onChange={handleChange}
            style={aiFilledStyle('memberId')}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Member Name</label>
          <input
            className="form-input"
            name="memberName"
            placeholder="Full name"
            value={form.memberName}
            onChange={handleChange}
            style={aiFilledStyle('memberName')}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Join Date</label>
          <input
            className="form-input"
            name="memberJoinDate"
            type="date"
            value={form.memberJoinDate}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* Treatment Information */}
      <div className="section-title">Treatment Details</div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Treatment Date</label>
          <input
            className="form-input"
            name="treatmentDate"
            type="date"
            value={form.treatmentDate}
            onChange={handleChange}
            style={aiFilledStyle('treatmentDate')}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Total Claim Amount (₹)</label>
          <input
            className="form-input"
            name="claimAmount"
            type="number"
            step="any"
            placeholder="e.g. 1500.50"
            value={form.claimAmount}
            onChange={handleChange}
            min="0"
            style={aiFilledStyle('claimAmount')}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Hospital / Clinic</label>
          <input
            className="form-input"
            name="hospital"
            placeholder="e.g. Apollo Hospitals"
            value={form.hospital}
            onChange={handleChange}
            style={aiFilledStyle('hospital')}
          />
        </div>
        <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5rem', paddingBottom: '0.3rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
            <input
              type="checkbox"
              name="cashlessRequest"
              checked={form.cashlessRequest}
              onChange={handleChange}
              style={{ accentColor: 'var(--accent-teal)' }}
            />
            Cashless Request
          </label>
          <div>
            <label className="form-label" style={{ marginBottom: '0.2rem' }}>Prior Claims Today</label>
            <input
              className="form-input"
              name="previousClaimsSameDay"
              type="number"
              value={form.previousClaimsSameDay}
              onChange={handleChange}
              min="0"
              style={{ width: '80px' }}
            />
          </div>
        </div>
      </div>

      {/* Prescription Details */}
      <div className="section-title">Prescription</div>
      <div className="form-row-3">
        <div className="form-group">
          <label className="form-label">Doctor Name</label>
          <input
            className="form-input"
            name="doctorName"
            placeholder="Dr. Sharma"
            value={form.doctorName}
            onChange={handleChange}
            style={aiFilledStyle('doctorName')}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Doctor Reg. No.</label>
          <input
            className="form-input"
            name="doctorReg"
            placeholder="KA/45678/2015"
            value={form.doctorReg}
            onChange={handleChange}
            style={aiFilledStyle('doctorReg')}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Diagnosis</label>
          <input
            className="form-input"
            name="diagnosis"
            placeholder="e.g. Viral fever"
            value={form.diagnosis}
            onChange={handleChange}
            style={aiFilledStyle('diagnosis')}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Treatment / Procedure</label>
        <input
          className="form-input"
          name="treatment"
          placeholder="e.g. Panchakarma therapy"
          value={form.treatment}
          onChange={handleChange}
          style={aiFilledStyle('treatment')}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Medicines (comma separated)</label>
          <input
            className="form-input"
            name="medicines"
            placeholder="Paracetamol 650mg, Vitamin C"
            value={form.medicines}
            onChange={handleChange}
            style={aiFilledStyle('medicines')}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Procedures (comma separated)</label>
          <input
            className="form-input"
            name="procedures"
            placeholder="Root canal, Teeth whitening"
            value={form.procedures}
            onChange={handleChange}
            style={aiFilledStyle('procedures')}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Tests Prescribed (comma separated)</label>
        <input
          className="form-input"
          name="tests"
          placeholder="CBC, MRI Lumbar Spine"
          value={form.tests}
          onChange={handleChange}
          style={aiFilledStyle('tests')}
        />
      </div>

      {/* Bill Details */}
      <div className="section-title">Bill Breakdown</div>
      <div className="form-row-3">
        <div className="form-group">
          <label className="form-label">Consultation Fee (₹)</label>
          <input
            className="form-input"
            name="consultationFee"
            type="number"
            placeholder="1000"
            value={form.consultationFee}
            onChange={handleChange}
            min="0"
            style={aiFilledStyle('consultationFee')}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Diagnostic Tests (₹)</label>
          <input
            className="form-input"
            name="diagnosticTests"
            type="number"
            placeholder="500"
            value={form.diagnosticTests}
            onChange={handleChange}
            min="0"
            style={aiFilledStyle('diagnosticTests')}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Medicines (₹)</label>
          <input
            className="form-input"
            name="medicinesCost"
            type="number"
            placeholder="500"
            value={form.medicinesCost}
            onChange={handleChange}
            min="0"
            style={aiFilledStyle('medicinesCost')}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Other Charges Label</label>
          <input
            className="form-input"
            name="otherChargesLabel"
            placeholder="e.g. therapy_charges, mri_scan"
            value={form.otherChargesLabel}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Other Charges Amount (₹)</label>
          <input
            className="form-input"
            name="otherCharges"
            type="number"
            placeholder="0"
            value={form.otherCharges}
            onChange={handleChange}
            min="0"
          />
        </div>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }}>
          {loading ? (
            <>
              <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></span>
              Processing Claim...
            </>
          ) : (
            'Submit Claim for Adjudication'
          )}
        </button>
      </div>
    </form>
  );
}
