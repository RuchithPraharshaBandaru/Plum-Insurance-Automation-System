import { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:5000/api';

export default function Dashboard() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [stats, setStats] = useState({ total: 0, approved: 0, rejected: 0, partial: 0, review: 0 });

  useEffect(() => {
    fetchClaims();
  }, [filter]);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const params = filter ? { status: filter } : {};
      const res = await axios.get(`${API}/claims`, { params });
      setClaims(res.data.claims || []);

      // Calculate stats from all claims
      const allRes = await axios.get(`${API}/claims`, { params: { limit: 1000 } });
      const all = allRes.data.claims || [];
      setStats({
        total: all.length,
        approved: all.filter(c => c.decision === 'APPROVED').length,
        rejected: all.filter(c => c.decision === 'REJECTED').length,
        partial: all.filter(c => c.decision === 'PARTIAL').length,
        review: all.filter(c => c.decision === 'MANUAL_REVIEW').length,
      });
    } catch (err) {
      console.error('Failed to fetch claims:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (d) => d?.toLowerCase().replace(' ', '_') || 'pending';
  const getStatusEmoji = (d) => {
    switch (d) {
      case 'APPROVED': return '✅';
      case 'REJECTED': return '❌';
      case 'PARTIAL': return '⚠️';
      case 'MANUAL_REVIEW': return '🔍';
      default: return '⏳';
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Claims Dashboard</h1>
        <p className="page-description">View and track all submitted claims and their adjudication results.</p>
      </div>

      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Total Claims</div>
          <div className="stat-value" style={{ color: 'var(--text-primary)' }}>{stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Approved</div>
          <div className="stat-value" style={{ color: 'var(--status-approved)' }}>{stats.approved}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Rejected</div>
          <div className="stat-value" style={{ color: 'var(--status-rejected)' }}>{stats.rejected}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Partial</div>
          <div className="stat-value" style={{ color: 'var(--status-partial)' }}>{stats.partial}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Manual Review</div>
          <div className="stat-value" style={{ color: 'var(--status-review)' }}>{stats.review}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        {['', 'APPROVED', 'REJECTED', 'PARTIAL', 'MANUAL_REVIEW'].map(f => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f || 'All'}
          </button>
        ))}
      </div>

      {/* Claims List */}
      {loading ? (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <div className="loading-text">Loading claims...</div>
        </div>
      ) : claims.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-title">No claims found</div>
          <div className="empty-state-text">
            {filter ? 'No claims match this filter.' : 'Submit your first claim to get started!'}
          </div>
        </div>
      ) : (
        <div className="claims-grid">
          {claims.map(claim => (
            <div
              key={claim._id}
              className="claim-row"
              onClick={() => setSelectedClaim(selectedClaim?._id === claim._id ? null : claim)}
            >
              <div className="claim-row-id">{claim.claimId}</div>
              <div>
                <div className="claim-row-name">{claim.memberName}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  {claim.documents?.prescription?.diagnosis || '—'}
                </div>
              </div>
              <div className="claim-row-amount" style={{ color: 'var(--text-primary)' }}>
                ₹{claim.claimAmount?.toLocaleString()}
              </div>
              <div className="claim-row-date">{formatDate(claim.treatmentDate)}</div>
              <div>
                <span className={`status-badge ${getStatusClass(claim.decision)}`}>
                  {getStatusEmoji(claim.decision)} {claim.decision}
                </span>
              </div>

              {/* Expanded Details */}
              {selectedClaim?._id === claim._id && (
                <div
                  style={{ gridColumn: '1 / -1', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}
                  className="fade-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <div className="result-section-title">Approved Amount</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-teal-light)' }}>
                        ₹{claim.approvedAmount?.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="result-section-title">Confidence</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                        {Math.round((claim.confidenceScore || 0) * 100)}%
                      </div>
                      <div className="confidence-bar" style={{ width: '100px' }}>
                        <div
                          className={`confidence-fill ${claim.confidenceScore >= 0.9 ? 'high' : claim.confidenceScore >= 0.7 ? 'medium' : 'low'}`}
                          style={{ width: `${(claim.confidenceScore || 0) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="result-section-title">Doctor</div>
                      <div style={{ fontSize: '0.85rem' }}>
                        {claim.documents?.prescription?.doctorName || '—'}
                      </div>
                    </div>
                  </div>

                  {claim.rejectionReasons?.length > 0 && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div className="result-section-title">Rejection Reasons</div>
                      {claim.rejectionReasons.map((r, i) => (
                        <span key={i} className="exclusion-tag" style={{ marginRight: '0.3rem' }}>{r}</span>
                      ))}
                    </div>
                  )}

                  {claim.notes && (
                    <div className="result-notes" style={{ marginTop: '0.5rem' }}>
                      {claim.notes}
                    </div>
                  )}

                  {claim.nextSteps && (
                    <div className="result-notes" style={{ marginTop: '0.5rem', background: 'rgba(20,184,166,0.05)', borderLeft: '3px solid var(--accent-teal)' }}>
                      <strong style={{ color: 'var(--accent-teal)' }}>Next Steps: </strong>
                      {claim.nextSteps}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
