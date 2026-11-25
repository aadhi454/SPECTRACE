import {
  EligibilityEvaluation,
  ProductRevision,
  SignOffAuditRecord,
} from '../types/spec';

export function downloadJsonDossier(
  auditRecord: SignOffAuditRecord,
  revision: ProductRevision,
  evaluation: EligibilityEvaluation
): void {
  const payload = {
    schemaVersion: 'SpecTrace-Audit-Dossier-v2.4',
    generatedAt: new Date().toISOString(),
    governancePolicy: 'PARSE_ONCE_FILTER_DETERMINISTICALLY_VERIFY_BY_CITATION',
    signOffRecord: auditRecord,
    verifiedProductRevision: {
      id: revision.id,
      modelCode: revision.modelCode,
      manufacturer: revision.manufacturer,
      series: revision.series,
      revision: revision.revision,
      status: revision.status,
      sourceFilename: revision.sourceFilename,
      parserPipeline: revision.parserPipeline,
      specs: revision.specs,
    },
    deterministicEligibilityProof: {
      isEligible: evaluation.isEligible,
      advisoryWarnings: evaluation.advisoryWarnings,
      failedReasons: evaluation.failedReasons,
      predicateDiagnostics: evaluation.diagnostics,
    },
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SpecTrace_Audit_${revision.modelCode}_Rev${revision.revision}_${auditRecord.projectReference.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadPrintableHtmlBrief(
  auditRecord: SignOffAuditRecord,
  revision: ProductRevision,
  evaluation: EligibilityEvaluation
): void {
  const diagRows = evaluation.diagnostics
    .map(
      (d) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #cbd5e1;font-weight:600;">${d.label}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #cbd5e1;font-family:monospace;">${d.expected}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #cbd5e1;font-family:monospace;">${d.actual}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #cbd5e1;font-family:monospace;color:${
          d.passed ? (d.warningNote ? '#b45309' : '#047857') : '#b91c1c'
        };font-weight:700;">
          ${d.passed ? (d.warningNote ? 'PASS (DERATING ADVISORY)' : 'PASS') : 'FAIL'}
        </td>
      </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>SpecTrace Engineering Sign-Off Brief — ${revision.modelCode} (Rev ${revision.revision})</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 32px;
      line-height: 1.45;
    }
    .header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    h1 { font-size: 20px; margin: 0 0 4px 0; }
    h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #94a3b8; padding-bottom: 4px; margin-top: 22px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
    th { text-align: left; background: #f1f5f9; padding: 8px 10px; border-bottom: 2px solid #cbd5e1; }
    .box { border: 1px solid #94a3b8; padding: 12px; background: #f8fafc; margin-top: 10px; font-size: 13px; }
    .warn { border: 1px solid #d97706; background: #fffbeb; color: #92400e; padding: 10px; margin-top: 10px; font-size: 13px; }
    @media print {
      body { margin: 12mm; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom:16px;padding:10px;background:#e0f2fe;border:1px solid #0284c7;font-size:13px;">
    <strong>Print-Ready Engineering Dossier:</strong> Use your browser's <code>Print &rarr; Save as PDF</code> command to archive this specification sheet.
  </div>
  <div class="header">
    <div>
      <h1>SPECTRACE — DETERMINISTIC SPECIFICATION SIGN-OFF DOSSIER</h1>
      <div class="mono" style="font-size:12px;color:#475569;">Audit ID: ${auditRecord.id} | Timestamp: ${auditRecord.timestamp}</div>
    </div>
    <div class="mono" style="text-align:right;font-size:12px;">
      <div><strong>Project Ref:</strong> ${auditRecord.projectReference}</div>
      <div><strong>Lead Engineer:</strong> ${auditRecord.engineerName}</div>
    </div>
  </div>

  <h2>1. Selected Approved Component & Revision Lineage</h2>
  <table>
    <tbody>
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;"><strong>Manufacturer / Model:</strong> ${revision.manufacturer} <span class="mono">${revision.modelCode}</span></td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;"><strong>Verified Revision:</strong> <span class="mono">Rev ${revision.revision} (${revision.status})</span></td>
      </tr>
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;"><strong>Source File:</strong> <span class="mono">${revision.sourceFilename}</span></td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;"><strong>Electrical Rating:</strong> <span class="mono">${revision.specs.outputVoltageV}V DC / ${revision.specs.outputCurrentA}A / ${revision.specs.outputPowerW}W (${revision.specs.efficiencyPct}% Eff.)</span></td>
      </tr>
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;"><strong>Thermal Envelope:</strong> <span class="mono">${revision.specs.operatingTempMinC}°C to +${revision.specs.operatingTempMaxC}°C (100% Load <= ${revision.specs.fullLoadMaxTempC}°C)</span></td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;"><strong>Certifications:</strong> <span class="mono">${revision.specs.certifications.join(', ')}</span></td>
      </tr>
    </tbody>
  </table>

  <h2>2. Deterministic SQL Constraint Verification Proof</h2>
  <table>
    <thead>
      <tr>
        <th>Parameter</th>
        <th>Customer Requirement</th>
        <th>Datasheet Value</th>
        <th>Deterministic Verdict</th>
      </tr>
    </thead>
    <tbody>
      ${diagRows}
    </tbody>
  </table>

  <h2>3. Thermal Derating & Installation Caveats [Cited: Page ${revision.specs.deratingPage}]</h2>
  <div class="warn">
    <strong>Mandatory Derating & Clearance Clause [${revision.modelCode} | Rev ${revision.revision} | Page ${revision.specs.deratingPage}]:</strong><br/>
    ${revision.specs.deratingSummary}
  </div>

  <h2>4. Human Engineering Verification Checklist & Sign-Off</h2>
  <div class="box">
    <div>[✓] Verified output power after ambient temperature derating curve</div>
    <div>[✓] Confirmed input voltage range, peak inrush, and DIN-rail mounting clearances</div>
    <div>[✓] Verified mandatory regional/industry safety certifications</div>
    <div>[✓] Confirmed datasheet revision is current APPROVED version (non-superseded)</div>
    <hr style="border:none;border-top:1px solid #cbd5e1;margin:10px 0;" />
    <div><strong>Engineering Suitability Notes:</strong> ${auditRecord.engineeringNotes || 'Verified compliant with panel build specification.'}</div>
    <div class="mono" style="margin-top:8px;font-size:12px;"><strong>Cited Evidence Anchors:</strong> ${auditRecord.citedPages.map((c) => `[${c.modelCode} | Rev ${c.revision} | Page ${c.page}]`).join(' ')}</div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SpecTrace_Brief_${revision.modelCode}_Rev${revision.revision}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
