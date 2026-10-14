import * as XLSX from 'xlsx';

/**
 * Maps an employee survey submission record into an Excel-friendly row object.
 */
export function formatSurveyRecordForExcel(record) {
  const probNum = typeof record.attritionProbability === 'number' 
    ? record.attritionProbability 
    : parseFloat(record.attritionProbability || 0);

  const probPercent = `${(probNum * 100).toFixed(1)}%`;
  const isLeave = probNum >= 0.50 || record.isAttritionLikely;
  const isOt = record.overtimeRating >= 3 || record.overtime === true || record.overtime === 1 || String(record.overtime).toLowerCase() === 'yes';

  return {
    'Submission Timestamp': record.timestamp ? new Date(record.timestamp).toLocaleString() : new Date().toLocaleString(),
    'Employee ID': record.employeeId || record.id || 'N/A',
    'Employee Name': record.employeeName || record.name || 'Anonymous',
    'Age': Number(record.age) || '',
    'Monthly Salary ($)': Number(record.salary) || '',
    'Total Experience (Years)': Number(record.experience) || '',
    'Department': record.department || '',
    'Overall Job Satisfaction (1-5)': Number(record.jobSatisfaction) || 3,
    'Work-Life Balance (1-5)': Number(record.workLifeBalance) || 3,
    'Workplace Environment (1-5)': Number(record.envSatisfaction) || 3,
    'Manager & Peer Relationship (1-5)': Number(record.relSatisfaction) || 3,
    'Composite Satisfaction (1-5)': Number(Number(record.compositeSatisfaction || 3).toFixed(2)),
    'Overtime Score (1-5)': Number(record.overtimeRating) || (isOt ? 4 : 1),
    'Overtime Status': isOt ? 'Yes (Overtime Active)' : 'No (Standard 40h)',
    'Attrition Prediction': isLeave ? 'LEAVE (Likely to Leave)' : 'STAY (Likely to Stay)',
    'Attrition Probability': probPercent,
    'Attrition Probability (Numeric)': Number(probNum.toFixed(4)),
    'Risk Tier': record.riskLevel || (probNum >= 0.6 ? 'HIGH' : probNum >= 0.3 ? 'MEDIUM' : 'LOW'),
    'Estimated Turnover Cost ($)': record.estimatedTurnoverCost ? `$${record.estimatedTurnoverCost.toLocaleString()}` : 'N/A',
    'Primary Risk Multipliers': Array.isArray(record.topRiskFactors) && record.topRiskFactors.length > 0 
      ? record.topRiskFactors.join('; ') 
      : 'None Identified',
    'Protective Retention Factors': Array.isArray(record.protectiveFactors) && record.protectiveFactors.length > 0 
      ? record.protectiveFactors.join('; ') 
      : 'Standard Retention Profile',
    'Prescriptive Retention Action': Array.isArray(record.retentionRecommendations) && record.retentionRecommendations.length > 0 
      ? record.retentionRecommendations.map(r => `[${r.category}] ${r.action}: ${r.description}`).join(' | ') 
      : 'Maintain routine engagement and recognition.'
  };
}

/**
 * Standard column widths configuration for survey response worksheets.
 */
const SURVEY_COL_WIDTHS = [
  { wch: 22 }, // Submission Timestamp
  { wch: 15 }, // Employee ID
  { wch: 24 }, // Employee Name
  { wch: 8 },  // Age
  { wch: 18 }, // Monthly Salary
  { wch: 24 }, // Total Experience
  { wch: 24 }, // Department
  { wch: 26 }, // Overall Job Satisfaction
  { wch: 22 }, // Work-Life Balance
  { wch: 26 }, // Workplace Environment
  { wch: 30 }, // Manager & Peer Relationship
  { wch: 26 }, // Composite Satisfaction
  { wch: 20 }, // Overtime Score
  { wch: 22 }, // Overtime Status
  { wch: 24 }, // Attrition Prediction
  { wch: 20 }, // Attrition Probability
  { wch: 28 }, // Attrition Probability (Numeric)
  { wch: 14 }, // Risk Tier
  { wch: 26 }, // Estimated Turnover Cost
  { wch: 38 }, // Primary Risk Multipliers
  { wch: 38 }, // Protective Retention Factors
  { wch: 55 }  // Prescriptive Retention Action
];

/**
 * Exports a single survey submission directly to an Excel (.xlsx) file.
 */
