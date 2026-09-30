// @ts-check
/**
 * CASE 06: "THE MISSING ROW"
 *
 * Population completeness. Quarrow Engineering's leaver control was tested by
 * management against HR's leaver report and scored 100%. The report was built
 * from the worker register with a filter that silently left out contractors,
 * so the test never saw the leavers most likely to fail.
 *
 * The player must:
 *   1. Test the report as management did: every leaver on it was disabled in
 *      time. Nothing to find. That is the first obvious query, and it clears.
 *   2. Reconcile the report back to its source with an anti-join: leavers in
 *      the register during the period with no row in the report. Three.
 *      Forgetting the period filter counts a December leaver too (four).
 *   3. See what the missing rows have in common: all contractors.
 *   4. Check the missing leavers' accounts: one still enabled (and used after
 *      its owner left), one disabled five weeks late, one disabled on time.
 *
 * Deductive shape: the report itself returns five compliant leavers. Only the
 * reconciliation finds anything, and it returns three candidates that differ
 * by what happened to their accounts. The realism dial is POPULATION
 * COMPLETENESS of information produced by the entity (IPE).
 */

/** @type {import('../types.js').PlayableCase} */
export const case06 = {
  id: 'case_06',
  code: 'CODE_06',
  tag: 'POPULATION',
  title: 'The Missing Row',
  teaser:
    'Management tested every leaver on the list and scored the control 100%. Then a penetration tester logged in as someone who left in February.',
  folderTheme: 'access',
  locked: true,

  engagement: {
    vitals: [
      { term: 'Control', line1: 'ITGC-A02: Leaver access removal', line2: 'Disabled within 1 working day of leaving' },
      { term: 'System', line1: 'Quarrow Engineering: Directory', line2: 'Network logins for all staff' },
      { term: 'Audit period', line1: '1 January – 30 June 2026', line2: 'H1 leavers, re-performed' },
    ],
    report: `Quarrow Engineering's control ITGC-A02 says that when anyone leaves, their network account is disabled within one working day of their last day. Every half-year, IT management tests it themselves: they take HR's leaver report, check each name against the directory, and report the result to the audit committee. For January to June 2026 they tested every leaver on the report, found every account disabled in time, and reported the control as 100% effective.

In July, an external penetration tester logged into Quarrow's network with a working account belonging to someone who had left months before.

A test is only as good as the list it is run on. Auditors call that list the POPULATION, and when the organisation itself produces it, it is INFORMATION PRODUCED BY THE ENTITY, or IPE. Before relying on IPE, an auditor must show it is COMPLETE: that nothing which belongs on it is missing. The usual way is to reconcile it back to the source it was drawn from.

HR's report was drawn from the WORKER REGISTER, which records everyone who works at Quarrow, employees and contractors alike, and the day each of them left. You have the register, the leaver report management tested, and the directory accounts with the day each was disabled and last used. Find how many H1 leavers the report missed, what kind of worker it left out, whose account is still live, and whose was disabled late.`,
  },

  schemaSql: `
    -- The worker register: the SOURCE. Everyone, employees and contractors.
    -- left_on is NULL for anyone still working at Quarrow.
    CREATE TABLE workers (
      id INTEGER PRIMARY KEY,
      name TEXT,
      worker_type TEXT,        -- 'Employee' or 'Contractor'
      department TEXT,
      left_on TEXT
    );
    INSERT INTO workers (id, name, worker_type, department, left_on) VALUES
      (1,  'Mark Deane',  'Employee',   'Engineering', '2026-01-16'),
      (2,  'Olu Adebayo', 'Employee',   'Finance',     '2026-02-27'),
      (3,  'Petra Nowak', 'Contractor', 'Engineering', '2026-02-13'),
      (4,  'Leona Barr',  'Contractor', 'IT',          '2026-02-20'),
      (5,  'Sian Price',  'Employee',   'HR',          '2026-03-31'),
      (6,  'Aaron Quist', 'Contractor', 'Engineering', '2026-03-27'),
      (7,  'Ravi Menon',  'Employee',   'Sales',       '2026-05-15'),
      (8,  'Ella Strand', 'Employee',   'Engineering', '2026-06-12'),
      (9,  'Tobias Grey', 'Employee',   'IT',          NULL),
      (10, 'Keiko Imai',  'Contractor', 'IT',          NULL),
      (11, 'Noor Aziz',   'Employee',   'Finance',     NULL),
      (12, 'Dara Flynn',  'Employee',   'Sales',       '2025-12-19');  -- before the period

    -- The report HR produced for management's test: the IPE.
    CREATE TABLE hr_leaver_report (
      id INTEGER PRIMARY KEY,
      worker_id INTEGER REFERENCES workers(id),
      last_day TEXT
    );
    INSERT INTO hr_leaver_report (id, worker_id, last_day) VALUES
      (1, 1, '2026-01-16'),
      (2, 2, '2026-02-27'),
      (3, 5, '2026-03-31'),
      (4, 7, '2026-05-15'),
      (5, 8, '2026-06-12');

    -- Network accounts. disabled_on is NULL while an account is live.
    CREATE TABLE directory_accounts (
      id INTEGER PRIMARY KEY,
      worker_id INTEGER REFERENCES workers(id),
      username TEXT,
      disabled_on TEXT,
      last_logon TEXT
    );
    INSERT INTO directory_accounts (id, worker_id, username, disabled_on, last_logon) VALUES
      (1,  1,  'm.deane',   '2026-01-19', '2026-01-16'),
      (2,  2,  'o.adebayo', '2026-02-27', '2026-02-27'),
      (3,  3,  'p.nowak',   '2026-02-16', '2026-02-13'),  -- missed by the report, but on time
      (4,  4,  'l.barr',    NULL,         '2026-06-02'),  -- missed, still live, used since
      (5,  5,  's.price',   '2026-04-01', '2026-03-31'),
      (6,  6,  'a.quist',   '2026-05-01', '2026-03-27'),  -- missed, five weeks late
      (7,  7,  'r.menon',   '2026-05-18', '2026-05-15'),
      (8,  8,  'e.strand',  '2026-06-15', '2026-06-12'),
      (9,  9,  't.grey',    NULL,         '2026-07-02'),
      (10, 10, 'k.imai',    NULL,         '2026-07-01'),
      (11, 11, 'n.aziz',    NULL,         '2026-07-02'),
      (12, 12, 'd.flynn',   '2025-12-22', '2025-12-19');
  `,

  erd: {
    tables: [
      {
        name: 'workers',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'name', type: 'TEXT' },
          { name: 'worker_type', type: 'TEXT' },
          { name: 'department', type: 'TEXT' },
          { name: 'left_on', type: 'TEXT' },
        ],
      },
      {
        name: 'hr_leaver_report',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'worker_id', type: 'INTEGER', fk: 'workers.id' },
          { name: 'last_day', type: 'TEXT' },
        ],
      },
      {
        name: 'directory_accounts',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'worker_id', type: 'INTEGER', fk: 'workers.id' },
          { name: 'username', type: 'TEXT' },
          { name: 'disabled_on', type: 'TEXT' },
          { name: 'last_logon', type: 'TEXT' },
        ],
      },
    ],
  },

  report: {
    template:
      'Control ITGC-A02 was reported as 100% effective, but it was tested on an incomplete population. The leaver report left out every {{excludedType}}, so {{missingCount}} H1 leavers were never tested. Of those, {{stillEnabled}} was still enabled and had been used after its owner left, and {{lateDisabled}} was disabled five weeks late.',
    blanks: {
      missingCount: {
        label: 'how many leavers were missed',
        targetValue: '3',
        // An aggregate alias over the anti-join. Without the period filter the
        // count picks up a December leaver and comes out at four.
        unlockedByColumn: 'missing_leavers',
        triggerValue: 3,
        options: ['0', '2', '3', '4'],
        provingQuery: `
          SELECT COUNT(*) AS missing_leavers
          FROM workers w
          LEFT JOIN hr_leaver_report r ON r.worker_id = w.id
          WHERE w.left_on BETWEEN '2026-01-01' AND '2026-06-30'
            AND r.id IS NULL
        `,
        hint: 'Reconcile the report to its source: LEFT JOIN workers to hr_leaver_report and keep the H1 leavers with no report row (IS NULL). Mind the audit period. Alias COUNT(*) AS missing_leavers.',
      },
      excludedType: {
        label: 'what the report left out',
        targetValue: 'Contractor',
        unlockedByColumn: 'excluded_type',
        triggerValue: 'Contractor',
        options: ['Employee', 'Contractor', 'Intern', 'Rehire'],
        provingQuery: `
          SELECT DISTINCT w.worker_type AS excluded_type
          FROM workers w
          LEFT JOIN hr_leaver_report r ON r.worker_id = w.id
          WHERE w.left_on BETWEEN '2026-01-01' AND '2026-06-30'
            AND r.id IS NULL
        `,
        hint: 'The same anti-join: what worker_type do all the missing leavers share? Alias it AS excluded_type.',
      },
      stillEnabled: {
        label: 'the account still live',
        targetValue: 'l.barr',
        unlockedByColumn: 'still_enabled',
        triggerValue: 'l.barr',
        options: ['p.nowak', 'l.barr', 'a.quist', 'k.imai'],
        provingQuery: `
          SELECT a.username AS still_enabled, w.left_on, a.last_logon
          FROM workers w JOIN directory_accounts a ON a.worker_id = w.id
          WHERE w.left_on IS NOT NULL AND a.disabled_on IS NULL
            AND NOT EXISTS (SELECT 1 FROM hr_leaver_report r WHERE r.worker_id = w.id)
        `,
        hint: 'Among the leavers missing from the report, whose account has no disabled_on? Alias the username AS still_enabled.',
      },
      lateDisabled: {
        label: 'the account disabled late',
        targetValue: 'a.quist',
        unlockedByColumn: 'disabled_late',
        triggerValue: 'a.quist',
        options: ['p.nowak', 'l.barr', 'a.quist', 'd.flynn'],
        provingQuery: `
          SELECT a.username AS disabled_late, w.left_on, a.disabled_on
          FROM workers w JOIN directory_accounts a ON a.worker_id = w.id
          WHERE julianday(a.disabled_on) - julianday(w.left_on) > 3
        `,
        hint: 'Compare disabled_on with left_on. A Friday leaver disabled on Monday is still on time, so allow three calendar days; julianday() turns a date into a number you can subtract. Alias the username AS disabled_late.',
      },
    },
  },
}
