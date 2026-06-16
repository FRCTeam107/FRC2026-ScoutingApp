#!/usr/bin/env node
/**
 * Creates GitHub Issues for all 31 Playwright test cases.
 *
 * Prerequisites:
 *   1. GitHub CLI installed: https://cli.github.com/
 *   2. Authenticated: `gh auth login`
 *   3. Run from the repo root: `node scripts/create-test-issues.js`
 *
 * Each test becomes one GitHub Issue with:
 *   - Title matching the Playwright test name
 *   - Labels: test-case, suite:<name>, automated
 *   - Body describing the test steps and expected result
 *
 * Labels are created automatically if they don't exist.
 */

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';

// ── Label definitions ──────────────────────────────────────────────────────

const LABELS = [
  { name: 'test-case',            color: '0075ca', description: 'Playwright test case' },
  { name: 'automated',            color: '6366f1', description: 'Covered by automated Playwright test' },
  { name: 'suite:auth',           color: 'e11d48', description: 'Auth / Password Gate test suite' },
  { name: 'suite:fan-page',       color: 'f97316', description: 'Fan Page test suite' },
  { name: 'suite:role-select',    color: 'a855f7', description: 'Role Select Page test suite' },
  { name: 'suite:scouting-forms', color: '22c55e', description: 'Scouting Forms test suite' },
];

// ── Test case definitions (all 31 Playwright tests) ────────────────────────

