#!/usr/bin/env node
/**
 * Reads Playwright JSON results and posts a PR comment with a test summary
 * table that links each test to its corresponding GitHub Issue.
 *
 * Usage (called automatically by the CI workflow):
 *   node scripts/post-test-results.js
 *
 * Required env vars (set by GitHub Actions):
 *   GH_TOKEN       — GitHub token with repo write access
 *   PR_NUMBER      — Pull request number to comment on
 *   GITHUB_REPOSITORY — e.g. "FRCTeam107/FRC2026-ScoutingApp"
 */

import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';

const RESULTS_FILE = 'playwright-results.json';
const REPO = process.env.GITHUB_REPOSITORY ?? 'FRCTeam107/FRC2026-ScoutingApp';
const PR_NUMBER = process.env.PR_NUMBER;

// ── GitHub CLI helper ──────────────────────────────────────────────────────

function gh(args) {
  try {
    return execSync(`gh ${args}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

// ── Build specTest → issueNumber map from GitHub Issues ───────────────────
//
// Each issue body contains a line:  **Test:** `describe > test title`
// We fetch all test-case issues and parse that line to build the map.

function buildIssueMap() {
  console.log('Fetching test-case issues from GitHub...');
  const raw = gh(`issue list --repo ${REPO} --label test-case --limit 100 --json number,body`);
  if (!raw) {
    console.warn('  Warning: could not fetch issues — issue links will be omitted.');
    return {};
  }

  const issues = JSON.parse(raw);
  const map = {};
  for (const issue of issues) {
    const match = issue.body?.match(/\*\*Test:\*\*\s+`([^`]+)`/);
    if (match) {
      map[match[1]] = issue.number;
    }
  }
  console.log(`  Mapped ${Object.keys(map).length} issues.`);
  return map;
}

// ── Flatten the Playwright JSON results tree into a flat list ─────────────
//
// JSON structure:
//   suites[]              ← files  (have a `.file` property)
//     suites[]            ← describe blocks
//       specs[]           ← individual tests
//
// We skip the file-level title when building the full test name so it
// matches the format used in GitHub Issue bodies: "Describe > test title"

function collectTests(suites, contextTitle = '') {
  const results = [];
  for (const suite of (suites ?? [])) {
    const isFileLevel = 'file' in suite;
    const title = isFileLevel
      ? contextTitle
      : (contextTitle ? `${contextTitle} > ${suite.title}` : suite.title);

    results.push(...collectTests(suite.suites, title));

    for (const spec of (suite.specs ?? [])) {
      const fullTitle = title ? `${title} > ${spec.title}` : spec.title;
      results.push({ fullTitle, status: spec.ok ? 'passed' : 'failed' });
    }
  }
  return results;
}

// ── Post a single comment on a GitHub Issue ───────────────────────────────

function postIssueComment(issueNumber, commentBody) {
  const bodyFile = `.tmp_issue_comment_${Date.now()}.md`;
  writeFileSync(bodyFile, commentBody, 'utf8');
  try {
    return gh(`issue comment ${issueNumber} --repo ${REPO} --body-file "${bodyFile}"`);
  } finally {
    try { unlinkSync(bodyFile); } catch { /* ignore */ }
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

function main() {
  // 1. Read Playwright JSON results
  let report;
  try {
    report = JSON.parse(readFileSync(RESULTS_FILE, 'utf8'));
  } catch (e) {
    console.error(`Could not read ${RESULTS_FILE}: ${e.message}`);
    process.exit(1);
  }

  // 2. Fetch issue map from GitHub
  const issueMap = buildIssueMap();

  // 3. Flatten tests
  const tests = collectTests(report.suites);
  const passed = tests.filter(t => t.status === 'passed').length;
  const failed = tests.filter(t => t.status === 'failed').length;

  // Build run URL for linking back to the CI run
  const runId = process.env.GITHUB_RUN_ID;
  const serverUrl = process.env.GITHUB_SERVER_URL ?? 'https://github.com';
  const runUrl = runId ? `${serverUrl}/${REPO}/actions/runs/${runId}` : null;
  const runLink = runUrl ? `[Run #${runId}](${runUrl})` : 'local run';
  const today = new Date().toISOString().split('T')[0];

  // 4. Post a trend comment on each individual issue
  console.log('\nPosting trend comments on issues...');
  for (const test of tests) {
    const num = issueMap[test.fullTitle];
    if (!num) continue;
    const icon = test.status === 'passed' ? '✅' : '❌';
    const verb = test.status === 'passed' ? 'Passed' : 'Failed';
    const comment = `${icon} **${verb}** — ${runLink} — ${today}`;
    const result = postIssueComment(num, comment);
    console.log(`  ${icon} #${num} ${result ? '✓' : '(failed to post)'}`);
  }

  // 5. Build PR summary comment body
  const icon = (s) => s === 'passed' ? '✅' : '❌';
  const rows = tests.map(t => {
    const num = issueMap[t.fullTitle];
    const issueLink = num
      ? `[#${num}](https://github.com/${REPO}/issues/${num})`
      : '—';
    return `| ${icon(t.status)} | ${t.fullTitle} | ${issueLink} |`;
  });

  const summary = failed === 0
    ? `✅ **All ${tests.length} tests passed**`
    : `❌ **${failed} of ${tests.length} tests failed**`;

  const prBody = [
    `## 🎭 Playwright Test Results`,
    ``,
    summary,
    ``,
    `| | Test | Issue |`,
    `|:---:|---|:---:|`,
    ...rows,
    ``,
    `*${runLink} • ${today}*`,
  ].join('\n');

  // 6. Post as a PR comment (only in PR context)
  if (!PR_NUMBER) {
    console.log('\nNo PR_NUMBER — skipping PR summary comment (direct push to main).');
    return;
  }

  const bodyFile = `.tmp_pr_comment_${Date.now()}.md`;
  writeFileSync(bodyFile, prBody, 'utf8');
  try {
    const result = gh(`pr comment ${PR_NUMBER} --repo ${REPO} --body-file "${bodyFile}"`);
    if (result !== null) {
      console.log(`\n✓ Posted summary to PR #${PR_NUMBER}`);
    } else {
      console.warn('\nCould not post PR comment — printing body instead:\n');
      console.log(prBody);
    }
  } finally {
    try { unlinkSync(bodyFile); } catch { /* ignore */ }
  }
}

main();
