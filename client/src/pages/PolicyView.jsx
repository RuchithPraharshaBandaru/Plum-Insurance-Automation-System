import { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:5000/api';

export default function PolicyView() {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/policy`)
      .then(res => setPolicy(res.data.policy))
      .catch(err => console.error('Failed to load policy:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page">
        <div className="loading-overlay">
          <div className="spinner"></div>
          <div className="loading-text">Loading policy terms...</div>
        </div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">Could not load policy</div>
          <div className="empty-state-text">Make sure the backend server is running.</div>
        </div>
      </div>
    );
  }

  const { coverage_details: cov } = policy;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Policy Details</h1>
        <p className="page-description">
          {policy.policy_name} ({policy.policy_id}) — Effective from {policy.effective_date}
        </p>
      </div>

      {/* Key Limits */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Annual Limit</div>
          <div className="stat-value" style={{ color: 'var(--accent-teal-light)' }}>₹{cov.annual_limit?.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Per Claim Limit</div>
          <div className="stat-value" style={{ color: 'var(--accent-teal-light)' }}>₹{cov.per_claim_limit?.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Family Floater</div>
          <div className="stat-value" style={{ color: 'var(--accent-teal-light)' }}>₹{cov.family_floater_limit?.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Min Claim</div>
          <div className="stat-value" style={{ color: 'var(--status-partial)' }}>₹{policy.claim_requirements?.minimum_claim_amount}</div>
        </div>
      </div>

      {/* Coverage Categories */}
      <div className="section-title">📦 Coverage Categories</div>
      <div className="policy-grid">
        {/* Consultation */}
        <div className="policy-card">
          <div className="policy-card-title">🩺 Consultation Fees</div>
          <div className="policy-card-value">₹{cov.consultation_fees?.sub_limit?.toLocaleString()}</div>
          <ul className="policy-list" style={{ marginTop: '0.5rem' }}>
            <li>Co-pay: {cov.consultation_fees?.copay_percentage}%</li>
            <li>Network discount: {cov.consultation_fees?.network_discount}%</li>
          </ul>
        </div>

        {/* Diagnostic */}
        <div className="policy-card">
          <div className="policy-card-title">🔬 Diagnostic Tests</div>
          <div className="policy-card-value">₹{cov.diagnostic_tests?.sub_limit?.toLocaleString()}</div>
          <ul className="policy-list" style={{ marginTop: '0.5rem' }}>
            {cov.diagnostic_tests?.covered_tests?.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>

        {/* Pharmacy */}
        <div className="policy-card">
          <div className="policy-card-title">💊 Pharmacy</div>
          <div className="policy-card-value">₹{cov.pharmacy?.sub_limit?.toLocaleString()}</div>
          <ul className="policy-list" style={{ marginTop: '0.5rem' }}>
            <li>Generic drugs mandatory: {cov.pharmacy?.generic_drugs_mandatory ? 'Yes' : 'No'}</li>
            <li>Branded drugs co-pay: {cov.pharmacy?.branded_drugs_copay}%</li>
          </ul>
        </div>

        {/* Dental */}
        <div className="policy-card">
          <div className="policy-card-title">🦷 Dental</div>
          <div className="policy-card-value">₹{cov.dental?.sub_limit?.toLocaleString()}</div>
          <ul className="policy-list" style={{ marginTop: '0.5rem' }}>
            {cov.dental?.procedures_covered?.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
            <li style={{ color: 'var(--status-rejected)' }}>Cosmetic: Not covered</li>
          </ul>
        </div>

        {/* Vision */}
        <div className="policy-card">
          <div className="policy-card-title">👁️ Vision</div>
          <div className="policy-card-value">₹{cov.vision?.sub_limit?.toLocaleString()}</div>
          <ul className="policy-list" style={{ marginTop: '0.5rem' }}>
            <li>Eye test: {cov.vision?.eye_test_covered ? 'Covered' : 'Not covered'}</li>
            <li>Glasses/Lenses: {cov.vision?.glasses_contact_lenses ? 'Covered' : 'Not covered'}</li>
            <li style={{ color: 'var(--status-rejected)' }}>LASIK: Not covered</li>
          </ul>
        </div>

        {/* Alternative Medicine */}
        <div className="policy-card">
          <div className="policy-card-title">🌿 Alternative Medicine</div>
          <div className="policy-card-value">₹{cov.alternative_medicine?.sub_limit?.toLocaleString()}</div>
          <ul className="policy-list" style={{ marginTop: '0.5rem' }}>
            {cov.alternative_medicine?.covered_treatments?.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
            <li>Session limit: {cov.alternative_medicine?.therapy_sessions_limit}</li>
          </ul>
        </div>
      </div>

      {/* Waiting Periods */}
      <div className="section-title">⏳ Waiting Periods</div>
      <div className="policy-grid">
        <div className="policy-card">
          <div className="policy-card-title">Standard Waiting</div>
          <ul className="policy-list">
            <li>Initial: {policy.waiting_periods?.initial_waiting} days</li>
            <li>Pre-existing: {policy.waiting_periods?.pre_existing_diseases} days</li>
            <li>Maternity: {policy.waiting_periods?.maternity} days</li>
          </ul>
        </div>
        <div className="policy-card">
          <div className="policy-card-title">Specific Ailments</div>
          <ul className="policy-list">
            {Object.entries(policy.waiting_periods?.specific_ailments || {}).map(([k, v]) => (
              <li key={k}>{k.replace('_', ' ')}: {v} days</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Exclusions */}
      <div className="section-title">🚫 Exclusions</div>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {policy.exclusions?.map((ex, i) => (
            <span key={i} className="exclusion-tag">{ex}</span>
          ))}
        </div>
      </div>

      {/* Network Hospitals */}
      <div className="section-title">🏥 Network Hospitals</div>
      <div className="policy-grid">
        {policy.network_hospitals?.map((h, i) => (
          <div key={i} className="policy-card" style={{ padding: '0.75rem 1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--status-approved)' }}>✓</span>
              <span style={{ fontWeight: 500 }}>{h}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Required Documents */}
      <div className="section-title">📄 Required Documents</div>
      <div className="card">
        <ul className="policy-list">
          {policy.claim_requirements?.documents_required?.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
        <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Submission deadline: {policy.claim_requirements?.submission_timeline_days} days from treatment date
        </div>
      </div>
    </div>
  );
}
