// @ts-check
/**
 * CASE 05: "BOTH SIDES"
 *
 * Segregation of duties in a finance system. Castellan Foods' ERP must never
 * let one person both maintain supplier bank details and approve payments.
 * Three users hold both roles anyway. One holds them under an approved SoD
 * exception with a mitigating control. The question is not who COULD abuse
 * the conflict, but who DID.
 *
 * The player must:
 *   1. Find the users holding both Vendor Maintain and Payment Approve: three.
 *   2. Find who EXERCISED the conflict: changed a vendor, then approved payments
 *      to that same vendor. Two users did.
 *   3. Remove the one with an approved SoD exception (an explained deviation).
 *   4. SUM only the self-approved payments made after the change. Summing every
 *      payment to that vendor gives a wrong total, because an earlier payment
 *      was approved by someone else before the bank details changed.
 *   5. TEXT join the vendor's bank account to the payroll bank details HR holds
 *      for staff: the supplier's new account is the user's own.
 *
 * Deductive shape: role holders (3) intersected with exercisers (2) minus the
 * approved exception leaves one. The realism dial is CONFLICT HELD versus
 * CONFLICT EXERCISED, plus a mitigated exception as the decoy.
 */

/** @type {import('../types.js').PlayableCase} */
export const case05 = {
  id: 'case_05',
  code: 'CODE_05',
  tag: 'FINANCE',
  title: 'Both Sides',
  teaser:
    'Three people could change a supplier’s bank details and approve its payments. Holding both keys is a risk. Only one of them turned both.',
  folderTheme: 'finance',
  locked: true,

  engagement: {
    vitals: [
      { term: 'Control', line1: 'ITGC-A09: Segregation of duties', line2: 'Vendor Maintain and Payment Approve kept apart' },
      { term: 'System', line1: 'Castellan Foods: Ledgerline', line2: 'ERP accounts payable' },
      { term: 'Audit period', line1: '1 June – 31 August 2026', line2: 'Vendor changes and payments' },
    ],
    report: `Castellan Foods pays its suppliers from Ledgerline, its ERP system. Two roles in Ledgerline must never sit with the same person. VENDOR MAINTAIN can create suppliers and change their bank details. PAYMENT APPROVE releases payments to them. Together they let one person point a supplier's payments at any account they like and then approve the money themselves. Keeping them apart is SEGREGATION OF DUTIES, and it is control ITGC-A09.

Sometimes a small team cannot avoid the overlap. Then the Finance Director may approve an SOD EXCEPTION, recorded with a MITIGATING CONTROL such as an independent monthly review of that person's vendor changes. A user who holds both roles under an approved exception is not a finding on their own.

Holding a conflict is also not the same as using it. Auditors separate a conflict that exists on paper from one that was EXERCISED: the same person on both sides of a real transaction. That means a user who changed a supplier's details and then approved payments to that same supplier.

Treasury has raised a concern about supplier bank details being changed and then paid within days. You have the users, their roles, the approved SoD exceptions, the vendor master, every change made to it, the payments, and the payroll bank details HR holds for each employee. Find who used both halves of the conflict without an exception, which supplier they changed, how much they approved to it themselves after the change, and whose account the money reached.`,
  },

  schemaSql: `
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      username TEXT,
      name TEXT,
      department TEXT
    );
    INSERT INTO users (id, username, name, department) VALUES
      (1, 'r.castell',  'Rhea Castell',  'Accounts Payable'),
      (2, 's.byrne',    'Sean Byrne',    'Accounts Payable'),
      (3, 't.okoro',    'Tunde Okoro',   'Procurement'),
      (4, 'v.lindgren', 'Vera Lindgren', 'Finance'),
      (5, 'w.haddad',   'Wael Haddad',   'Accounts Payable'),
      (6, 'y.marsh',    'Yvette Marsh',  'Treasury'),
      (7, 'z.pell',     'Zoe Pell',      'Procurement');

    CREATE TABLE role_assignments (
      id INTEGER PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      role TEXT
    );
    INSERT INTO role_assignments (id, user_id, role) VALUES
      (1,  1, 'Payment Approve'),
      (2,  1, 'Invoice Entry'),
      (3,  2, 'Vendor Maintain'),
      (4,  2, 'Payment Approve'),     -- conflict held
      (5,  3, 'Vendor Maintain'),
      (6,  3, 'Payment Approve'),     -- conflict held, under an exception
      (7,  4, 'Payment Approve'),
      (8,  5, 'Vendor Maintain'),
      (9,  5, 'Payment Approve'),     -- conflict held
      (10, 5, 'Invoice Entry'),
      (11, 6, 'Payment Approve'),
      (12, 7, 'Vendor Maintain');

    -- Approved SoD exceptions, each with its mitigating control.
    CREATE TABLE sod_exceptions (
      id INTEGER PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      conflict TEXT,
      mitigating_control TEXT,
      approved_by INTEGER REFERENCES users(id),
      expires_on TEXT
    );
    INSERT INTO sod_exceptions (id, user_id, conflict, mitigating_control, approved_by, expires_on) VALUES
      (1, 3, 'Vendor Maintain + Payment Approve', 'Monthly independent review of vendor changes', 4, '2026-12-31');

    -- The vendor master as it stands today.
    CREATE TABLE vendors (
      id INTEGER PRIMARY KEY,
      vendor_name TEXT,
      bank_account TEXT,       -- 'sort code account number'
      created_on TEXT
    );
    INSERT INTO vendors (id, vendor_name, bank_account, created_on) VALUES
      (1, 'Harrow Packaging',      '40-11-62 19283746', '2024-02-01'),
      (2, 'Ardent Facilities Ltd', '20-45-17 83310492', '2023-09-14'),
      (3, 'Kelso Dairy',           '60-02-33 55512908', '2022-05-30'),
      (4, 'Merrow Logistics',      '30-90-81 44120937', '2024-11-12');

    -- Every change made to the vendor master in the period.
    CREATE TABLE vendor_changes (
      id INTEGER PRIMARY KEY,
      vendor_id INTEGER REFERENCES vendors(id),
      field TEXT,
      new_value TEXT,
      changed_by INTEGER REFERENCES users(id),
      changed_on TEXT
    );
    INSERT INTO vendor_changes (id, vendor_id, field, new_value, changed_by, changed_on) VALUES
      (1, 1, 'address',       'Unit 4, Brook Park',   2, '2026-07-08'),
      (2, 2, 'bank_account',  '20-45-17 83310492',    5, '2026-07-21'),
      (3, 3, 'bank_account',  '60-02-33 55512908',    3, '2026-08-02'),
      (4, 4, 'contact_email', 'accounts@merrow.test', 7, '2026-07-30');

    CREATE TABLE payments (
      id INTEGER PRIMARY KEY,
      vendor_id INTEGER REFERENCES vendors(id),
      amount INTEGER,
      approved_by INTEGER REFERENCES users(id),
      paid_on TEXT
    );
    INSERT INTO payments (id, vendor_id, amount, approved_by, paid_on) VALUES
      (1, 2, 6300,  6, '2026-06-19'),   -- Ardent, before the change, approved by someone else
      (2, 1, 8200,  1, '2026-07-10'),
      (3, 2, 12400, 5, '2026-07-24'),
      (4, 3, 5600,  3, '2026-08-05'),   -- exercised, but under an approved exception
      (5, 2, 14850, 5, '2026-08-07'),
      (6, 1, 9100,  4, '2026-08-12'),
      (7, 2, 11200, 5, '2026-08-21'),
      (8, 4, 7750,  6, '2026-08-25');

    -- Staff bank details held by HR for payroll.
    CREATE TABLE payroll_accounts (
      id INTEGER PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      bank_account TEXT
    );
    INSERT INTO payroll_accounts (id, user_id, bank_account) VALUES
      (1, 1, '11-30-52 20194837'),
      (2, 2, '09-01-28 77301256'),
      (3, 3, '40-11-62 88420915'),
      (4, 4, '23-14-70 61039482'),
      (5, 5, '20-45-17 83310492'),
      (6, 6, '60-02-33 10928374'),
      (7, 7, '77-91-04 30561284');
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
        name: 'role_assignments',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'user_id', type: 'INTEGER', fk: 'users.id' },
          { name: 'role', type: 'TEXT' },
        ],
      },
      {
        name: 'sod_exceptions',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'user_id', type: 'INTEGER', fk: 'users.id' },
          { name: 'conflict', type: 'TEXT' },
          { name: 'mitigating_control', type: 'TEXT' },
          { name: 'approved_by', type: 'INTEGER', fk: 'users.id' },
          { name: 'expires_on', type: 'TEXT' },
        ],
      },
      {
        name: 'vendors',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'vendor_name', type: 'TEXT' },
          { name: 'bank_account', type: 'TEXT' },
          { name: 'created_on', type: 'TEXT' },
        ],
      },
      {
        name: 'vendor_changes',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'vendor_id', type: 'INTEGER', fk: 'vendors.id' },
          { name: 'field', type: 'TEXT' },
          { name: 'new_value', type: 'TEXT' },
          { name: 'changed_by', type: 'INTEGER', fk: 'users.id' },
          { name: 'changed_on', type: 'TEXT' },
        ],
      },
      {
        name: 'payments',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'vendor_id', type: 'INTEGER', fk: 'vendors.id' },
          { name: 'amount', type: 'INTEGER' },
          { name: 'approved_by', type: 'INTEGER', fk: 'users.id' },
          { name: 'paid_on', type: 'TEXT' },
        ],
      },
      {
        name: 'payroll_accounts',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'user_id', type: 'INTEGER', fk: 'users.id' },
          { name: 'bank_account', type: 'TEXT' },
        ],
      },
    ],
  },

  report: {
    template:
      'Control ITGC-A09 failed, and the conflict was exercised. {{selfApprover}} held Vendor Maintain and Payment Approve with no approved exception. They changed the bank details of {{vendor}}, then approved {{total}} of payments to it themselves. The new bank account matched the payroll account HR holds for {{holder}}.',
    blanks: {
      selfApprover: {
        label: 'who exercised the conflict',
        targetValue: 'Wael Haddad',
        unlockedByColumn: 'self_approver',
        triggerValue: 'Wael Haddad',
        options: ['Sean Byrne', 'Tunde Okoro', 'Wael Haddad', 'Rhea Castell'],
        // Who self-approved and how much are one SUM ... HAVING row.
        coUnlocksWith: 'total',
        provingQuery: `
          SELECT u.name AS self_approver, v.vendor_name, SUM(p.amount) AS self_approved_total
          FROM vendor_changes vc
          JOIN payments p ON p.vendor_id = vc.vendor_id
                         AND p.approved_by = vc.changed_by
                         AND p.paid_on >= vc.changed_on
          JOIN users u ON u.id = vc.changed_by
          JOIN vendors v ON v.id = vc.vendor_id
          WHERE vc.changed_by NOT IN (SELECT user_id FROM sod_exceptions)
          GROUP BY u.name, v.vendor_name
          HAVING SUM(p.amount) > 0
        `,
        hint: 'Join vendor_changes to payments on the same vendor where the approver is the person who made the change. Leave out anyone in sod_exceptions, then GROUP BY person with SUM(amount). Alias the name AS self_approver and the SUM AS self_approved_total.',
      },
      total: {
        label: 'how much they approved themselves',
        targetValue: '£38,450',
        unlockedByColumn: 'self_approved_total',
        triggerValue: 38450,
        options: ['£12,400', '£38,450', '£44,750', '£5,600'],
        coUnlocksWith: 'selfApprover',
        provingQuery: `
          SELECT u.name AS self_approver, v.vendor_name, SUM(p.amount) AS self_approved_total
          FROM vendor_changes vc
          JOIN payments p ON p.vendor_id = vc.vendor_id
                         AND p.approved_by = vc.changed_by
                         AND p.paid_on >= vc.changed_on
          JOIN users u ON u.id = vc.changed_by
          JOIN vendors v ON v.id = vc.vendor_id
          WHERE vc.changed_by NOT IN (SELECT user_id FROM sod_exceptions)
          GROUP BY u.name, v.vendor_name
          HAVING SUM(p.amount) > 0
        `,
        hint: 'The same row. Count only payments they approved after their own change, not every payment to the vendor. Alias it AS self_approved_total.',
      },
      vendor: {
        label: 'the supplier they changed',
        targetValue: 'Ardent Facilities Ltd',
        unlockedByColumn: 'changed_vendor',
        triggerValue: 'Ardent Facilities Ltd',
        options: ['Harrow Packaging', 'Ardent Facilities Ltd', 'Kelso Dairy', 'Merrow Logistics'],
        provingQuery: `
          SELECT v.vendor_name AS changed_vendor, vc.field, vc.new_value, vc.changed_on
          FROM vendor_changes vc
          JOIN vendors v ON v.id = vc.vendor_id
          JOIN users u ON u.id = vc.changed_by
          WHERE u.name = 'Wael Haddad'
        `,
        hint: 'Join vendor_changes to vendors for that person’s change. Alias the supplier AS changed_vendor.',
      },
      holder: {
        label: 'whose account received it',
        targetValue: 'Wael Haddad',
        unlockedByColumn: 'account_holder',
        triggerValue: 'Wael Haddad',
        options: ['Tunde Okoro', 'Sean Byrne', 'Wael Haddad', 'Rhea Castell'],
        provingQuery: `
          SELECT v.vendor_name, v.bank_account, u.name AS account_holder
          FROM vendors v
          JOIN payroll_accounts pa ON pa.bank_account = v.bank_account
          JOIN users u ON u.id = pa.user_id
        `,
        hint: 'Join vendors to payroll_accounts ON the bank_account text itself: does any supplier share an account with a member of staff? Alias the staff name AS account_holder.',
      },
    },
  },
}
