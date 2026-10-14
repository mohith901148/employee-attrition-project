import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck, 
  DollarSign, 
  Briefcase, 
  Clock, 
  Scale, 
  Coffee, 
  HeartHandshake, 
  ThumbsUp, 
  Calculator, 
  Download, 
  RotateCcw, 
  Trash2, 
  Flame,
  Sliders,
  Check,
  User,
  Hash
} from 'lucide-react';
import { calculateAttritionRisk } from '../utils/predictor';
import { exportSingleSurveyToExcel, exportAllSurveysToExcel } from '../utils/excelExporter';

const DEPARTMENTS = [
  { id: 'Research & Development', label: 'R&D', icon: '🔬', desc: 'Scientific & engineering research' },
  { id: 'Sales', label: 'Sales', icon: '📈', desc: 'Client acquisition & revenue' },
  { id: 'Engineering', label: 'Engineering', icon: '💻', desc: 'Software, cloud & infra' },
  { id: 'Human Resources', label: 'Human Resources', icon: '👥', desc: 'People ops & talent' },
  { id: 'Marketing', label: 'Marketing', icon: '🎯', desc: 'Growth, brand & product' },
  { id: 'Finance', label: 'Finance', icon: '💳', desc: 'Financial planning & treasury' },
];

const OVERTIME_DESC = {
  1: 'Level 1: No Overtime (Standard 40h workweek)',
  2: 'Level 2: Minimal Overtime (< 2 hrs/week)',
  3: 'Level 3: Moderate Overtime (2 - 5 hrs/week)',
  4: 'Level 4: Frequent Overtime (5 - 10 hrs/week)',
  5: 'Level 5: Heavy / Chronic Overtime (> 10 hrs/week)'
};

