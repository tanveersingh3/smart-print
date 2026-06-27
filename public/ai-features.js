/**
 * Smart Print — AI Features Client Module
 * Drop this script into student.html and operator.html.
 * It attaches UI components for all 5 AI features.
 *
 * Expects a <div id="ai-panel"> placeholder in the page,
 * and a global BASE_URL = '' (or Railway domain).
 */

const BASE_URL = window.BASE_URL || '';

// ─────────────────────────────────────────────
// UTIL: show a toast notification
// ─────────────────────────────────────────────
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `sp-toast sp-toast--${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('sp-toast--visible'), 10);
  setTimeout(() => { el.classList.remove('sp-toast--visible'); setTimeout(() => el.remove(), 300); }, 3500);
}

// ─────────────────────────────────────────────
// FEATURE 1: AI Print Assistant
// Call after file is chosen; patches print settings form.
// ─────────────────────────────────────────────
async function runAIAssistant(fileInput, formFields) {
  if (!fileInput.files[0]) return;

  const btn = document.getElementById('btn-ai-assist');
  if (btn) { btn.disabled = true; btn.textContent = '🤖 Analysing…'; }

  const fd = new FormData();
  fd.append('file', fileInput.files[0]);

  try {
    const res = await fetch(`${BASE_URL}/api/ai/analyze`, { method: 'POST', body: fd });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    const r = data.recommendation;

    // Auto-fill form fields if provided
    if (formFields) {
      if (formFields.color) formFields.color.value = r.colorMode;
      if (formFields.sides) formFields.sides.value = r.sides;
      if (formFields.copies) formFields.copies.value = r.copies;
    }

    // Render recommendation card
    const panel = document.getElementById('ai-assist-result');
    if (panel) {
      panel.innerHTML = `
        <div class="ai-card">
          <h3>🤖 AI Recommendation</h3>
          <p class="doc-type">Detected: <strong>${r.documentType}</strong></p>
          <table class="ai-table">
            <tr><td>Colour Mode</td><td><strong>${r.colorMode.toUpperCase()}</strong></td><td class="reason">${r.reasoning.colorMode}</td></tr>
            <tr><td>Orientation</td><td><strong>${r.orientation}</strong></td><td class="reason">${r.reasoning.orientation}</td></tr>
            <tr><td>Sides</td><td><strong>${r.sides}-sided</strong></td><td class="reason">${r.reasoning.sides}</td></tr>
          </table>
          ${r.costTip ? `<p class="cost-tip">💡 ${r.costTip}</p>` : ''}
          ${r.warning ? `<p class="ai-warning">⚠️ ${r.warning}</p>` : ''}
          <p class="applied-note">Settings have been applied to the form. You can still change them.</p>
        </div>`;
    }
  } catch (e) {
    toast('AI analysis failed: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🤖 Get AI Recommendation'; }
  }
}

// ─────────────────────────────────────────────
// FEATURE 2: OCR & Image Enhancement
// ─────────────────────────────────────────────
async function runOCR(fileInput) {
  if (!fileInput.files[0]) { toast('Please select an image file first.', 'warning'); return; }

  const ext = fileInput.files[0].name.split('.').pop().toLowerCase();
  if (!['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
    toast('OCR only works on image files (JPG, PNG, WEBP)', 'warning');
    return;
  }

  const btn = document.getElementById('btn-ocr');
  if (btn) { btn.disabled = true; btn.textContent = '🔍 Extracting text…'; }

  const fd = new FormData();
  fd.append('file', fileInput.files[0]);

  try {
    const res = await fetch(`${BASE_URL}/api/ai/ocr`, { method: 'POST', body: fd });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    const panel = document.getElementById('ocr-result');
    if (panel) {
      const issueList = data.qualityIssues.length
        ? `<ul>${data.qualityIssues.map(i => `<li>⚠️ ${i}</li>`).join('')}</ul>`
        : '<p>✅ No quality issues detected</p>';

      panel.innerHTML = `
        <div class="ai-card">
          <h3>🔍 OCR Result</h3>
          <div class="ocr-meta">
            <span>Orientation: <strong>${data.detectedOrientation}</strong></span>
            <span>Confidence: <strong>${data.confidence}</strong></span>
            <span>Handwriting: <strong>${data.hasHandwriting ? 'Yes' : 'No'}</strong></span>
            <span>Print Ready: <strong>${data.printReady ? '✅ Yes' : '❌ No'}</strong></span>
          </div>
          <h4>Extracted Text:</h4>
          <textarea class="ocr-text" readonly>${data.extractedText || '(No text found)'}</textarea>
          <h4>Quality Issues:</h4>
          ${issueList}
          ${data.suggestedFixes.length ? `<h4>Suggestions:</h4><ul>${data.suggestedFixes.map(f => `<li>💡 ${f}</li>`).join('')}</ul>` : ''}
        </div>`;
    }
  } catch (e) {
    toast('OCR failed: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🔍 Extract Text (OCR)'; }
  }
}

// ─────────────────────────────────────────────
// FEATURE 3: AI Print Preview Check
// ─────────────────────────────────────────────
async function runPreviewCheck(fileInput, colorVal, sidesVal, copiesVal) {
  if (!fileInput.files[0]) { toast('Please select a file first.', 'warning'); return; }

  const btn = document.getElementById('btn-preview');
  if (btn) { btn.disabled = true; btn.textContent = '🖼 Checking…'; }

  const fd = new FormData();
  fd.append('file', fileInput.files[0]);
  fd.append('color', colorVal || 'bw');
  fd.append('sides', sidesVal || 'single');
  fd.append('copies', copiesVal || '1');

  try {
    const res = await fetch(`${BASE_URL}/api/ai/preview-check`, { method: 'POST', body: fd });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    const scoreColor = data.overallScore === 'good' ? '#22c55e' : data.overallScore === 'fair' ? '#f59e0b' : '#ef4444';

    const panel = document.getElementById('preview-result');
    if (panel) {
      panel.innerHTML = `
        <div class="ai-card">
          <h3>🖼 Print Preview Check</h3>
          <p class="score-badge" style="color:${scoreColor}">Overall: <strong>${data.overallScore.toUpperCase()}</strong></p>
          ${data.issues.length ? `<h4>Issues Found:</h4><ul>${data.issues.map(i => `<li>❌ ${i}</li>`).join('')}</ul>` : '<p>✅ No critical issues detected</p>'}
          ${data.warnings.length ? `<h4>Warnings:</h4><ul>${data.warnings.map(w => `<li>⚠️ ${w}</li>`).join('')}</ul>` : ''}
          ${data.previewNotes.length ? `<h4>What to Expect:</h4><ul>${data.previewNotes.map(n => `<li>📄 ${n}</li>`).join('')}</ul>` : ''}
          ${data.resolution ? `<p>Resolution: <strong>${data.resolution}</strong></p>` : ''}
          ${data.willLookGoodBW === false ? '<p class="ai-warning">⚠️ This document may not look good in black & white — consider colour printing.</p>' : ''}
        </div>`;
    }
  } catch (e) {
    toast('Preview check failed: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🖼 Check Print Preview'; }
  }
}

// ─────────────────────────────────────────────
// FEATURE 4: Merchant Analytics (operator page)
// ─────────────────────────────────────────────
async function loadAnalytics(range = '7') {
  const panel = document.getElementById('analytics-panel');
  if (!panel) return;

  panel.innerHTML = '<p class="loading">⏳ Loading analytics…</p>';

  try {
    const res = await fetch(`${BASE_URL}/api/analytics?range=${range}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    const s = data.stats;
    panel.innerHTML = `
      <div class="ai-card analytics-card">
        <h3>📊 Analytics — ${s.period}</h3>
        <p class="ai-summary">${data.aiSummary}</p>
        <div class="stats-grid">
          <div class="stat-box"><span class="stat-num">${s.totalJobs}</span><span class="stat-label">Total Jobs</span></div>
          <div class="stat-box"><span class="stat-num">${s.totalPages}</span><span class="stat-label">Pages Printed</span></div>
          <div class="stat-box"><span class="stat-num">${s.completedJobs}</span><span class="stat-label">Completed</span></div>
          <div class="stat-box"><span class="stat-num">${s.urgentJobs}</span><span class="stat-label">Urgent</span></div>
          <div class="stat-box"><span class="stat-num">${s.colorJobs}</span><span class="stat-label">Colour Jobs</span></div>
          <div class="stat-box"><span class="stat-num">${s.bwJobs}</span><span class="stat-label">B&W Jobs</span></div>
          <div class="stat-box"><span class="stat-num">${s.paidJobs}</span><span class="stat-label">Paid</span></div>
          <div class="stat-box"><span class="stat-num">${s.unpaidJobs}</span><span class="stat-label">Unpaid</span></div>
        </div>
        <p class="stat-detail">Avg Copies/Job: <strong>${s.avgCopies}</strong> &nbsp;|&nbsp; Peak Hour: <strong>${s.peakHour}</strong> &nbsp;|&nbsp; ${s.colorVsBwRatio}</p>
        <div class="range-btns">
          <button onclick="loadAnalytics('1')" class="range-btn ${range==='1'?'active':''}">Today</button>
          <button onclick="loadAnalytics('7')" class="range-btn ${range==='7'?'active':''}">7 Days</button>
          <button onclick="loadAnalytics('30')" class="range-btn ${range==='30'?'active':''}">30 Days</button>
        </div>
      </div>`;
  } catch (e) {
    panel.innerHTML = `<p class="error">Failed to load analytics: ${e.message}</p>`;
  }
}

