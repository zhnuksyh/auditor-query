// @ts-check
/**
 * CASE 04: "PAPER TRAIL"
 *
 * Change management, with a misdirection. Norhaven Energy's change manager says
 * every Q2 change to the billing system was approved before it went live, and
 * every ticket agrees. The ticket's approved_at is a typed field, though; the
 * ticketing system's own audit trail says when each approval record was really
 * created.
 *
 * The player must:
 *   1. Compare approved_at with deployed_at. Only the two EMERGENCY changes show
 *      an approval after deployment, and both were retro-approved inside the
 *      two-working-day window: compliant. The obvious query clears every
 *      standard change. That is the misdirection.
 *   2. Go to the audit trail and take MIN(edited_at) per approval, aliased: the
 *      moment the approval first existed. One STANDARD change's approval was
 *      created the morning after it went live, then its approved_at typed back
 *      to the previous Monday's CAB.
 *   3. MAX(edited_at) is the wrong aggregate: CHG-7152 had a comment edited a
 *      week after deployment and would be a false positive.
 *   4. Read who created and edited that approval, and whose name it carries.
 *
 * Deductive shape: approvals first created after deployment returns three
 * changes; two are emergency changes explained by the procedure, leaving one.
 * The realism dial is TIME LOGIC and the difference between a record's stated
 * date and its system-recorded history.
 */