export default function EmployeeSurveyForm({ 
  onAddToRoster,
  surveyResponses = [],
  onSaveSurveyResponse,
  onClearSurveys,
  onDeleteSurvey
}) {
  // 1. Employee Identity & Profile State
  const [employeeId, setEmployeeId] = useState(() => `EMP-${Math.floor(1000 + Math.random() * 9000)}`);
  const [employeeName, setEmployeeName] = useState('');
  const [age, setAge] = useState(32);
  const [salary, setSalary] = useState(6500);
  const [experience, setExperience] = useState(4);
  const [department, setDepartment] = useState('Research & Development');

  // 2. Opinion Ratings (out of 5)
  const [jobSatisfaction, setJobSatisfaction] = useState(3);
  const [workLifeBalance, setWorkLifeBalance] = useState(3);
  const [envSatisfaction, setEnvSatisfaction] = useState(3);
  const [relSatisfaction, setRelSatisfaction] = useState(3);
  const [isAutoComposite, setIsAutoComposite] = useState(true);
  const [customComposite, setCustomComposite] = useState(3.0);
  const [overtimeRating, setOvertimeRating] = useState(3);

  // Status & Notification state
  const [lastExportedFile, setLastExportedFile] = useState(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-calculated Composite Satisfaction score (mean of the 4 core factors)
  const autoComposite = useMemo(() => {
    const mean = (jobSatisfaction + workLifeBalance + envSatisfaction + relSatisfaction) / 4;
    return Number(mean.toFixed(2));
  }, [jobSatisfaction, workLifeBalance, envSatisfaction, relSatisfaction]);

  const activeComposite = isAutoComposite ? autoComposite : customComposite;

  // Run live prediction with the platform's calibrated model
  const livePrediction = useMemo(() => {
    return calculateAttritionRisk({
      age,
      salary,
      experience,
      department,
      job_satisfaction: jobSatisfaction,
      work_life_balance: workLifeBalance,
      environment_satisfaction: envSatisfaction,
      relationship_satisfaction: relSatisfaction,
      composite_satisfaction: activeComposite,
      overtime_score: overtimeRating
    });
  }, [age, salary, experience, department, jobSatisfaction, workLifeBalance, envSatisfaction, relSatisfaction, activeComposite, overtimeRating]);

  // Generate random employee ID
  const handleRegenerateId = () => {
    setEmployeeId(`EMP-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  // Reset form to defaults
  const handleResetForm = () => {
    handleRegenerateId();
    setEmployeeName('');
    setAge(30);
    setSalary(6000);
    setExperience(3);
    setDepartment('Research & Development');
    setJobSatisfaction(3);
    setWorkLifeBalance(3);
    setEnvSatisfaction(3);
    setRelSatisfaction(3);
    setIsAutoComposite(true);
    setCustomComposite(3.0);
    setOvertimeRating(2);
    setLastExportedFile(null);
  };

  // Quick Sample Presets for Testing
  const handleFillHighRiskSample = () => {
    setEmployeeId(`EMP-${Math.floor(1000 + Math.random() * 9000)}`);
    setEmployeeName('Marcus Vance');
    setAge(26);
    setSalary(3600);
    setExperience(2);
    setDepartment('Sales');
    setJobSatisfaction(1);
    setWorkLifeBalance(1);
    setEnvSatisfaction(2);
    setRelSatisfaction(2);
    setIsAutoComposite(true);
    setOvertimeRating(5); // Severe overtime
  };

  const handleFillRetainedSample = () => {
    setEmployeeId(`EMP-${Math.floor(1000 + Math.random() * 9000)}`);
    setEmployeeName('Elena Rostova');
    setAge(42);
    setSalary(14500);
    setExperience(12);
    setDepartment('Engineering');
    setJobSatisfaction(5);
    setWorkLifeBalance(5);
    setEnvSatisfaction(4);
    setRelSatisfaction(5);
    setIsAutoComposite(true);
    setOvertimeRating(1); // No overtime
  };

  // Main Submit Handler: Predicts & Directly Exports to Excel Sheet (.xlsx)
  const handleSubmitSurvey = (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);

    const empNameClean = employeeName.trim() || `Employee ${employeeId}`;

    const submissionRecord = {
      id: employeeId,
      employeeId,
      employeeName: empNameClean,
      name: empNameClean,
      age: Number(age),
      salary: Number(salary),
      experience: Number(experience),
      department,
      jobSatisfaction: Number(jobSatisfaction),
      job_satisfaction: Number(jobSatisfaction),
      workLifeBalance: Number(workLifeBalance),
      work_life_balance: Number(workLifeBalance),
      envSatisfaction: Number(envSatisfaction),
      environment_satisfaction: Number(envSatisfaction),
      relSatisfaction: Number(relSatisfaction),
      relationship_satisfaction: Number(relSatisfaction),
      compositeSatisfaction: Number(activeComposite),
      composite_satisfaction: Number(activeComposite),
      overtimeRating: Number(overtimeRating),
      overtime: overtimeRating >= 3,
      // Model predictions
      attritionPrediction: livePrediction.attritionPrediction,
      isAttritionLikely: livePrediction.isAttritionLikely,
      attritionProbability: livePrediction.attritionProbability,
      ground_truth_prob: livePrediction.rawProbability,
      riskLevel: livePrediction.riskLevel,
      riskBadge: livePrediction.riskBadge,
      riskColor: livePrediction.riskColor,
      riskBg: livePrediction.riskBg,
      estimatedTurnoverCost: livePrediction.estimatedTurnoverCost,
      topRiskFactors: livePrediction.topRiskFactors,
      protectiveFactors: livePrediction.protectiveFactors,
      factorContributions: livePrediction.factorContributions,
      retentionRecommendations: livePrediction.retentionRecommendations,
      timestamp: new Date().toISOString()
    };

    // 1. Direct Export to Excel (.xlsx) file download
    try {
      const fileName = exportSingleSurveyToExcel(submissionRecord);
      setLastExportedFile(fileName);
    } catch (err) {
      console.error('Failed to export single survey to Excel:', err);
    }

    // 2. Save into session survey responses
    if (onSaveSurveyResponse) {
      onSaveSurveyResponse(submissionRecord);
    }

    // 3. Add to platform active workforce roster
    if (onAddToRoster) {
      onAddToRoster(submissionRecord);
    }

    // 4. Show success feedback
    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
      setIsSubmitting(false);
    }, 4500);
  };

  // Download all survey responses to Excel workbook
  const handleExportAllToExcel = () => {
    exportAllSurveysToExcel(surveyResponses);
  };

  // Gauge calculation for right column
  const circumference = 2 * Math.PI * 45; // 282.74
  const strokeDashoffset = circumference * (1 - livePrediction.rawProbability);

  return (
    <div className="predictor-container">
      {/* Page Header matching the rest of the app */}
      <div className="section-header">
        <div>
          <div className="badge badge-neutral" style={{ marginBottom: '8px' }}>
            <Sparkles size={12} color="var(--primary)" /> Employee Feedback & Excel Pipeline
          </div>
          <h2 className="section-heading">Employee Opinion & Attrition Survey Form</h2>
          <p className="section-subheading">
            Capture employee feedback across core satisfaction dimensions, run real-time AI turnover prediction, 
            and directly export structured survey responses into Microsoft Excel (.xlsx).
          </p>
        </div>

        <div className="section-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            className="action-btn action-btn-secondary" 
            onClick={handleFillHighRiskSample}
            title="Pre-fill sample with high flight risk indicators"
          >
            <ShieldAlert size={14} className="text-danger" />
            <span>Sample: High Risk</span>
          </button>

          <button 
            type="button" 
            className="action-btn action-btn-secondary" 
            onClick={handleFillRetainedSample}
            title="Pre-fill sample with strong retention profile"
          >
            <ShieldCheck size={14} className="text-success" />
            <span>Sample: Retained</span>
          </button>

          <button 
            type="button" 
            className="action-btn action-btn-secondary" 
            onClick={handleResetForm}
            title="Clear all fields"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>

          {surveyResponses.length > 0 && (
            <button 
              type="button" 
              className="action-btn action-btn-primary" 
              onClick={handleExportAllToExcel}
              title="Download all responses in a multi-sheet Excel file"
            >
              <Download size={14} />
              <span>Export All ({surveyResponses.length}) to Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Alert */}
      {showSuccessToast && (
        <div className="survey-native-alert animate-fade-in">
          <div className="survey-alert-icon">
            <CheckCircle2 size={22} color="#10b981" />
          </div>
          <div className="survey-alert-body">
            <strong>Survey Recorded & Excel Sheet Generated Successfully!</strong>
            <p>
              Direct Excel spreadsheet <strong>{lastExportedFile}</strong> has been downloaded to your computer. 
              The employee record has been added to the Workforce Roster.
            </p>
          </div>
          <button 
            type="button" 
            className="survey-alert-dismiss" 
            onClick={() => setShowSuccessToast(false)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Grid: Left Form Card, Right Live Predictive Output */}
      <div className="predictor-grid">
        
        {/* LEFT COLUMN: Input Form */}
        <form className="input-card glass-panel glow-card" onSubmit={handleSubmitSurvey}>
          
          {/* Card Header */}
          <div className="card-header-styled">
            <h3 className="card-title">
              <FileSpreadsheet size={18} className="icon-accent" />
              <span>1. Employee Identity & Profile</span>
            </h3>
            <span className="badge badge-primary">Direct Input</span>
          </div>

          <div className="input-form">
            
            {/* Row 1: ID and Name */}
            <div className="survey-two-col-row">
              {/* Employee ID */}
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label" htmlFor="survey-emp-id">
                  Employee ID <span className="field-required">*</span>
                </label>
                <div className="survey-input-with-action">
                  <input
                    id="survey-emp-id"
                    type="text"
                    required
                    className="form-input"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="e.g. EMP-1042"
                  />
                  <button
                    type="button"
                    className="action-btn action-btn-secondary survey-mini-btn"
                    onClick={handleRegenerateId}
                    title="Generate new ID"
                  >
                    Generate
                  </button>
                </div>
              </div>

              {/* Employee Name */}
              <div className="form-group" style={{ flex: 1.5 }}>
                <label className="form-label" htmlFor="survey-emp-name">
                  Employee Name <span className="field-required">*</span>
                </label>
                <input
                  id="survey-emp-name"
                  type="text"
                  required
                  className="form-input"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  placeholder="e.g. Alexander Reed"
                />
              </div>
            </div>

            {/* 1. EMPLOYEE AGE */}
            <div className="form-group">
              <div className="slider-label-row">
                <label className="form-label" htmlFor="survey-age">
                  1. Employee Age
                </label>
                <span className="slider-value-badge slider-value-primary">
                  {age} years old
                </span>
              </div>
              <input
                id="survey-age"
                type="range"
                min="18"
                max="65"
                step="1"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="slider-range"
              />
              <div className="slider-range-hints">
                <span>18 yrs (Early Entry)</span>
                <span>35 yrs (Mid-Level)</span>
                <span>65 yrs (Senior)</span>
              </div>
            </div>

            {/* 2. SALARY (Monthly Income) */}
            <div className="form-group">
              <div className="slider-label-row">
                <label className="form-label" htmlFor="survey-salary">
                  2. Monthly Salary ($)
                </label>
                <span className="slider-value-badge slider-value-primary">
                  ${salary.toLocaleString()} / mo 
                  <span className="salary-annual"> (~${(salary * 12 / 1000).toFixed(0)}k/yr)</span>
                </span>
              </div>
              <input
                id="survey-salary"
                type="range"
                min="2000"
                max="25000"
                step="250"
                value={salary}
                onChange={(e) => setSalary(Number(e.target.value))}
                className="slider-range"
              />
              <div className="slider-range-hints">
                <span>$2,000 (Entry)</span>
                <span>$9,240 (Median)</span>
                <span>$25,000 (Executive)</span>
              </div>
            </div>

            {/* 3. EXPERIENCE */}
            <div className="form-group">
              <div className="slider-label-row">
                <label className="form-label" htmlFor="survey-exp">
                  3. Total Experience (Years)
                </label>
                <span className="slider-value-badge slider-value-primary">
                  {experience} {experience === 1 ? 'Year' : 'Years'}
                </span>
              </div>
              <input
                id="survey-exp"
                type="range"
                min="0"
                max="40"
                step="1"
                value={experience}
                onChange={(e) => setExperience(Number(e.target.value))}
                className="slider-range"
              />
              <div className="slider-range-hints">
                <span>0 yrs (Novice)</span>
                <span>7.4 yrs (Company Avg)</span>
                <span>40 yrs (Veteran)</span>
              </div>
            </div>

            {/* 4. DEPARTMENT */}
            <div className="form-group">
              <label className="form-label">
                4. Department
              </label>
              <div className="dept-grid">
                {DEPARTMENTS.map((dept) => {
                  const isSelected = department === dept.id;
                  return (
                    <button
                      key={dept.id}
                      type="button"
                      className={`dept-card ${isSelected ? 'dept-card-active' : ''}`}
                      onClick={() => setDepartment(dept.id)}
                    >
                      <span className="dept-icon">{dept.icon}</span>
                      <div className="dept-info">
                        <span className="dept-name">{dept.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. JOB SATISFACTION PARAMETERS (1 TO 5 SCALE) */}
            <div className="form-group form-group-box">
              <div className="satisfaction-box-header">
                <div>
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    5. Employee Opinions & Satisfaction (1 to 5 Scale)
                  </label>
                  <p className="form-helper">Core psychological and workplace wellness dimensions</p>
                </div>
                <div className="composite-sat-badge">
                  <span>Composite:</span>
                  <strong>{activeComposite} / 5.0</strong>
                </div>
              </div>

              {/* Sub-parameter 5a: Job Satisfaction */}
              <div className="rating-row">
                <div className="rating-info">
                  <span className="rating-title">Overall Job Satisfaction</span>
                  <span className="rating-desc">Role fulfillment and daily work contentment</span>
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

              {/* Sub-parameter 5b: Work-Life Balance */}
              <div className="rating-row">
                <div className="rating-info">
                  <span className="rating-title">Work-Life Balance</span>
                  <span className="rating-desc">Boundary preservation & personal recovery time</span>
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

              {/* Sub-parameter 5c: Environment Satisfaction */}
              <div className="rating-row">
                <div className="rating-info">
                  <span className="rating-title">Workplace Environment</span>
                  <span className="rating-desc">Culture, team harmony & psychological safety</span>
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

              {/* Sub-parameter 5d: Relationship Satisfaction */}
              <div className="rating-row">
                <div className="rating-info">
                  <span className="rating-title">Manager & Peer Relationship</span>
                  <span className="rating-desc">Direct manager support & peer trust</span>
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

              {/* Sub-parameter 5e: Composite Satisfaction */}
              <div className="rating-row survey-composite-sub-row">
                <div className="rating-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="rating-title">Composite Satisfaction Score</span>
                    <span className="badge badge-low" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>Auto Index</span>
                  </div>
                  <span className="rating-desc">
                    Calculated average from the 4 satisfaction ratings ({autoComposite} / 5.0)
                  </span>
                </div>
                <div className="survey-composite-control">
                  <label className="survey-auto-toggle">
                    <input 
                      type="checkbox" 
                      checked={isAutoComposite} 
                      onChange={(e) => setIsAutoComposite(e.target.checked)} 
                    />
                    <span>Auto ({autoComposite})</span>
                  </label>
                  {!isAutoComposite && (
                    <input
                      type="number"
                      min="1.0"
                      max="5.0"
                      step="0.1"
                      value={customComposite}
                      onChange={(e) => setCustomComposite(Math.min(5, Math.max(1, parseFloat(e.target.value) || 1)))}
                      className="form-input survey-comp-input"
                    />
                  )}
                </div>
              </div>

              {/* Sub-parameter 5f: Overtime (Out of 5) */}
              <div className="rating-row survey-overtime-sub-row">
                <div className="rating-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="rating-title">6. Overtime Workload (1 to 5 Scale)</span>
                    {overtimeRating >= 3 && (
                      <span className="badge badge-high" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>Risk Multiplier</span>
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
                      className={`sat-btn ${overtimeRating === lvl ? (lvl >= 4 ? 'sat-btn-danger' : lvl === 3 ? 'sat-btn-warning' : 'sat-btn-active') : ''}`}
                      onClick={() => setOvertimeRating(lvl)}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* ACTION SUBMIT BUTTON */}
            <div className="survey-action-footer">
              <button
                type="submit"
                disabled={isSubmitting}
                className="action-btn action-btn-primary survey-cta-btn"
              >
                <span>Submit</span>
                <Sparkles size={16} />
              </button>
              <p className="survey-cta-hint">
                Securely submits employee opinion data and automatically synchronizes with the live platform roster.
              </p>
            </div>

          </div>
        </form>

        {/* RIGHT COLUMN: The 3 Core Outputs (Matching PredictorTab exactly) */}
        <div className="output-column">
          <div className="output-card glass-panel glow-card">
            
            <div className="output-card-header">
              <span className="output-kicker">Predictive Output Engine</span>
              <span className={`badge ${
                livePrediction.riskLevel === 'HIGH' ? 'badge-high' : 
                livePrediction.riskLevel === 'MEDIUM' ? 'badge-med' : 'badge-low'
              }`}>
                {livePrediction.riskBadge}
              </span>
            </div>

            {/* Output 1: Attrition Prediction Banner */}
            <div className={`prediction-banner ${livePrediction.isAttritionLikely ? 'banner-attrition-yes' : 'banner-attrition-no'}`}>
              <div className="banner-icon-side">
                {livePrediction.isAttritionLikely ? (
                  <Flame size={32} className="alert-flame" />
                ) : (
                  <ShieldCheck size={32} className="shield-safe" />
                )}
              </div>
              <div className="banner-text-side">
                <span className="banner-small-label">OUTPUT 1: ATTRITION PREDICTION</span>
                <h3 className="prediction-headline">{livePrediction.attritionPrediction}</h3>
                <p className="prediction-explanation">
                  {livePrediction.isAttritionLikely 
                    ? `Warning: Model predicts ${employeeName || 'this employee'} has an elevated probability of voluntary resignation in the next 6-12 months.`
                    : `${employeeName || 'This employee'} displays stable retention characteristics with low statistical intent to leave.`
                  }
                </p>
              </div>
            </div>

            {/* Output 2 & 3: Circular Speedometer Gauge & Risk Probability */}
            <div className="probability-display-block">
              <div className="gauge-container">
                <svg className="gauge-svg" viewBox="0 0 100 100">
                  <circle
                    className="gauge-bg"
                    cx="50"
                    cy="50"
                    r="45"
                    strokeWidth="8"
                  />
                  <circle
                    className="gauge-fill"
                    cx="50"
                    cy="50"
                    r="45"
                    strokeWidth="8"
                    stroke={livePrediction.riskColor}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                  />
                </svg>
                <div className="gauge-inner-content">
                  <span className="gauge-pct" style={{ color: livePrediction.riskColor }}>
                    {livePrediction.attritionProbability}
                  </span>
                  <span className="gauge-label">
                    <span>PROBABILITY</span>
                    <span>SCORE</span>
                  </span>
                  <span className="gauge-range">(0.00 – 1.00)</span>
                </div>
              </div>

              <div className="probability-meta">
                <div className="prob-stat-row">
                  <span className="prob-meta-title">OUTPUT 2: Attrition Probability</span>
                  <strong className="prob-meta-value" style={{ color: livePrediction.riskColor }}>
                    {livePrediction.attritionProbability} ({(livePrediction.rawProbability * 100).toFixed(1)}%)
                  </strong>
                </div>

                <div className="prob-stat-row">
                  <span className="prob-meta-title">OUTPUT 3: Risk Classification</span>
                  <strong className="prob-meta-value">
                    {livePrediction.riskLevel} FLIGHT RISK
                  </strong>
                </div>

                <div className="prob-stat-row">
                  <span className="prob-meta-title">Estimated Replacement Cost</span>
                  <strong className="prob-meta-value text-accent">
                    ${livePrediction.estimatedTurnoverCost.toLocaleString()}
                  </strong>
                </div>

                <div className="prob-stat-row">
                  <span className="prob-meta-title">Composite Satisfaction</span>
                  <strong className="prob-meta-value">
                    {activeComposite} / 5.0
                  </strong>
                </div>
              </div>
            </div>

            {/* Factor Attribution (SHAP-Style Attribution Panel) */}
            <div className="factors-panel">
              <div className="factors-header">
                <span className="factors-title">Key Contributing Factors</span>
                <span className="factors-sub">Model Feature Importance</span>
              </div>
              <div className="factors-list">
                {livePrediction.factorContributions.map((factor, idx) => (
                  <div 
                    key={idx} 
                    className={`factor-pill ${factor.type === 'risk' ? 'factor-risk' : 'factor-protective'}`}
                  >
                    <div className="factor-top-line">
                      <span className="factor-name">{factor.feature}</span>
                      <span className="factor-impact">{factor.impact}</span>
                    </div>
                    <span className="factor-desc">{factor.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Prescriptive HR Retention Playbook */}
            <div className="retention-playbook-panel">
              <div className="playbook-header">
                <span className="playbook-title">Prescriptive Retention Playbook</span>
                <span className="playbook-badge">Actionable Guidance</span>
              </div>
              <div className="playbook-list">
                {livePrediction.retentionRecommendations.slice(0, 2).map((item, idx) => (
                  <div key={idx} className="playbook-card">
                    <div className="playbook-card-top">
                      <span className="playbook-category">{item.category}</span>
                      <span className="playbook-urgency">{item.urgency}</span>
                    </div>
                    <strong className="playbook-action">{item.action}</strong>
                    <p className="playbook-desc">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Excel Bridge Action Box */}
            <div className="survey-excel-bridge-box">
              <div className="survey-excel-bridge-head">
                <FileSpreadsheet size={16} color="var(--primary)" />
                <strong>Direct Microsoft Excel Bridge</strong>
              </div>
              <p className="survey-excel-bridge-p">
                This response will be structured into an official Excel file with all 12 variables, calibrated probability, and executive advice.
              </p>
              <button
                type="button"
                onClick={handleSubmitSurvey}
                className="action-btn action-btn-secondary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Download size={14} />
                <span>Export Current Submission (.xlsx)</span>
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* SECTION 3: Submissions Table & Excel Download Log */}
      <div className="directory-table-card glass-panel" style={{ marginTop: '28px' }}>
        
        <div className="section-header" style={{ marginBottom: '16px' }}>
          <div>
            <div className="badge badge-neutral" style={{ marginBottom: '6px' }}>
              <FileSpreadsheet size={12} color="var(--primary)" /> Session Log
            </div>
            <h3 className="section-heading" style={{ fontSize: '1.2rem' }}>
              Survey Submissions & Excel Export Directory
            </h3>
            <p className="section-subheading">
              Accumulated survey entries from this session ({surveyResponses.length} records). Download single audit cards or the full consolidated workbook.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {surveyResponses.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleExportAllToExcel}
                  className="action-btn action-btn-primary"
                  title="Download all responses as a consolidated Microsoft Excel file"
                >
                  <Download size={14} />
                  <span>Download Master Excel (.xlsx)</span>
                </button>

                <button
                  type="button"
                  onClick={onClearSurveys}
                  className="action-btn action-btn-secondary text-danger"
                  title="Clear all stored survey responses"
                >
                  <Trash2 size={14} />
                  <span>Clear All</span>
                </button>
              </>
            )}
          </div>
        </div>

        {surveyResponses.length === 0 ? (
          <div className="empty-db-search" style={{ padding: '40px 20px' }}>
            <FileSpreadsheet size={36} color="var(--primary)" style={{ opacity: 0.5, marginBottom: '10px' }} />
            <p><strong>No survey responses submitted yet during this session.</strong></p>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              Complete the form above and click "Submit Opinion & Directly Export to Excel" to record your first survey.
            </span>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="roster-table">
              <thead>
                <tr>
                  <th>Employee Name & ID</th>
                  <th>Department</th>
                  <th>Age / Exp</th>
                  <th>Monthly Salary</th>
                  <th>Ratings (Job/WLB/Env/Rel)</th>
                  <th>Composite</th>
                  <th>Overtime</th>
                  <th>Prediction</th>
                  <th>Attrition Risk</th>
                  <th style={{ textAlign: 'center' }}>Excel</th>
                  <th style={{ textAlign: 'center' }}>Delete</th>
                </tr>
              </thead>
              <tbody>
                {surveyResponses.map((res, index) => {
                  const prob = typeof res.attritionProbability === 'number' 
                    ? res.attritionProbability 
                    : parseFloat(res.attritionProbability || 0);

                  const isHigh = res.riskLevel === 'HIGH' || prob >= 0.60;
                  const isMed = res.riskLevel === 'MEDIUM' || (prob >= 0.30 && prob < 0.60);
                  const badgeClass = isHigh ? 'badge-high' : isMed ? 'badge-med' : 'badge-low';
                  const riskTierText = isHigh ? 'High Risk' : isMed ? 'Medium' : 'Low Risk';

                  return (
                    <tr key={index} className="roster-row">
                      <td>
                        <div className="emp-cell">
                          <div className="emp-avatar">{res.employeeName ? res.employeeName.charAt(0) : 'E'}</div>
                          <div>
                            <strong className="emp-name-text">{res.employeeName || 'Employee'}</strong>
                            <span className="emp-id-text">{res.employeeId || res.id}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="dept-badge">{res.department}</span>
                      </td>
                      <td>
                        <div className="age-exp-cell">
                          <span>{res.age} yrs</span>
                          <span className="exp-sub">{res.experience}y exp</span>
                        </div>
                      </td>
                      <td>
                        <strong className="salary-text">${Number(res.salary).toLocaleString()}</strong>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                          <span title="Job Sat">{res.jobSatisfaction}</span>/
                          <span title="Work-Life Balance">{res.workLifeBalance}</span>/
                          <span title="Environment">{res.envSatisfaction}</span>/
                          <span title="Relationships">{res.relSatisfaction}</span>
                        </div>
                      </td>
                      <td>
                        <strong>{Number(res.compositeSatisfaction || 3).toFixed(1)}</strong>/5
                      </td>
                      <td>
                        <span className={`ot-badge ${res.overtimeRating >= 3 || res.overtime ? 'ot-yes' : 'ot-no'}`}>
                          {res.overtimeRating ? `${res.overtimeRating}/5` : res.overtime ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td>
                        <strong className={res.isAttritionLikely || prob >= 0.5 ? 'text-danger' : 'text-success'}>
                          {res.isAttritionLikely || prob >= 0.5 ? 'LEAVE' : 'STAY'}
                        </strong>
                      </td>
                      <td>
                        <span className={`badge ${badgeClass}`}>
                          {riskTierText} ({(prob * 100).toFixed(0)}%)
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => exportSingleSurveyToExcel(res)}
                          className="table-action-btn"
                          title="Download individual Excel (.xlsx) file"
                        >
                          <FileSpreadsheet size={15} />
                        </button>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => onDeleteSurvey && onDeleteSurvey(index)}
                          className="table-action-btn text-danger"
                          title="Delete response"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
