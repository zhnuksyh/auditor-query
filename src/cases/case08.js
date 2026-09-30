// @ts-check
/**
 * CASE 08: "NOTHING TAKEN AWAY"
 *
 * Privilege creep across department moves. Merrin Pharmaceuticals snapshots
 * every user's department and role count at each quarter end. When someone
 * moves, their old access must be removed within five working days unless a
 * time-limited handover exception covers the overlap.
 *
 * The player must:
 *   1. Use LAG() OVER (PARTITION BY username ORDER BY snapshot_date) to put each
 *      snapshot beside the same user's previous one. SQLite cannot filter on a
 *      window alias in the same WHERE, so the query has to be wrapped.
 *   2. Role counts that rose: three users. One (h.berg) never moved; their
 *      duties grew. Rising access is not the exception.
 *   3. Moves where the role count did not fall: two users. One (t.amari) moved
 *      under an approved handover exception and shed the old roles by the next
 *      quarter. The other moved three times and kept everything.
 *   4. Follow that user to the batch they released from outside Quality, and
 *      to the reviewer who certified their access anyway.
 *
 * Deductive shape: 3 risers, 2 movers who kept access, 1 without an exception.
 * The realism dial is EXPLAINED DEVIATIONS: growth with a reason, and an
 * overlap with an approval, both look like creep until the second table.
 */

