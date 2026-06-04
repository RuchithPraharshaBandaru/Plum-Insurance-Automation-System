import { useState, useEffect } from 'react';
import axios from 'axios';
import ClaimForm from '../components/ClaimForm';
import ClaimResult from '../components/ClaimResult';
import DocumentUpload from '../components/DocumentUpload';

const API = 'http://localhost:5000/api';

export default function SubmitClaim() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState([]);
  const [testCases, setTestCases] = useState([]);
  const [runningTest, setRunningTest] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [prefillData, setPrefillData] = useState(null);
  const [extractionMessage, setExtractionMessage] = useState('');
  const [extractionWarnings, setExtractionWarnings] = useState([]);

  // Load test cases
  useEffect(() => {
    axios.get(`${API}/test-cases`)
      .then(res => setTestCases(res.data.testCases || []))
      .catch(() => {});
  }, []);

  // Auto-extract when files are uploaded
  useEffect(() => {
    if (files.length > 0) {
      extractFromDocuments(files);
    }
  }, [files]);

  // Send uploaded files to backend for AI extraction → auto-fill
  const extractFromDocuments = async (uploadedFiles) => {
    setExtracting(true);
    setExtractionMessage('');
    setExtractionWarnings([]);
    setError('');

    try {
      const formData = new FormData();
      uploadedFiles.forEach(f => formData.append('files', f));

      const res = await axios.post(`${API}/claims/extract`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success && res.data.formData) {
        setPrefillData(res.data.formData);
        setExtractionMessage(res.data.message);
        setExtractionWarnings(res.data.formData.warnings || []);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setError(`AI extraction failed: ${msg}. You can fill the form manually.`);
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async (claimData) => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await axios.post(`${API}/claims`, claimData);
      setResult(response.data.claim);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to submit claim');
    } finally {
      setLoading(false);
    }
  };

  const runTestCase = async (caseId) => {
    setRunningTest(caseId);
    setTestResult(null);
    setResult(null);
    setError('');
    setPrefillData(null);

    try {
      const response = await axios.post(`${API}/claims/test/${caseId}`);
      setTestResult(response.data);
      setResult(response.data.actualResult);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setRunningTest(null);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Submit OPD Claim</h1>
        <p className="page-description">
          Upload your medical documents and let AI fill the form, or enter details manually.
        </p>
      </div>

      {/* Test Case Runner */}
      {testCases.length > 0 && (
        <div className="test-runner">
          <div className="test-runner-header">
            <span className="test-runner-label">🧪 Quick Test Cases</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
            {testCases.map(tc => (
              <button
                key={tc.caseId}
                className="btn btn-sm btn-secondary"
                onClick={() => runTestCase(tc.caseId)}
                disabled={runningTest === tc.caseId}
                title={tc.description}
              >
                {runningTest === tc.caseId ? '⏳' : '▶'} {tc.caseId}
                <span className={`status-badge ${tc.expectedDecision?.toLowerCase().replace(' ', '_')}`} style={{ marginLeft: '0.3rem', padding: '0.15rem 0.4rem', fontSize: '0.65rem' }}>
                  {tc.expectedDecision}
                </span>
              </button>
            ))}
          </div>

          {testResult && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                <strong style={{ fontSize: '0.85rem' }}>{testResult.testCase.caseName}</strong>
                <span className={`match-badge ${testResult.match ? 'pass' : 'fail'}`}>
                  {testResult.match ? '✓ PASS' : '✕ FAIL'}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Expected: <strong>{testResult.expectedResult.decision}</strong> |
                Got: <strong>{testResult.actualResult.decision}</strong>
                {testResult.expectedResult.approved_amount !== undefined && (
                  <> | Expected ₹{testResult.expectedResult.approved_amount} → Got ₹{testResult.actualResult.approvedAmount}</>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={{
          padding: '1rem',
          background: 'var(--status-rejected-bg)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--status-rejected)',
          marginBottom: '1.5rem',
          fontSize: '0.875rem',
        }}>
          ❌ {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: result ? '1fr 1fr' : '1fr', gap: '1.5rem' }}>
        {/* Claim Form */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">📋 Claim Details</span>
            {prefillData && (
              <span style={{
                fontSize: '0.72rem',
                color: 'var(--accent-teal)',
                background: 'rgba(20,184,166,0.1)',
                padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                fontWeight: 600,
              }}>
                ✨ AI Auto-filled
              </span>
            )}
          </div>

          {/* Document Upload with extraction */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div className="section-title">📎 Upload Documents — AI will auto-fill the form</div>
            <DocumentUpload files={files} setFiles={setFiles} />

            {/* Extraction Loading State */}
            {extracting && (
              <div style={{
                marginTop: '1rem',
                padding: '1.25rem',
                background: 'rgba(20, 184, 166, 0.06)',
                border: '1px solid rgba(20, 184, 166, 0.2)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
              }}>
                <div className="spinner" style={{ width: 24, height: 24, flexShrink: 0 }}></div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--accent-teal)' }}>
                    🤖 AI is reading your documents...
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Extracting patient details, diagnosis, medicines, and bill amounts
                  </div>
                </div>
              </div>
            )}

            {/* Extraction Success Message */}
            {extractionMessage && !extracting && (
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem',
                color: 'var(--status-approved)',
              }}>
                ✅ {extractionMessage}
                <span style={{ display: 'block', marginTop: '0.3rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Fields highlighted in teal were auto-filled. Review and correct if needed.
                </span>
              </div>
            )}

            {/* Extraction Warnings */}
            {extractionWarnings.length > 0 && (
              <div style={{
                marginTop: '0.5rem',
                padding: '0.6rem 0.9rem',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                color: 'var(--status-partial)',
              }}>
                ⚠️ Warnings:
                {extractionWarnings.map((w, i) => (
                  <div key={i} style={{ marginTop: '0.15rem', marginLeft: '1rem' }}>• {w}</div>
                ))}
              </div>
            )}
          </div>

          <ClaimForm onSubmit={handleSubmit} loading={loading} prefillData={prefillData} />
        </div>

        {/* Result */}
        {result && (
          <div className="fade-in">
            <ClaimResult result={result} />
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(10, 14, 26, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)',
        }}>
          <div className="loading-overlay" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: '2.5rem', boxShadow: 'var(--shadow-lg)' }}>
            <div className="spinner" style={{ width: 48, height: 48 }}></div>
            <div className="loading-text">Running adjudication engine...</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Checking eligibility • Validating documents • Verifying coverage • AI fraud scan
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
