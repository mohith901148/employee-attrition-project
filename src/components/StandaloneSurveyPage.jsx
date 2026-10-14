import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles, CheckCircle2, User, Hash, Lock, Unlock, Send,
  Sun, Moon, ShieldCheck, AlertTriangle, Clock, FileSpreadsheet, Download
} from 'lucide-react';
import { benchmarkEmployees } from '../data/benchmarkEmployees.js';
import { calculateAttritionRisk } from '../utils/predictor.js';
import { exportSingleSurveyToExcel } from '../utils/excelExporter.js';
import '../App.css';

const OVERTIME_DESC = {
  1: 'Level 1: No Overtime (Standard 40h workweek)',
  2: 'Level 2: Minimal Overtime (< 2 hrs/week)',
  3: 'Level 3: Moderate Overtime (2 - 5 hrs/week)',
  4: 'Level 4: Frequent Overtime (5 - 10 hrs/week)',
  5: 'Level 5: Heavy / Chronic Overtime (> 10 hrs/week)'
};

export default function StandaloneSurveyPage() {
  // Theme
  const [theme, setTheme] = useState('midnight');

  // Credential verification state
  const [empIdInput, setEmpIdInput] = useState('');
  const [empNameInput, setEmpNameInput] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifiedEmployee, setVerifiedEmployee] = useState(null);

  // Opinion Ratings (1 to 5)
  const [jobSatisfaction, setJobSatisfaction] = useState(3);
  const [workLifeBalance, setWorkLifeBalance] = useState(3);
  const [envSatisfaction, setEnvSatisfaction] = useState(3);
  const [relSatisfaction, setRelSatisfaction] = useState(3);
  const [overtimeRating, setOvertimeRating] = useState(2);

  // Status & Notification
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState(null);
  const [excelUpdated, setExcelUpdated] = useState(false);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-glass', 'true');
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'midnight' ? 'royal-white' : 'midnight'));
  };

  // Helper normalizers for robust credential matching
  const cleanId = (id) => String(id || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const cleanName = (name) => String(name || '').toLowerCase().trim().replace(/\s+/g, ' ');

  // Verify employee credentials against separate Employee_Credentials.xlsx & fallback pool
  const handleVerify = async (e) => {
    e.preventDefault();
    setVerifyError('');

    const rawId = empIdInput.trim();
    const rawName = empNameInput.trim();

    if (!rawId || !rawName) {
      setVerifyError('Please enter both your Employee ID and Full Name.');
      return;
    }

    setIsSubmitting(true);

    // 1. Primary Check: Verify against separate Employee_Credentials.xlsx via server API
    try {
      const res = await fetch('/api/verify-credential', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: rawId, name: rawName }),
      });
      const data = await res.json();
      if (res.ok && data.verified && data.employee) {
        setVerifiedEmployee(data.employee);
        if (data.employee.job_satisfaction) setJobSatisfaction(Number(data.employee.job_satisfaction));
        if (data.employee.work_life_balance) setWorkLifeBalance(Number(data.employee.work_life_balance));
        setIsVerified(true);
        setIsSubmitting(false);
        return;
      }
    } catch (err) {
      console.warn('Direct Excel verify API not reachable, using fallback dataset:', err);
    }

    // 2. Client-side Fallback: In case backend server is unreachable
    const targetId = cleanId(rawId);
    const targetName = cleanName(rawName);

    let customPool = [];
    try {
      const c1 = localStorage.getItem('workforcepulse_custom_employees');
      if (c1) customPool = JSON.parse(c1);
      const c2 = localStorage.getItem('workforcepulse_authorized_employees');
      if (c2 && customPool.length === 0) customPool = JSON.parse(c2);
    } catch { /* ignore */ }

    const candidatePool = [...customPool, ...benchmarkEmployees];

    const match = candidatePool.find((emp) => {
      const empId = cleanId(emp.employee_id || emp.id);
      const empName = cleanName(emp.name || emp.employeeName);
      
      const idMatches = empId === targetId;
      const nameMatches = empName === targetName ||
                          empName.includes(targetName) ||
                          targetName.includes(empName);

      return idMatches && nameMatches;
    });

    setIsSubmitting(false);

    if (match) {
      const empData = {
        employee_id: match.employee_id || match.id,
        name: match.name || match.employeeName,
        age: Number(match.age) || 30,
        salary: Number(match.salary) || 5000,
        experience: Number(match.experience) || 3,
        department: match.department || 'Research & Development',
      };
      setVerifiedEmployee(empData);

      if (match.job_satisfaction) setJobSatisfaction(Number(match.job_satisfaction));
      if (match.work_life_balance) setWorkLifeBalance(Number(match.work_life_balance));
      if (match.environment_satisfaction) setEnvSatisfaction(Number(match.environment_satisfaction));
      if (match.relationship_satisfaction) setRelSatisfaction(Number(match.relationship_satisfaction));
      if (match.overtime !== undefined) {
        setOvertimeRating(match.overtime === 1 || match.overtime === true || match.overtime === 'Yes' ? 4 : 2);
      }

      setIsVerified(true);
    } else {
      setVerifyError(
        'Invalid Employee ID or Name. Please verify against Employee_Credentials.xlsx or contact HR.'
      );
    }
  };

  // Auto-calculated Composite Satisfaction
  const autoComposite = useMemo(() => {
    return Number(
      ((jobSatisfaction + workLifeBalance + envSatisfaction + relSatisfaction) / 4).toFixed(2)
    );
  }, [jobSatisfaction, workLifeBalance, envSatisfaction, relSatisfaction]);

  // Submit handler — directly updates Excel dataset and saves to platform responses
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!verifiedEmployee) return;
    setIsSubmitting(true);

    // 1. Calculate live ML attrition risk and explanations
    const riskAnalysis = calculateAttritionRisk({
      age: verifiedEmployee.age,
      salary: verifiedEmployee.salary,
      experience: verifiedEmployee.experience,
      department: verifiedEmployee.department,
      job_satisfaction: jobSatisfaction,
      work_life_balance: workLifeBalance,
      environment_satisfaction: envSatisfaction,
      relationship_satisfaction: relSatisfaction,
      overtimeRating: overtimeRating,
      overtime: overtimeRating >= 3,
      composite_satisfaction: autoComposite,
    });

    const record = {
      id: verifiedEmployee.employee_id,
      employeeId: verifiedEmployee.employee_id,
      employeeName: verifiedEmployee.name,
      name: verifiedEmployee.name,
      age: Number(verifiedEmployee.age) || 0,
      salary: Number(verifiedEmployee.salary) || 0,
      experience: Number(verifiedEmployee.experience) || 0,
      department: verifiedEmployee.department || '',
      jobSatisfaction: Number(jobSatisfaction),
      job_satisfaction: Number(jobSatisfaction),
      workLifeBalance: Number(workLifeBalance),
      work_life_balance: Number(workLifeBalance),
      envSatisfaction: Number(envSatisfaction),
      environment_satisfaction: Number(envSatisfaction),
      relSatisfaction: Number(relSatisfaction),
      relationship_satisfaction: Number(relSatisfaction),
      compositeSatisfaction: Number(autoComposite),
      composite_satisfaction: Number(autoComposite),
      overtimeRating: Number(overtimeRating),
      overtime_score: Number(overtimeRating),
      overtime: overtimeRating >= 3,
      attritionPrediction: riskAnalysis.prediction,
      isAttritionLikely: riskAnalysis.isAttritionLikely,
      attritionProbability: `${(riskAnalysis.probability * 100).toFixed(1)}%`,
      ground_truth_prob: riskAnalysis.probability,
      riskLevel: riskAnalysis.riskLevel,
      riskBadge: riskAnalysis.riskBadge,
      riskColor: riskAnalysis.riskColor,
      riskBg: riskAnalysis.riskBg,
      estimatedTurnoverCost: Math.round((Number(verifiedEmployee.salary) || 5000) * 6 * riskAnalysis.probability),
      topRiskFactors: riskAnalysis.factorContributions?.filter(f => f.type === 'risk').map(f => f.feature) || [],
      protectiveFactors: riskAnalysis.factorContributions?.filter(f => f.type === 'protective').map(f => f.feature) || [],
      retentionRecommendations: riskAnalysis.factorContributions?.map(f => ({ action: f.desc })) || [],
      submittedVia: 'employee_standalone_form',
      timestamp: new Date().toISOString(),
    };

    // 2. Directly update Excel dataset file on filesystem (POST /api/submit-survey)
    let excelOk = false;
    try {
      const res = await fetch('/api/submit-survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      if (res.ok) {
        excelOk = true;
      }
    } catch (err) {
      console.warn('Backend Excel update API not reachable:', err);
    }
    setExcelUpdated(excelOk);

    // 3. Save to localStorage for real-time frontend HR sync
    try {
      const existing = JSON.parse(
        localStorage.getItem('workforcepulse_survey_responses') || '[]'
      );
      const updated = [record, ...existing];
      localStorage.setItem('workforcepulse_survey_responses', JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save survey response to localStorage:', err);
    }

    setSubmittedRecord(record);
    setIsSubmitting(false);
    setShowSuccess(true);
  };

  // ─── RENDER ────────────────────────────────────────────────────────────

  return (
    <div className="app-layout glass-active">
      {/* ── Standalone Header ── */}
      <header className="standalone-survey-header">
        <div className="navbar-brand">
          <div className="brand-icon-wrapper">
            <img src="/app-icon.png" alt="WorkforcePulse" className="brand-icon-img" />
          </div>
          <div>
            <div className="brand-title-row">
              <h1 className="brand-title">WorkforcePulse</h1>
              <span
                className="badge badge-low"
                style={{ fontSize: '0.7rem', padding: '2px 8px' }}
              >
                Employee Survey
              </span>
            </div>
            <p className="brand-subtitle">Confidential Employee Opinion Survey</p>
          </div>
        </div>
        <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle theme">
          {theme === 'royal-white' ? <Moon size={17} /> : <Sun size={17} />}
        </button>
      </header>

      {/* ── Main Content ── */}
      <main className="main-content-viewport" style={{ paddingTop: '24px' }}>
        {/* ═══════════ STATE 1: Credential Verification ═══════════ */}
        {!isVerified && (
          <div className="predictor-container">
            <div
              className="section-header"
              style={{ justifyContent: 'center', textAlign: 'center' }}
            >
              <div>
                <div className="badge badge-neutral" style={{ marginBottom: '8px' }}>
                  <Lock size={12} color="var(--primary)" /> Employee Verification Required
                </div>
                <h2 className="section-heading">Verify Your Identity</h2>
                <p className="section-subheading">
                  Enter your Employee ID and Full Name to access the opinion survey.
                  <br />
                  These credentials are provided by your HR department.
                </p>
              </div>
            </div>

            <div style={{ maxWidth: '480px', margin: '0 auto' }}>
              <form className="input-card glass-panel glow-card" onSubmit={handleVerify}>
                <div className="card-header-styled">
                  <h3 className="card-title">
                    <Lock size={18} className="icon-accent" />
                    <span>Employee Credentials</span>
                  </h3>
                </div>

                <div className="input-form">
                  <div className="form-group">
                    <label className="form-label" htmlFor="verify-emp-id">
                      Employee ID <span className="field-required">*</span>
                    </label>
                    <input
                      id="verify-emp-id"
                      type="text"
                      required
                      className="form-input"
                      value={empIdInput}
                      onChange={(e) => setEmpIdInput(e.target.value)}
                      placeholder="e.g. EMP-1042"
                      autoFocus
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="verify-emp-name">
                      Full Name <span className="field-required">*</span>
                    </label>
                    <input
                      id="verify-emp-name"
                      type="text"
                      required
                      className="form-input"
                      value={empNameInput}
                      onChange={(e) => setEmpNameInput(e.target.value)}
                      placeholder="e.g. Alexander Brown"
                    />
                  </div>

                  {verifyError && (
                    <div
                      className="survey-native-alert animate-fade-in"
                      style={{
                        background: 'rgba(239,68,68,0.08)',
                        border: '1px solid rgba(239,68,68,0.25)',
                      }}
                    >
                      <div className="survey-alert-icon">
                        <AlertTriangle size={20} color="#ef4444" />
                      </div>
                      <div className="survey-alert-body">
                        <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>
                          {verifyError}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="survey-action-footer" style={{ marginTop: '8px' }}>
                    <button
                      type="submit"
                      className="action-btn action-btn-primary survey-cta-btn"
                    >
                      <Unlock size={18} />
                      <span>Verify & Access Survey</span>
                      <Sparkles size={16} />
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══════════ STATE 2: Success ═══════════ */}
        {isVerified && showSuccess && (
          <div
            className="predictor-container"
            style={{ textAlign: 'center', padding: '60px 20px' }}
          >
            <div
              className="glass-panel glow-card"
              style={{ padding: '60px 40px', maxWidth: '620px', margin: '0 auto' }}
            >
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'rgba(16,185,129,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                }}
              >
                <CheckCircle2 size={48} color="#10b981" />
              </div>
              <h2 className="section-heading" style={{ marginBottom: '12px' }}>
                Survey Submitted Successfully!
              </h2>
              <p className="section-subheading">
                Thank you, <strong>{verifiedEmployee.name}</strong>. Your survey has been submitted.
              </p>



              <p
                style={{
                  marginTop: '28px',
                  fontSize: '0.8rem',
                  color: 'var(--text-dim)',
                }}
              >
                You may close this page now. Your responses are confidential and protected.
              </p>
            </div>
          </div>
        )}

        {/* ═══════════ STATE 3: Survey Form ═══════════ */}
        {isVerified && !showSuccess && (
          <div className="predictor-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Header */}
            <div className="section-header" style={{ justifyContent: 'center', textAlign: 'center', width: '100%', maxWidth: '740px' }}>
              <div>
                <div className="badge badge-neutral" style={{ marginBottom: '8px' }}>
                  <ShieldCheck size={12} color="#10b981" /> Verified against Employee_Credentials.xlsx: {verifiedEmployee.name} ({verifiedEmployee.employee_id})
                </div>
                <h2 className="section-heading">Employee Opinion Survey</h2>
                <p className="section-subheading">
                  Share your honest feedback across core workplace dimensions. Your
                  responses are confidential and help us improve the organization.
                </p>
              </div>
            </div>

            <form
              className="input-card glass-panel glow-card"
              onSubmit={handleSubmit}
              style={{ maxWidth: '740px' }}
            >
              {/* Employee Profile Summary — Read Only */}
              <div className="card-header-styled">
                <h3 className="card-title">
                  <User size={18} className="icon-accent" />
                  <span>Your Profile</span>
                </h3>
                <span className="badge badge-primary">Read Only</span>
              </div>

              <div className="input-form">
                <div className="standalone-profile-grid">
                  <div className="standalone-profile-item">
                    <span className="standalone-profile-label">Employee ID</span>
                    <p className="standalone-profile-value">
                      {verifiedEmployee.employee_id}
                    </p>
                  </div>
                  <div className="standalone-profile-item">
                    <span className="standalone-profile-label">Full Name</span>
                    <p className="standalone-profile-value">{verifiedEmployee.name}</p>
                  </div>
                  <div className="standalone-profile-item">
                    <span className="standalone-profile-label">Department</span>
                    <p className="standalone-profile-value">
                      {verifiedEmployee.department || '—'}
                    </p>
                  </div>
                  <div className="standalone-profile-item">
                    <span className="standalone-profile-label">Age</span>
                    <p className="standalone-profile-value">
                      {verifiedEmployee.age ? `${verifiedEmployee.age} yrs` : '—'}
                    </p>
                  </div>
                  <div className="standalone-profile-item">
                    <span className="standalone-profile-label">Experience</span>
                    <p className="standalone-profile-value">
                      {verifiedEmployee.experience != null
                        ? `${verifiedEmployee.experience} years`
                        : '—'}
                    </p>
                  </div>
                  <div className="standalone-profile-item">
                    <span className="standalone-profile-label">Monthly Salary</span>
                    <p className="standalone-profile-value">
                      {verifiedEmployee.salary
                        ? `$${Number(verifiedEmployee.salary).toLocaleString()}`
                        : '—'}
                    </p>
                  </div>
                </div>

                {/* ── Opinion Ratings ── */}
                <div className="form-group form-group-box">
                  <div className="satisfaction-box-header">
                    <div>
                      <label className="form-label" style={{ marginBottom: 0 }}>
                        Your Opinions & Satisfaction Ratings (1 to 5)
                      </label>
                      <p className="form-helper">
                        Rate each dimension honestly. All responses are strictly
                        confidential.
                      </p>
                    </div>
                    <div className="composite-sat-badge">
                      <span>Overall:</span>
                      <strong>{autoComposite} / 5.0</strong>
                    </div>
                  </div>

                  {/* 1. Job Satisfaction */}
                  <div className="rating-row">
                    <div className="rating-info">
                      <span className="rating-title">Overall Job Satisfaction</span>
                      <span className="rating-desc">
                        How fulfilled do you feel in your current role?
                      </span>
                    </div>
                    <div className="star-selector">
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          className={`sat-btn ${jobSatisfaction === lvl ? 'sat-btn-active' : ''}`}
                          onClick={() => setJobSatisfaction(lvl)}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Work-Life Balance */}
                  <div className="rating-row">
                    <div className="rating-info">
                      <span className="rating-title">Work-Life Balance</span>
                      <span className="rating-desc">
                        How well can you maintain personal time boundaries?
                      </span>
                    </div>
                    <div className="star-selector">
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          className={`sat-btn ${workLifeBalance === lvl ? 'sat-btn-active' : ''}`}
                          onClick={() => setWorkLifeBalance(lvl)}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Workplace Environment */}
                  <div className="rating-row">
                    <div className="rating-info">
                      <span className="rating-title">Workplace Environment</span>
                      <span className="rating-desc">
                        Culture, team harmony & psychological safety
                      </span>
                    </div>
                    <div className="star-selector">
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          className={`sat-btn ${envSatisfaction === lvl ? 'sat-btn-active' : ''}`}
                          onClick={() => setEnvSatisfaction(lvl)}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4. Manager & Peer Relationship */}
                  <div className="rating-row">
                    <div className="rating-info">
                      <span className="rating-title">Manager & Peer Relationship</span>
                      <span className="rating-desc">
                        Direct manager support & peer trust
                      </span>
                    </div>
                    <div className="star-selector">
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          className={`sat-btn ${relSatisfaction === lvl ? 'sat-btn-active' : ''}`}
                          onClick={() => setRelSatisfaction(lvl)}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 5. Overtime Workload */}
                  <div className="rating-row survey-overtime-sub-row">
                    <div className="rating-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="rating-title">Overtime Workload</span>
                        {overtimeRating >= 3 && (
                          <span
                            className="badge badge-high"
                            style={{ fontSize: '0.68rem', padding: '1px 6px' }}
                          >
                            Heavy
                          </span>
                        )}
                      </div>
                      <span className="rating-desc">
                        {OVERTIME_DESC[overtimeRating]}
                      </span>
                    </div>
                    <div className="star-selector">
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          className={`sat-btn ${
                            overtimeRating === lvl
                              ? lvl >= 4
                                ? 'sat-btn-danger'
                                : lvl === 3
                                  ? 'sat-btn-warning'
                                  : 'sat-btn-active'
                              : ''
                          }`}
                          onClick={() => setOvertimeRating(lvl)}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Submit Button ── */}
                <div className="survey-action-footer">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="action-btn action-btn-primary survey-cta-btn"
                  >
                    <Send size={18} />
                    <span>{isSubmitting ? 'Submitting...' : 'Submit'}</span>
                  </button>
                  <p className="survey-cta-hint">
                    Your feedback will be securely recorded and reviewed by the HR team.
                    All responses are confidential.
                  </p>
                </div>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer
        style={{
          textAlign: 'center',
          padding: '20px',
          fontSize: '0.75rem',
          color: 'var(--text-dim)',
          borderTop: '1px solid var(--border-color)',
          marginTop: 'auto',
        }}
      >
        © {new Date().getFullYear()} WorkforcePulse — Employee Attrition Prediction &
        Workforce Analytics Platform
      </footer>
    </div>
  );
}
