import React from 'react';
import { 
  LayoutDashboard, 
  ClipboardCheck,
  UserCheck, 
  Sliders, 
  Users, 
  Upload, 
  Sun, 
  Moon,
  Sparkles,
  ShieldAlert,
  Database,
  LogOut
} from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  theme, 
  toggleTheme, 
  glassMode,
  toggleGlassMode,
  onOpenUpload, 
  onExportCsv,
  totalEmployees,
  highRiskCount,
  currentUser,
  onLogout
}) {
  const tabs = [
    { id: 'dashboard', label: 'HR Analytics Dashboard', icon: LayoutDashboard },
    { id: 'survey', label: 'Survey Management', icon: ClipboardCheck, badge: 'HR Admin' },
    { id: 'predictor', label: 'Attrition Predictor', icon: UserCheck },
    { id: 'whatif', label: 'What-If Simulator', icon: Sliders },
    { id: 'directory', label: 'Workforce Roster', icon: Users },
  ];

  return (
    <header className="navbar-container">
      <div className="navbar-top">
        <div className="navbar-brand">
          <div className="brand-icon-wrapper">
            <img src="/app-icon.png" alt="WorkforcePulse Logo" className="brand-icon-img" />
          </div>
          <div>
            <div className="brand-title-row">
              <h1 className="brand-title">WorkforcePulse</h1>
              <span className="badge badge-low" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                AI Engine Active
              </span>
            </div>
            <p className="brand-subtitle">Employee Attrition Prediction & Workforce Analytics Platform</p>
          </div>
        </div>

        {/* Live Status Summary & Actions */}
        <div className="navbar-actions">
          <div className="workforce-quick-stat" data-tooltip="Monitored Employees in Current Cohort">
            <span className="stat-label">Workforce:</span>
            <span className="stat-val">{totalEmployees.toLocaleString()}</span>
          </div>

          <div className="workforce-quick-stat stat-alert" data-tooltip="Employees Flagged at Critical Flight Risk">
            <ShieldAlert size={14} className="stat-alert-icon" />
            <span className="stat-label">At-Risk:</span>
            <span className="stat-val stat-val-danger">{highRiskCount}</span>
          </div>

          {/* Interactive Glass UI Mode Switch */}
          <button 
            className={`glass-toggle-pill ${glassMode ? 'glass-toggle-active' : ''}`}
            onClick={toggleGlassMode}
            data-tooltip={glassMode ? "Frosted Glass UI Active (Hover options to illuminate)" : "Enable Transparent Glass UI"}
            data-tooltip-pos="bottom"
            aria-label="Toggle Glass UI"
          >
            <Sparkles size={14} className={glassMode ? "icon-glass-sparkle" : ""} />
            <span>{glassMode ? "Glass UI: ON" : "Glass UI: OFF"}</span>
            <span className={`glass-status-dot ${glassMode ? 'dot-active' : ''}`}></span>
          </button>

          <button 
            className="action-btn action-btn-secondary" 
            onClick={onOpenUpload}
            title="Import custom CSV dataset with the 6 parameters"
          >
            <Database size={15} />
            <span>Real Data / CSV</span>
          </button>

          <button 
            className="action-btn action-btn-secondary" 
            onClick={onExportCsv}
            title="Export full workforce roster to Microsoft Excel (.xlsx)"
          >
            <Upload size={15} />
            <span>Export Roster</span>
          </button>

          <button 
            className="theme-toggle-btn" 
            onClick={toggleTheme} 
            title={theme === 'royal-white' ? 'Switch to Midnight Dark Mode' : 'Switch to Royal White Mode'}
            aria-label="Toggle Theme"
          >
            {theme === 'royal-white' ? <Moon size={17} /> : <Sun size={17} />}
          </button>

          {currentUser && (
            <div className="navbar-user-profile" title={`Authorized HR Session: ${currentUser.name} (${currentUser.role})`}>
              <div className="navbar-user-avatar">{currentUser.avatar || 'HR'}</div>
              <div className="navbar-user-info">
                <span className="navbar-user-name">{currentUser.name}</span>
                <span className="navbar-user-role">{currentUser.role}</span>
              </div>
              <button 
                className="navbar-logout-btn" 
                onClick={onLogout}
                title="Sign out of HR session"
              >
                <LogOut size={13} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="navbar-tabs-bar">
        <div className="tabs-list">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-btn ${isActive ? 'tab-btn-active' : ''}`}
                id={`tab-${tab.id}`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="tab-pill" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)' }}>
                    {tab.badge}
                  </span>
                )}
                {tab.id === 'predictor' && !tab.badge && (
                  <span className="tab-pill">Core Tool</span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
