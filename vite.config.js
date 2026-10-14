import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

/**
 * Custom Vite Plugin to handle:
 * 1. Employee_Credentials.xlsx - Separate Excel register for employee login/verification
 * 2. Employee_Survey_Responses.xlsx - Main Excel register where survey responses are directly added
 */
function surveyExcelPlugin() {
  const xlsx = XLSX.default || XLSX;
  const mainExcelPath = path.resolve(process.cwd(), 'Employee_Survey_Responses.xlsx');
  const credentialsExcelPath = path.resolve(process.cwd(), 'Employee_Credentials.xlsx');

  const cleanId = id => String(id || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const cleanName = str => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  return {
    name: 'survey-excel-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // ── 1. Verify Credential from Employee_Credentials.xlsx ──
        if (req.url === '/api/verify-credential' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { employeeId, name } = JSON.parse(body);
              const targetId = cleanId(employeeId);
              const targetName = cleanName(name);

              let rows = [];
              if (fs.existsSync(credentialsExcelPath)) {
                const wb = xlsx.readFile(credentialsExcelPath);
                const sheetName = wb.SheetNames[0];
                if (sheetName && wb.Sheets[sheetName]) {
                  rows = xlsx.utils.sheet_to_json(wb.Sheets[sheetName]);
                }
              }

              const match = rows.find(r => {
                const rId = cleanId(r['Employee ID'] || r.employee_id || r.id);
                const rName = cleanName(r['Full Name'] || r.name || r.employeeName);
                return rId === targetId && (rName === targetName || rName.includes(targetName) || targetName.includes(rName));
              });

              if (match) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: true,
                  verified: true,
                  source: 'Employee_Credentials.xlsx',
                  employee: {
                    employee_id: match['Employee ID'] || match.employee_id,
                    name: match['Full Name'] || match.name,
                    department: match['Department'] || match.department || 'Research & Development',
                    age: Number(match['Age'] || match.age) || 30,
                    salary: Number(match['Monthly Salary ($)'] || match.salary) || 5000,
                    experience: Number(match['Total Experience (Years)'] || match.experience) || 3,
                    job_satisfaction: Number(match['Baseline Job Satisfaction'] || match.job_satisfaction) || 3,
                    work_life_balance: Number(match['Baseline Work-Life Balance'] || match.work_life_balance) || 3
                  }
                }));
              } else {
                res.statusCode = 401;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: false,
                  verified: false,
                  error: 'Credentials not found in Employee_Credentials.xlsx'
                }));
              }
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // ── 2. Add Credential to Employee_Credentials.xlsx ──
        if (req.url === '/api/add-credential' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              let rows = [];
              if (fs.existsSync(credentialsExcelPath)) {
                const wb = xlsx.readFile(credentialsExcelPath);
                const sheetName = wb.SheetNames[0];
                if (sheetName && wb.Sheets[sheetName]) {
                  rows = xlsx.utils.sheet_to_json(wb.Sheets[sheetName]);
                }
              }

              const newRow = {
                'Employee ID': data.employee_id || data.employeeId,
                'Full Name': data.name || data.employeeName,
                'Department': data.department || 'Research & Development',
                'Age': Number(data.age) || '',
                'Monthly Salary ($)': Number(data.salary) || '',
                'Total Experience (Years)': Number(data.experience) || '',
                'Baseline Job Satisfaction': Number(data.job_satisfaction) || 3,
                'Baseline Work-Life Balance': Number(data.work_life_balance) || 3,
                'Account Status': 'Active / Verified'
              };

              // Filter out duplicate ID if exists and prepend
              const filtered = rows.filter(r => cleanId(r['Employee ID']) !== cleanId(newRow['Employee ID']));
              const updatedRows = [newRow, ...filtered];

              const newWb = xlsx.utils.book_new();
              const ws = xlsx.utils.json_to_sheet(updatedRows);
              ws['!cols'] = [
                { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 8 }, { wch: 18 }, { wch: 22 }, { wch: 24 }, { wch: 24 }, { wch: 20 }
              ];
              xlsx.utils.book_append_sheet(newWb, ws, 'Employee Credentials');
              xlsx.writeFile(newWb, credentialsExcelPath);

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                message: 'Successfully updated Employee_Credentials.xlsx',
                totalCredentials: updatedRows.length,
                credential: newRow
              }));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // ── 3. Query Credentials List Endpoint ──
        if (req.url === '/api/credentials' && req.method === 'GET') {
          try {
            let rows = [];
            if (fs.existsSync(credentialsExcelPath)) {
              const wb = xlsx.readFile(credentialsExcelPath);
              const sheetName = wb.SheetNames[0];
              if (sheetName && wb.Sheets[sheetName]) {
                rows = xlsx.utils.sheet_to_json(wb.Sheets[sheetName]);
              }
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              total: rows.length,
              credentials: rows,
              filePath: 'Employee_Credentials.xlsx'
            }));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        // ── 4. Download Employee_Credentials.xlsx Endpoint ──
        if (req.url === '/api/download-credentials-excel' && req.method === 'GET') {
          try {
            if (fs.existsSync(credentialsExcelPath)) {
              const fileBuffer = fs.readFileSync(credentialsExcelPath);
              res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
              res.setHeader('Content-Disposition', 'attachment; filename="Employee_Credentials.xlsx"');
              res.end(fileBuffer);
            } else {
              res.statusCode = 404;
              res.end('Employee_Credentials.xlsx not found');
            }
          } catch (e) {
            res.statusCode = 500;
            res.end(e.message);
          }
          return;
        }

        // ── 5. Submit Survey Endpoint (Directly updates main Excel: Employee_Survey_Responses.xlsx) ──
        if (req.url === '/api/submit-survey' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);

              // Read existing main Excel responses if file exists
              let existingRows = [];
              if (fs.existsSync(mainExcelPath)) {
                try {
                  const wb = xlsx.readFile(mainExcelPath);
                  const sheetName = wb.SheetNames[0];
                  if (sheetName && wb.Sheets[sheetName]) {
                    existingRows = xlsx.utils.sheet_to_json(wb.Sheets[sheetName]);
                  }
                } catch (e) {
                  console.error('Error reading existing main Excel file:', e);
                }
              }

              // Create formatted row for main Excel
              const newRow = {
                'Submission Date & Time': new Date().toLocaleString(),
                'Employee ID': data.employeeId || data.employee_id || 'EMP-NEW',
                'Employee Name': data.employeeName || data.name || 'Anonymous',
                'Age': Number(data.age) || '',
                'Monthly Salary ($)': Number(data.salary) || '',
                'Total Experience (Years)': Number(data.experience) || '',
                'Department': data.department || '',
                'Overall Job Satisfaction (1-5)': Number(data.jobSatisfaction ?? data.job_satisfaction) || 3,
                'Work-Life Balance (1-5)': Number(data.workLifeBalance ?? data.work_life_balance) || 3,
                'Workplace Environment (1-5)': Number(data.envSatisfaction ?? data.environment_satisfaction) || 3,
                'Manager & Peer Relationship (1-5)': Number(data.relSatisfaction ?? data.relationship_satisfaction) || 3,
                'Composite Satisfaction (1-5)': Number(Number(data.compositeSatisfaction ?? data.composite_satisfaction ?? 3).toFixed(2)),
                'Overtime Score (1-5)': Number(data.overtimeRating ?? data.overtime_score) || (data.overtime ? 4 : 1),
                'Overtime Status': (data.overtimeRating >= 3 || data.overtime) ? 'Yes (Overtime Active)' : 'No (Standard Hours)',
                'Attrition Prediction': data.attritionPrediction || (data.isAttritionLikely ? 'LEAVE' : 'STAY'),
                'Attrition Probability': data.attritionProbability || `${(Number(data.ground_truth_prob || 0) * 100).toFixed(1)}%`,
                'Risk Classification': data.riskLevel || 'LOW',
                'Estimated Replacement Cost ($)': data.estimatedTurnoverCost ? `$${Number(data.estimatedTurnoverCost).toLocaleString()}` : '$--',
                'Key Risk Drivers': Array.isArray(data.topRiskFactors) ? data.topRiskFactors.join('; ') : (data.topRiskFactors || ''),
                'Protective Retention Factors': Array.isArray(data.protectiveFactors) ? data.protectiveFactors.join('; ') : (data.protectiveFactors || ''),
                'Recommended Retention Action': Array.isArray(data.retentionRecommendations) 
                  ? data.retentionRecommendations.map(r => r.action).join('; ') 
                  : (data.retentionRecommendations || '')
              };

              existingRows.push(newRow);

              // Build Main Excel workbook
              const wb = xlsx.utils.book_new();
              const ws = xlsx.utils.json_to_sheet(existingRows);
              ws['!cols'] = [
                { wch: 22 }, // Submission Date & Time
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
                { wch: 22 }, // Overtime Rating
                { wch: 22 }, // Overtime Status
                { wch: 20 }, // Attrition Prediction
                { wch: 20 }, // Attrition Probability
                { wch: 18 }, // Risk Classification
                { wch: 24 }, // Estimated Replacement Cost
                { wch: 36 }, // Key Risk Drivers
                { wch: 36 }, // Protective Retention Factors
                { wch: 45 }  // Recommended Retention Action
              ];

              xlsx.utils.book_append_sheet(wb, ws, 'Survey Responses');

              // Executive summary sheet
              const total = existingRows.length;
              const highCount = existingRows.filter(r => String(r['Risk Classification']).includes('HIGH')).length;
              const summaryData = [
                { 'Workforce Metric': 'Report Title', 'Metric Value': 'Corporate Employee Opinion & Attrition Register' },
                { 'Workforce Metric': 'Total Responses Recorded', 'Metric Value': total },
                { 'Workforce Metric': 'High Flight Risk Responses', 'Metric Value': `${highCount} (${((highCount / (total || 1)) * 100).toFixed(1)}%)` },
                { 'Workforce Metric': 'Last Updated Timestamp', 'Metric Value': new Date().toLocaleString() },
                { 'Workforce Metric': 'Main Excel Database File', 'Metric Value': 'Employee_Survey_Responses.xlsx' }
              ];
              const wsSummary = xlsx.utils.json_to_sheet(summaryData);
              wsSummary['!cols'] = [{ wch: 30 }, { wch: 45 }];
              xlsx.utils.book_append_sheet(wb, wsSummary, 'Executive Summary');

              // Write to disk
              xlsx.writeFile(wb, mainExcelPath);

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ 
                success: true, 
                message: 'Successfully updated main Excel file (Employee_Survey_Responses.xlsx)', 
                totalResponses: existingRows.length,
                filePath: 'Employee_Survey_Responses.xlsx',
                submission: newRow
              }));
            } catch (err) {
              console.error('Error updating main Excel file:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // ── 6. Query Survey Stats Endpoint ──
        if (req.url === '/api/surveys' && req.method === 'GET') {
          try {
            let rows = [];
            if (fs.existsSync(mainExcelPath)) {
              const wb = xlsx.readFile(mainExcelPath);
              const sheetName = wb.SheetNames[0];
              if (sheetName && wb.Sheets[sheetName]) {
                rows = xlsx.utils.sheet_to_json(wb.Sheets[sheetName]);
              }
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ 
              total: rows.length, 
              surveys: rows,
              filePath: 'Employee_Survey_Responses.xlsx',
              lastModified: fs.existsSync(mainExcelPath) ? fs.statSync(mainExcelPath).mtime : null
            }));
          } catch (e) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: e.message }));
          }
          return;
        }

        // ── 7. Direct Main Excel Download Endpoint ──
        if (req.url === '/api/download-excel' && req.method === 'GET') {
          try {
            if (fs.existsSync(mainExcelPath)) {
              const fileBuffer = fs.readFileSync(mainExcelPath);
              res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
              res.setHeader('Content-Disposition', 'attachment; filename="Employee_Survey_Responses.xlsx"');
              res.end(fileBuffer);
            } else {
              res.statusCode = 404;
              res.end('Main Excel file not created yet');
            }
          } catch (e) {
            res.statusCode = 500;
            res.end(e.message);
          }
          return;
        }

        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), surveyExcelPlugin()]
});
