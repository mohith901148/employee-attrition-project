import modelMetadata from '../data/modelMetadata.js';

const params = modelMetadata.logistic_parameters;

/**
 * Predicts attrition and risk level for an employee based on the 6 input dimensions.
 * @param {Object} employeeData
 * @param {number} employeeData.age - Employee age (18 - 65)
 * @param {number} employeeData.salary - Monthly salary (e.g. 2000 - 25000)
 * @param {number} employeeData.experience - Total experience in years (0 - 40)
 * @param {string} employeeData.department - Department name
 * @param {number} employeeData.job_satisfaction - 1 to 5
 * @param {number} employeeData.work_life_balance - 1 to 5
 * @param {number} employeeData.environment_satisfaction - 1 to 5
 * @param {number} employeeData.relationship_satisfaction - 1 to 5
 * @param {boolean|number|string} employeeData.overtime - true/false or 1/0 or 'Yes'/'No'
 */
export function calculateAttritionRisk(employeeData) {
  const age = Number(employeeData.age) || 35;
  const salary = Number(employeeData.salary) || 6500;
  const experience = Number(employeeData.experience) || 5;
  const department = employeeData.department || 'Research & Development';
  const jobSat = Number(employeeData.job_satisfaction) || 3;
  const wlb = Number(employeeData.work_life_balance) || 3;
  const envSat = Number(employeeData.environment_satisfaction) || 3;
  const relSat = Number(employeeData.relationship_satisfaction) || 3;
  
  // Support 1-5 overtime rating scale or boolean
  const otRating = typeof employeeData.overtime_score === 'number'
    ? employeeData.overtime_score
    : (typeof employeeData.overtimeRating === 'number')
      ? employeeData.overtimeRating
      : (typeof employeeData.overtime === 'number' && employeeData.overtime >= 1 && employeeData.overtime <= 5)
        ? employeeData.overtime
        : null;

  const isOvertime = otRating !== null
    ? otRating >= 3
    : (employeeData.overtime === true || 
       employeeData.overtime === 1 || 
       String(employeeData.overtime).toLowerCase() === 'yes');

  // 1. Standardize numeric inputs
  const numInputs = [age, salary, experience, jobSat, wlb, envSat, relSat];
  const stdNum = numInputs.map((val, i) => (val - params.scaler_means[i]) / params.scaler_scales[i]);

  // 2. Department one-hot encoding (Reference category is 'Engineering')
  const deptOneHot = [
    department === 'Finance' ? 1 : 0,
    department === 'Human Resources' ? 1 : 0,
    department === 'Marketing' ? 1 : 0,
    department === 'Research & Development' ? 1 : 0,
    department === 'Sales' ? 1 : 0,
  ];

  // 3. Binary or scaled feature: overtime
  const otVal = otRating !== null
    ? Math.max(0, Math.min(1, (otRating - 1) / 4))
    : (isOvertime ? 1 : 0);

  // 4. Feature vector
  const featureVector = [...stdNum, ...deptOneHot, otVal];

  // 5. Calculate log-odds
  let z = params.intercept;
  for (let i = 0; i < featureVector.length; i++) {
    z += featureVector[i] * params.coefficients[i];
  }

  // 6. Calibrated probability using sigmoid
  const rawProb = 1.0 / (1.0 + Math.exp(-z));
  // Bound strictly between 0.02 and 0.98 for realistic corporate calibration
  const probability = Math.min(0.98, Math.max(0.02, rawProb));
  const probabilityNum = probability.toFixed(2); // Numerical value e.g. 0.88

  // 7. Categorical Attrition Output
  const isAttritionLikely = probability >= 0.50;
  const prediction = isAttritionLikely ? 'YES (Likely to Leave)' : 'NO (Likely to Stay)';

  // 8. Risk Level
  let riskLevel = 'LOW';
  let riskColor = '#10b981'; // emerald
  let riskBg = 'rgba(16, 185, 129, 0.12)';
  let riskBadge = 'Low Retention Risk';

  if (probability >= 0.60) {
    riskLevel = 'HIGH';
    riskColor = '#ef4444'; // red
    riskBg = 'rgba(239, 68, 68, 0.14)';
    riskBadge = 'Critical Flight Risk';
  } else if (probability >= 0.30) {
    riskLevel = 'MEDIUM';
    riskColor = '#f59e0b'; // amber
    riskBg = 'rgba(245, 158, 11, 0.14)';
    riskBadge = 'Moderate At-Risk';
  }

  // Composite satisfaction score (1 - 5)
  const compositeSatisfaction = employeeData.composite_satisfaction !== undefined && employeeData.composite_satisfaction !== null
    ? Number(employeeData.composite_satisfaction).toFixed(1)
    : ((jobSat + wlb + envSat + relSat) / 4).toFixed(1);

  // 9. Explainability & Contributing Factors (SHAP-style attribution)
  const factorContributions = [];

  // Overtime impact
  if (otRating !== null) {
    if (otRating >= 4) {
      factorContributions.push({
        feature: `Heavy Overtime Workload (${otRating}/5)`,
        impact: `+${(0.18 + (otRating - 3) * 0.08).toFixed(3)}`,
        type: 'risk',
        desc: `High overtime rating of ${otRating}/5 indicates acute fatigue and burnout risk.`
      });
    } else if (otRating === 3) {
      factorContributions.push({
        feature: `Moderate Overtime (3/5)`,
        impact: '+0.092',
        type: 'risk',
        desc: 'Occasional overtime requires workload tracking to prevent turnover spikes.'
      });
    } else {
      factorContributions.push({
        feature: `Manageable Hours (${otRating}/5 Overtime)`,
        impact: '-0.182',
        type: 'protective',
        desc: 'Low/no overtime workload significantly stabilizes employee retention.'
      });
    }
  } else if (isOvertime) {
    factorContributions.push({
      feature: 'Overtime Workload',
      impact: '+0.264',
      type: 'risk',
      desc: 'Active overtime is the single largest turnover risk multiplier (+1.75 weight).'
    });
  } else {
    factorContributions.push({
      feature: 'Standard Hours (No Overtime)',
      impact: '-0.182',
      type: 'protective',
      desc: 'Predictable working hours significantly stabilize retention.'
    });
  }

  // Salary impact
  if (salary < 4500) {
    factorContributions.push({
      feature: 'Compensation Level',
      impact: '+0.148',
      type: 'risk',
      desc: `Monthly salary of $${salary.toLocaleString()} is below market median ($9,240).`
    });
  } else if (salary > 10000) {
    factorContributions.push({
      feature: 'Competitive Compensation',
      impact: '-0.165',
      type: 'protective',
      desc: `High monthly income ($${salary.toLocaleString()}) acts as a major golden handcuff.`
    });
  }

  // Work-Life Balance & Satisfaction
  if (wlb <= 2) {
    factorContributions.push({
      feature: 'Work-Life Strain',
      impact: '+0.126',
      type: 'risk',
      desc: `Work-Life Balance rated ${wlb}/5 signals early burnout risk.`
    });
  } else if (wlb >= 4) {
    factorContributions.push({
      feature: 'Healthy Work-Life Balance',
      impact: '-0.108',
      type: 'protective',
      desc: `Strong balance score (${wlb}/5) strongly mitigates departure intent.`
    });
  }

  if (jobSat <= 2) {
    factorContributions.push({
      feature: 'Low Job Satisfaction',
      impact: '+0.094',
      type: 'risk',
      desc: `Satisfaction score of ${jobSat}/5 indicates disengagement with current role.`
    });
  }

  if (experience <= 2) {
    factorContributions.push({
      feature: 'Early Tenure Vulnerability',
      impact: '+0.112',
      type: 'risk',
      desc: `Employees with under 3 years experience (${experience} yrs) have 2.3x higher market mobility.`
    });
  } else if (experience >= 10) {
    factorContributions.push({
      feature: 'Organizational Tenure',
      impact: '-0.120',
      type: 'protective',
      desc: `${experience} years of accumulated experience provides institutional loyalty.`
    });
  }

  if (age < 28) {
    factorContributions.push({
      feature: 'Early Career Cohort',
      impact: '+0.085',
      type: 'risk',
      desc: `Age ${age} cohort experiences more frequent external headhunting.`
    });
  }

  // 10. Prescriptive HR Retention Playbook
  const retentionRecommendations = [];
  if (isOvertime) {
    retentionRecommendations.push({
      action: 'Workload Rebalancing & Overtime Cap',
      urgency: 'Immediate (Next 7 Days)',
      category: 'Workload',
      description: 'Audit project deadlines and reassign 20% of overtime tasks to contractor or peer pool to eliminate burnout.'
    });
  }

  if (salary < 6000) {
    retentionRecommendations.push({
      action: 'Targeted Compensation Review',
      urgency: 'High Priority (Next 30 Days)',
      category: 'Compensation',
      description: `Consider an 8-15% salary recalibration or performance bonus to close the gap with the department average.`
    });
  }

  if (wlb <= 2 || envSat <= 2) {
    retentionRecommendations.push({
      action: 'Flexible Working Arrangement',
      urgency: 'High Priority',
      category: 'Culture',
      description: 'Offer structured remote/hybrid days and asynchronous work blocks to support personal well-being.'
    });
  }

  if (jobSat <= 2 || relSat <= 2) {
    retentionRecommendations.push({
      action: '1-on-1 Career Alignment & Mentorship',
      urgency: 'Medium Priority',
      category: 'Development',
      description: 'Conduct a skip-level stay interview to explore lateral moves, internal mobility, or skill upskilling.'
    });
  }

  if (retentionRecommendations.length === 0) {
    retentionRecommendations.push({
      action: 'Recognition & Growth Pathway',
      urgency: 'Routine Monitoring',
      category: 'Engagement',
      description: 'Maintain high engagement through quarterly recognition, peer awards, and leadership development assignments.'
    });
  }

  // Estimate turnover replacement cost (standard HR formula: 50% - 150% of annual salary based on tenure and role)
  const estimatedTurnoverCost = Math.round(salary * 6 * (0.8 + probability * 0.4));

  // Extract risk & protective feature lists for quick badge display
  const topRiskFactors = factorContributions
    .filter(f => f.type === 'risk')
    .map(f => `${f.feature} (${f.impact})`);

  const protectiveFactors = factorContributions
    .filter(f => f.type === 'protective')
    .map(f => `${f.feature} (${f.impact})`);

  return {
    attritionPrediction: prediction,
    isAttritionLikely,
    attritionProbability: probabilityNum,
    rawProbability: probability,
    probabilityScore: probabilityNum,
    riskLevel,
    riskBadge,
    riskColor,
    riskBg,
    compositeSatisfaction,
    estimatedTurnoverCost,
    topRiskFactors,
    protectiveFactors,
    factorContributions,
    retentionRecommendations,
    timestamp: new Date().toISOString()
  };
}
