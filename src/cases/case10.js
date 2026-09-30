// @ts-check
/**
 * CASE 10: "TOLERANCE"
 *
 * The capstone: a reliance chain. Brightmoor Construction's ERP runs an
 * automated three-way match that blocks invoices too far above their purchase
 * order. External audit tested it and relies on it, which is only safe while
 * change management (an ITGC) stops anyone altering it unnoticed. A DBA changed
 * the tolerance directly in the database, where the application's own audit
 * never saw it.
 *
 * The player must:
 *   1. Check the application's configuration audit, as management did: the
 *      tolerance changed once, 2% to 3%, under an approved ticket. Clean.
 *   2. Realise the database keeps a separate log of direct updates, and UNION
 *      ALL the two logs into one timeline for the tolerance parameter. It was
 *      set to 20% in July and back to 3% in September, with no ticket.
 *   3. Map the database account that did it to a person.
 *   4. COUNT and SUM the invoices the match passed above the APPROVED 3%.
 *      Two invoices sit just under 3% and one over-tolerance invoice was
 *      blocked after the reset, so a loose filter gives the wrong total.
 *
 * Deductive shape: the application audit alone returns no unapproved change.
 * Only combining evidence from two logs completes the population, the lesson
 * of Case 06 applied to change management. The realism dial is the RELIANCE
 * CHAIN: one ITGC failure invalidates an automated control that was tested and
 * working.
 */

