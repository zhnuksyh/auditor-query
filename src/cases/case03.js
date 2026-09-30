// @ts-check
/**
 * CASE 03: "RUBBER STAMP"
 *
 * Recertification. Brannock Savings runs a quarterly user access review: every
 * line manager marks each entitlement their team holds Keep or Revoke. The Q2
 * review was signed off complete. Six weeks later an account outside the
 * Payments team released a payment it should never have been able to release.
 *
 * The player must:
 *   1. GROUP BY reviewer to see how each one reviewed: how many lines, how many
 *      revoked, first and last decision time.
 *   2. HAVING no revokes leaves two reviewers. One had three lines over 25
 *      minutes (a small, stable team). The other cleared twelve lines in six
 *      minutes. Revoking nothing is not the exception; revoking nothing at that
 *      pace is.
 *   3. Find the Payment Release line kept for someone outside Payments.
 *   4. Follow that account to the payment it released.
 *
 * Deductive shape: the first obvious query (reviewers who revoked nothing)
 * returns two. The realism dial is PRECISION of a review control: the review
 * happened and was signed off; the question is whether it could have caught
 * anything. A decoy mover (k.vale) held the same entitlement and had it revoked
 * properly by a reviewer who did the job.
 */

/** @type {import('../types.js').PlayableCase} */
export const case03 = {
  id: 'case_03',
  code: 'CODE_03',
  tag: 'REVIEW',
  title: 'Rubber Stamp',
  teaser:
    'Four managers signed off the access review. Six weeks later, an account in Marketing released a payment it should never have been able to touch.',
  folderTheme: 'access',
  locked: true,

  engagement: {
    vitals: [
      { term: 'Control', line1: 'ITGC-A07: User access review', line2: 'Quarterly recertification by line managers' },
      { term: 'System', line1: 'Brannock Savings: Tessera', line2: 'Core banking, payments, lending' },
      { term: 'Audit period', line1: 'Q2 review, 1–3 July 2026', line2: 'Payments to 17 August 2026' },
    ],
    report: `Brannock Savings is a building society, and Tessera is the core banking system its staff use to open accounts, lend and move money. The most dangerous entitlement in Tessera is PAYMENT RELEASE: the final click that sends money out of the society. Policy says only the Payments team may hold it.

Keeping it that way is the job of ITGC-A07, the quarterly USER ACCESS REVIEW, also called recertification. Every line manager receives a list of the entitlements their team holds, one line per user per entitlement, and marks each line Keep or Revoke. Revoke removes the access. The review tool records the minute each decision was made. The Q2 review ran from 1 to 3 July. Four managers took part, every one of them signed off, and the review was reported complete.

A review that happened is not the same as a review that worked. Auditors call this PRECISION. A manager who clears a line every thirty seconds and never revokes anything is not reviewing; they are clicking. But revoking nothing is not proof on its own: a small, stable team may genuinely need everything it has.

In mid-August a payment left the society for a company Brannock had never dealt with. It was released by an account outside the Payments team, using a Payment Release entitlement the Q2 review had certified. You have the users, the reviewers, every review line with its decision and timestamp, and the payments. Find the review that was not really a review, how many lines it waved through, whose Payment Release it kept, and where the money went.`,
  },

  schemaSql: `
    -- Everyone with a Tessera login, by their CURRENT department.
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      username TEXT,
      name TEXT,
      department TEXT
    );
    INSERT INTO users (id, username, name, department) VALUES
      (1,  'a.hale',     'Amara Hale',     'Payments'),
      (2,  'b.osei',     'Ben Osei',       'Payments'),
      (3,  'c.moreau',   'Claire Moreau',  'Payments'),
      (4,  'd.kowal',    'Dominik Kowal',  'Marketing'),  -- moved out of Payments in May
      (5,  'e.lund',     'Erik Lund',      'Lending'),
      (6,  'f.nakamura', 'Fumi Nakamura',  'Lending'),
      (7,  'g.pryce',    'Gethin Pryce',   'Branch'),
      (8,  'h.idowu',    'Hana Idowu',     'Branch'),
      (9,  'k.vale',     'Kit Vale',       'Branch'),     -- also ex-Payments; revoked properly
      (10, 'j.brenner',  'Jonas Brenner',  'Marketing'),
      (11, 'm.quinn',    'Maeve Quinn',    'Marketing'),
      (12, 'l.ferro',    'Luca Ferro',     'Lending');

    -- The managers who performed the Q2 review.
    CREATE TABLE reviewers (
      id INTEGER PRIMARY KEY,
      name TEXT,
      team TEXT
    );
    INSERT INTO reviewers (id, name, team) VALUES
      (1, 'Nadia Frost',  'Payments'),
      (2, 'Tom Ashby',    'Branch'),
      (3, 'Grace Mbeki',  'Lending'),
      (4, 'Owen Tarrant', 'Marketing');

    -- One line per user per entitlement, with the reviewer's decision and the
    -- minute the review tool recorded it.
    CREATE TABLE review_lines (
      id INTEGER PRIMARY KEY,
      reviewer_id INTEGER REFERENCES reviewers(id),
      user_id INTEGER REFERENCES users(id),
      entitlement TEXT,
      decision TEXT,          -- 'Keep' or 'Revoke'
      decided_at TEXT         -- 'YYYY-MM-DD HH:MM'
    );
    INSERT INTO review_lines (id, reviewer_id, user_id, entitlement, decision, decided_at) VALUES
      (1,  1, 1,  'Payment Release',  'Keep',   '2026-07-01 09:30'),
      (2,  1, 1,  'Payment Entry',    'Keep',   '2026-07-01 09:36'),
      (3,  1, 2,  'Payment Release',  'Keep',   '2026-07-01 09:41'),
      (4,  1, 2,  'Payment Entry',    'Keep',   '2026-07-01 09:47'),
      (5,  1, 3,  'Payment Entry',    'Keep',   '2026-07-01 09:55'),
      (6,  1, 3,  'Statement Export', 'Revoke', '2026-07-01 10:04'),
      (7,  2, 7,  'Customer View',    'Keep',   '2026-07-03 15:00'),
      (8,  2, 8,  'Customer View',    'Keep',   '2026-07-03 15:06'),
      (9,  2, 8,  'Cash Desk',        'Keep',   '2026-07-03 15:13'),
      (10, 2, 9,  'Customer View',    'Keep',   '2026-07-03 15:21'),
      (11, 2, 9,  'Payment Release',  'Revoke', '2026-07-03 15:30'), -- the review working
      (12, 2, 9,  'Cash Desk',        'Keep',   '2026-07-03 15:38'),
      (13, 3, 5,  'Loan Origination', 'Keep',   '2026-07-02 14:10'), -- no revokes, but three
      (14, 3, 6,  'Loan Origination', 'Keep',   '2026-07-02 14:22'), -- considered lines
      (15, 3, 12, 'Loan Approval',    'Keep',   '2026-07-02 14:35'),
      (16, 4, 4,  'Customer View',    'Keep',   '2026-07-02 11:02'), -- twelve lines,
      (17, 4, 4,  'Campaign Admin',   'Keep',   '2026-07-02 11:02'), -- six minutes
      (18, 4, 4,  'Payment Release',  'Keep',   '2026-07-02 11:03'),
      (19, 4, 4,  'Statement Export', 'Keep',   '2026-07-02 11:03'),
      (20, 4, 10, 'Customer View',    'Keep',   '2026-07-02 11:04'),
      (21, 4, 10, 'Campaign Admin',   'Keep',   '2026-07-02 11:04'),
      (22, 4, 10, 'Statement Export', 'Keep',   '2026-07-02 11:05'),
      (23, 4, 11, 'Customer View',    'Keep',   '2026-07-02 11:06'),
      (24, 4, 11, 'Campaign Admin',   'Keep',   '2026-07-02 11:06'),
      (25, 4, 11, 'Statement Export', 'Keep',   '2026-07-02 11:07'),
      (26, 4, 4,  'Payment Entry',    'Keep',   '2026-07-02 11:08'),
      (27, 4, 10, 'Customer Export',  'Keep',   '2026-07-02 11:08');

    -- Outbound payments released from Tessera after the review.
    CREATE TABLE payments (
      id INTEGER PRIMARY KEY,
      released_by INTEGER REFERENCES users(id),
      payee TEXT,
      amount INTEGER,
      released_on TEXT
    );
    INSERT INTO payments (id, released_by, payee, amount, released_on) VALUES
      (1, 1, 'Harlow Utilities',        12400,  '2026-08-03'),
      (2, 2, 'Brannock Payroll Bureau', 310500, '2026-08-07'),
      (3, 1, 'Selby Office Supply',     2180,   '2026-08-11'),
      (4, 4, 'Quillon Trading Ltd',     48200,  '2026-08-14'),
      (5, 2, 'Harlow Utilities',        11950,  '2026-08-17');
  `,

  erd: {
    tables: [
      {
        name: 'users',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'username', type: 'TEXT' },
          { name: 'name', type: 'TEXT' },
          { name: 'department', type: 'TEXT' },
        ],
      },
      {
        name: 'reviewers',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'name', type: 'TEXT' },
          { name: 'team', type: 'TEXT' },
        ],
      },
      {
        name: 'review_lines',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'reviewer_id', type: 'INTEGER', fk: 'reviewers.id' },
          { name: 'user_id', type: 'INTEGER', fk: 'users.id' },
          { name: 'entitlement', type: 'TEXT' },
          { name: 'decision', type: 'TEXT' },
          { name: 'decided_at', type: 'TEXT' },
        ],
      },
      {
        name: 'payments',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'released_by', type: 'INTEGER', fk: 'users.id' },
          { name: 'payee', type: 'TEXT' },
          { name: 'amount', type: 'INTEGER' },
          { name: 'released_on', type: 'TEXT' },
        ],
      },
    ],
  },

  // The template names no times or teams: either would point straight at the
  // reviewer before a query was run.
  report: {
    template:
      'Control ITGC-A07 operated in form but not in substance. {{reviewer}} certified all {{lines}} of their review lines without revoking one, at a pace no real review could keep. One of those lines kept Payment Release for {{user}}, who no longer worked in Payments. On 14 August that account released £48,200 to {{payee}}.',
    blanks: {
      reviewer: {
        label: 'the reviewer',
        targetValue: 'Owen Tarrant',
        // HAVING no revokes returns two reviewers; the row itself carries the
        // count and time span that separate them, so the choice is the player's.
        unlockedByColumn: 'rubber_stamp_reviewer',
        triggerValue: 'Owen Tarrant',
        options: ['Nadia Frost', 'Tom Ashby', 'Grace Mbeki', 'Owen Tarrant'],
        // "Who rubber-stamped" and "how many lines" come out of the same
        // GROUP BY row; splitting them would be busywork.
        coUnlocksWith: 'lines',
        provingQuery: `
          SELECT r.name AS rubber_stamp_reviewer, COUNT(*) AS lines_certified,
                 MIN(l.decided_at) AS first_decision, MAX(l.decided_at) AS last_decision
          FROM review_lines l JOIN reviewers r ON r.id = l.reviewer_id
          GROUP BY r.name
          HAVING SUM(l.decision = 'Revoke') = 0
        `,
        hint: 'GROUP BY reviewer and HAVING no Revoke decisions. Two survive: compare how many lines each cleared and how long it took (MIN and MAX of decided_at). Alias the name AS rubber_stamp_reviewer and COUNT(*) AS lines_certified.',
      },
      lines: {
        label: 'how many lines',
        targetValue: '12',
        unlockedByColumn: 'lines_certified',
        triggerValue: 12,
        options: ['3', '6', '12', '27'],
        coUnlocksWith: 'reviewer',
        provingQuery: `
          SELECT r.name AS rubber_stamp_reviewer, COUNT(*) AS lines_certified,
                 MIN(l.decided_at) AS first_decision, MAX(l.decided_at) AS last_decision
          FROM review_lines l JOIN reviewers r ON r.id = l.reviewer_id
          GROUP BY r.name
          HAVING SUM(l.decision = 'Revoke') = 0
        `,
        hint: 'The same GROUP BY row: COUNT(*) for that reviewer, aliased AS lines_certified.',
      },
      user: {
        label: 'whose access it kept',
        targetValue: 'd.kowal',
        unlockedByColumn: 'unrevoked_user',
        triggerValue: 'd.kowal',
        options: ['k.vale', 'd.kowal', 'j.brenner', 'a.hale'],
        provingQuery: `
          SELECT u.username AS unrevoked_user, u.department, l.entitlement, l.decision
          FROM review_lines l JOIN users u ON u.id = l.user_id
          WHERE l.entitlement = 'Payment Release' AND l.decision = 'Keep'
            AND u.department <> 'Payments'
        `,
        hint: 'Join review_lines to users: which Payment Release line was kept for someone whose department is not Payments? Alias the username AS unrevoked_user.',
      },
      payee: {
        label: 'where the money went',
        targetValue: 'Quillon Trading Ltd',
        unlockedByColumn: 'payee_paid',
        triggerValue: 'Quillon Trading Ltd',
        options: ['Harlow Utilities', 'Quillon Trading Ltd', 'Selby Office Supply', 'Brannock Payroll Bureau'],
        provingQuery: `
          SELECT p.payee AS payee_paid, p.amount, p.released_on
          FROM payments p JOIN users u ON u.id = p.released_by
          WHERE u.username = 'd.kowal'
        `,
        hint: 'Join payments to users for that account. Alias the payee AS payee_paid.',
      },
    },
  },
}
