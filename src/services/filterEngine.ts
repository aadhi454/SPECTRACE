import {
  ConstraintDiagnostic,
  EligibilityEvaluation,
  ProductRevision,
  SpecFilterConstraints,
} from '../types/spec';

export interface CustomerScenarioPreset {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  constraints: SpecFilterConstraints;
}

export const CUSTOMER_SCENARIO_PRESETS: CustomerScenarioPreset[] = [
  {
    id: 'scenario-1-valid-multi',
    title: 'Standard 24V / 75W (50°C)',
    subtitle: '24V DC, ≥75W, 230V AC, 50°C, UL508',
    tag: '2 Eligible',
    constraints: {
      outputVoltageV: 24,
      minOutputPowerW: 75,
      requiredInputVoltageV: 230,
      targetAmbientTempC: 50,
      minEfficiencyPct: null,
      maxWidthMm: null,
      requiredCertifications: ['UL508'],
    },
  },
  {
    id: 'scenario-2-thermal-boundary',
    title: 'High Ambient 60°C (Derating Check)',
    subtitle: '24V DC, ≥75W, 230V AC, 60°C, UL508',
    tag: 'Derating Check',
    constraints: {
      outputVoltageV: 24,
      minOutputPowerW: 75,
      requiredInputVoltageV: 230,
      targetAmbientTempC: 60,
      minEfficiencyPct: null,
      maxWidthMm: null,
      requiredCertifications: ['UL508'],
    },
  },
  {
    id: 'scenario-3-semi-f47',
    title: 'Semiconductor SEMI F47 (100W+)',
    subtitle: '24V DC, ≥100W, SEMI F47, ≤45mm width',
    tag: '1 Eligible',
    constraints: {
      outputVoltageV: 24,
      minOutputPowerW: 100,
      requiredInputVoltageV: 230,
      targetAmbientTempC: 55,
      minEfficiencyPct: null,
      maxWidthMm: 45,
      requiredCertifications: ['SEMI F47'],
    },
  },
  {
    id: 'scenario-4-impossible',
    title: 'Impossible Spec (250W / 85°C)',
    subtitle: '24V DC, ≥250W, 85°C ambient',
    tag: '0 Eligible',
    constraints: {
      outputVoltageV: 24,
      minOutputPowerW: 250,
      requiredInputVoltageV: 230,
      targetAmbientTempC: 85,
      minEfficiencyPct: null,
      maxWidthMm: null,
      requiredCertifications: ['UL508'],
    },
  },
];

export function evaluateRevisionEligibility(
  revision: ProductRevision,
  constraints: SpecFilterConstraints
): EligibilityEvaluation {
  const diagnostics: ConstraintDiagnostic[] = [];
  const failedReasons: string[] = [];
  const advisoryWarnings: string[] = [];
  const s = revision.specs;

  // 1. Output Voltage
  if (constraints.outputVoltageV !== null) {
    const passed = s.outputVoltageV === constraints.outputVoltageV;
    diagnostics.push({
      field: 'outputVoltageV',
      label: 'Output Voltage',
      expected: `${constraints.outputVoltageV}V DC`,
      actual: `${s.outputVoltageV}V DC`,
      passed,
    });
    if (!passed) {
      failedReasons.push(
        `Output Voltage is ${s.outputVoltageV}V DC (Required: ${constraints.outputVoltageV}V DC)`
      );
    }
  }

  // 2. Min Output Power
  if (constraints.minOutputPowerW !== null) {
    const passed = s.outputPowerW >= constraints.minOutputPowerW;
    diagnostics.push({
      field: 'outputPowerW',
      label: 'Rated Output Power',
      expected: `≥ ${constraints.minOutputPowerW}W`,
      actual: `${s.outputPowerW}W`,
      passed,
    });
    if (!passed) {
      failedReasons.push(
        `Output Power is ${s.outputPowerW}W (Required: ≥ ${constraints.minOutputPowerW}W)`
      );
    }
  }

  // 3. Required Input AC Voltage
  if (constraints.requiredInputVoltageV !== null) {
    const reqV = constraints.requiredInputVoltageV;
    const passed = s.inputVoltageMinV <= reqV && reqV <= s.inputVoltageMaxV;
    diagnostics.push({
      field: 'inputVoltageRange',
      label: 'AC Input Supply',
      expected: `Supports ${reqV}V AC`,
      actual: `${s.inputVoltageMinV}–${s.inputVoltageMaxV}V AC`,
      passed,
    });
    if (!passed) {
      failedReasons.push(
        `Input Range ${s.inputVoltageMinV}–${s.inputVoltageMaxV}V AC excludes ${reqV}V AC`
      );
    }
  }

  // 4. Target Ambient Temperature + Boundary Derating Check
  if (constraints.targetAmbientTempC !== null) {
    const targetC = constraints.targetAmbientTempC;
    const passed =
      targetC >= s.operatingTempMinC && targetC <= s.operatingTempMaxC;
    let warningNote: string | undefined;

    if (passed && targetC > s.fullLoadMaxTempC) {
      const degreesOver = targetC - s.fullLoadMaxTempC;
      const slopePctPerDeg =
        revision.modelCode === 'DR-75-12' || revision.modelCode === 'SDR-120-24'
          ? 2.5
          : 2.0;
      const deratePct = Math.min(80, +(degreesOver * slopePctPerDeg).toFixed(1));
      const deratedPowerW = +((s.outputPowerW * (100 - deratePct)) / 100).toFixed(1);
      warningNote = `Target ${targetC}°C ambient exceeds the ${s.fullLoadMaxTempC}°C full-load ceiling. Linear thermal derating of ${deratePct}% applies (maximum continuous output reduced from ${s.outputPowerW}W to ${deratedPowerW}W).`;
      advisoryWarnings.push(warningNote);
    }

    diagnostics.push({
      field: 'operatingTempMaxC',
      label: 'Ambient Temperature Limit',
      expected: `≥ ${targetC}°C (Full load ≤ ${s.fullLoadMaxTempC}°C)`,
      actual: `${s.operatingTempMinC}°C to +${s.operatingTempMaxC}°C`,
      passed,
      warningNote,
    });

    if (!passed) {
      failedReasons.push(
        `Max Operating Temp is ${s.operatingTempMaxC}°C (Required: ≥ ${targetC}°C)`
      );
    }
  }

  // 5. Min Efficiency
  if (constraints.minEfficiencyPct !== null) {
    const passed = s.efficiencyPct >= constraints.minEfficiencyPct;
    diagnostics.push({
      field: 'efficiencyPct',
      label: 'Conversion Efficiency',
      expected: `≥ ${constraints.minEfficiencyPct}%`,
      actual: `${s.efficiencyPct}%`,
      passed,
    });
    if (!passed) {
      failedReasons.push(
        `Efficiency is ${s.efficiencyPct}% (Required: ≥ ${constraints.minEfficiencyPct}%)`
      );
    }
  }

  // 6. Max Width
  if (constraints.maxWidthMm !== null) {
    const passed = s.widthMm <= constraints.maxWidthMm;
    diagnostics.push({
      field: 'widthMm',
      label: 'Enclosure Width',
      expected: `≤ ${constraints.maxWidthMm}mm`,
      actual: `${s.widthMm}mm`,
      passed,
    });
    if (!passed) {
      failedReasons.push(
        `Enclosure Width is ${s.widthMm}mm (Required: ≤ ${constraints.maxWidthMm}mm)`
      );
    }
  }

  // 7. Required Certifications
  if (constraints.requiredCertifications.length > 0) {
    const missingCerts = constraints.requiredCertifications.filter(
      (reqCert) => !s.certifications.includes(reqCert)
    );
    const passed = missingCerts.length === 0;
    diagnostics.push({
      field: 'certifications',
      label: 'Required Certifications',
      expected: constraints.requiredCertifications.join(', '),
      actual: s.certifications.join(', '),
      passed,
    });
    if (!passed) {
      missingCerts.forEach((mc) => {
        failedReasons.push(`Missing Required Certification: ${mc}`);
      });
    }
  }

  return {
    revision,
    isEligible: failedReasons.length === 0,
    diagnostics,
    failedReasons,
    advisoryWarnings,
  };
}

