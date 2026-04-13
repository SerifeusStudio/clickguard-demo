/**
 * main.js — Click Fraud Intelligence Lab
 *
 * Renders the scenario gallery, handles selection, and renders the
 * rule-based vs LLM-powered comparison view.
 *
 * Deliberately plain JavaScript (no framework, no build step) so the
 * entire tool is one HTML file, three JS modules, and one CSS file.
 * Anyone inspecting the code can read it top to bottom in 10 minutes.
 */

import { SCENARIOS } from './scenarios.js';
import { ANALYZERS } from './analyzers.js';

const ICONS = {
  BLOCK: '■',
  FLAG: '▲',
  ALLOW: '●',
};

const VERDICT_CLASSES = {
  BLOCK: 'verdict-block',
  FLAG: 'verdict-flag',
  ALLOW: 'verdict-allow',
};

//─────────────────────────────────────────────────────────────────────────
// Render the scenario gallery
//─────────────────────────────────────────────────────────────────────────

function renderGallery() {
  const gallery = document.getElementById('gallery');
  gallery.innerHTML = SCENARIOS.map((s) => {
    const analyzers = ANALYZERS[s.id];
    const ruleVerdict = analyzers.rule.verdict;
    const llmVerdict = analyzers.llm.verdict;
    const matchClass = ruleVerdict === llmVerdict ? 'match-agree' : 'match-disagree';
    const matchLabel = ruleVerdict === llmVerdict ? 'agreement' : 'disagreement';

    return `
      <button class="card" data-scenario-id="${s.id}">
        <div class="card-header">
          <span class="card-num">${String(s.index).padStart(2, '0')}</span>
          <span class="card-match ${matchClass}">${matchLabel}</span>
        </div>
        <h3 class="card-title">${escape(s.name)}</h3>
        <p class="card-subtitle">${escape(s.subtitle)}</p>
        <p class="card-teaser">${escape(s.teaser)}</p>
        <div class="card-verdicts">
          <div class="mini-verdict">
            <span class="mini-verdict-label">rules</span>
            <span class="mini-verdict-value ${VERDICT_CLASSES[ruleVerdict]}">${ICONS[ruleVerdict]} ${ruleVerdict}</span>
          </div>
          <div class="mini-verdict">
            <span class="mini-verdict-label">llm</span>
            <span class="mini-verdict-value ${VERDICT_CLASSES[llmVerdict]}">${ICONS[llmVerdict]} ${llmVerdict}</span>
          </div>
        </div>
      </button>
    `;
  }).join('');

  gallery.querySelectorAll('.card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-scenario-id');
      selectScenario(id);
    });
  });
}

//─────────────────────────────────────────────────────────────────────────
// Select a scenario, render the comparison view
//─────────────────────────────────────────────────────────────────────────

