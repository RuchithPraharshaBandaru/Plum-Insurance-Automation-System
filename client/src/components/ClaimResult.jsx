export default function ClaimResult({ result }) {
  if (!result) return null;

  const getStatusClass = (decision) => {
    return decision?.toLowerCase().replace(' ', '_') || 'pending';
  };

  const getStatusEmoji = (decision) => {
    switch (decision) {
      case 'APPROVED': return '✅';
      case 'REJECTED': return '❌';
      case 'PARTIAL': return '⚠️';
      case 'MANUAL_REVIEW': return '🔍';
      default: return '⏳';
    }
  };

  const confidenceLevel = result.confidenceScore >= 0.9
    ? 'high'
    : result.confidenceScore >= 0.7
    ? 'medium'
    : 'low';

  return (
    <div className="result-card slide-up">
      <div className="result-header">
        <div>
          <div className="result-decision" style={{ marginBottom: '0.25rem' }}>
            {getStatusEmoji(result.decision)} Claim {result.claimId}
          </div>
          <span className={`status-badge ${getStatusClass(result.decision)}`}>
            {result.decision}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="result-section-title">Confidence</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
            {Math.round((result.confidenceScore || 0) * 100)}%
          </div>
          <div className="confidence-bar" style={{ width: '120px' }}>
            <div
              className={`confidence-fill ${confidenceLevel}`}
              style={{ width: `${(result.confidenceScore || 0) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="result-body">
        {/* Claim Amount */}
        <div className="result-section">
          <div className="result-section-title">Claim Amount</div>
          <div className="result-value">₹{result.claimAmount?.toLocaleString()}</div>
        </div>

        {/* Approved Amount */}
        <div className="result-section">
          <div className="result-section-title">Approved Amount</div>
          <div className="result-value amount">₹{result.approvedAmount?.toLocaleString()}</div>
        </div>

        {/* Deductions */}
        {result.deductions && Object.keys(result.deductions).length > 0 && (
          <div className="result-section">
            <div className="result-section-title">Deductions</div>
            {Object.entries(result.deductions).map(([key, value]) => (
              <div key={key} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                {key.replace(/_/g, ' ')}: <span style={{ color: 'var(--status-partial)' }}>₹{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Network Discount */}
        {result.networkDiscount > 0 && (
          <div className="result-section">
            <div className="result-section-title">Network Discount</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent-emerald)' }}>
              -₹{result.networkDiscount?.toLocaleString()}
            </div>
            {result.cashlessApproved && (
              <span className="status-badge approved" style={{ marginTop: '0.4rem' }}>
                Cashless Approved
              </span>
            )}
          </div>
        )}

        {/* Rejection Reasons */}
        {result.rejectionReasons && result.rejectionReasons.length > 0 && (
          <div className="result-section" style={{ gridColumn: '1 / -1' }}>
            <div className="result-section-title">Rejection Reasons</div>
            <ul className="result-reasons">
              {result.rejectionReasons.map((reason, i) => (
                <li key={i}>{reason.replace(/_/g, ' ')}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Rejected Items */}
        {result.rejectedItems && result.rejectedItems.length > 0 && (
          <div className="result-section" style={{ gridColumn: '1 / -1' }}>
            <div className="result-section-title">Excluded Items</div>
            <ul className="result-reasons">
              {result.rejectedItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Flags */}
        {result.flags && result.flags.length > 0 && (
          <div className="result-section" style={{ gridColumn: '1 / -1' }}>
            <div className="result-section-title">Flags</div>
            {result.flags.map((flag, i) => (
              <span key={i} className="status-badge manual_review" style={{ marginRight: '0.5rem', marginBottom: '0.3rem' }}>
                🚩 {flag}
              </span>
            ))}
          </div>
        )}

        {/* Notes */}
        {result.notes && (
          <div className="result-notes">
            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.4rem' }}>Notes</strong>
            {result.notes}
          </div>
        )}

        {/* Next Steps */}
        {result.nextSteps && (
          <div className="result-notes" style={{ background: 'rgba(20, 184, 166, 0.05)', borderLeft: '3px solid var(--accent-teal)' }}>
            <strong style={{ color: 'var(--accent-teal)', display: 'block', marginBottom: '0.4rem' }}>Next Steps</strong>
            {result.nextSteps}
          </div>
        )}

        {/* LLM Analysis */}
        {result.llmAnalysis && (
          <div className="result-notes" style={{ gridColumn: '1 / -1', background: 'rgba(139, 92, 246, 0.05)', borderLeft: '3px solid var(--status-review)' }}>
            <strong style={{ color: 'var(--status-review)', display: 'block', marginBottom: '0.4rem' }}>🤖 AI Analysis</strong>
            {result.llmAnalysis}
          </div>
        )}

        {/* Confidence Reasoning (Explainability) */}
        {result.confidenceReasoning && (
          <div className="result-notes" style={{ gridColumn: '1 / -1', background: 'rgba(245, 158, 11, 0.05)', borderLeft: '3px solid var(--status-partial)' }}>
            <strong style={{ color: 'var(--status-partial)', display: 'block', marginBottom: '0.4rem' }}>
              📊 Confidence: {Math.round((result.confidenceScore || 0) * 100)}% — Why?
            </strong>
            {result.confidenceReasoning}
          </div>
        )}

        {/* AI Fraud Analysis */}
        {result.fraudAnalysis && result.fraudAnalysis.anomaliesDetected && (
          <div className="result-notes" style={{ gridColumn: '1 / -1', background: 'rgba(239, 68, 68, 0.06)', borderLeft: '3px solid var(--status-rejected)' }}>
            <strong style={{ color: 'var(--status-rejected)', display: 'block', marginBottom: '0.5rem' }}>
              🚨 AI Fraud & Anomaly Detection (Risk: {Math.round((result.fraudAnalysis.riskScore || 0) * 100)}%)
            </strong>
            {result.fraudAnalysis.anomalies?.map((a, i) => (
              <div key={i} style={{
                padding: '0.5rem 0.7rem',
                marginBottom: '0.4rem',
                background: 'rgba(239, 68, 68, 0.06)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem',
              }}>
                <span style={{
                  display: 'inline-block',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '4px',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  marginRight: '0.5rem',
                  background: a.severity === 'high' ? 'var(--status-rejected-bg)' : a.severity === 'medium' ? 'var(--status-partial-bg)' : 'var(--status-pending-bg)',
                  color: a.severity === 'high' ? 'var(--status-rejected)' : a.severity === 'medium' ? 'var(--status-partial)' : 'var(--text-secondary)',
                }}>
                  {a.severity}
                </span>
                <strong>{a.type}: </strong>{a.description}
              </div>
            ))}
            {result.fraudAnalysis.overallAssessment && (
              <div style={{ marginTop: '0.5rem', fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                {result.fraudAnalysis.overallAssessment}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
