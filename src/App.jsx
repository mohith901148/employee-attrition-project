import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import DashboardTab from './components/DashboardTab';
import SurveyManagementTab from './components/SurveyManagementTab';
import PredictorTab from './components/PredictorTab';
import WhatIfSimulator from './components/WhatIfSimulator';
import DirectoryTab from './components/DirectoryTab';
import EmployeeDetailModal from './components/EmployeeDetailModal';
import CsvUploadModal from './components/CsvUploadModal';
import LoginPage from './components/LoginPage';
import benchmarkEmployees from './data/benchmarkEmployees.js';
import * as XLSX from 'xlsx';
import './App.css';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('workforcepulse_hr_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState('midnight');
  const [glassMode, setGlassMode] = useState(true);
  const [employees, setEmployees] = useState(benchmarkEmployees);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [whatIfTarget, setWhatIfTarget] = useState(null);
  const [predictorTarget, setPredictorTarget] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [surveyResponses, setSurveyResponses] = useState(() => {
    try {
      const saved = localStorage.getItem('workforcepulse_survey_responses');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [customAuthorizedEmployees, setCustomAuthorizedEmployees] = useState(() => {
    try {
      const saved = localStorage.getItem('workforcepulse_custom_employees');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const authorizedEmployees = useMemo(() => {
    const customIds = new Set(customAuthorizedEmployees.map(c => String(c.employee_id || '').toUpperCase()));
    const benchmarkList = benchmarkEmployees
      .filter(b => !customIds.has(String(b.employee_id || '').toUpperCase()))
      .map(emp => ({
        employee_id: emp.employee_id,
        name: emp.name,
        age: emp.age,
        salary: emp.salary,
        experience: emp.experience,
        department: emp.department,
      }));
    return [...customAuthorizedEmployees, ...benchmarkList];
  }, [customAuthorizedEmployees]);

  const handleAddCredential = (newCred) => {
    setCustomAuthorizedEmployees(prev => {
      const filtered = prev.filter(
        e => String(e.employee_id || '').toLowerCase() !== String(newCred.employee_id || '').toLowerCase()
      );
      const updated = [newCred, ...filtered];
      try {
        localStorage.setItem('workforcepulse_custom_employees', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save custom employees:', e);
      }
      return updated;
    });
  };

  const handleRemoveCredential = (employeeId) => {
    setCustomAuthorizedEmployees(prev => {
      const updated = prev.filter(e => e.employee_id !== employeeId);
      try {
        localStorage.setItem('workforcepulse_custom_employees', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to update custom employees:', e);
      }
      return updated;
    });
  };

  const handleSaveSurveyResponse = (newResponse) => {
    setSurveyResponses(prev => {
      const updated = [newResponse, ...prev];
      try {
        localStorage.setItem('workforcepulse_survey_responses', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save survey to localStorage:', e);
      }
      return updated;
    });
  };

  const handleClearSurveys = () => {
    if (window.confirm('Are you sure you want to clear all stored survey responses?')) {
      setSurveyResponses([]);
      try {
        localStorage.removeItem('workforcepulse_survey_responses');
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleDeleteSurvey = (index) => {
    setSurveyResponses(prev => {
      const updated = prev.filter((_, i) => i !== index);
      try {
        localStorage.setItem('workforcepulse_survey_responses', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const handleLogin = (user) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('workforcepulse_hr_session', JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('workforcepulse_hr_session');
    } catch (e) {
      console.error(e);
    }
  };

  // Apply theme & glass state to html root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-glass', glassMode ? 'true' : 'false');
  }, [glassMode]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'royal-white' ? 'midnight' : 'royal-white'));
  };

  const toggleGlassMode = () => {
    setGlassMode(prev => !prev);
  };

  // Add individual employee to live roster
  const handleAddToRoster = (newEmp) => {
    setEmployees(prev => [newEmp, ...prev]);
    setActiveTab('directory');
  };

  // Direct an employee to What-If simulator
  const handleSendToWhatIf = (emp) => {
    setWhatIfTarget(emp);
    setActiveTab('whatif');
  };

  // Direct an employee to Predictor Tab with synced details
  const handleSendToPredictor = (emp) => {
    setPredictorTarget(emp);
    setActiveTab('predictor');
  };

  // Import batch CSV
  const handleImportEmployees = (importedList) => {
    setEmployees(prev => [...importedList, ...prev]);
    setActiveTab('dashboard');
  };

  // Export roster in Microsoft Excel format (.xlsx)
  const handleExportRoster = () => {
    // 1. Prepare detailed workforce roster data
    const rosterData = employees.map(e => {
      const prob = e.ground_truth_prob !== undefined ? e.ground_truth_prob : (e.attrition ? 0.8 : 0.2);
      const isLeave = prob >= 0.50;
      const riskTier = prob >= 0.60 ? 'HIGH' : prob >= 0.30 ? 'MEDIUM' : 'LOW';
      const isOt = e.overtime === 1 || e.overtime === true || e.overtime === 'Yes' || e.overtime === 'YES';

      return {
        'Employee ID': e.employee_id || e.id || '',
        'Employee Name': e.name || '',
        'Age': Number(e.age) || e.age || '',
        'Salary ($)': Number(e.salary) || e.salary || '',
        'Experience (Years)': Number(e.experience) || e.experience || '',
        'Department': e.department || '',
        'Job Satisfaction (1-5)': Number(e.job_satisfaction) || 3,
        'Work-Life Balance (1-5)': Number(e.work_life_balance) || 3,
        'Environment Satisfaction (1-5)': Number(e.environment_satisfaction) || 3,
        'Relationship Satisfaction (1-5)': Number(e.relationship_satisfaction) || 3,
        'Composite Satisfaction': Number((e.composite_satisfaction || 3.0).toFixed(2)),
        'Overtime': isOt ? 'Yes' : 'No',
        'Attrition Prediction': isLeave ? 'LEAVE' : 'STAY',
        'Attrition Probability': Number(prob.toFixed(4)),
        'Risk Tier': riskTier
      };
    });

    // 2. Prepare Executive Summary Sheet
    const totalCount = employees.length;
    const highRiskCount = employees.filter(e => {
      const prob = e.ground_truth_prob !== undefined ? e.ground_truth_prob : (e.attrition ? 0.8 : 0.2);
      return prob >= 0.60;
    }).length;
    const medRiskCount = employees.filter(e => {
      const prob = e.ground_truth_prob !== undefined ? e.ground_truth_prob : (e.attrition ? 0.8 : 0.2);
      return prob >= 0.30 && prob < 0.60;
    }).length;
    const lowRiskCount = totalCount - highRiskCount - medRiskCount;

    const avgSalary = totalCount > 0 
      ? Math.round(employees.reduce((acc, curr) => acc + (Number(curr.salary) || 0), 0) / totalCount)
      : 0;

    const summaryData = [
      { 'Workforce Analytics Metric': 'Report Title', 'Summary Value': 'Workforce Intelligence & Attrition Audit' },
      { 'Workforce Analytics Metric': 'Generated Date', 'Summary Value': new Date().toLocaleString() },
      { 'Workforce Analytics Metric': 'Total Employees Evaluated', 'Summary Value': totalCount },
      { 'Workforce Analytics Metric': 'High Risk Attrition (>= 60%)', 'Summary Value': `${highRiskCount} (${((highRiskCount / (totalCount || 1)) * 100).toFixed(1)}%)` },
      { 'Workforce Analytics Metric': 'Medium Risk Attrition (30% - 59%)', 'Summary Value': `${medRiskCount} (${((medRiskCount / (totalCount || 1)) * 100).toFixed(1)}%)` },
      { 'Workforce Analytics Metric': 'Low Risk Retention (< 30%)', 'Summary Value': `${lowRiskCount} (${((lowRiskCount / (totalCount || 1)) * 100).toFixed(1)}%)` },
      { 'Workforce Analytics Metric': 'Average Annual Salary', 'Summary Value': `$${avgSalary.toLocaleString()}` },
      { 'Workforce Analytics Metric': 'Predictive AI Architecture', 'Summary Value': 'XGBoost / Random Forest Attrition Predictor v2.1' },
      { 'Workforce Analytics Metric': 'Export Format', 'Summary Value': 'Microsoft Excel Spreadsheet (.xlsx)' }
    ];

    // 3. Create Workbook & Sheets
    const wb = XLSX.utils.book_new();

    const wsRoster = XLSX.utils.json_to_sheet(rosterData);
    wsRoster['!cols'] = [
      { wch: 15 }, // Employee ID
      { wch: 22 }, // Employee Name
      { wch: 8 },  // Age
      { wch: 14 }, // Salary
      { wch: 18 }, // Experience
      { wch: 20 }, // Department
      { wch: 22 }, // Job Satisfaction
      { wch: 22 }, // Work-Life Balance
      { wch: 25 }, // Environment Satisfaction
      { wch: 25 }, // Relationship Satisfaction
      { wch: 22 }, // Composite Satisfaction
      { wch: 12 }, // Overtime
      { wch: 20 }, // Attrition Prediction
      { wch: 20 }, // Attrition Probability
      { wch: 14 }  // Risk Tier
    ];

    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    wsSummary['!cols'] = [
      { wch: 34 },
      { wch: 45 }
    ];

    XLSX.utils.book_append_sheet(wb, wsRoster, 'Workforce Roster');
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Summary');

    // 4. Trigger download in Microsoft Excel format (.xlsx)
    const fileName = `workforce_attrition_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName, { bookType: 'xlsx', type: 'binary' });
  };

  const handleExportCsv = handleExportRoster;

  // High risk count calculation for navbar
  const highRiskCount = employees.filter(e => (e.ground_truth_prob || (e.attrition ? 0.8 : 0.1)) >= 0.60).length;

  // If no HR user is logged in, show restricted Login Portal
  if (!currentUser) {
    return (
      <LoginPage 
        onLogin={handleLogin} 
        theme={theme} 
        toggleTheme={toggleTheme} 
      />
    );
  }

  return (
    <div className={`app-layout ${glassMode ? 'glass-active' : ''}`}>
      {/* Global Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        theme={theme}
        toggleTheme={toggleTheme}
        glassMode={glassMode}
        toggleGlassMode={toggleGlassMode}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        onExportCsv={handleExportCsv}
        totalEmployees={employees.length}
        highRiskCount={highRiskCount}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="main-content-viewport">
        {activeTab === 'dashboard' && (
          <DashboardTab
            employees={employees}
            onSelectEmployee={(emp) => setSelectedEmployee(emp)}
            onNavigateToPredictor={() => setActiveTab('predictor')}
          />
        )}

        {activeTab === 'survey' && (
          <SurveyManagementTab
            authorizedEmployees={authorizedEmployees}
            onAddCredential={handleAddCredential}
            onRemoveCredential={handleRemoveCredential}
            surveyResponses={surveyResponses}
            onClearSurveys={handleClearSurveys}
            onDeleteSurvey={handleDeleteSurvey}
          />
        )}

        {activeTab === 'predictor' && (
          <PredictorTab
            employees={employees}
            initialEmployee={predictorTarget}
            onAddToRoster={handleAddToRoster}
            onSendToWhatIf={handleSendToWhatIf}
          />
        )}

        {activeTab === 'whatif' && (
          <WhatIfSimulator
            initialEmployee={whatIfTarget}
          />
        )}

        {activeTab === 'directory' && (
          <DirectoryTab
            employees={employees}
            onSelectEmployee={(emp) => setSelectedEmployee(emp)}
            onSendToWhatIf={handleSendToWhatIf}
            onSendToPredictor={handleSendToPredictor}
            onOpenUpload={() => setIsUploadModalOpen(true)}
            onExportCsv={handleExportCsv}
            onNavigateToPredictor={() => setActiveTab('predictor')}
          />
        )}
      </main>

      {/* 360-Degree Employee Detail Modal */}
      {selectedEmployee && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          onSendToWhatIf={handleSendToWhatIf}
          onSendToPredictor={handleSendToPredictor}
        />
      )}

      {/* Batch CSV / Excel Upload Modal */}
      <CsvUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onImportEmployees={handleImportEmployees}
      />
    </div>
  );
}