function selectScenario(id) {
  const scenario = SCENARIOS.find((s) => s.id === id);
  const analyzers = ANALYZERS[id];
  if (!scenario || !analyzers) return;

  // Highlight the selected card
  document.querySelectorAll('.card').forEach((c) => {
    c.classList.toggle('card-active', c.getAttribute('data-scenario-id') === id);
  });

  const panel = document.getElementById('detail');
  panel.innerHTML = `
    <div class="detail-header">
      <div class="detail-eyebrow">Scenario ${String(scenario.index).padStart(2, '0')}</div>
      <h2 class="detail-title">${escape(scenario.name)}</h2>
      <p class="detail-subtitle">${escape(scenario.subtitle)}</p>
    </div>

    <div class="detail-section">
      <h3 class="section-label">Click data received by the detection pipeline</h3>
      <pre class="json-block"><code>${escape(JSON.stringify(scenario.data, null, 2))}</code></pre>
    </div>

    <div class="detail-section">
      <h3 class="section-label">Detector comparison</h3>
      <div class="compare-grid">
        ${renderRuleColumn(analyzers.rule)}
        ${renderLlmColumn(analyzers.llm)}
      </div>
    </div>

    <div class="detail-section">
      <div class="truth-banner">
        <div class="truth-label">Ground truth</div>
        <div class="truth-verdict ${scenario.truth.verdict === 'fraud' ? 'truth-fraud' : 'truth-legit'}">
          ${scenario.truth.verdict === 'fraud' ? '✗ FRAUD' : '✓ LEGITIMATE'}
        </div>
        <div class="truth-title">${escape(scenario.truth.label)}</div>
        <p class="truth-summary">${escape(scenario.truth.summary)}</p>
      </div>
    </div>

    ${renderScorecard(scenario, analyzers)}
  `;

  // Smooth scroll into view on mobile
  if (window.innerWidth < 960) {
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function renderRuleColumn(rule) {
  const signalsHtml = rule.signals_fired.map((sig) => {
    const severityClass = `severity-${sig.severity}`;
    return `
      <div class="signal-row">
        <div class="signal-name">${escape(sig.rule)}</div>
        <div class="signal-detail">
          <span class="signal-threshold">${escape(sig.threshold)}</span>
          <span class="signal-arrow">→</span>
          <span class="signal-actual">${escape(sig.actual)}</span>
        </div>
        <div class="signal-severity ${severityClass}">${sig.severity}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="column column-rule">
      <div class="column-header">
        <div class="column-kicker">Rule-based detector</div>
        <div class="column-desc">Static rules, threshold-based, evaluates each session in isolation</div>
      </div>
      <div class="column-verdict">
        <div class="verdict-main ${VERDICT_CLASSES[rule.verdict]}">
          ${ICONS[rule.verdict]} ${rule.verdict}
        </div>
        <div class="verdict-meta">
          <div><span>risk</span><strong>${rule.risk}/100</strong></div>
          <div><span>confidence</span><strong>${rule.confidence}%</strong></div>
        </div>
      </div>
      <div class="column-section">
        <div class="column-section-label">Signals fired</div>
        <div class="signal-list">${signalsHtml}</div>
      </div>
      <div class="column-section">
        <div class="column-section-label">Reasoning</div>
        <p class="column-reasoning">${escape(rule.explanation)}</p>
      </div>
    </div>
  `;
}

function renderLlmColumn(llm) {
  const signalsHtml = llm.signals_read.map((sig) => `<li>${escape(sig)}</li>`).join('');

  return `
    <div class="column column-llm">
      <div class="column-header">
        <div class="column-kicker">LLM-powered detector</div>
        <div class="column-desc">Behavioral reasoning, cross-session correlation, context-aware</div>
      </div>
      <div class="column-verdict">
        <div class="verdict-main ${VERDICT_CLASSES[llm.verdict]}">
          ${ICONS[llm.verdict]} ${llm.verdict}
        </div>
        <div class="verdict-meta">
          <div><span>risk</span><strong>${llm.risk}/100</strong></div>
          <div><span>confidence</span><strong>${llm.confidence}%</strong></div>
        </div>
      </div>
      <div class="column-section">
        <div class="column-section-label">Signals read</div>
        <ul class="llm-signals">${signalsHtml}</ul>
      </div>
      <div class="column-section">
        <div class="column-section-label">Reasoning</div>
        <p class="column-reasoning">${escape(llm.explanation)}</p>
      </div>
      <div class="column-section column-value-add">
        <div class="column-section-label">Why the LLM layer matters here</div>
        <p class="column-reasoning">${escape(llm.value_add)}</p>
      </div>
    </div>
  `;
}

function renderScorecard(scenario, analyzers) {
  const truthVerdict = scenario.truth.verdict; // 'fraud' | 'legitimate'
  const ruleCorrect = isVerdictCorrect(analyzers.rule.verdict, truthVerdict);
  const llmCorrect = isVerdictCorrect(analyzers.llm.verdict, truthVerdict);

  const ruleIcon = ruleCorrect ? '✓' : '✗';
  const llmIcon = llmCorrect ? '✓' : '✗';
  const ruleClass = ruleCorrect ? 'score-correct' : 'score-wrong';
  const llmClass = llmCorrect ? 'score-correct' : 'score-wrong';

  return `
    <div class="detail-section">
      <h3 class="section-label">Scorecard</h3>
      <div class="scorecard">
        <div class="score-row ${ruleClass}">
          <span class="score-icon">${ruleIcon}</span>
          <span class="score-label">Rule-based detector</span>
          <span class="score-result">${ruleCorrect ? 'got it right' : 'got it wrong'}</span>
        </div>
        <div class="score-row ${llmClass}">
          <span class="score-icon">${llmIcon}</span>
          <span class="score-label">LLM-powered detector</span>
          <span class="score-result">${llmCorrect ? 'got it right' : 'got it wrong'}</span>
        </div>
      </div>
    </div>
  `;
}

function isVerdictCorrect(verdict, truth) {
  if (truth === 'fraud') {
    // BLOCK or FLAG = correct for fraud; ALLOW = wrong
    return verdict === 'BLOCK' || verdict === 'FLAG';
  } else {
    // ALLOW = correct for legitimate; anything else = wrong
    return verdict === 'ALLOW';
  }
}

//─────────────────────────────────────────────────────────────────────────
// Utility: escape HTML
//─────────────────────────────────────────────────────────────────────────

function escape(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

//─────────────────────────────────────────────────────────────────────────
// Boot
//─────────────────────────────────────────────────────────────────────────

function boot() {
  renderGallery();
  // Auto-select first scenario so the panel isn't empty on load
  selectScenario(SCENARIOS[0].id);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