// ─────────────────────────────────────────────
// FEATURE 5: Natural Language Print Requests
// ─────────────────────────────────────────────
async function parseNLRequest(formFields) {
  const input = document.getElementById('nlp-input');
  if (!input || !input.value.trim()) { toast('Type a print request first.', 'warning'); return; }

  const btn = document.getElementById('btn-nlp');
  if (btn) { btn.disabled = true; btn.textContent = '⚙️ Parsing…'; }

  try {
    const res = await fetch(`${BASE_URL}/api/ai/parse-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: input.value.trim() })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    const s = data.settings;

    // Apply to form
    if (formFields) {
      if (formFields.color) formFields.color.value = s.color;
      if (formFields.sides) formFields.sides.value = s.sides;
      if (formFields.copies) formFields.copies.value = s.copies;
    }

    const panel = document.getElementById('nlp-result');
    if (panel) {
      panel.innerHTML = `
        <div class="ai-card">
          <p class="understood">✅ <strong>Understood:</strong> ${s.understood}</p>
          <div class="nlp-settings">
            <span>🎨 ${s.color.toUpperCase()}</span>
            <span>📄 ${s.sides}-sided</span>
            <span>🔢 ${s.copies} cop${s.copies > 1 ? 'ies' : 'y'}</span>
            ${s.urgent ? '<span>🚨 Urgent</span>' : ''}
          </div>
          ${s.missingInfo.length ? `<p class="missing">You might also want to specify: ${s.missingInfo.join(', ')}</p>` : ''}
          <p class="confidence-note">Confidence: <strong>${s.confidence}</strong></p>
        </div>`;
    }
  } catch (e) {
    toast('Could not parse request: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '⚙️ Apply Settings'; }
  }
}

// ─────────────────────────────────────────────
// SHARED CSS (injected once)
// ─────────────────────────────────────────────
(function injectStyles() {
  if (document.getElementById('sp-ai-styles')) return;
  const style = document.createElement('style');
  style.id = 'sp-ai-styles';
  style.textContent = `
    .ai-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; margin: 12px 0; }
    .ai-card h3 { margin: 0 0 12px; font-size: 15px; color: #1e293b; }
    .ai-card h4 { margin: 10px 0 4px; font-size: 13px; color: #475569; }
    .ai-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .ai-table td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
    .ai-table .reason { color: #64748b; font-size: 12px; }
    .doc-type { font-size: 13px; color: #334155; margin-bottom: 10px; }
    .cost-tip { background: #f0fdf4; border-left: 3px solid #22c55e; padding: 8px 12px; font-size: 13px; color: #166534; margin-top: 10px; }
    .ai-warning { background: #fff7ed; border-left: 3px solid #f97316; padding: 8px 12px; font-size: 13px; color: #9a3412; margin-top: 8px; }
    .applied-note { font-size: 12px; color: #64748b; margin-top: 8px; font-style: italic; }
    .ocr-meta { display: flex; gap: 16px; flex-wrap: wrap; font-size: 13px; margin-bottom: 8px; }
    .ocr-text { width: 100%; height: 120px; font-size: 12px; font-family: monospace; resize: vertical; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; }
    .score-badge { font-size: 16px; margin: 4px 0 10px; }
    .ai-summary { font-size: 13px; color: #334155; line-height: 1.6; background: #eff6ff; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 12px 0; }
    .stat-box { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
    .stat-num { display: block; font-size: 24px; font-weight: 700; color: #1e293b; }
    .stat-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-detail { font-size: 12px; color: #64748b; margin-top: 8px; }
    .range-btns { display: flex; gap: 8px; margin-top: 12px; }
    .range-btn { padding: 5px 14px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; cursor: pointer; font-size: 13px; }
    .range-btn.active { background: #3b82f6; color: #fff; border-color: #3b82f6; }
    .nlp-input-row { display: flex; gap: 8px; align-items: center; margin: 8px 0; }
    .nlp-input-row input { flex: 1; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; }
    .understood { font-size: 13px; color: #166534; margin-bottom: 8px; }
    .nlp-settings { display: flex; gap: 10px; flex-wrap: wrap; margin: 8px 0; }
    .nlp-settings span { background: #dbeafe; color: #1d4ed8; padding: 4px 10px; border-radius: 20px; font-size: 13px; }
    .missing { font-size: 12px; color: #92400e; background: #fef3c7; padding: 6px 10px; border-radius: 6px; }
    .confidence-note { font-size: 12px; color: #64748b; margin-top: 6px; }
    .sp-toast { position: fixed; bottom: 24px; right: 24px; background: #1e293b; color: #fff; padding: 12px 20px; border-radius: 10px; font-size: 14px; opacity: 0; transform: translateY(10px); transition: all 0.25s; z-index: 9999; max-width: 320px; }
    .sp-toast--visible { opacity: 1; transform: translateY(0); }
    .sp-toast--error { background: #dc2626; }
    .sp-toast--warning { background: #d97706; }
    .loading { color: #64748b; font-size: 13px; padding: 12px; }
    @media (max-width: 600px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } .ocr-meta { flex-direction: column; gap: 4px; } }
  `;
  document.head.appendChild(style);
})();
