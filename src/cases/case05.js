// @ts-check
/**
 * CASE 05 — "ZERO SUM"
 *
 * The hardest file yet. Seven tables, six suspects, and a motive buried in
 * money rather than movement. The player has to work like the victim did — a
 * forensic auditor — and the query shapes step up accordingly:
 *
 *   - The skim is spread across many small ledger_entries. Naming the amount
 *     requires GROUP BY entered_by with SUM(amount) AS skimmed_total (and a
 *     HAVING to cut the petty-cash noise) — no single row contains the answer.
 *   - The shell vendor is exposed by a TEXT JOIN: its registered_address in
 *     `vendors` matches one employee's home_address in `hr_records`.
 *   - The poisoning window comes from toxicology, and pantry_log holds several
 *     people inside it — presence alone convicts nobody; the money does.
 *
 * Two suspects were in the pantry during the dosing window, and two suspects
 * booked entries to the shell vendor. Only one person is in both sets, and the
 * address match seals it. Everything is provable with SQL — no guessing.
 */

/** @type {import('../types.js').PlayableCase} */
export const case05 = {
  id: 'case_05',
  code: 'CODE_05',
  tag: 'LEDGER',
  title: 'Zero Sum',
  teaser:
    'The auditor was three days from naming a thief. The books balance perfectly now — minus one auditor.',
  folderTheme: 'ledger',
  locked: true,

  crimeScene: {
    victim: { line1: 'Evelyn Cho, 48', line2: 'Forensic auditor' },
    location: { line1: 'Halvard & Pope, 40 Exchange Row', line2: '6th floor — audit bureau' },
    timeOfDeath: { line1: 'Dosed 08:00 – 09:30', line2: 'June 9th · died 14:10' },
    report: `Evelyn Cho collapsed at her desk at 13:55 on June 9th and was dead within the quarter hour. Toxicology found aconitine in her thermos — the tea she brewed in the office pantry every morning and sipped until lunch. Whoever dosed it did so in the pantry between 08:00 and 09:30, and the pantry door logs every badge.

Evelyn was three days from delivering an internal audit. Her working notes flag one payee: a vendor with no registration filings and invoices that never carried purchase-order numbers. The skim was patient — dozens of small entries, none big enough to trip a review, all booked to the same shell.

Shells have paperwork, and paperwork has addresses. The vendor's registered address is on file, and so — in HR's records — are the home addresses of everyone on this floor.

Several people used the pantry that morning. More than one has entries against the flagged vendor. Follow the money to its total, match the address, and only one name survives.`,
  },

  schemaSql: `
    CREATE TABLE suspects (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT,
      desk_floor INTEGER
    );
    INSERT INTO suspects (id, name, role, desk_floor) VALUES
      (1, 'Piet Halvard', 'Managing partner',        7),
      (2, 'Sonia Grey',   'Accounts-payable clerk',  6),
      (3, 'Tobias Denn',  'Payroll manager',         6),
      (4, 'Ida Brandt',   'Office manager',          6),
      (5, 'Yusuf Kade',   'IT administrator',        5),
      (6, 'Fern Wexley',  'Junior auditor',          6);

    -- Every journal entry booked this quarter. 'entered_by' is a suspect id.
    -- The skim hides in small amounts against one payee.
    CREATE TABLE ledger_entries (
      id INTEGER PRIMARY KEY,
      entered_by INTEGER REFERENCES suspects(id),
      account TEXT,
      amount INTEGER,
      entry_date TEXT,
      memo TEXT
    );
    INSERT INTO ledger_entries (id, entered_by, account, amount, entry_date, memo) VALUES
      (1,  2, 'Coastline Supply',  9800, '2026-04-14', 'Facilities consumables'),
      (2,  3, 'Payroll',          61200, '2026-04-30', 'April payroll run'),
      (3,  2, 'Brightwater Paper', 1240, '2026-04-18', 'Print stock'),
      (4,  2, 'Coastline Supply',  7400, '2026-04-28', 'Storage crates'),
      (5,  4, 'Petty Cash',         180, '2026-05-02', 'Client refreshments'),
      (6,  2, 'Coastline Supply',  8200, '2026-05-06', 'Safety equipment'),
      (7,  5, 'Kestrel IT',        3900, '2026-05-09', 'License renewal'),
      (8,  2, 'Coastline Supply',  9100, '2026-05-15', 'Pallet contract'),
      (9,  3, 'Payroll',          61200, '2026-05-30', 'May payroll run'),
      (10, 2, 'Coastline Supply',  6900, '2026-05-21', 'Site clearance'),
      (11, 4, 'Coastline Supply',   450, '2026-05-23', 'Petty-cash reconciliation'),
      (12, 2, 'Coastline Supply',  7500, '2026-06-03', 'Container hire'),
      (13, 6, 'Brightwater Paper',  310, '2026-06-04', 'Audit binders'),
      (14, 5, 'Kestrel IT',        1150, '2026-06-05', 'Spare drives');

    -- Registered vendors. A real company has filings; a shell has an address.
    CREATE TABLE vendors (
      id INTEGER PRIMARY KEY,
      vendor_name TEXT,
      registered_address TEXT,
      status TEXT
    );
    INSERT INTO vendors (id, vendor_name, registered_address, status) VALUES
      (1, 'Brightwater Paper', 'Unit 4, Mill Road',        'active'),
      (2, 'Coastline Supply',  'PO Box 119, Brant Station','no filings'),
      (3, 'Kestrel IT',        '12 Foundry Avenue',        'active');

    -- HR's personnel file: where everyone actually lives.
    CREATE TABLE hr_records (
      id INTEGER PRIMARY KEY,
      suspect_id INTEGER REFERENCES suspects(id),
      home_address TEXT,
      hire_date TEXT
    );
    INSERT INTO hr_records (id, suspect_id, home_address, hire_date) VALUES
      (1, 1, '2 Regent Crescent',          '2009-01-12'),
      (2, 2, 'PO Box 119, Brant Station',  '2018-06-01'),
      (3, 3, '31 Alder Row',               '2015-03-23'),
      (4, 4, '9 Wren Court',               '2012-09-10'),
      (5, 5, '17 Foundry Avenue, Flat 2',  '2020-11-02'),
      (6, 6, '55 Exchange Row',            '2024-02-19');

    -- Pantry badge log for the morning of June 9th.
    CREATE TABLE pantry_log (
      id INTEGER PRIMARY KEY,
      suspect_id INTEGER REFERENCES suspects(id),
      entry_time TEXT,
      exit_time TEXT
    );
    INSERT INTO pantry_log (id, suspect_id, entry_time, exit_time) VALUES
      (1, 6, '07:45', '07:55'),   -- before the window
      (2, 4, '08:05', '08:20'),   -- inside the window
      (3, 2, '08:40', '08:55'),   -- inside the window
      (4, 5, '09:05', '09:15'),   -- inside the window
      (5, 3, '10:10', '10:20');   -- after the window

    CREATE TABLE toxicology (
      id INTEGER PRIMARY KEY,
      victim TEXT,
      substance TEXT,
      ingestion_from TEXT,
      ingestion_to TEXT,
      note TEXT
    );
    INSERT INTO toxicology (id, victim, substance, ingestion_from, ingestion_to, note) VALUES
      (1, 'Evelyn Cho', 'aconitine', '08:00', '09:30',
          'Dosed into the thermos in the pantry; symptom onset roughly five hours after ingestion.');

    -- The victim's own working notes: which payees her audit had flagged.
    CREATE TABLE audit_scope (
      id INTEGER PRIMARY KEY,
      account TEXT,
      flagged TEXT,        -- 'yes' or 'no'
      note TEXT
    );
    INSERT INTO audit_scope (id, account, flagged, note) VALUES
      (1, 'Coastline Supply',  'yes', 'No registration filings; invoices lack PO numbers.'),
      (2, 'Brightwater Paper', 'no',  'Clean. Long-standing supplier.'),
      (3, 'Kestrel IT',        'no',  'Clean. Contracts on file.'),
      (4, 'Payroll',           'no',  'Reconciles to headcount.');
  `,

  erd: {
    tables: [
      {
        name: 'suspects',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'name', type: 'TEXT' },
          { name: 'role', type: 'TEXT' },
          { name: 'desk_floor', type: 'INTEGER' },
        ],
      },
      {
        name: 'ledger_entries',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'entered_by', type: 'INTEGER', fk: 'suspects.id' },
          { name: 'account', type: 'TEXT', fk: 'vendors.vendor_name' },
          { name: 'amount', type: 'INTEGER' },
          { name: 'entry_date', type: 'TEXT' },
          { name: 'memo', type: 'TEXT' },
        ],
      },
      {
        name: 'vendors',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'vendor_name', type: 'TEXT' },
          { name: 'registered_address', type: 'TEXT' },
          { name: 'status', type: 'TEXT' },
        ],
      },
      {
        name: 'hr_records',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'suspect_id', type: 'INTEGER', fk: 'suspects.id' },
          { name: 'home_address', type: 'TEXT' },
          { name: 'hire_date', type: 'TEXT' },
        ],
      },
      {
        name: 'pantry_log',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'suspect_id', type: 'INTEGER', fk: 'suspects.id' },
          { name: 'entry_time', type: 'TEXT' },
          { name: 'exit_time', type: 'TEXT' },
        ],
      },
      {
        name: 'toxicology',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'victim', type: 'TEXT' },
          { name: 'substance', type: 'TEXT' },
          { name: 'ingestion_from', type: 'TEXT' },
          { name: 'ingestion_to', type: 'TEXT' },
          { name: 'note', type: 'TEXT' },
        ],
      },
      {
        name: 'audit_scope',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'account', type: 'TEXT' },
          { name: 'flagged', type: 'TEXT' },
          { name: 'note', type: 'TEXT' },
        ],
      },
    ],
  },

  report: {
    template:
      'Evelyn died for a number. Her audit had flagged {{vendor}} — a shell with no filings, registered to {{address}}, an address that appears once more in this building: in one employee’s own HR file. The ledger shows {{killer}} routed a total of {{total}} through that shell in small, deniable entries. With the audit three days out, they laced Evelyn’s thermos in the pantry with {{substance}}, inside the dosing window toxicology fixed from {{window}} to 09:30.',
    blanks: {
      vendor: {
        label: 'the shell vendor',
        targetValue: 'Coastline Supply',
        unlockedByColumn: 'vendor_name',
        triggerValue: 'Coastline Supply',
        options: ['Brightwater Paper', 'Coastline Supply', 'Kestrel IT', 'Harbor Freight Co.'],
        provingQuery: `
          SELECT v.vendor_name, v.registered_address, v.status, a.flagged
          FROM vendors v JOIN audit_scope a ON a.account = v.vendor_name
          WHERE a.flagged = 'yes'
        `,
        hint: 'audit_scope names the flagged account; vendors shows which payee has no filings.',
      },
      address: {
        label: 'the shared address',
        targetValue: 'PO Box 119, Brant Station',
        unlockedByColumn: 'registered_address',
        triggerValue: 'PO Box 119, Brant Station',
        options: ['Unit 4, Mill Road', 'PO Box 119, Brant Station', '12 Foundry Avenue', '2 Regent Crescent'],
        provingQuery: `
          SELECT v.vendor_name, v.registered_address, s.name, h.home_address
          FROM vendors v JOIN hr_records h ON h.home_address = v.registered_address
          JOIN suspects s ON s.id = h.suspect_id
        `,
        hint: 'Join vendors.registered_address to hr_records.home_address — one pair matches.',
      },
      killer: {
        label: 'the killer',
        targetValue: 'Sonia Grey',
        unlockedByColumn: 'name',
        triggerValue: 'Sonia Grey',
        options: ['Piet Halvard', 'Sonia Grey', 'Tobias Denn', 'Ida Brandt', 'Yusuf Kade', 'Fern Wexley'],
        provingQuery: `
          SELECT s.name, SUM(l.amount) AS skimmed_total
          FROM ledger_entries l JOIN suspects s ON s.id = l.entered_by
          WHERE l.account = 'Coastline Supply'
          GROUP BY s.name
          HAVING SUM(l.amount) > 1000
        `,
        hint: 'Intersect three sets: booked entries to the shell, badged the pantry inside 08:00–09:30, and matches the vendor’s address. One name survives all three.',
      },
      total: {
        label: 'the skimmed total',
        targetValue: '48,900',
        unlockedByColumn: 'skimmed_total',
        triggerValue: 48900,
        options: ['12,400', '48,900', '61,200', '96,200'],
        provingQuery: `
          SELECT s.name, SUM(l.amount) AS skimmed_total
          FROM ledger_entries l JOIN suspects s ON s.id = l.entered_by
          WHERE l.account = 'Coastline Supply'
          GROUP BY s.name
          HAVING SUM(l.amount) > 1000
        `,
        hint: 'GROUP BY entered_by over the shell-vendor entries with SUM(amount) AS skimmed_total — use HAVING to drop the petty-cash noise.',
      },
      substance: {
        label: 'the poison',
        targetValue: 'aconitine',
        unlockedByColumn: 'substance',
        triggerValue: 'aconitine',
        options: ['aconitine', 'arsenic', 'thallium', 'cyanide'],
        provingQuery: `
          SELECT victim, substance, ingestion_from, ingestion_to FROM toxicology
        `,
        hint: 'Toxicology names what was in the thermos.',
      },
      window: {
        label: 'dosing window start',
        targetValue: '08:00',
        unlockedByColumn: 'ingestion_from',
        triggerValue: '08:00',
        options: ['07:45', '08:00', '08:40', '09:30'],
        provingQuery: `
          SELECT victim, substance, ingestion_from, ingestion_to FROM toxicology
        `,
        hint: 'Toxicology fixes when the thermos could have been dosed.',
      },
    },
  },
}