/** @type {import('../types.js').PlayableCase} */
export const case10 = {
  id: 'case_10',
  code: 'CODE_10',
  tag: 'RELIANCE',
  title: 'Tolerance',
  teaser:
    'The invoice match was tested in spring and worked perfectly. Nobody changed it. The application says so. The database has its own opinion.',
  folderTheme: 'finance',
  locked: true,

  engagement: {
    vitals: [
      { term: 'Control', line1: 'ITGC-C07 and AP-03', line2: 'Config change control; three-way match' },
      { term: 'System', line1: 'Brightmoor Construction: Keystone', line2: 'ERP purchasing and payables' },
      { term: 'Audit period', line1: '1 June – 2 October 2026', line2: 'Config changes and matched invoices' },
    ],
    report: `Brightmoor Construction pays its suppliers from Keystone, its ERP. Keystone runs AP-03, an AUTOMATED CONTROL called the THREE-WAY MATCH: before an invoice is paid, Keystone compares it with the purchase order and the goods received, and blocks it if the invoice is more than a set TOLERANCE above the order. The tolerance is one configuration value. Since May it has been 3%, approved under a change ticket.

Auditors like automated controls because a machine does the same thing every time. Test one once and you can RELY on it, but only for as long as nobody can change it without anyone knowing. That is the job of ITGC-C07, change management: every change to Keystone's production configuration is made through its admin screen under an approved change ticket, and the application records it in its own configuration audit. Direct database updates to production are forbidden without an approved change. External audit tested AP-03 in the spring and has relied on it ever since.

The database administrators can still reach the database directly, and the database keeps its OWN log of direct updates, separate from the application's audit. Neither log on its own is the complete population of changes. Together they are.

Finance has noticed one supplier's bills running high all summer. You have Brightmoor's people, the database accounts and who owns them, the change tickets, the application's configuration audit, the database change log, and every invoice the match processed in the period. Find what the tolerance was really set to, who set it, how many invoices it passed above the approved tolerance, and what that cost.`,
  },

  schemaSql: `
    CREATE TABLE people (
      id INTEGER PRIMARY KEY,
      name TEXT,
      role TEXT
    );
    INSERT INTO people (id, name, role) VALUES
      (1, 'Vivian Ansell', 'Finance Systems Analyst'),
      (2, 'Kasia March',   'Database Administrator'),
      (3, 'Rohan Pillai',  'Database Administrator'),
      (4, 'Greta Lowe',    'Finance Controller'),
      (5, 'Tom Rudd',      'Accounts Payable Clerk');

    -- Database logins and the person each belongs to. Service accounts have none.
    CREATE TABLE db_accounts (
      db_user TEXT PRIMARY KEY,
      person_id INTEGER REFERENCES people(id)
    );
    INSERT INTO db_accounts (db_user, person_id) VALUES
      ('k_march',  2),
      ('r_pillai', 3),
      ('svc_etl',  NULL);

    CREATE TABLE change_tickets (
      change_ref TEXT PRIMARY KEY,
      summary TEXT,
      status TEXT,
      approved_by INTEGER REFERENCES people(id)
    );
    INSERT INTO change_tickets (change_ref, summary, status, approved_by) VALUES
      ('CHG-3301', 'Raise three-way match tolerance to 3% for freight rounding', 'Approved', 4),
      ('CHG-3342', 'Extend invoice archive to 400 days',                          'Approved', 4),
      ('CHG-3350', 'Load new cost centre list',                                    'Approved', 4);

    -- Changes made through Keystone's admin screen. The application writes this.
    CREATE TABLE app_config_audit (
      id INTEGER PRIMARY KEY,
      parameter TEXT,
      old_value TEXT,
      new_value TEXT,
      changed_by INTEGER REFERENCES people(id),
      changed_at TEXT,
      change_ref TEXT REFERENCES change_tickets(change_ref)
    );
    INSERT INTO app_config_audit (id, parameter, old_value, new_value, changed_by, changed_at, change_ref) VALUES
      (1, 'MATCH_TOLERANCE_PCT', '2',   '3',   1, '2026-05-04 10:12', 'CHG-3301'),
      (2, 'COST_CENTRE_LIST',    'v12', 'v13', 1, '2026-07-20 14:05', 'CHG-3350');

    -- Direct updates to the production database. The DATABASE writes this; the
    -- application never sees these changes.
    CREATE TABLE db_change_log (
      id INTEGER PRIMARY KEY,
      table_name TEXT,
      parameter TEXT,
      old_value TEXT,
      new_value TEXT,
      db_user TEXT REFERENCES db_accounts(db_user),
      changed_at TEXT
    );
    INSERT INTO db_change_log (id, table_name, parameter, old_value, new_value, db_user, changed_at) VALUES
      (1, 'erp_parameters', 'INVOICE_ARCHIVE_DAYS', '365',   '400',   'r_pillai', '2026-06-01 22:10'),
      (2, 'erp_parameters', 'MATCH_TOLERANCE_PCT',  '3',     '20',    'k_march',  '2026-07-03 23:41'),
      (3, 'erp_parameters', 'BATCH_WINDOW_START',   '01:00', '01:30', 'svc_etl',  '2026-08-11 01:00'),
      (4, 'erp_parameters', 'MATCH_TOLERANCE_PCT',  '20',    '3',     'k_march',  '2026-09-28 23:52');

    -- Every invoice the three-way match processed in the period.
    CREATE TABLE invoices (
      id INTEGER PRIMARY KEY,
      vendor TEXT,
      po_amount INTEGER,
      invoice_amount INTEGER,
      match_result TEXT,       -- 'Matched' (paid) or 'Blocked'
      processed_on TEXT
    );
    INSERT INTO invoices (id, vendor, po_amount, invoice_amount, match_result, processed_on) VALUES
      (1,  'Halden Steel',       48000, 49200, 'Matched', '2026-06-12'),  -- 2.5%, within 3%
      (2,  'Peak Scaffold Hire', 12500, 14000, 'Blocked', '2026-06-20'),  -- 12%, the match working
      (3,  'Orrin Aggregates',   36000, 42120, 'Matched', '2026-07-10'),
      (4,  'Halden Steel',       52000, 52000, 'Matched', '2026-07-15'),
      (5,  'Orrin Aggregates',   28500, 33060, 'Matched', '2026-07-31'),
      (6,  'Tessaly Concrete',   19000, 20520, 'Matched', '2026-08-14'),
      (7,  'Orrin Aggregates',   41000, 48790, 'Matched', '2026-08-28'),
      (8,  'Orrin Aggregates',   33000, 38280, 'Matched', '2026-09-17'),
      (9,  'Peak Scaffold Hire', 9800,  10000, 'Matched', '2026-09-21'),  -- 2.04%, within 3%
      (10, 'Orrin Aggregates',   30000, 35400, 'Blocked', '2026-10-02');  -- after the reset
  `,

  erd: {
    tables: [
      {
        name: 'people',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'name', type: 'TEXT' },
          { name: 'role', type: 'TEXT' },
        ],
      },
      {
        name: 'db_accounts',
        columns: [
          { name: 'db_user', type: 'TEXT', pk: true },
          { name: 'person_id', type: 'INTEGER', fk: 'people.id' },
        ],
      },
      {
        name: 'change_tickets',
        columns: [
          { name: 'change_ref', type: 'TEXT', pk: true },
          { name: 'summary', type: 'TEXT' },
          { name: 'status', type: 'TEXT' },
          { name: 'approved_by', type: 'INTEGER', fk: 'people.id' },
        ],
      },
      {
        name: 'app_config_audit',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'parameter', type: 'TEXT' },
          { name: 'old_value', type: 'TEXT' },
          { name: 'new_value', type: 'TEXT' },
          { name: 'changed_by', type: 'INTEGER', fk: 'people.id' },
          { name: 'changed_at', type: 'TEXT' },
          { name: 'change_ref', type: 'TEXT', fk: 'change_tickets.change_ref' },
        ],
      },
      {
        name: 'db_change_log',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'table_name', type: 'TEXT' },
          { name: 'parameter', type: 'TEXT' },
          { name: 'old_value', type: 'TEXT' },
          { name: 'new_value', type: 'TEXT' },
          { name: 'db_user', type: 'TEXT', fk: 'db_accounts.db_user' },
          { name: 'changed_at', type: 'TEXT' },
        ],
      },
      {
        name: 'invoices',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'vendor', type: 'TEXT' },
          { name: 'po_amount', type: 'INTEGER' },
          { name: 'invoice_amount', type: 'INTEGER' },
          { name: 'match_result', type: 'TEXT' },
          { name: 'processed_on', type: 'TEXT' },
        ],
      },
    ],
  },

  report: {
    template:
      'Control ITGC-C07 failed, and took automated control AP-03 down with it. The approved three-way match tolerance of 3% was raised to {{toleranceSetTo}} by a direct database update made by {{changedBy}}, with no change ticket, and put back weeks later the same way. While it stood, the match passed {{waved}} invoices above the approved tolerance, overpaying suppliers by {{excess}}. The reliance placed on AP-03 since its spring test no longer holds.',
    blanks: {
      toleranceSetTo: {
        label: 'what the tolerance was set to',
        targetValue: '20%',
        unlockedByColumn: 'tolerance_set_to',
        triggerValue: '20',
        options: ['3%', '5%', '20%', '50%'],
        provingQuery: `
          SELECT 'application' AS source, old_value, new_value AS tolerance_set_to, changed_at
          FROM app_config_audit WHERE parameter = 'MATCH_TOLERANCE_PCT'
          UNION ALL
          SELECT 'database', old_value, new_value, changed_at
          FROM db_change_log WHERE parameter = 'MATCH_TOLERANCE_PCT'
          ORDER BY changed_at
        `,
        hint: 'The application’s audit shows one approved change. Build the full timeline for MATCH_TOLERANCE_PCT: SELECT from app_config_audit, UNION ALL the same columns from db_change_log, ORDER BY changed_at. Alias new_value AS tolerance_set_to in the first SELECT.',
      },
      changedBy: {
        label: 'who changed it',
        targetValue: 'Kasia March',
        unlockedByColumn: 'changed_by_person',
        triggerValue: 'Kasia March',
        options: ['Vivian Ansell', 'Kasia March', 'Rohan Pillai', 'Greta Lowe'],
        provingQuery: `
          SELECT p.name AS changed_by_person, d.db_user, d.old_value, d.new_value, d.changed_at
          FROM db_change_log d
          JOIN db_accounts a ON a.db_user = d.db_user
          JOIN people p ON p.id = a.person_id
          WHERE d.parameter = 'MATCH_TOLERANCE_PCT'
        `,
        hint: 'Join the database change log to db_accounts and people to turn the db_user into a person. Alias the name AS changed_by_person.',
      },
      waved: {
        label: 'how many invoices it let through',
        targetValue: '5',
        unlockedByColumn: 'invoices_waved_through',
        triggerValue: 5,
        options: ['2', '5', '6', '7'],
        // The count and the cost come from the same aggregate row.
        coUnlocksWith: 'excess',
        provingQuery: `
          SELECT COUNT(*) AS invoices_waved_through,
                 SUM(invoice_amount - po_amount) AS excess_paid
          FROM invoices
          WHERE match_result = 'Matched' AND invoice_amount > po_amount * 1.03
        `,
        hint: 'Which invoices were Matched (so paid) despite being more than the APPROVED 3% above their PO? Alias COUNT(*) AS invoices_waved_through and SUM(invoice_amount - po_amount) AS excess_paid.',
      },
      excess: {
        label: 'what it cost',
        targetValue: '£25,270',
        unlockedByColumn: 'excess_paid',
        triggerValue: 25270,
        options: ['£6,120', '£25,270', '£26,670', '£32,170'],
        coUnlocksWith: 'waved',
        provingQuery: `
          SELECT COUNT(*) AS invoices_waved_through,
                 SUM(invoice_amount - po_amount) AS excess_paid
          FROM invoices
          WHERE match_result = 'Matched' AND invoice_amount > po_amount * 1.03
        `,
        hint: 'The same row. Leave out invoices within 3% and anything the match blocked. Alias the SUM AS excess_paid.',
      },
    },
  },
}