const TEST_CASES = [
  // ── auth.spec.js ──────────────────────────────────────────────────────────
  {
    title: '[TEST] Auth: /scouting shows the password gate',
    suite: 'suite:auth',
    specFile: 'tests/auth.spec.js',
    specTest: 'Protected scouting routes > /scouting shows the password gate',
    description: 'Verify that navigating to /scouting without authentication shows the password gate.',
    steps: `1. Navigate to /scouting\n   Expected: "Enter Password" button or modal overlay is visible`,
    expected: 'The password gate (either button or open modal) is displayed.',
  },
  {
    title: '[TEST] Auth: /pit shows the password gate',
    suite: 'suite:auth',
    specFile: 'tests/auth.spec.js',
    specTest: 'Protected scouting routes > /pit shows the password gate',
    description: 'Verify that navigating to /pit without authentication shows the password gate.',
    steps: `1. Navigate to /pit\n   Expected: "Enter Password" button or modal overlay is visible`,
    expected: 'The password gate is displayed.',
  },
  {
    title: '[TEST] Auth: /match shows the password gate',
    suite: 'suite:auth',
    specFile: 'tests/auth.spec.js',
    specTest: 'Protected scouting routes > /match shows the password gate',
    description: 'Verify that navigating to /match without authentication shows the password gate.',
    steps: `1. Navigate to /match\n   Expected: "Enter Password" button or modal overlay is visible`,
    expected: 'The password gate is displayed.',
  },
  {
    title: '[TEST] Auth: /analytics shows the password gate',
    suite: 'suite:auth',
    specFile: 'tests/auth.spec.js',
    specTest: 'Protected scouting routes > /analytics shows the password gate',
    description: 'Verify that navigating to /analytics without authentication shows the password gate.',
    steps: `1. Navigate to /analytics\n   Expected: "Enter Password" button or modal overlay is visible`,
    expected: 'The password gate is displayed.',
  },
  {
    title: '[TEST] Auth: /drive shows the password gate',
    suite: 'suite:auth',
    specFile: 'tests/auth.spec.js',
    specTest: 'Protected scouting routes > /drive shows the password gate',
    description: 'Verify that navigating to /drive without authentication shows the password gate.',
    steps: `1. Navigate to /drive\n   Expected: "Enter Password" button or modal overlay is visible`,
    expected: 'The password gate is displayed.',
  },
  {
    title: '[TEST] Auth: /field shows the password gate',
    suite: 'suite:auth',
    specFile: 'tests/auth.spec.js',
    specTest: 'Protected scouting routes > /field shows the password gate',
    description: 'Verify that navigating to /field without authentication shows the password gate.',
    steps: `1. Navigate to /field\n   Expected: "Enter Password" button or modal overlay is visible`,
    expected: 'The password gate is displayed.',
  },
  {
    title: '[TEST] Auth: /admin shows the password gate',
    suite: 'suite:auth',
    specFile: 'tests/auth.spec.js',
    specTest: 'Protected scouting routes > /admin shows the password gate',
    description: 'Verify that navigating to /admin without authentication shows the password gate.',
    steps: `1. Navigate to /admin\n   Expected: "Enter Password" button or modal overlay is visible`,
    expected: 'The password gate is displayed.',
  },
  {
    title: '[TEST] Auth: password modal opens when "Enter Password" is clicked',
    suite: 'suite:auth',
    specFile: 'tests/auth.spec.js',
    specTest: 'Protected scouting routes > password modal opens when "Enter Password" is clicked',
    description: 'Verify the password modal opens when the user clicks "Enter Password" (if not already open).',
    steps: `1. Navigate to /scouting\n   Expected: Password gate is visible\n2. If modal is not already open, click "Enter Password"\n   Expected: .modal-content becomes visible`,
    expected: '.modal-content is visible.',
  },
  {
    title: '[TEST] Auth: password modal shows an error for a wrong password',
    suite: 'suite:auth',
    specFile: 'tests/auth.spec.js',
    specTest: 'Protected scouting routes > password modal shows an error for a wrong password',
    description: 'Verify that submitting an incorrect password displays an error message.',
    steps: `1. Navigate to /scouting and ensure modal is open\n   Expected: Password input is visible\n2. Type "wrongpassword" and click "Confirm"\n   Expected: .error element appears within 5 seconds`,
    expected: 'An error message is displayed inside the modal.',
  },
  {
    title: '[TEST] Auth: password modal closes when Cancel is clicked',
    suite: 'suite:auth',
    specFile: 'tests/auth.spec.js',
    specTest: 'Protected scouting routes > password modal closes when Cancel is clicked',
    description: 'Verify that clicking Cancel dismisses the password modal.',
    steps: `1. Navigate to /scouting and ensure modal is open\n   Expected: Modal is visible\n2. Click "Cancel"\n   Expected: .modal-content is no longer visible`,
    expected: '.modal-content is not visible after clicking Cancel.',
  },
  {
    title: '[TEST] Auth: header Fan View link is present on scouting pages',
    suite: 'suite:auth',
    specFile: 'tests/auth.spec.js',
    specTest: 'Protected scouting routes > header Fan View link is present on scouting pages',
    description: 'Verify the "Fan View" navigation link is visible in the header on protected routes.',
    steps: `1. Navigate to /scouting\n   Expected: "Fan View" link is visible in the header`,
    expected: 'A link labelled "Fan View" is visible.',
  },
  {
    title: '[TEST] Auth: Fan View link returns to /',
    suite: 'suite:auth',
    specFile: 'tests/auth.spec.js',
    specTest: 'Protected scouting routes > Fan View link returns to /',
    description: 'Verify that clicking the "Fan View" header link navigates back to the home page.',
    steps: `1. Navigate to /scouting\n   Expected: Password modal is open\n2. Click "Cancel" to dismiss the modal\n   Expected: Modal closes\n3. Click the "Fan View" header link\n   Expected: URL changes to /`,
    expected: 'URL is / after clicking Fan View.',
  },

  // ── fan-page.spec.js ──────────────────────────────────────────────────────
  {
    title: '[TEST] Fan Page: loads and shows the Team 107 header',
    suite: 'suite:fan-page',
    specFile: 'tests/fan-page.spec.js',
    specTest: 'Fan Page > loads and shows the Team 107 header',
    description: 'Verify the fan page renders the Team 107 Scouting logo link in the header.',
    steps: `1. Navigate to /\n   Expected: Link "Team 107 Scouting" is visible`,
    expected: '"Team 107 Scouting" header link is visible.',
  },
  {
    title: '[TEST] Fan Page: renders the fan page content area',
    suite: 'suite:fan-page',
    specFile: 'tests/fan-page.spec.js',
    specTest: 'Fan Page > renders the fan page content area',
    description: 'Verify the .fan-page content container is rendered.',
    steps: `1. Navigate to /\n   Expected: .fan-page element is visible`,
    expected: '.fan-page element is present and visible.',
  },
  {
    title: '[TEST] Fan Page: shows a Scouting nav link',
    suite: 'suite:fan-page',
    specFile: 'tests/fan-page.spec.js',
    specTest: 'Fan Page > shows a Scouting nav link',
    description: 'Verify the Scouting navigation link (🔬 Scouting) is shown on the fan page header.',
    steps: `1. Navigate to /\n   Expected: .scouting-nav-link element is visible`,
    expected: 'The scouting nav link is visible.',
  },
  {
    title: '[TEST] Fan Page: navigates to scouting area when Scouting link is clicked',
    suite: 'suite:fan-page',
    specFile: 'tests/fan-page.spec.js',
    specTest: 'Fan Page > navigates to scouting area when Scouting link is clicked',
    description: 'Verify clicking the Scouting nav link navigates to /scouting.',
    steps: `1. Navigate to /\n   Expected: Page loads\n2. Click .scouting-nav-link\n   Expected: URL matches /scouting`,
    expected: 'URL contains /scouting.',
  },
  {
    title: '[TEST] Fan Page: /fan redirects to /',
    suite: 'suite:fan-page',
    specFile: 'tests/fan-page.spec.js',
    specTest: 'Fan Page > /fan redirects to /',
    description: 'Verify navigating to /fan redirects to the root /.',
    steps: `1. Navigate to /fan\n   Expected: URL is /`,
    expected: 'URL is / after the redirect.',
  },

  // ── role-select.spec.js ───────────────────────────────────────────────────
  {
    title: '[TEST] Role Select: shows Team 107 heading',
    suite: 'suite:role-select',
    specFile: 'tests/role-select.spec.js',
    specTest: 'Role Select Page > shows Team 107 heading',
    description: 'Verify the "FRC Team 107" heading is displayed on the scouting home page.',
    steps: `1. Bypass auth, navigate to /scouting\n   Expected: "FRC Team 107" heading is visible`,
    expected: '"FRC Team 107" heading is visible.',
  },
  {
    title: '[TEST] Role Select: shows the 2026 season heading',
    suite: 'suite:role-select',
    specFile: 'tests/role-select.spec.js',
    specTest: 'Role Select Page > shows the 2026 season heading',
    description: 'Verify the 2026 season heading is displayed on the role select page.',
    steps: `1. Bypass auth, navigate to /scouting\n   Expected: A heading containing "2026" is visible`,
    expected: '2026 season heading is visible.',
  },
  {
    title: '[TEST] Role Select: shows the Load Event button when no event is loaded',
    suite: 'suite:role-select',
    specFile: 'tests/role-select.spec.js',
    specTest: 'Role Select Page > shows the Load Event button when no event is loaded',
    description: 'Verify the "Load Event" button is shown when no event is stored in localStorage.',
    steps: `1. Bypass auth, navigate to /scouting\n2. Clear current_event from localStorage and reload\n   Expected: "Load Event" button is visible`,
    expected: '"Load Event" button is visible.',
  },
  {
    title: '[TEST] Role Select: opens the event picker when Load Event is clicked',
    suite: 'suite:role-select',
    specFile: 'tests/role-select.spec.js',
    specTest: 'Role Select Page > opens the event picker modal when Load Event is clicked',
    description: 'Verify the event picker overlay appears after clicking "Load Event".',
    steps: `1. Bypass auth, navigate to /scouting, clear stored event\n2. Click "Load Event"\n   Expected: .epm-overlay is visible`,
    expected: '.epm-overlay (event picker) is visible.',
  },
  {
    title: '[TEST] Role Select: shows role navigation buttons',
    suite: 'suite:role-select',
    specFile: 'tests/role-select.spec.js',
    specTest: 'Role Select Page > shows role navigation buttons',
    description: 'Verify at least one role card/link is rendered on the role select page.',
    steps: `1. Bypass auth, navigate to /scouting\n   Expected: At least one link element is visible`,
    expected: 'One or more role links are visible.',
  },
  {
    title: '[TEST] Role Select: Switch Role link is absent on the scouting home page',
    suite: 'suite:role-select',
    specFile: 'tests/role-select.spec.js',
    specTest: 'Role Select Page > Switch Role link is absent on the scouting home page',
    description: 'Verify the "Switch Role" back-link is NOT shown on /scouting itself (only on sub-pages).',
    steps: `1. Bypass auth, navigate to /scouting\n   Expected: "Switch Role" link is NOT visible`,
    expected: '"Switch Role" link is not present.',
  },
  {
    title: '[TEST] Header Navigation: logo links back to /',
    suite: 'suite:role-select',
    specFile: 'tests/role-select.spec.js',
    specTest: 'Header navigation (authenticated) > logo links back to /',
    description: 'Verify clicking the "Team 107 Scouting" logo navigates back to the home page.',
    steps: `1. Bypass auth, navigate to /scouting\n2. Click "Team 107 Scouting" logo link\n   Expected: URL is /`,
    expected: 'URL is / after clicking the logo.',
  },

  // ── scouting-forms.spec.js ────────────────────────────────────────────────
  {
    title: '[TEST] Match Scout: renders the match scouting form',
    suite: 'suite:scouting-forms',
    specFile: 'tests/scouting-forms.spec.js',
    specTest: 'Match Scout Page > renders the match scouting form',
    description: 'Verify the .match-scout-page container is rendered on /match.',
    steps: `1. Bypass auth, navigate to /match\n   Expected: .match-scout-page is visible`,
    expected: '.match-scout-page element is visible.',
  },
  {
    title: '[TEST] Match Scout: shows Auto/Teleop stages (mode toggle)',
    suite: 'suite:scouting-forms',
    specFile: 'tests/scouting-forms.spec.js',
    specTest: 'Match Scout Page > shows a mode toggle (Auton / Teleop)',
    description: 'Verify the form advances to the Auto Period stage after entering a team number.',
    steps: `1. Bypass auth, navigate to /match\n2. Fill the first number input with "107"\n3. Click "Start Match →"\n   Expected: "Auto Period" heading is visible`,
    expected: '"Auto Period" heading is visible after starting.',
  },
  {
    title: '[TEST] Match Scout: shows the climb selector section',
    suite: 'suite:scouting-forms',
    specFile: 'tests/scouting-forms.spec.js',
    specTest: 'Match Scout Page > shows the climb selector section',
    description: 'Verify the .climb-selector element is visible after a match is started.',
    steps: `1. Bypass auth, navigate to /match\n2. Enter team "107", click "Start Match →"\n   Expected: .climb-selector is visible`,
    expected: '.climb-selector element is visible.',
  },
  {
    title: '[TEST] Match Scout: accuracy slider is present',
    suite: 'suite:scouting-forms',
    specFile: 'tests/scouting-forms.spec.js',
    specTest: 'Match Scout Page > accuracy slider is present',
    description: 'Verify an input[type="range"] accuracy slider is visible after a match is started.',
    steps: `1. Bypass auth, navigate to /match\n2. Enter team "107", click "Start Match →"\n   Expected: input[type="range"] is visible`,
    expected: 'Range slider (accuracy) is visible.',
  },
  {
    title: '[TEST] Match Scout: Switch Role header link is visible',
    suite: 'suite:scouting-forms',
    specFile: 'tests/scouting-forms.spec.js',
    specTest: 'Match Scout Page > Switch Role header link is visible',
    description: 'Verify the "Switch Role" back-link is shown in the header on /match.',
    steps: `1. Bypass auth, navigate to /match\n   Expected: "Switch Role" link is visible`,
    expected: '"Switch Role" link is visible.',
  },
  {
    title: '[TEST] Pit Scout: renders the pit scouting form',
    suite: 'suite:scouting-forms',
    specFile: 'tests/scouting-forms.spec.js',
    specTest: 'Pit Scout Page > renders the pit scouting form',
    description: 'Verify the .pit-scout-page container is rendered on /pit.',
    steps: `1. Bypass auth, navigate to /pit\n   Expected: .pit-scout-page is visible`,
    expected: '.pit-scout-page element is visible.',
  },
  {
    title: '[TEST] Pit Scout: Switch Role header link is visible',
    suite: 'suite:scouting-forms',
    specFile: 'tests/scouting-forms.spec.js',
    specTest: 'Pit Scout Page > Switch Role header link is visible',
    description: 'Verify the "Switch Role" back-link is shown in the header on /pit.',
    steps: `1. Bypass auth, navigate to /pit\n   Expected: "Switch Role" link is visible`,
    expected: '"Switch Role" link is visible.',
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function gh(args) {
  try {
    const result = execSync(`gh ${args}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return result.trim();
  } catch (e) {
    return null;
  }
}

function ensureLabels() {
  console.log('Creating labels...');
  for (const label of LABELS) {
    gh(`label create "${label.name}" --color "${label.color}" --description "${label.description}" --force`);
    console.log(`  ✓ ${label.name}`);
  }
}

function buildBody(tc) {
  return [
    `## Description`,
    tc.description,
    ``,
    `## Test Steps`,
    tc.steps,
    ``,
    `## Expected Result`,
    tc.expected,
    ``,
    `## Spec File`,
    `\`${tc.specFile}\``,
    ``,
    `**Test:** \`${tc.specTest}\``,
    ``,
    `---`,
    `*Automated via Playwright — do not edit steps manually.*`,
  ].join('\n');
}

function createIssues() {
  console.log(`\nCreating ${TEST_CASES.length} test case issues...\n`);
  let created = 0;
  let failed = 0;

  for (const tc of TEST_CASES) {
    const body = buildBody(tc);
    const bodyFile = `.tmp_issue_body_${Date.now()}.md`;

    // Write body to a temp file to avoid shell escaping issues
    writeFileSync(bodyFile, body, 'utf8');
    const url = gh(`issue create --title "${tc.title}" --type "Test Case" --label "test-case" --label "automated" --label "${tc.suite}" --body-file "${bodyFile}"`);
    try { unlinkSync(bodyFile); } catch { /* ignore */ }

    if (url) {
      console.log(`✓ ${tc.title}\n  ${url}`);
      created++;
    } else {
      console.error(`✗ Failed: ${tc.title}`);
      failed++;
    }
  }

  console.log(`\nDone. Created: ${created}  Failed: ${failed}`);
}

// ── Main ───────────────────────────────────────────────────────────────────

// Verify gh CLI is available
if (!gh('--version')) {
  console.error('ERROR: GitHub CLI (gh) is not installed or not in PATH.');
  console.error('Install it from https://cli.github.com/ then run: gh auth login');
  process.exit(1);
}

ensureLabels();
createIssues();
