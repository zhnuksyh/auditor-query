// @ts-check
/**
 * CASE 07: "TWO AT ONCE"
 *
 * Privileged access. Gilmour Retail's generic admin accounts may only be used
 * through the password vault: one checkout, one person, one workstation. On the
 * night audit logging was switched off, the database log names an account, not
 * a person. The finding is that it cannot name a person, because that account's
 * password was in use outside the vault.
 *
 * The player must:
 *   1. SELF-JOIN privileged_sessions: the same account, the same night, two
 *      different workstations, overlapping times. Only db_admin on 10 September.
 *   2. Read the vault: who legitimately checked db_admin out that evening.
 *   3. EXCEPT: every workstation that ran a privileged session, minus those
 *      covered by a vault checkout made by the workstation's own user. One
 *      workstation is left.
 *   4. Join that workstation to its assigned owner.
 *
 * Deductive shape: generic-account sessions that evening come from four
 * workstations. The self-join narrows it to two overlapping sessions, and the
 * vault tells the legitimate one from the other. The realism dial is JOINING
 * IDENTITIES: an account is not a person, and a workstation is the only link
 * from one to the other.
 */

/** @type {import('../types.js').PlayableCase} */
export const case07 = {
  id: 'case_07',
  code: 'CODE_07',
  tag: 'PRIVILEGE',
  title: 'Two at Once',
  teaser:
    'Audit logging went dark for forty minutes and 1,940 gift cards grew richer. The log names the account that did it. The account belongs to nobody.',
  folderTheme: 'access',
  locked: true,

  engagement: {
    vitals: [
      { term: 'Control', line1: 'ITGC-A11: Privileged access', line2: 'Generic accounts via the vault only' },
      { term: 'System', line1: 'Gilmour Retail: Store Ledger', line2: 'Tills, stock and gift cards' },
      { term: 'Audit period', line1: '8 – 11 September 2026', line2: 'All privileged sessions' },
    ],
    report: `Gilmour Retail runs its tills, stock and gift cards on Store Ledger, a database with a handful of GENERIC ADMIN ACCOUNTS: powerful logins, such as db_admin and sysops, that belong to no single person. Generic accounts are dangerous because their logs name the account, not the human. So Gilmour's control ITGC-A11 says a generic account may only be used through the PASSWORD VAULT. An engineer checks the account out for a stated window, the vault records who, and the password changes when the window closes. One checkout, one person, one workstation. Every engineer works from a workstation assigned to them.

On the evening of Thursday 10 September, audit logging on Store Ledger was switched off for forty minutes. While it was off, 1,940 gift cards had their balances raised. The database audit log records what each generic account did and when. It does not record who.

If a generic account's password is known outside the vault, two people can be logged into it at once, and nothing can tell you which of them acted. That is exactly the failure this control exists to prevent.

You have the staff, their workstations, the vault checkouts, every privileged session with its source workstation and times, and the database audit log. Find which account was in use from two places at once, who had legitimately checked it out, which workstation was using it with no checkout, and whose workstation that is.`,
  },

  schemaSql: `
    CREATE TABLE staff (
      id INTEGER PRIMARY KEY,
      name TEXT,
      team TEXT
    );
    INSERT INTO staff (id, name, team) VALUES
      (1, 'Bea Lawson',   'Database'),
      (2, 'Marco Silva',  'Database'),
      (3, 'Ade Kuti',     'Store Systems Support'),
      (4, 'Ivy Chen',     'Platform'),
      (5, 'Fergus Doyle', 'Store Systems Support');

    -- Every engineer has one assigned workstation.
    CREATE TABLE workstations (
      hostname TEXT PRIMARY KEY,
      assigned_to INTEGER REFERENCES staff(id),
      site TEXT
    );
    INSERT INTO workstations (hostname, assigned_to, site) VALUES
      ('WS-DBA-04',  1, 'Head Office'),
      ('WS-DBA-07',  2, 'Head Office'),
      ('WS-SUP-117', 3, 'Leeds Support Centre'),
      ('WS-PLT-02',  4, 'Head Office'),
      ('WS-SUP-121', 5, 'Leeds Support Centre');

    -- The password vault's record of who checked out which generic account.
    CREATE TABLE vault_checkouts (
      id INTEGER PRIMARY KEY,
      account TEXT,
      checked_out_by INTEGER REFERENCES staff(id),
      checkout_date TEXT,
      from_time TEXT,
      to_time TEXT
    );
    INSERT INTO vault_checkouts (id, account, checked_out_by, checkout_date, from_time, to_time) VALUES
      (1, 'db_admin', 2, '2026-09-08', '10:00', '11:00'),
      (2, 'sysops',   4, '2026-09-09', '14:00', '15:30'),
      (3, 'sysops',   4, '2026-09-10', '19:00', '19:45'),
      (4, 'db_admin', 1, '2026-09-10', '20:45', '22:00'),  -- the on-call DBA
      (5, 'sysops',   5, '2026-09-10', '21:15', '22:00'),
      (6, 'db_admin', 2, '2026-09-11', '09:30', '10:15');

    -- Every login to a generic admin account, with the workstation it came from.
    CREATE TABLE privileged_sessions (
      id INTEGER PRIMARY KEY,
      account TEXT,
      source_host TEXT REFERENCES workstations(hostname),
      session_date TEXT,
      start_time TEXT,
      end_time TEXT
    );
    INSERT INTO privileged_sessions (id, account, source_host, session_date, start_time, end_time) VALUES
      (1, 'db_admin', 'WS-DBA-07',  '2026-09-08', '10:05', '10:50'),
      (2, 'sysops',   'WS-PLT-02',  '2026-09-09', '14:10', '15:20'),
      (3, 'sysops',   'WS-PLT-02',  '2026-09-10', '19:05', '19:40'),
      (4, 'db_admin', 'WS-DBA-04',  '2026-09-10', '20:50', '21:40'),  -- vaulted
      (5, 'db_admin', 'WS-SUP-117', '2026-09-10', '21:02', '21:31'),  -- no checkout
      (6, 'sysops',   'WS-SUP-121', '2026-09-10', '21:20', '21:50'),  -- vaulted, alone
      (7, 'db_admin', 'WS-DBA-07',  '2026-09-11', '09:35', '10:05');

    -- The database's own audit log. It records the ACCOUNT, never the person.
    CREATE TABLE db_audit_log (
      id INTEGER PRIMARY KEY,
      account TEXT,
      action_date TEXT,
      action_time TEXT,
      action TEXT
    );
    INSERT INTO db_audit_log (id, account, action_date, action_time, action) VALUES
      (1, 'db_admin', '2026-09-08', '10:20', 'Rebuilt index on sales_2026'),
      (2, 'sysops',   '2026-09-09', '14:40', 'Rotated TLS certificate'),
      (3, 'sysops',   '2026-09-10', '19:12', 'Restarted replication'),
      (4, 'db_admin', '2026-09-10', '21:05', 'Ran nightly health check'),
      (5, 'db_admin', '2026-09-10', '21:14', 'Disabled audit logging'),
      (6, 'sysops',   '2026-09-10', '21:54', 'Audit logging restored by monitor'),
      (7, 'db_admin', '2026-09-11', '09:50', 'Vacuumed gift_cards table');
  `,

  erd: {
    tables: [
      {
        name: 'staff',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'name', type: 'TEXT' },
          { name: 'team', type: 'TEXT' },
        ],
      },
      {
        name: 'workstations',
        columns: [
          { name: 'hostname', type: 'TEXT', pk: true },
          { name: 'assigned_to', type: 'INTEGER', fk: 'staff.id' },
          { name: 'site', type: 'TEXT' },
        ],
      },
      {
        name: 'vault_checkouts',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'account', type: 'TEXT' },
          { name: 'checked_out_by', type: 'INTEGER', fk: 'staff.id' },
          { name: 'checkout_date', type: 'TEXT' },
          { name: 'from_time', type: 'TEXT' },
          { name: 'to_time', type: 'TEXT' },
        ],
      },
      {
        name: 'privileged_sessions',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'account', type: 'TEXT' },
          { name: 'source_host', type: 'TEXT', fk: 'workstations.hostname' },
          { name: 'session_date', type: 'TEXT' },
          { name: 'start_time', type: 'TEXT' },
          { name: 'end_time', type: 'TEXT' },
        ],
      },
      {
        name: 'db_audit_log',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'account', type: 'TEXT' },
          { name: 'action_date', type: 'TEXT' },
          { name: 'action_time', type: 'TEXT' },
          { name: 'action', type: 'TEXT' },
        ],
      },
    ],
  },

  report: {
    template:
      'Control ITGC-A11 failed. When audit logging was switched off, the generic account {{sharedAccount}} was open from two workstations at once, so its log cannot say who acted. One session was checked out of the vault by {{onCall}}. The other came from {{host}}, the workstation assigned to {{owner}}, with no vault checkout at all: the password was known outside the vault.',
    blanks: {
      sharedAccount: {
        label: 'the shared account',
        targetValue: 'db_admin',
        unlockedByColumn: 'shared_account',
        triggerValue: 'db_admin',
        options: ['db_admin', 'sysops', 'backup_svc', 'app_reader'],
        provingQuery: `
          SELECT a.account AS shared_account, a.source_host AS first_host,
                 b.source_host AS second_host, a.session_date,
                 a.start_time, a.end_time, b.start_time AS second_start, b.end_time AS second_end
          FROM privileged_sessions a
          JOIN privileged_sessions b
            ON b.account = a.account AND b.session_date = a.session_date
           AND a.id < b.id AND a.source_host <> b.source_host
           AND a.start_time < b.end_time AND b.start_time < a.end_time
        `,
        hint: 'Join privileged_sessions to itself: same account, same date, different source_host, and the two sessions overlap (each starts before the other ends). Alias the account AS shared_account.',
      },
      onCall: {
        label: 'who checked it out legitimately',
        targetValue: 'Bea Lawson',
        unlockedByColumn: 'vault_holder',
        triggerValue: 'Bea Lawson',
        options: ['Bea Lawson', 'Marco Silva', 'Ivy Chen', 'Fergus Doyle'],
        provingQuery: `
          SELECT s.name AS vault_holder, v.from_time, v.to_time
          FROM vault_checkouts v JOIN staff s ON s.id = v.checked_out_by
          WHERE v.account = 'db_admin' AND v.checkout_date = '2026-09-10'
        `,
        hint: 'Who checked that account out of the vault that evening? Join vault_checkouts to staff. Alias the name AS vault_holder.',
      },
      host: {
        label: 'the workstation with no checkout',
        targetValue: 'WS-SUP-117',
        unlockedByColumn: 'unvaulted_host',
        triggerValue: 'WS-SUP-117',
        options: ['WS-DBA-04', 'WS-DBA-07', 'WS-SUP-117', 'WS-SUP-121'],
        provingQuery: `
          SELECT source_host AS unvaulted_host FROM privileged_sessions
          EXCEPT
          SELECT s.source_host
          FROM privileged_sessions s
          JOIN vault_checkouts v
            ON v.account = s.account AND v.checkout_date = s.session_date
           AND s.start_time >= v.from_time AND s.end_time <= v.to_time
          JOIN workstations w
            ON w.hostname = s.source_host AND w.assigned_to = v.checked_out_by
        `,
        hint: 'Take every source_host that ran a privileged session, EXCEPT those covered by a vault checkout of the same account, in the same window, made by the person the workstation belongs to. Alias the first column AS unvaulted_host.',
      },
      owner: {
        label: 'whose workstation it is',
        targetValue: 'Ade Kuti',
        unlockedByColumn: 'host_owner',
        triggerValue: 'Ade Kuti',
        options: ['Bea Lawson', 'Ade Kuti', 'Fergus Doyle', 'Marco Silva'],
        provingQuery: `
          SELECT w.hostname, s.name AS host_owner, w.site
          FROM workstations w JOIN staff s ON s.id = w.assigned_to
          WHERE w.hostname = 'WS-SUP-117'
        `,
        hint: 'Join that workstation to staff on assigned_to. Alias the name AS host_owner.',
      },
    },
  },
}
