import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  UserPlus,
  Trash2,
  Copy,
  CheckCircle2,
  Search,
  Download,
  Users,
  Link as LinkIcon,
  Shield,
  ClipboardCheck,
  ExternalLink,
} from 'lucide-react';
import { exportAllSurveysToExcel } from '../utils/excelExporter';

export default function SurveyManagementTab({
  authorizedEmployees = [],
  onAddCredential,
  onRemoveCredential,
  surveyResponses = [],
  onClearSurveys,
  onDeleteSurvey,
}) {
  // Add credential form state
  const [newEmpId, setNewEmpId] = useState('');
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpAge, setNewEmpAge] = useState('');
  const [newEmpSalary, setNewEmpSalary] = useState('');
  const [newEmpExperience, setNewEmpExperience] = useState('');
  const [newEmpDepartment, setNewEmpDepartment] = useState('Research & Development');

  // Search / filter state
  const [credSearch, setCredSearch] = useState('');
  const [responseSearch, setResponseSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const DEPARTMENTS = [
    'Research & Development',
    'Sales',
    'Engineering',
    'Human Resources',
    'Marketing',
    'Finance',
  ];

  // Survey link
  const surveyLink = `${window.location.origin}${window.location.pathname}#/survey`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(surveyLink).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    });
  };

  // Filter authorized employees
  const filteredCredentials = useMemo(() => {
    if (!credSearch.trim()) return authorizedEmployees;
    const q = credSearch.toLowerCase();
    return authorizedEmployees.filter(
      (emp) =>
        emp.employee_id?.toLowerCase().includes(q) ||
        emp.name?.toLowerCase().includes(q) ||
        emp.department?.toLowerCase().includes(q)
    );
  }, [authorizedEmployees, credSearch]);

  // Filter survey responses
  const filteredResponses = useMemo(() => {
    if (!responseSearch.trim()) return surveyResponses;
    const q = responseSearch.toLowerCase();
    return surveyResponses.filter(
      (r) =>
        r.employeeId?.toLowerCase().includes(q) ||
        r.employeeName?.toLowerCase().includes(q) ||
        r.department?.toLowerCase().includes(q)
    );
  }, [surveyResponses, responseSearch]);

  // Add new employee credential directly to Employee_Credentials.xlsx
  const handleAddCredential = async (e) => {
    e.preventDefault();
    if (!newEmpId.trim() || !newEmpName.trim()) return;

    const newCred = {
      employee_id: newEmpId.trim(),
      name: newEmpName.trim(),
      age: Number(newEmpAge) || 0,
      salary: Number(newEmpSalary) || 0,
      experience: Number(newEmpExperience) || 0,
      department: newEmpDepartment,
    };

    // 1. Directly add to Employee_Credentials.xlsx on filesystem
    try {
      await fetch('/api/add-credential', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCred)
      });
    } catch (err) {
      console.warn('API error adding to Employee_Credentials.xlsx:', err);
    }

    if (onAddCredential) onAddCredential(newCred);

    // Reset form
    setNewEmpId('');
    setNewEmpName('');
    setNewEmpAge('');
    setNewEmpSalary('');
    setNewEmpExperience('');
    setNewEmpDepartment('Research & Development');
    setShowAddForm(false);
  };

  // Export survey responses to Excel
  const handleExportResponses = () => {
    if (surveyResponses.length > 0) {
      exportAllSurveysToExcel(surveyResponses);
    }
  };

  return (
    <div className="predictor-container">
      {/* ── Page Header ── */}
      <div className="section-header">
        <div>
          <div className="badge badge-neutral" style={{ marginBottom: '8px' }}>
            <Shield size={12} color="var(--primary)" /> Survey Access & Response Management
          </div>
          <h2 className="section-heading">Survey Management</h2>
          <p className="section-subheading">
            Manage employee survey access credentials, share the survey link with
            employees, and review submitted survey responses.
          </p>
        </div>
      </div>

      {/* ═══════════ SECTION 1: Survey Link Card ═══════════ */}
      <div
        className="glass-panel glow-card"
        style={{ padding: '24px', marginBottom: '24px' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '14px',
          }}
        >
          <LinkIcon size={18} color="var(--primary)" />
          <h3 className="card-title" style={{ margin: 0 }}>
            Employee Survey Link
          </h3>
          <span className="badge badge-low" style={{ fontSize: '0.7rem' }}>
            Share with employees
          </span>
        </div>
        <p
          className="section-subheading"
          style={{ marginBottom: '14px', fontSize: '0.82rem' }}
        >
          Share this link with employees so they can access the opinion survey remotely.
          They will need to verify their credentials (Employee ID + Name) before
          submitting.
        </p>
        <div className="survey-link-row">
          <code className="survey-link-code">{surveyLink}</code>
          <button
            type="button"
            className={`action-btn ${linkCopied ? 'action-btn-primary' : 'action-btn-secondary'}`}
            onClick={handleCopyLink}
          >
            {linkCopied ? (
              <>
                <CheckCircle2 size={14} />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copy Link</span>
              </>
            )}
          </button>
          <a
            href={surveyLink}
            target="_blank"
            rel="noopener noreferrer"
            className="action-btn action-btn-secondary"
            title="Open survey in new tab"
          >
            <ExternalLink size={14} />
            <span>Preview</span>
          </a>
        </div>
      </div>

      {/* ═══════════ SECTION 2: Authorized Employees (Credentials) ═══════════ */}
      <div
        className="directory-table-card glass-panel"
        style={{ marginBottom: '28px' }}
      >
        <div className="section-header" style={{ marginBottom: '16px' }}>
          <div>
            <div className="badge badge-neutral" style={{ marginBottom: '6px' }}>
              <Users size={12} color="var(--primary)" /> Separate Credentials Excel Register
            </div>
            <h3 className="section-heading" style={{ fontSize: '1.2rem' }}>
              Authorized Credentials ({authorizedEmployees.length})
            </h3>
            <p className="section-subheading">
              Stored in <strong>Employee_Credentials.xlsx</strong>. Employees verify against this file using Employee ID & Name.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <a
              href="/api/download-credentials-excel"
              download="Employee_Credentials.xlsx"
              className="action-btn action-btn-secondary"
              title="Download separate Login Credentials Excel"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <FileSpreadsheet size={14} color="#10b981" />
              <span>Download Credentials Excel (.xlsx)</span>
            </a>
            <button
              type="button"
              className="action-btn action-btn-primary"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <UserPlus size={14} />
              <span>{showAddForm ? 'Cancel' : 'Add New Employee'}</span>
            </button>
          </div>
        </div>

        {/* Add New Employee Form */}
        {showAddForm && (
          <form
            onSubmit={handleAddCredential}
            className="credential-add-form glass-panel"
            style={{
              padding: '20px',
              marginBottom: '16px',
              border: '1px solid var(--primary-alpha)',
              borderRadius: '12px',
            }}
          >
            <h4
              style={{
                fontSize: '0.95rem',
                fontWeight: 600,
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <UserPlus size={16} color="var(--primary)" />
              Add New Employee Credentials
            </h4>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
              }}
            >
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Employee ID <span className="field-required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={newEmpId}
                  onChange={(e) => setNewEmpId(e.target.value)}
                  placeholder="e.g. EMP-2001"
                  required
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Full Name <span className="field-required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                  placeholder="e.g. John Doe"
                  required
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Age</label>
                <input
                  type="number"
                  className="form-input"
                  value={newEmpAge}
                  onChange={(e) => setNewEmpAge(e.target.value)}
                  placeholder="e.g. 30"
                  min="18"
                  max="70"
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Monthly Salary ($)</label>
                <input
                  type="number"
                  className="form-input"
                  value={newEmpSalary}
                  onChange={(e) => setNewEmpSalary(e.target.value)}
                  placeholder="e.g. 6500"
                  min="0"
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Experience (Years)</label>
                <input
                  type="number"
                  className="form-input"
                  value={newEmpExperience}
                  onChange={(e) => setNewEmpExperience(e.target.value)}
                  placeholder="e.g. 5"
                  min="0"
                  max="40"
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Department</label>
                <select
                  className="form-input"
                  value={newEmpDepartment}
                  onChange={(e) => setNewEmpDepartment(e.target.value)}
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginTop: '14px', display: 'flex', gap: '10px' }}>
              <button type="submit" className="action-btn action-btn-primary">
                <UserPlus size={14} />
                <span>Add Employee</span>
              </button>
              <button
                type="button"
                className="action-btn action-btn-secondary"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Search Credentials */}
        <div className="search-bar" style={{ marginBottom: '12px' }}>
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="form-input"
            value={credSearch}
            onChange={(e) => setCredSearch(e.target.value)}
            placeholder="Search by ID, name, or department..."
            style={{ paddingLeft: '36px' }}
          />
        </div>

        {/* Credentials Table */}
        {filteredCredentials.length === 0 ? (
          <div className="empty-db-search" style={{ padding: '40px 20px' }}>
            <Users
              size={36}
              color="var(--primary)"
              style={{ opacity: 0.5, marginBottom: '10px' }}
            />
            <p>
              <strong>
                {credSearch
                  ? 'No employees match your search.'
                  : 'No authorized employees yet.'}
              </strong>
            </p>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              {credSearch
                ? 'Try a different search term.'
                : 'Click "Add New Employee" to add credentials for employees.'}
            </span>
          </div>
        ) : (
          <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="roster-table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Full Name</th>
                  <th>Department</th>
                  <th>Age</th>
                  <th>Experience</th>
                  <th>Salary</th>
                  <th style={{ textAlign: 'center' }}>Remove</th>
                </tr>
              </thead>
              <tbody>
                {filteredCredentials.slice(0, 100).map((emp, idx) => (
                  <tr key={`${emp.employee_id}-${idx}`} className="roster-row">
                    <td>
                      <strong style={{ fontSize: '0.82rem' }}>{emp.employee_id}</strong>
                    </td>
                    <td>
                      <div className="emp-cell">
                        <div className="emp-avatar">
                          {emp.name ? emp.name.charAt(0) : 'E'}
                        </div>
                        <strong className="emp-name-text">{emp.name}</strong>
                      </div>
                    </td>
                    <td>
                      <span className="dept-badge">{emp.department || '—'}</span>
                    </td>
                    <td>{emp.age || '—'}</td>
                    <td>{emp.experience != null ? `${emp.experience}y` : '—'}</td>
                    <td>
                      {emp.salary
                        ? `$${Number(emp.salary).toLocaleString()}`
                        : '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => onRemoveCredential && onRemoveCredential(emp.employee_id)}
                        className="table-action-btn text-danger"
                        title="Remove this employee's survey access"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredCredentials.length > 100 && (
              <p
                style={{
                  textAlign: 'center',
                  fontSize: '0.78rem',
                  color: 'var(--text-dim)',
                  padding: '10px',
                }}
              >
                Showing first 100 of {filteredCredentials.length} employees.
                Use search to find specific employees.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ═══════════ SECTION 3: Survey Responses ═══════════ */}
      <div className="directory-table-card glass-panel">
        <div className="section-header" style={{ marginBottom: '16px' }}>
          <div>
            <div className="badge badge-neutral" style={{ marginBottom: '6px' }}>
              <FileSpreadsheet size={12} color="var(--primary)" /> Main Excel Dataset: Employee_Survey_Responses.xlsx
            </div>
            <h3 className="section-heading" style={{ fontSize: '1.2rem' }}>
              Submitted Survey Responses ({surveyResponses.length})
            </h3>
            <p className="section-subheading">
              Submissions are directly added into the main Excel file (<strong>Employee_Survey_Responses.xlsx</strong>).
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <a
              href="/api/download-excel"
              download="Employee_Survey_Responses.xlsx"
              className="action-btn action-btn-primary"
              title="Download Main Survey Responses Excel"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <FileSpreadsheet size={14} />
              <span>Download Main Excel (.xlsx)</span>
            </a>
            {surveyResponses.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleExportResponses}
                  className="action-btn action-btn-secondary"
                  title="Export all session responses"
                >
                  <Download size={14} />
                  <span>Export Client Copy</span>
                </button>
                <button
                  type="button"
                  onClick={onClearSurveys}
                  className="action-btn action-btn-secondary text-danger"
                  title="Clear all survey responses"
                >
                  <Trash2 size={14} />
                  <span>Clear All</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Search Responses */}
        {surveyResponses.length > 0 && (
          <div className="search-bar" style={{ marginBottom: '12px' }}>
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="form-input"
              value={responseSearch}
              onChange={(e) => setResponseSearch(e.target.value)}
              placeholder="Search responses by ID, name, or department..."
              style={{ paddingLeft: '36px' }}
            />
          </div>
        )}

        {surveyResponses.length === 0 ? (
          <div className="empty-db-search" style={{ padding: '40px 20px' }}>
            <ClipboardCheck
              size={36}
              color="var(--primary)"
              style={{ opacity: 0.5, marginBottom: '10px' }}
            />
            <p>
              <strong>No survey responses submitted yet.</strong>
            </p>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              Share the survey link with employees. Responses will appear here once
              submitted.
            </span>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="roster-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Job Sat</th>
                  <th>WLB</th>
                  <th>Env</th>
                  <th>Relations</th>
                  <th>Composite</th>
                  <th>Overtime</th>
                  <th>Source</th>
                  <th>Submitted</th>
                  <th style={{ textAlign: 'center' }}>Delete</th>
                </tr>
              </thead>
              <tbody>
                {filteredResponses.map((res, index) => (
                  <tr key={index} className="roster-row">
                    <td>
                      <div className="emp-cell">
                        <div className="emp-avatar">
                          {res.employeeName ? res.employeeName.charAt(0) : 'E'}
                        </div>
                        <div>
                          <strong className="emp-name-text">
                            {res.employeeName || 'Employee'}
                          </strong>
                          <span className="emp-id-text">
                            {res.employeeId || res.id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="dept-badge">{res.department}</span>
                    </td>
                    <td>
                      <strong>{res.jobSatisfaction || res.job_satisfaction}/5</strong>
                    </td>
                    <td>
                      <strong>{res.workLifeBalance || res.work_life_balance}/5</strong>
                    </td>
                    <td>
                      <strong>{res.envSatisfaction || res.environment_satisfaction}/5</strong>
                    </td>
                    <td>
                      <strong>{res.relSatisfaction || res.relationship_satisfaction}/5</strong>
                    </td>
                    <td>
                      <strong>
                        {Number(res.compositeSatisfaction || res.composite_satisfaction || 3).toFixed(1)}
                      </strong>
                      /5
                    </td>
                    <td>
                      <span
                        className={`ot-badge ${
                          res.overtimeRating >= 3 || res.overtime ? 'ot-yes' : 'ot-no'
                        }`}
                      >
                        {res.overtimeRating
                          ? `${res.overtimeRating}/5`
                          : res.overtime
                            ? 'Yes'
                            : 'No'}
                      </span>
                    </td>
                    <td>
                      <span
                        className="badge badge-neutral"
                        style={{ fontSize: '0.68rem', padding: '2px 6px' }}
                      >
                        {res.submittedVia === 'employee_standalone_form'
                          ? '🔗 Remote'
                          : '🏢 In-App'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {res.timestamp
                        ? new Date(res.timestamp).toLocaleDateString()
                        : '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => onDeleteSurvey && onDeleteSurvey(index)}
                        className="table-action-btn text-danger"
                        title="Delete this response"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
