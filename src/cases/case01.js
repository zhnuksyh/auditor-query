// @ts-check
/**
 * CASE 01 — "THE LEAVER"
 *
 * The tutorial engagement. A quarterly access review at Kestrel Freight passed
 * clean, then the payroll export walked out of the building on a Sunday. The
 * control under test is deprovisioning: when someone leaves, their access is
 * supposed to be revoked within one working day.
 *
 * The player must:
 *   1. Read the leavers table to find who left and when.
 *   2. Join it to accounts to see which of those accounts is still enabled.
 *   3. Check sessions to find which live account was actually USED after its
 *      owner's last day — that use is the exception, not the mere existence.
 *   4. Read the system that account reaches (payroll) and the review that
 *      signed it off anyway.
 *
 * Deductive shape: three people left in the period, and two of them still have
 * an enabled account — leaving alone does not convict. Only one of those two
 * shows a session after their last day. The intersection of "left", "still
 * enabled" and "used since" is a single account.
 *
 * The tutorial gets a gentler ladder than later cases (WHERE + a single JOIN),
 * but the answer still requires combining two tables, never one filter.
 */

/** @type {import('../types.js').PlayableCase} */
export const case01 = {
  id: 'case_01',
  code: 'CODE_01',
  tag: 'ACCESS',
  title: 'The Leaver',
  teaser:
    'Three people left in March. The access review passed clean. On a Sunday in April, someone pulled the payroll export — and every one of them had already handed back their laptop.',
  folderTheme: 'access', // maps to paper.access tone
  locked: false,

  // This case doubles as the tutorial. Each step pops an assist card; a step
  // with `tab` auto-switches the player to that tab and anchors the card there.
  tutorial: [
    {
      tab: 'scene',
      title: 'Welcome to Internal Audit',
      body: 'You test controls by querying the records with SQL — no guessing. Work left to right through the four tabs. Let’s walk through this engagement.',
    },
    {
      tab: 'scene',
      title: '1 · Scope',
      body: 'Read the memo carefully. It names the control being tested and states every fact you’ll need — who left, what the control promises, and what happened anyway.',
    },
    {
      tab: 'board',
      title: '2 · Data Map',
      body: 'These are the tables you’ve been given, with their columns. Dotted lines are foreign keys — they show how tables connect (e.g. accounts.person_id → people.id).',
    },
    {
      tab: 'analysis',
      title: '3 · Analysis',
      body: 'Write SQL here and press RUN. Try “SELECT * FROM accounts;” to list them all. Then dig deeper — join the leavers against their accounts to find which one outlived its owner.',
    },
    {
      tab: 'analysis',
      title: 'Tip · The intercept',
      body: 'When a query returns the right row, an “EVIDENCE OBTAINED” toast appears and unlocks a blank on the Finding. That’s how you make progress.',
    },
    {
      tab: 'report',
      title: '4 · Finding',
      body: 'Fill each blank from the dropdowns. A blank stays locked until you’ve run the query that evidences it — then submit to close the engagement and unlock the next file.',
    },
    {
      title: 'Tip · Audit Manual',
      body: 'Stuck on SQL, or on a term? Click the book icon at the top right — or press the Tab key — to toggle the Audit Manual: a cheat sheet of every clause you’ll need, plus a glossary. Good luck.',
    },
  ],

  engagement: {
    // Each vital renders as two stacked lines within one row cell.
    vitals: [
      { term: 'Control', line1: 'ITGC-A04 — Deprovisioning', line2: 'Access revoked within 1 working day of exit' },
      { term: 'System', line1: 'Kestrel Freight — Helios HR', line2: 'Payroll, expenses, personnel records' },
      { term: 'Audit period', line1: '1 March – 30 April 2026', line2: 'Q1 leavers, post-review sample' },
    ],
    report: `Kestrel Freight runs a control it is rather proud of: ITGC-A04. When someone leaves the company, IT disables their account within one working day of their last day. Every quarter, a system owner reviews who still has access and signs that the list is correct. The March review was signed off clean.

On Sunday 12 April, at 02:47, somebody exported the full payroll file out of Helios HR — every salary, every bank detail, for the whole company. Nobody was working that night. THREE PEOPLE LEFT KESTREL IN MARCH, and all three returned their laptops at the door.

Here is the thing the review was supposed to catch. An account that outlives its owner is called an ORPHANED ACCOUNT, and it is the oldest finding in access management: nobody owns it, so nobody misses it, and it keeps every permission it had on the day its owner walked out. Leaving alone is not the exception — plenty of leavers are deprovisioned properly, and a disabled account can sit in the table forever doing no harm. The exception is an account that was still ENABLED after its owner's last day, and was then USED.

You have the people, their leaving dates, their accounts, the login sessions, and the review sign-off. One account in this data was live when it should have been dead, and somebody logged into it. Find it, find what it could reach, and find who signed to say the list was correct.`,
  },

  schemaSql: `
    -- Everyone who held an account in the audit period.
    CREATE TABLE people (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      department TEXT,
      employment_type TEXT     -- 'Permanent' or 'Contractor'
    );
    INSERT INTO people (id, name, department, employment_type) VALUES
      (1, 'Rosa Iqbal',    'Finance',    'Permanent'),
      (2, 'Daniel Okafor', 'IT',         'Contractor'),
      (3, 'Priya Raman',   'HR',         'Permanent'),
      (4, 'Tomas Lindqvist','Logistics', 'Permanent'),
      (5, 'Ada Whitfield', 'Finance',    'Permanent'),
      (6, 'Ivan Brecht',   'IT',         'Contractor');

    -- The leavers. last_day is the final day of employment; a leaver's access
    -- is meant to be revoked within one working day of it.
    CREATE TABLE leavers (
      id INTEGER PRIMARY KEY,
      person_id INTEGER REFERENCES people(id),
      last_day TEXT,
      reason TEXT
    );
    INSERT INTO leavers (id, person_id, last_day, reason) VALUES
      (1, 2, '2026-03-06', 'Contract ended'),    -- Daniel Okafor
      (2, 4, '2026-03-20', 'Resigned'),          -- Tomas Lindqvist
      (3, 6, '2026-03-27', 'Contract ended');    -- Ivan Brecht

    -- One account per person. 'status' is what the directory says TODAY.
    -- disabled_on is NULL while an account is still live.
    CREATE TABLE accounts (
      id INTEGER PRIMARY KEY,
      person_id INTEGER REFERENCES people(id),
      username TEXT,
      status TEXT,             -- 'enabled' or 'disabled'
      disabled_on TEXT
    );
    INSERT INTO accounts (id, person_id, username, status, disabled_on) VALUES
      (101, 1, 'r.iqbal',     'enabled',  NULL),
      (102, 2, 'd.okafor',    'disabled', '2026-03-09'),  -- deprovisioned properly
      (103, 3, 'p.raman',     'enabled',  NULL),
      (104, 4, 't.lindqvist', 'enabled',  NULL),          -- LEFT 20 Mar, still live
      (105, 5, 'a.whitfield', 'enabled',  NULL),
      (106, 6, 'i.brecht',    'enabled',  NULL);          -- LEFT 27 Mar, still live

    -- Which system each account can reach, and how much it can do there.
    CREATE TABLE entitlements (
      id INTEGER PRIMARY KEY,
      account_id INTEGER REFERENCES accounts(id),
      system_name TEXT,
      access_level TEXT
    );
    INSERT INTO entitlements (id, account_id, system_name, access_level) VALUES
      (1, 101, 'Helios HR',     'Read'),
      (2, 102, 'Freight Ops',   'Administrator'),
      (3, 103, 'Helios HR',     'Administrator'),
      (4, 104, 'Freight Ops',   'Read'),          -- Tomas could only reach Ops
      (5, 105, 'Helios HR',     'Read'),
      (6, 106, 'Helios HR',     'Administrator'), -- Ivan's account reaches payroll
      (7, 106, 'Freight Ops',   'Read');

    -- Successful logins during the audit period.
    CREATE TABLE sessions (
      id INTEGER PRIMARY KEY,
      account_id INTEGER REFERENCES accounts(id),
      login_date TEXT,
      login_time TEXT,
      source_ip TEXT
    );
    INSERT INTO sessions (id, account_id, login_date, login_time, source_ip) VALUES
      (1, 101, '2026-04-10', '09:14', '10.2.0.31'),
      (2, 103, '2026-04-10', '08:52', '10.2.0.44'),
      (3, 104, '2026-03-19', '16:30', '10.2.0.77'),   -- Tomas, BEFORE his last day
      (4, 105, '2026-04-11', '11:05', '10.2.0.19'),
      (5, 106, '2026-04-12', '02:47', '81.24.6.190'), -- Ivan's account, 16 days after he left
      (6, 101, '2026-04-12', '10:22', '10.2.0.31'),
      (7, 103, '2026-04-13', '09:03', '10.2.0.44');

    -- The quarterly access review, and who signed it off.
    CREATE TABLE access_reviews (
      id INTEGER PRIMARY KEY,
      system_name TEXT,
      review_date TEXT,
      reviewer TEXT,
      outcome TEXT
    );
    INSERT INTO access_reviews (id, system_name, review_date, reviewer, outcome) VALUES
      (1, 'Helios HR',   '2026-03-31', 'Priya Raman',    'No exceptions noted'),
      (2, 'Freight Ops', '2026-03-31', 'Rosa Iqbal',     'No exceptions noted');
  `,

  // Entity-Relationship diagram for the Data Map tab.
  erd: {
    tables: [
      {
        name: 'people',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'name', type: 'TEXT' },
          { name: 'department', type: 'TEXT' },
          { name: 'employment_type', type: 'TEXT' },
        ],
      },
      {
        name: 'leavers',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'person_id', type: 'INTEGER', fk: 'people.id' },
          { name: 'last_day', type: 'TEXT' },
          { name: 'reason', type: 'TEXT' },
        ],
      },
      {
        name: 'accounts',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'person_id', type: 'INTEGER', fk: 'people.id' },
          { name: 'username', type: 'TEXT' },
          { name: 'status', type: 'TEXT' },
          { name: 'disabled_on', type: 'TEXT' },
        ],
      },
      {
        name: 'entitlements',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'account_id', type: 'INTEGER', fk: 'accounts.id' },
          { name: 'system_name', type: 'TEXT' },
          { name: 'access_level', type: 'TEXT' },
        ],
      },
      {
        name: 'sessions',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'account_id', type: 'INTEGER', fk: 'accounts.id' },
          { name: 'login_date', type: 'TEXT' },
          { name: 'login_time', type: 'TEXT' },
          { name: 'source_ip', type: 'TEXT' },
        ],
      },
      {
        name: 'access_reviews',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'system_name', type: 'TEXT' },
          { name: 'review_date', type: 'TEXT' },
          { name: 'reviewer', type: 'TEXT' },
          { name: 'outcome', type: 'TEXT' },
        ],
      },
    ],
  },

  // The Finding write-up.
  report: {
    // Template: {{key}} tokens are replaced by dropdowns.
    template:
      'Control ITGC-A04 failed. The account {{username}} belonged to a leaver whose last day was {{lastDay}}, but it was never disabled — and at 02:47 on 12 April, sixteen days after its owner had gone, somebody logged into it from outside the network. The account held {{accessLevel}} rights on {{system}}, which is where the payroll export came from. The March access review was signed off by {{reviewer}} as having no exceptions noted.',
    blanks: {
      username: {
        label: 'the orphaned account',
        targetValue: 'i.brecht',
        // Keyed on an ALIAS, not on `username`: a bare `SELECT * FROM accounts`
        // lists i.brecht among six rows and would otherwise hand the answer to
        // a player who never joined anything. `orphan_account` exists in no
        // table, so only the join that actually tests the control unlocks this.
        unlockedByColumn: 'orphan_account',
        triggerValue: 'i.brecht',
        options: ['d.okafor', 't.lindqvist', 'i.brecht', 'a.whitfield'],
        provingQuery: `
          SELECT a.username AS orphan_account, s.login_date, s.login_time
          FROM leavers l
          JOIN accounts a ON a.person_id = l.person_id
          JOIN sessions s ON s.account_id = a.id
          WHERE a.status = 'enabled' AND s.login_date > l.last_day
        `,
        hint: 'Join leavers to accounts to find the ones still enabled, then to sessions — which was logged into after its owner’s last day? Alias it AS orphan_account.',
      },
      lastDay: {
        label: 'their last day',
        targetValue: '2026-03-27',
        // A bare dump of `leavers` lists all three dates; keying on the raw
        // column would let it pass for the right one. The alias requires the
        // player to have tied the date to the account they identified.
        unlockedByColumn: 'orphan_last_day',
        triggerValue: '2026-03-27',
        options: ['2026-03-06', '2026-03-20', '2026-03-27', '2026-04-12'],
        provingQuery: `
          SELECT p.name, l.last_day AS orphan_last_day, l.reason
          FROM leavers l
          JOIN people p ON p.id = l.person_id
          JOIN accounts a ON a.person_id = p.id
          WHERE a.username = 'i.brecht'
        `,
        hint: 'Join leavers to the person behind the orphaned account. Alias their last day AS orphan_last_day.',
      },
      accessLevel: {
        label: 'the access level it held',
        targetValue: 'Administrator',
        // Aliased for the same reason as `orphan_account`: a bare dump of
        // entitlements would otherwise unlock both this and `system`.
        unlockedByColumn: 'orphan_access',
        triggerValue: 'Administrator',
        options: ['Read', 'Write', 'Administrator', 'None'],
        // Shares its query with `system`: "what could this account reach, and
        // how much could it do there" is one lookup, and splitting it into two
        // near-identical queries would be busywork.
        coUnlocksWith: 'system',
        provingQuery: `
          SELECT e.system_name AS orphan_system, e.access_level AS orphan_access
          FROM entitlements e JOIN accounts a ON a.id = e.account_id
          WHERE a.username = 'i.brecht'
        `,
        hint: 'Look up the orphaned account’s rows in entitlements. Alias the columns AS orphan_system and orphan_access.',
      },
      system: {
        label: 'the system it reached',
        targetValue: 'Helios HR',
        unlockedByColumn: 'orphan_system',
        triggerValue: 'Helios HR',
        options: ['Helios HR', 'Freight Ops', 'Kestrel Mail', 'Depot Access'],
        coUnlocksWith: 'accessLevel',
        provingQuery: `
          SELECT e.system_name AS orphan_system, e.access_level AS orphan_access
          FROM entitlements e JOIN accounts a ON a.id = e.account_id
          WHERE a.username = 'i.brecht'
        `,
        hint: 'The same entitlements row names the system the account could reach.',
      },
      reviewer: {
        label: 'who signed the review',
        targetValue: 'Priya Raman',
        // Two reviewers sign two systems; a bare dump names both. Filtering to
        // the system the orphaned account could reach is the actual deduction,
        // so the alias keys on that filtered row.
        unlockedByColumn: 'signed_off_by',
        triggerValue: 'Priya Raman',
        options: ['Rosa Iqbal', 'Priya Raman', 'Ada Whitfield', 'Ivan Brecht'],
        provingQuery: `
          SELECT system_name, review_date, reviewer AS signed_off_by, outcome
          FROM access_reviews WHERE system_name = 'Helios HR'
        `,
        hint: 'access_reviews records who signed off each system in March — take the one for the system the orphaned account reached, aliased AS signed_off_by.',
      },
    },
  },
}