/** @type {import('../types.js').PlayableCase} */
export const case08 = {
  id: 'case_08',
  code: 'CODE_08',
  tag: 'CREEP',
  title: 'Nothing Taken Away',
  teaser:
    'Three moves in three quarters, and every job left something behind. By summer, a salesperson could release medicine from quarantine.',
  folderTheme: 'access',
  locked: true,

  engagement: {
    vitals: [
      { term: 'Control', line1: 'ITGC-A05: Mover access removal', line2: 'Old access removed within 5 working days' },
      { term: 'System', line1: 'Merrin Pharmaceuticals: Quire', line2: 'ERP, quality and batch release' },
      { term: 'Audit period', line1: 'Q3 2025 – Q2 2026', line2: 'Quarter-end access snapshots' },
    ],
    report: `Merrin Pharmaceuticals makes medicines, and before any batch leaves the warehouse a Quality specialist must release it in Quire, the company's ERP. Only the Quality team may hold the BATCH RELEASE role.

When someone changes jobs inside the company they are a MOVER, and movers are where access quietly piles up: the new job's roles are added and the old job's are never taken away. Auditors call it PRIVILEGE CREEP. Merrin's control ITGC-A05 says a mover's old access must be removed within five working days of the move. The only allowed overlap is a HANDOVER EXCEPTION, approved by the new manager and time-limited, so the mover can finish old work.

Quire photographs access every quarter. At each quarter end it records every user's department and how many roles they hold. A role count that rises is not the problem on its own: people take on new duties, and their access grows with them. The exception is a move where nothing was taken away. And because each snapshot only means something next to the one before it, the answer lives between rows, not inside any one of them.

In July a batch was released from quarantine by someone who was no longer in Quality. You have the quarterly snapshots, the handover exceptions, the batch releases and the July access review. Find the mover whose access crept, how many of their moves kept every role, which batch they released, and who certified their access anyway.`,
  },

  schemaSql: `
    -- Quarter-end photographs of every user's access.
    CREATE TABLE access_snapshots (
      id INTEGER PRIMARY KEY,
      username TEXT,
      snapshot_date TEXT,
      department TEXT,
      role_count INTEGER
    );
    INSERT INTO access_snapshots (id, username, snapshot_date, department, role_count) VALUES
      (1,  'j.okafor', '2025-09-30', 'Quality',   4),
      (2,  'j.okafor', '2025-12-31', 'Quality',   4),
      (3,  'j.okafor', '2026-03-31', 'Quality',   4),
      (4,  'j.okafor', '2026-06-30', 'Quality',   4),
      (5,  'r.stein',  '2025-09-30', 'Sales',     5),
      (6,  'r.stein',  '2025-12-31', 'Marketing', 3),   -- moved and shed: compliant
      (7,  'r.stein',  '2026-03-31', 'Marketing', 3),
      (8,  'r.stein',  '2026-06-30', 'Marketing', 3),
      (9,  't.amari',  '2025-09-30', 'Warehouse', 4),
      (10, 't.amari',  '2025-12-31', 'Warehouse', 4),
      (11, 't.amari',  '2026-03-31', 'Quality',   7),   -- kept, under a handover exception
      (12, 't.amari',  '2026-06-30', 'Quality',   4),   -- and shed afterwards
      (13, 'c.dunne',  '2025-09-30', 'Quality',   5),
      (14, 'c.dunne',  '2025-12-31', 'Warehouse', 8),
      (15, 'c.dunne',  '2026-03-31', 'Planning',  10),
      (16, 'c.dunne',  '2026-06-30', 'Sales',     12),
      (17, 'h.berg',   '2025-09-30', 'Finance',   3),   -- grew without moving
      (18, 'h.berg',   '2025-12-31', 'Finance',   4),
      (19, 'h.berg',   '2026-03-31', 'Finance',   5),
      (20, 'h.berg',   '2026-06-30', 'Finance',   5);

    -- Approved, time-limited overlaps for movers.
    CREATE TABLE handover_exceptions (
      id INTEGER PRIMARY KEY,
      username TEXT,
      move_date TEXT,
      approved_by TEXT,
      expires_on TEXT
    );
    INSERT INTO handover_exceptions (id, username, move_date, approved_by, expires_on) VALUES
      (1, 't.amari', '2026-02-02', 'Lena Ortiz', '2026-04-30');

    CREATE TABLE batch_releases (
      id INTEGER PRIMARY KEY,
      batch_no TEXT,
      product TEXT,
      released_by TEXT,
      released_on TEXT
    );
    INSERT INTO batch_releases (id, batch_no, product, released_by, released_on) VALUES
      (1, 'MX-2291', 'Mexolin 20mg',  'j.okafor', '2026-07-02'),
      (2, 'MX-2294', 'Mexolin 20mg',  'j.okafor', '2026-07-09'),
      (3, 'CV-0418', 'Corvanta 5mg',  'c.dunne',  '2026-07-14'),
      (4, 'MX-2297', 'Mexolin 20mg',  'j.okafor', '2026-07-16');

    -- The July recertification, one line per user.
    CREATE TABLE access_reviews (
      id INTEGER PRIMARY KEY,
      username TEXT,
      review_date TEXT,
      reviewer TEXT,
      outcome TEXT
    );
    INSERT INTO access_reviews (id, username, review_date, reviewer, outcome) VALUES
      (1, 'j.okafor', '2026-07-01', 'Lena Ortiz',   'Certified'),
      (2, 'r.stein',  '2026-07-01', 'Paul Achebe',  'Certified'),
      (3, 't.amari',  '2026-07-01', 'Lena Ortiz',   'Certified'),
      (4, 'c.dunne',  '2026-07-01', 'Simone Reyes', 'Certified'),
      (5, 'h.berg',   '2026-07-01', 'Grant Whelan', 'Certified');
  `,

  erd: {
    tables: [
      {
        name: 'access_snapshots',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'username', type: 'TEXT' },
          { name: 'snapshot_date', type: 'TEXT' },
          { name: 'department', type: 'TEXT' },
          { name: 'role_count', type: 'INTEGER' },
        ],
      },
      {
        name: 'handover_exceptions',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'username', type: 'TEXT' },
          { name: 'move_date', type: 'TEXT' },
          { name: 'approved_by', type: 'TEXT' },
          { name: 'expires_on', type: 'TEXT' },
        ],
      },
      {
        name: 'batch_releases',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'batch_no', type: 'TEXT' },
          { name: 'product', type: 'TEXT' },
          { name: 'released_by', type: 'TEXT' },
          { name: 'released_on', type: 'TEXT' },
        ],
      },
      {
        name: 'access_reviews',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'username', type: 'TEXT' },
          { name: 'review_date', type: 'TEXT' },
          { name: 'reviewer', type: 'TEXT' },
          { name: 'outcome', type: 'TEXT' },
        ],
      },
    ],
  },

  // No role counts or dates in the template: either would name the user.
  report: {
    template:
      'Control ITGC-A05 failed repeatedly for one user. {{creepingUser}} moved department {{movesKept}} times without losing a single role, and no handover exception covered any of those moves. Long after leaving Quality they still held its batch-release role, and they used it to release batch {{batch}}. The July review of their access was certified by {{certifier}}.',
    blanks: {
      creepingUser: {
        label: 'the mover whose access crept',
        targetValue: 'c.dunne',
        unlockedByColumn: 'creeping_user',
        triggerValue: 'c.dunne',
        options: ['t.amari', 'h.berg', 'c.dunne', 'r.stein'],
        // The user and how many moves kept everything are one grouped row.
        coUnlocksWith: 'movesKept',
        provingQuery: `
          SELECT username AS creeping_user, COUNT(*) AS moves_kept
          FROM (
            SELECT username, snapshot_date, department, role_count,
                   LAG(department) OVER (PARTITION BY username ORDER BY snapshot_date) AS prev_department,
                   LAG(role_count) OVER (PARTITION BY username ORDER BY snapshot_date) AS prev_count
            FROM access_snapshots
          )
          WHERE department <> prev_department AND role_count >= prev_count
            AND username NOT IN (SELECT username FROM handover_exceptions)
          GROUP BY username
        `,
        hint: 'Wrap a subquery that adds LAG(department) and LAG(role_count) OVER (PARTITION BY username ORDER BY snapshot_date). Keep rows where the department changed but the role count did not fall, drop anyone with a handover exception, then GROUP BY username. Alias it AS creeping_user and COUNT(*) AS moves_kept.',
      },
      movesKept: {
        label: 'how many moves kept every role',
        targetValue: '3',
        unlockedByColumn: 'moves_kept',
        triggerValue: 3,
        options: ['1', '2', '3', '4'],
        coUnlocksWith: 'creepingUser',
        provingQuery: `
          SELECT username AS creeping_user, COUNT(*) AS moves_kept
          FROM (
            SELECT username, snapshot_date, department, role_count,
                   LAG(department) OVER (PARTITION BY username ORDER BY snapshot_date) AS prev_department,
                   LAG(role_count) OVER (PARTITION BY username ORDER BY snapshot_date) AS prev_count
            FROM access_snapshots
          )
          WHERE department <> prev_department AND role_count >= prev_count
            AND username NOT IN (SELECT username FROM handover_exceptions)
          GROUP BY username
        `,
        hint: 'The same grouped row: COUNT(*) of that user’s moves, aliased AS moves_kept.',
      },
      batch: {
        label: 'the batch they released',
        targetValue: 'CV-0418',
        unlockedByColumn: 'released_batch',
        triggerValue: 'CV-0418',
        options: ['MX-2291', 'MX-2294', 'CV-0418', 'MX-2297'],
        provingQuery: `
          SELECT batch_no AS released_batch, product, released_on
          FROM batch_releases WHERE released_by = 'c.dunne'
        `,
        hint: 'Which batch did that user release? Alias batch_no AS released_batch.',
      },
      certifier: {
        label: 'who certified their access',
        targetValue: 'Simone Reyes',
        unlockedByColumn: 'certified_by',
        triggerValue: 'Simone Reyes',
        options: ['Lena Ortiz', 'Paul Achebe', 'Simone Reyes', 'Grant Whelan'],
        provingQuery: `
          SELECT username, reviewer AS certified_by, outcome
          FROM access_reviews WHERE username = 'c.dunne'
        `,
        hint: 'Find that user’s line in the July access review. Alias the reviewer AS certified_by.',
      },
    },
  },
}