/** @type {import('../types.js').PlayableCase} */
export const case04 = {
  id: 'case_04',
  code: 'CODE_04',
  tag: 'CHANGE',
  title: 'Paper Trail',
  teaser:
    'Every change to the billing system carries an approval dated before it went live. The tickets say so. The tickets can be typed into.',
  folderTheme: 'change',
  locked: true,

  engagement: {
    vitals: [
      { term: 'Control', line1: 'ITGC-C03: Change approval', line2: 'CAB before deploy; emergencies within 2 days' },
      { term: 'System', line1: 'Norhaven Energy: Ampere', line2: 'Household billing, 400,000 accounts' },
      { term: 'Audit period', line1: 'Q2: 1 April – 30 June 2026', line2: 'All changes to Ampere' },
    ],
    report: `Norhaven Energy bills 400,000 households from Ampere, its billing system. In June the energy ombudsman asked why 3,100 customers had been sent bills far above anything they had used. The fault was traced to one of the changes made to Ampere's billing rules during Q2. Norhaven's change manager has told the audit committee that every one of those changes was approved before it went live, and each ticket carries an approval that says so.

The control is ITGC-C03. A STANDARD CHANGE must be approved by the CAB, which meets on Mondays, before it is deployed. An EMERGENCY CHANGE is the exception: it may be deployed first to fix a live fault, but it must be approved retrospectively by the emergency CAB within two working days. An emergency change approved after deployment is compliant, as long as the approval came in time.

Each approval record shows who approved it and an approved_at time. But approved_at is only a field: anyone with edit rights on the ticket can type into it. The ticketing system also keeps an AUDIT TRAIL of every approval record: when it was first created, every later edit, and who made each one. Nobody can edit the audit trail.

You have the staff, the Q2 changes to Ampere, their approvals and the approval audit trail. Find the change whose approval did not exist when it went live, when that approval was really first entered, whose name it carries, and who typed it in.`,
  },

  schemaSql: `
    CREATE TABLE staff (
      id INTEGER PRIMARY KEY,
      name TEXT,
      role TEXT
    );
    INSERT INTO staff (id, name, role) VALUES
      (1, 'Hester Voss',   'Change Manager, CAB chair'),
      (2, 'Callum Reid',   'Billing Developer'),
      (3, 'Ines Duarte',   'Billing Developer'),
      (4, 'Rafe Okonkwo',  'Platform Engineer'),
      (5, 'Mina Holt',     'Head of IT Operations, emergency CAB');

    -- Every change deployed to Ampere in Q2.
    CREATE TABLE changes (
      id INTEGER PRIMARY KEY,
      change_ref TEXT UNIQUE,
      summary TEXT,
      change_type TEXT,        -- 'Standard' or 'Emergency'
      implemented_by INTEGER REFERENCES staff(id),
      deployed_at TEXT         -- 'YYYY-MM-DD HH:MM'
    );
    INSERT INTO changes (id, change_ref, summary, change_type, implemented_by, deployed_at) VALUES
      (1, 'CHG-7101', 'Tariff table update',          'Standard',  3, '2026-04-01 06:00'),
      (2, 'CHG-7134', 'Meter-read import fix',        'Emergency', 4, '2026-04-16 02:15'),
      (3, 'CHG-7152', 'Payment reminder emails',      'Standard',  3, '2026-05-06 20:00'),
      (4, 'CHG-7166', 'Billing rule update BR-22',    'Standard',  2, '2026-05-14 22:30'),
      (5, 'CHG-7180', 'Restart stalled bill run',     'Emergency', 4, '2026-06-03 23:10'),
      (6, 'CHG-7192', 'Billing rule update BR-23',    'Standard',  3, '2026-06-17 19:00');

    -- The approval as the ticket shows it. approved_at is a TYPED field.
    CREATE TABLE approvals (
      id INTEGER PRIMARY KEY,
      change_ref TEXT REFERENCES changes(change_ref),
      approver INTEGER REFERENCES staff(id),
      approved_at TEXT,
      decision TEXT
    );
    INSERT INTO approvals (id, change_ref, approver, approved_at, decision) VALUES
      (1, 'CHG-7101', 1, '2026-03-30 10:00', 'Approved'),
      (2, 'CHG-7134', 5, '2026-04-17 09:30', 'Approved'),  -- emergency, retro in time
      (3, 'CHG-7152', 1, '2026-05-04 11:00', 'Approved'),
      (4, 'CHG-7166', 1, '2026-05-11 10:00', 'Approved'),  -- typed to look like CAB on the 11th
      (5, 'CHG-7180', 5, '2026-06-04 08:45', 'Approved'),  -- emergency, retro in time
      (6, 'CHG-7192', 1, '2026-06-15 10:15', 'Approved');

    -- The ticketing system's own history of every approval record. Written by
    -- the system; no user can edit it.
    CREATE TABLE approval_history (
      id INTEGER PRIMARY KEY,
      approval_id INTEGER REFERENCES approvals(id),
      action TEXT,             -- 'Created' or 'Edited'
      field TEXT,
      edited_by INTEGER REFERENCES staff(id),
      edited_at TEXT
    );
    INSERT INTO approval_history (id, approval_id, action, field, edited_by, edited_at) VALUES
      (1,  1, 'Created', NULL,          1, '2026-03-30 10:00'),
      (2,  2, 'Created', NULL,          5, '2026-04-17 09:30'),
      (3,  3, 'Created', NULL,          1, '2026-05-04 11:00'),
      (4,  3, 'Edited',  'comment',     1, '2026-05-12 14:20'),  -- after deploy, harmless
      (5,  4, 'Created', NULL,          2, '2026-05-15 09:42'),  -- the morning AFTER go-live
      (6,  4, 'Edited',  'approved_at', 2, '2026-05-15 09:44'),
      (7,  5, 'Created', NULL,          5, '2026-06-04 08:45'),
      (8,  6, 'Created', NULL,          1, '2026-06-15 10:15');
  `,

  erd: {
    tables: [
      {
        name: 'staff',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'name', type: 'TEXT' },
          { name: 'role', type: 'TEXT' },
        ],
      },
      {
        name: 'changes',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'change_ref', type: 'TEXT' },
          { name: 'summary', type: 'TEXT' },
          { name: 'change_type', type: 'TEXT' },
          { name: 'implemented_by', type: 'INTEGER', fk: 'staff.id' },
          { name: 'deployed_at', type: 'TEXT' },
        ],
      },
      {
        name: 'approvals',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'change_ref', type: 'TEXT', fk: 'changes.change_ref' },
          { name: 'approver', type: 'INTEGER', fk: 'staff.id' },
          { name: 'approved_at', type: 'TEXT' },
          { name: 'decision', type: 'TEXT' },
        ],
      },
      {
        name: 'approval_history',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'approval_id', type: 'INTEGER', fk: 'approvals.id' },
          { name: 'action', type: 'TEXT' },
          { name: 'field', type: 'TEXT' },
          { name: 'edited_by', type: 'INTEGER', fk: 'staff.id' },
          { name: 'edited_at', type: 'TEXT' },
        ],
      },
    ],
  },

  report: {
    template:
      'Control ITGC-C03 failed, and the ticket concealed it. {{changeRef}} was a standard change, and its approval is dated before deployment in the name of {{approver}}. But the audit trail shows the approval record did not exist until {{firstEntered}}, after the change was already live, and that it was created and back-dated by {{enteredBy}}, the developer who implemented the change.',
    blanks: {
      changeRef: {
        label: 'the change',
        targetValue: 'CHG-7166',
        unlockedByColumn: 'backdated_change',
        triggerValue: 'CHG-7166',
        options: ['CHG-7134', 'CHG-7152', 'CHG-7166', 'CHG-7180'],
        // The change and the moment its approval first existed are one row of
        // the same aggregate query.
        coUnlocksWith: 'firstEntered',
        provingQuery: `
          SELECT c.change_ref AS backdated_change, c.change_type, c.deployed_at,
                 a.approved_at, MIN(h.edited_at) AS first_entered
          FROM changes c
          JOIN approvals a ON a.change_ref = c.change_ref
          JOIN approval_history h ON h.approval_id = a.id
          WHERE c.change_type = 'Standard'
          GROUP BY c.change_ref
          HAVING MIN(h.edited_at) > c.deployed_at
        `,
        hint: 'approved_at clears every standard change. Use the audit trail instead: MIN(edited_at) per approval is when the record first existed. Which standard change was live before its approval was? Alias the reference AS backdated_change and the MIN AS first_entered.',
      },
      firstEntered: {
        label: 'when the approval first existed',
        targetValue: '2026-05-15 09:42',
        unlockedByColumn: 'first_entered',
        triggerValue: '2026-05-15 09:42',
        options: ['2026-05-11 10:00', '2026-05-12 14:20', '2026-05-14 22:30', '2026-05-15 09:42'],
        coUnlocksWith: 'changeRef',
        provingQuery: `
          SELECT c.change_ref AS backdated_change, c.change_type, c.deployed_at,
                 a.approved_at, MIN(h.edited_at) AS first_entered
          FROM changes c
          JOIN approvals a ON a.change_ref = c.change_ref
          JOIN approval_history h ON h.approval_id = a.id
          WHERE c.change_type = 'Standard'
          GROUP BY c.change_ref
          HAVING MIN(h.edited_at) > c.deployed_at
        `,
        hint: 'The same row: MIN(edited_at) for that approval, aliased AS first_entered. MAX would catch harmless later edits instead.',
      },
      approver: {
        label: 'whose name it carries',
        targetValue: 'Hester Voss',
        unlockedByColumn: 'named_approver',
        triggerValue: 'Hester Voss',
        options: ['Hester Voss', 'Mina Holt', 'Rafe Okonkwo', 'Ines Duarte'],
        provingQuery: `
          SELECT a.change_ref, s.name AS named_approver, a.approved_at
          FROM approvals a JOIN staff s ON s.id = a.approver
          WHERE a.change_ref = 'CHG-7166'
        `,
        hint: 'Join that approval to staff on approver. Alias the name AS named_approver.',
      },
      enteredBy: {
        label: 'who typed it in',
        targetValue: 'Callum Reid',
        unlockedByColumn: 'entered_by',
        triggerValue: 'Callum Reid',
        options: ['Hester Voss', 'Callum Reid', 'Ines Duarte', 'Mina Holt'],
        provingQuery: `
          SELECT s.name AS entered_by, h.action, h.field, h.edited_at
          FROM approval_history h
          JOIN approvals a ON a.id = h.approval_id
          JOIN staff s ON s.id = h.edited_by
          WHERE a.change_ref = 'CHG-7166'
        `,
        hint: 'Join approval_history to staff on edited_by for that approval. Alias the name AS entered_by.',
      },
    },
  },
}