export function evaluateCorpus(
  corpus: ProductRevision[],
  constraints: SpecFilterConstraints
): {
  approvedEvaluations: EligibilityEvaluation[];
  eligible: EligibilityEvaluation[];
  disqualified: EligibilityEvaluation[];
  ignoredSupersededCount: number;
  ignoredDraftCount: number;
} {
  const approvedRevisions = corpus.filter((r) => r.status === 'APPROVED');
  const ignoredSupersededCount = corpus.filter((r) => r.status === 'SUPERSEDED').length;
  const ignoredDraftCount = corpus.filter((r) => r.status === 'DRAFT').length;

  const approvedEvaluations = approvedRevisions.map((rev) =>
    evaluateRevisionEligibility(rev, constraints)
  );

  return {
    approvedEvaluations,
    eligible: approvedEvaluations.filter((e) => e.isEligible),
    disqualified: approvedEvaluations.filter((e) => !e.isEligible),
    ignoredSupersededCount,
    ignoredDraftCount,
  };
}

export function buildDeterministicSqlPreview(
  constraints: SpecFilterConstraints
): string {
  const predicates: string[] = [`status = 'APPROVED'`];

  if (constraints.outputVoltageV !== null) {
    predicates.push(`output_voltage_v = ${constraints.outputVoltageV}`);
  }
  if (constraints.minOutputPowerW !== null) {
    predicates.push(`output_power_w >= ${constraints.minOutputPowerW}`);
  }
  if (constraints.requiredInputVoltageV !== null) {
    predicates.push(
      `input_voltage_min_v <= ${constraints.requiredInputVoltageV} AND input_voltage_max_v >= ${constraints.requiredInputVoltageV}`
    );
  }
  if (constraints.targetAmbientTempC !== null) {
    predicates.push(
      `operating_temp_min_c <= ${constraints.targetAmbientTempC} AND operating_temp_max_c >= ${constraints.targetAmbientTempC}`
    );
  }
  if (constraints.minEfficiencyPct !== null) {
    predicates.push(`efficiency_pct >= ${constraints.minEfficiencyPct}`);
  }
  if (constraints.maxWidthMm !== null) {
    predicates.push(`width_mm <= ${constraints.maxWidthMm}`);
  }
  if (constraints.requiredCertifications.length > 0) {
    const escaped = constraints.requiredCertifications
      .map((c) => `'${c}'`)
      .join(', ');
    predicates.push(`certifications @> ARRAY[${escaped}]::text[]`);
  }

  return [
    `SELECT model_code, revision, output_power_w, efficiency_pct, width_mm,`,
    `       (CASE WHEN ${constraints.targetAmbientTempC ?? 25} > full_load_max_temp_c`,
    `             THEN 'AMBER_DERATING_ADVISORY' ELSE 'NOMINAL_100PCT_LOAD' END) AS thermal_status`,
    `FROM product_revisions`,
    `WHERE ${predicates.join('\n  AND ')}`,
    `ORDER BY efficiency_pct DESC, output_power_w DESC;`,
  ].join('\n');
}
