// @ts-check
/**
 * CASE 06 — "THE ARCHIVIST"
 *
 * The hardest file yet, and the first built on ABSENCE. Seven tables, six
 * suspects. Every earlier case asked the player to find a row that shouldn't
 * exist; this one asks them to find a row that ISN'T THERE:
 *
 *   - vault_ledger records every sign-out and its matching return. One file was
 *     signed out and never returned — provable only with an anti-join
 *     (NOT EXISTS / LEFT JOIN ... WHERE return IS NULL), because there is no
 *     "missing" flag anywhere in the data.
 *   - The ledger row covering that file names a clerk who was on leave that
 *     week (leave_records) — the entry was written under a borrowed name.
 *   - door_scans is the honest record: it shows who was physically in the vault
 *     in the minute the entry was timestamped, which is how the borrowed name
 *     gets attached to a real person.
 *   - The victim, the head archivist, had queued that same file for digitisation
 *     (digitisation_queue), which is why it had to disappear before he scanned it.
 *
 * Difficulty step: cases 03/05 taught GROUP BY + HAVING; this one needs the
 * negative shape (anti-join) plus a self-consistency check across two tables
 * that disagree. Everything is still provable with SQL — no guessing.
 */

/** @type {import('../types.js').PlayableCase} */
export const case06 = {
  id: 'case_06',
  code: 'CODE_06',
  tag: 'ARCHIVE',
  title: 'The Archivist',
  teaser:
    'Every file in the vault was signed out in perfect order. Except the one that never came back.',
  folderTheme: 'archive',
  locked: true,

  crimeScene: {
    victim: { line1: 'Hollis Wray, 61', line2: 'Head archivist' },
    location: { line1: 'Bureau Records Annex, Sub-level 2', line2: 'Cold vault — Row F' },
    timeOfDeath: { line1: '19:05 – 19:40', line2: 'September 3rd' },
    report: `HOLLIS WRAY was found at 20:12 between the stacks in Row F of the cold vault, a shelf ladder overturned beside him. The fall looked like an accident until the coroner put the blunt injury at the back of the skull, not the front — he was struck, then the ladder was laid down around him. Death came between 19:05 and 19:40.

Wray had spent his last month digitising the Bureau's oldest evidence files, and he kept the queue meticulously. Nothing is stolen from a vault like this without a trace, because the vault keeps two records of everything: the VAULT LEDGER, where a clerk writes down each file signed out and signs it back in on return, and the DOOR SCANS, which log every badge through the vault door and cannot be written by hand.

The ledger for that week looks immaculate — every sign-out paired with a return, every line initialled. But the ledger is only as honest as the person holding the pen, and one clerk whose name appears in it was nowhere near the building: the staff leave records put them away all week. Whoever wrote that line borrowed a name that couldn't contradict them.

Three people passed through that door while Wray was dying, and each had a reason to be there. Find the file that went out and never came back, then work out which of them was still inside at the minute that entry was written. The ledger lies. The door does not.`,
    constraints: [
      'Time of death: 19:05–19:40, September 3rd.',
      'Blunt trauma to the BACK of the skull — the fall was staged.',
      'Every vault sign-out must have a matching return in the ledger.',
      'Door scans are machine-written and cannot be forged; the ledger is handwritten.',
      'One name in the ledger belongs to a clerk who was on leave all week.',
      'Three badges passed the vault door inside the coroner’s window.',
    ],
  },

  schemaSql: `
    CREATE TABLE suspects (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT,
      badge_id INTEGER
    );
    INSERT INTO suspects (id, name, role, badge_id) VALUES
      (1, 'Perrin Oyelaran', 'Records clerk',        301),
      (2, 'Sabine Marchetti','Conservation officer', 302),
      (3, 'Dov Lantry',      'Records clerk',        303),
      (4, 'Ingrid Sahl',     'Vault supervisor',     304),
      (5, 'Casimir Boyle',   'Digitisation tech',    305),
      (6, 'Neve Abara',      'Night porter',         306);

    CREATE TABLE case_files (
      id INTEGER PRIMARY KEY,
      file_code TEXT,
      subject TEXT,
      shelf TEXT
    );
    INSERT INTO case_files (id, file_code, subject, shelf) VALUES
      (1, 'BX-1140', 'Harbour arson, 1998',        'Row F'),
      (2, 'BX-1207', 'Mill Road fraud, 2001',      'Row F'),
      (3, 'BX-1315', 'Alder Row disappearance, 1994', 'Row D'),
      (4, 'BX-1402', 'Foundry contract bribery, 2003', 'Row F'),
      (5, 'BX-1488', 'Brant Station theft, 1999',  'Row B');

    -- The handwritten record. A sign-out is only closed when returned_time is
    -- filled in; exactly one row in this table never gets one.
    CREATE TABLE vault_ledger (
      id INTEGER PRIMARY KEY,
      file_id INTEGER REFERENCES case_files(id),
      signed_out_by TEXT,        -- written by hand, so it can be a borrowed name
      signed_out_time TEXT,      -- 'HH:MM'
      returned_time TEXT         -- NULL means it never came back
    );
    INSERT INTO vault_ledger (id, file_id, signed_out_by, signed_out_time, returned_time) VALUES
      (1, 3, 'Perrin Oyelaran',  '09:12', '09:48'),
      (2, 1, 'Casimir Boyle',    '11:30', '12:05'),
      (3, 5, 'Sabine Marchetti', '14:20', '15:02'),
      (4, 2, 'Dov Lantry',       '19:14', NULL),    -- never returned: the stolen file
      (5, 1, 'Ingrid Sahl',      '16:40', '17:15'),
      (6, 3, 'Casimir Boyle',    '17:50', '18:30');

    -- Machine-written. Cannot be forged, so it overrides the ledger.
    CREATE TABLE door_scans (
      id INTEGER PRIMARY KEY,
      badge_id INTEGER,
      direction TEXT,            -- 'IN' or 'OUT'
      scan_time TEXT             -- 'HH:MM'
    );
    INSERT INTO door_scans (id, badge_id, direction, scan_time) VALUES
      (1,  301, 'IN',  '09:10'),
      (2,  301, 'OUT', '09:50'),
      (3,  305, 'IN',  '11:28'),
      (4,  305, 'OUT', '12:07'),
      (5,  302, 'IN',  '14:18'),
      (6,  302, 'OUT', '15:04'),
      (7,  304, 'IN',  '16:38'),
      (8,  304, 'OUT', '17:17'),
      (9,  305, 'IN',  '17:48'),
      (10, 305, 'OUT', '18:32'),
      (11, 304, 'IN',  '19:08'),   -- Ingrid is inside when entry 4 is written
      (12, 306, 'IN',  '19:52'),   -- the porter arrives well after the window
      (13, 304, 'OUT', '19:36'),
      (14, 306, 'OUT', '20:15'),
      -- Two more people are inside the coroner's window, so "who was in the
      -- vault when Wray died" returns three names, not one. Neither of them is
      -- still inside at 19:14 when the ledger entry is written:
      -- Sabine leaves four minutes before it, Casimir arrives six after.
      (15, 302, 'IN',  '18:55'),
      (16, 302, 'OUT', '19:10'),
      (17, 305, 'IN',  '19:20'),
      (18, 305, 'OUT', '19:33');

    -- Dov Lantry cannot have signed anything that day.
    CREATE TABLE leave_records (
      id INTEGER PRIMARY KEY,
      suspect_id INTEGER REFERENCES suspects(id),
      leave_from TEXT,
      leave_to TEXT,
      reason TEXT
    );
    INSERT INTO leave_records (id, suspect_id, leave_from, leave_to, reason) VALUES
      (1, 3, '2026-08-31', '2026-09-06', 'Approved annual leave — abroad'),
      (2, 6, '2026-07-14', '2026-07-18', 'Sick leave'),
      (3, 1, '2026-06-02', '2026-06-09', 'Approved annual leave');

    -- Why the file had to vanish before Wray reached it.
    CREATE TABLE digitisation_queue (
      id INTEGER PRIMARY KEY,
      file_id INTEGER REFERENCES case_files(id),
      queued_by TEXT,
      scheduled_date TEXT,
      status TEXT
    );
    INSERT INTO digitisation_queue (id, file_id, queued_by, scheduled_date, status) VALUES
      (1, 1, 'Hollis Wray', '2026-09-01', 'done'),
      (2, 2, 'Hollis Wray', '2026-09-04', 'pending'),
      (3, 3, 'Hollis Wray', '2026-09-02', 'done'),
      (4, 4, 'Hollis Wray', '2026-09-11', 'pending');

    CREATE TABLE coroner_reports (
      id INTEGER PRIMARY KEY,
      victim TEXT,
      tod_from TEXT,
      tod_to TEXT,
      injury TEXT
    );
    INSERT INTO coroner_reports (id, victim, tod_from, tod_to, injury) VALUES
      (1, 'Hollis Wray', '19:05', '19:40', 'Blunt trauma, posterior skull — inconsistent with a forward fall');
  `,

  erd: {
    tables: [
      {
        name: 'suspects',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'name', type: 'TEXT' },
          { name: 'role', type: 'TEXT' },
          { name: 'badge_id', type: 'INTEGER' },
        ],
      },
      {
        name: 'case_files',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'file_code', type: 'TEXT' },
          { name: 'subject', type: 'TEXT' },
          { name: 'shelf', type: 'TEXT' },
        ],
      },
      {
        name: 'vault_ledger',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'file_id', type: 'INTEGER', fk: 'case_files.id' },
          { name: 'signed_out_by', type: 'TEXT' },
          { name: 'signed_out_time', type: 'TEXT' },
          { name: 'returned_time', type: 'TEXT' },
        ],
      },
      {
        name: 'door_scans',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'badge_id', type: 'INTEGER' },
          { name: 'direction', type: 'TEXT' },
          { name: 'scan_time', type: 'TEXT' },
        ],
      },
      {
        name: 'leave_records',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'suspect_id', type: 'INTEGER', fk: 'suspects.id' },
          { name: 'leave_from', type: 'TEXT' },
          { name: 'leave_to', type: 'TEXT' },
          { name: 'reason', type: 'TEXT' },
        ],
      },
      {
        name: 'digitisation_queue',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'file_id', type: 'INTEGER', fk: 'case_files.id' },
          { name: 'queued_by', type: 'TEXT' },
          { name: 'scheduled_date', type: 'TEXT' },
          { name: 'status', type: 'TEXT' },
        ],
      },
      {
        name: 'coroner_reports',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'victim', type: 'TEXT' },
          { name: 'tod_from', type: 'TEXT' },
          { name: 'tod_to', type: 'TEXT' },
          { name: 'injury', type: 'TEXT' },
        ],
      },
    ],
  },

  report: {
    template:
      'Hollis Wray died over a file that was never meant to be scanned. Of everything signed out of the vault that day, only {{file}} has no return line — it went out at 19:14 and never came back. The ledger credits that sign-out to {{borrowedName}}, a clerk who was on approved leave and out of the country all week, so the entry was written in a borrowed hand. The door scans settle it: {{killer}} was the only person inside the vault when that line was written, having badged in at {{scanTime}} and out at 19:36 — straddling the coroner’s window. Wray had the file queued for digitisation on {{scheduled}}, and it had to disappear before he reached it.',
    blanks: {
      file: {
        label: 'the file that never came back',
        targetValue: 'BX-1207',
        unlockedByColumn: 'file_code',
        triggerValue: 'BX-1207',
        options: ['BX-1140', 'BX-1207', 'BX-1315', 'BX-1488'],
        provingQuery: `
          SELECT f.file_code, f.subject, v.signed_out_by, v.signed_out_time, v.returned_time
          FROM vault_ledger v JOIN case_files f ON f.id = v.file_id
          WHERE v.returned_time IS NULL
        `,
        hint: 'A sign-out with no return leaves returned_time empty — look for IS NULL in vault_ledger.',
      },
      borrowedName: {
        label: 'the name in the ledger',
        targetValue: 'Dov Lantry',
        // Keyed on the leave date, not the name: the name is visible on the
        // unreturned ledger row, so triggering on it would unlock this blank
        // for free. The player must join leave_records to prove the signer
        // couldn't have been holding the pen.
        unlockedByColumn: 'leave_from',
        triggerValue: '2026-08-31',
        options: ['Perrin Oyelaran', 'Dov Lantry', 'Casimir Boyle', 'Neve Abara'],
        provingQuery: `
          SELECT v.signed_out_by, l.leave_from, l.leave_to, l.reason
          FROM vault_ledger v
          JOIN suspects s ON s.name = v.signed_out_by
          JOIN leave_records l ON l.suspect_id = s.id
          WHERE v.returned_time IS NULL
        `,
        hint: 'Join the unreturned ledger row to leave_records — the signer was away that week.',
      },
      killer: {
        label: 'the killer',
        targetValue: 'Ingrid Sahl',
        unlockedByColumn: 'name',
        triggerValue: 'Ingrid Sahl',
        options: ['Sabine Marchetti', 'Ingrid Sahl', 'Casimir Boyle', 'Neve Abara'],
        provingQuery: `
          SELECT s.name, d.scan_time AS entered, (
            SELECT MIN(o.scan_time) FROM door_scans o
            WHERE o.badge_id = d.badge_id AND o.direction = 'OUT'
              AND o.scan_time > d.scan_time
          ) AS left_at
          FROM door_scans d JOIN suspects s ON s.badge_id = d.badge_id
          WHERE d.direction = 'IN'
            AND d.scan_time <= '19:14'
            AND (
              SELECT MIN(o.scan_time) FROM door_scans o
              WHERE o.badge_id = d.badge_id AND o.direction = 'OUT'
                AND o.scan_time > d.scan_time
            ) >= '19:14'
        `,
        hint: 'Several people were in the vault that evening. Who was badged IN before 19:14 and had not badged OUT again until after it?',
      },
      scanTime: {
        label: 'when they badged in',
        targetValue: '19:08',
        unlockedByColumn: 'scan_time',
        triggerValue: '19:08',
        options: ['17:48', '19:08', '19:14', '19:52'],
        provingQuery: `
          SELECT s.name, d.direction, d.scan_time
          FROM door_scans d JOIN suspects s ON s.badge_id = d.badge_id
          WHERE s.name = 'Ingrid Sahl' AND d.direction = 'IN' AND d.scan_time > '19:00'
        `,
        hint: 'Filter door_scans to the killer’s badge for the IN scan just before the ledger entry.',
      },
      scheduled: {
        label: 'the digitisation date',
        targetValue: '2026-09-04',
        unlockedByColumn: 'scheduled_date',
        triggerValue: '2026-09-04',
        options: ['2026-09-01', '2026-09-02', '2026-09-04', '2026-09-11'],
        provingQuery: `
          SELECT f.file_code, q.scheduled_date, q.status
          FROM digitisation_queue q JOIN case_files f ON f.id = q.file_id
          WHERE f.file_code = 'BX-1207'
        `,
        hint: 'Look up the missing file in digitisation_queue — it was due to be scanned days later.',
      },
    },
  },
}