export function exportSingleSurveyToExcel(surveyRecord) {
  const wb = XLSX.utils.book_new();
  const row = formatSurveyRecordForExcel(surveyRecord);

  // 1. Table Sheet of the response
  const wsResponse = XLSX.utils.json_to_sheet([row]);
  wsResponse['!cols'] = SURVEY_COL_WIDTHS;
  XLSX.utils.book_append_sheet(wb, wsResponse, 'Survey & Prediction');

  // 2. Formatted Individual Audit Card Sheet
  const cardData = [
    { 'Field': '--- EMPLOYEE IDENTIFICATION ---', 'Value': '' },
    { 'Field': 'Employee ID', 'Value': row['Employee ID'] },
    { 'Field': 'Employee Name', 'Value': row['Employee Name'] },
    { 'Field': 'Department', 'Value': row['Department'] },
    { 'Field': 'Age', 'Value': row['Age'] },
    { 'Field': 'Monthly Salary', 'Value': `$${Number(row['Monthly Salary ($)']).toLocaleString()}` },
    { 'Field': 'Total Experience', 'Value': `${row['Total Experience (Years)']} Years` },
    { 'Field': '', 'Value': '' },
    { 'Field': '--- EMPLOYEE OPINION & SATISFACTION RATINGS (OUT OF 5) ---', 'Value': '' },
    { 'Field': 'Overall Job Satisfaction (1-5)', 'Value': `${row['Overall Job Satisfaction (1-5)']} / 5` },
    { 'Field': 'Work-Life Balance (1-5)', 'Value': `${row['Work-Life Balance (1-5)']} / 5` },
    { 'Field': 'Workplace Environment (1-5)', 'Value': `${row['Workplace Environment (1-5)']} / 5` },
    { 'Field': 'Manager & Peer Relationship (1-5)', 'Value': `${row['Manager & Peer Relationship (1-5)']} / 5` },
    { 'Field': 'Composite Satisfaction (1-5)', 'Value': `${row['Composite Satisfaction (1-5)']} / 5.0` },
    { 'Field': 'Overtime Rating (1-5)', 'Value': `${row['Overtime Score (1-5)']} / 5 (${row['Overtime Status']})` },
    { 'Field': '', 'Value': '' },
    { 'Field': '--- AI ATTRITION PREDICTION & MODEL RESULTS ---', 'Value': '' },
    { 'Field': 'Predicted Attrition Outcome', 'Value': row['Attrition Prediction'] },
    { 'Field': 'Flight Risk Probability', 'Value': row['Attrition Probability'] },
    { 'Field': 'Assigned Risk Classification', 'Value': row['Risk Tier'] },
    { 'Field': 'Estimated Turnover Replacement Cost', 'Value': row['Estimated Turnover Cost ($)'] },
    { 'Field': 'Key Risk Multipliers', 'Value': row['Primary Risk Multipliers'] },
    { 'Field': 'Protective Retention Factors', 'Value': row['Protective Retention Factors'] },
    { 'Field': 'Prescriptive HR Retention Strategy', 'Value': row['Prescriptive Retention Action'] },
    { 'Field': 'Evaluation Date', 'Value': row['Submission Timestamp'] }
  ];

  const wsCard = XLSX.utils.json_to_sheet(cardData);
  wsCard['!cols'] = [{ wch: 45 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsCard, 'Employee Audit Card');

  // Trigger file download
  const empIdClean = (surveyRecord.employeeId || 'EMP').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `Employee_Opinion_${empIdClean}_${dateStr}.xlsx`;
  XLSX.writeFile(wb, fileName, { bookType: 'xlsx', type: 'binary' });

  return fileName;
}

/**
 * Exports all accumulated survey submissions into a comprehensive multi-sheet Excel (.xlsx) file.
 */
export function exportAllSurveysToExcel(surveysList, customFilename = null) {
  if (!surveysList || surveysList.length === 0) {
    alert('No survey responses available to export yet. Please submit a survey first!');
    return null;
  }

  const wb = XLSX.utils.book_new();

  // 1. All Responses Sheet
  const rows = surveysList.map(s => formatSurveyRecordForExcel(s));
  const wsAll = XLSX.utils.json_to_sheet(rows);
  wsAll['!cols'] = SURVEY_COL_WIDTHS;
  XLSX.utils.book_append_sheet(wb, wsAll, 'Survey Responses & Predictions');

  // 2. Executive Analytics Summary Sheet
  const total = surveysList.length;
  const highRisk = surveysList.filter(s => {
    const prob = typeof s.attritionProbability === 'number' ? s.attritionProbability : parseFloat(s.attritionProbability || 0);
    return prob >= 0.60 || s.riskLevel === 'HIGH';
  }).length;
  const medRisk = surveysList.filter(s => {
    const prob = typeof s.attritionProbability === 'number' ? s.attritionProbability : parseFloat(s.attritionProbability || 0);
    return (prob >= 0.30 && prob < 0.60) || s.riskLevel === 'MEDIUM';
  }).length;
  const lowRisk = total - highRisk - medRisk;

  const avgSalary = Math.round(surveysList.reduce((acc, s) => acc + (Number(s.salary) || 0), 0) / (total || 1));
  const avgExp = (surveysList.reduce((acc, s) => acc + (Number(s.experience) || 0), 0) / (total || 1)).toFixed(1);
  const avgJobSat = (surveysList.reduce((acc, s) => acc + (Number(s.jobSatisfaction) || 3), 0) / (total || 1)).toFixed(2);
  const avgWlb = (surveysList.reduce((acc, s) => acc + (Number(s.workLifeBalance) || 3), 0) / (total || 1)).toFixed(2);
  const avgCompSat = (surveysList.reduce((acc, s) => acc + (Number(s.compositeSatisfaction) || 3), 0) / (total || 1)).toFixed(2);
  const avgOt = (surveysList.reduce((acc, s) => acc + (Number(s.overtimeRating) || (s.overtime ? 4 : 1)), 0) / (total || 1)).toFixed(2);

  const summary = [
    { 'Metric': 'Survey Title', 'Value': 'Employee Workforce Opinion & Attrition Evaluation Log' },
    { 'Metric': 'Export Date & Time', 'Value': new Date().toLocaleString() },
    { 'Metric': 'Total Survey Responses Ingested', 'Value': total },
    { 'Metric': 'High Flight Risk Cohort (>= 60%)', 'Value': `${highRisk} (${((highRisk / total) * 100).toFixed(1)}%)` },
    { 'Metric': 'Medium Flight Risk Cohort (30% - 59%)', 'Value': `${medRisk} (${((medRisk / total) * 100).toFixed(1)}%)` },
    { 'Metric': 'Low Flight Risk Cohort (< 30%)', 'Value': `${lowRisk} (${((lowRisk / total) * 100).toFixed(1)}%)` },
    { 'Metric': 'Average Monthly Compensation', 'Value': `$${avgSalary.toLocaleString()}` },
    { 'Metric': 'Average Total Experience', 'Value': `${avgExp} Years` },
    { 'Metric': 'Average Job Satisfaction Rating', 'Value': `${avgJobSat} / 5.0` },
    { 'Metric': 'Average Work-Life Balance Rating', 'Value': `${avgWlb} / 5.0` },
    { 'Metric': 'Average Composite Satisfaction Rating', 'Value': `${avgCompSat} / 5.0` },
    { 'Metric': 'Average Overtime Load Rating', 'Value': `${avgOt} / 5.0` },
    { 'Metric': 'Integrated AI Predictive Architecture', 'Value': 'Calibrated Attrition Random Forest / Platt Sigmoidal Classifier' },
    { 'Metric': 'Export Engine File Type', 'Value': 'Microsoft Excel Workbook (.xlsx)' }
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summary);
  wsSummary['!cols'] = [{ wch: 38 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Summary');

  // 3. Departmental Breakdown Sheet
  const deptMap = {};
  surveysList.forEach(s => {
    const dept = s.department || 'Unassigned';
    if (!deptMap[dept]) {
      deptMap[dept] = { total: 0, highRisk: 0, sumProb: 0, sumSalary: 0 };
    }
    const prob = typeof s.attritionProbability === 'number' ? s.attritionProbability : parseFloat(s.attritionProbability || 0);
    deptMap[dept].total += 1;
    if (prob >= 0.60 || s.riskLevel === 'HIGH') deptMap[dept].highRisk += 1;
    deptMap[dept].sumProb += prob;
    deptMap[dept].sumSalary += (Number(s.salary) || 0);
  });

  const deptRows = Object.keys(deptMap).map(d => ({
    'Department': d,
    'Respondents': deptMap[d].total,
    'High Flight Risk Count': deptMap[d].highRisk,
    'Department Attrition Rate (%)': `${((deptMap[d].highRisk / deptMap[d].total) * 100).toFixed(1)}%`,
    'Mean Probability (%)': `${((deptMap[d].sumProb / deptMap[d].total) * 100).toFixed(1)}%`,
    'Mean Monthly Salary ($)': `$${Math.round(deptMap[d].sumSalary / deptMap[d].total).toLocaleString()}`
  }));

  const wsDept = XLSX.utils.json_to_sheet(deptRows);
  wsDept['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 22 }, { wch: 28 }, { wch: 22 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, wsDept, 'Department Breakdown');

  // Write and trigger download
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = customFilename || `Master_Employee_Attrition_Surveys_${dateStr}.xlsx`;
  XLSX.writeFile(wb, fileName, { bookType: 'xlsx', type: 'binary' });

  return fileName;
}
