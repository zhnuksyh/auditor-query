// @ts-check
/**
 * CASE 09: "RESTORE POINT"
 *
 * IT operations: backup and recovery, the one ITGC domain no earlier case
 * touches. Ellery Mutual's weekly backups all reported Success in Q3, and the
 * single failed job was re-run the next day. When ransomware hit in October a
 * Critical system was restored and weeks of data were gone.
 *
 * The player must:
 *   1. Check for failed jobs, as Operations did: one, re-run the next day. The
 *      obvious query points at the wrong system.
 *   2. Use a CTE (WITH ... AS) to work out each system's typical backup size,
 *      then find Success jobs that wrote a tiny fraction of it. One Critical
 *      system has written 12 MB a week since mid-August instead of ~1.2 TB.
 *   3. Take the last full backup before that as the real recovery point.
 *   4. Check the restore tests: that system's Q3 test was postponed, so the
 *      last one that passed was in May.
 *
 * Deductive shape: the first obvious query (failed jobs) returns one explained
 * failure on a different system. Critical systems without a passed Q3 restore
 * test returns two; only the intersection with the hollow backups explains the
 * loss. The realism dial is that a control can report green while operating on
 * nothing: status is a claim, size is the evidence.
 */

/** @type {import('../types.js').PlayableCase} */
export const case09 = {
  id: 'case_09',
  code: 'CODE_09',
  tag: 'OPERATIONS',
  title: 'Restore Point',
  teaser:
    'Every backup reported success, every week, all quarter. Then ransomware came, and the restore brought back a system seven weeks out of date.',
  folderTheme: 'continuity',
  locked: true,

  engagement: {
    vitals: [
      { term: 'Control', line1: 'ITGC-O02: Backup and recovery', line2: 'Weekly full backups, quarterly restore tests' },
      { term: 'System', line1: 'Ellery Mutual: data centre', line2: 'Four systems in scope' },
      { term: 'Audit period', line1: 'Q3: 1 July – 30 September 2026', line2: 'Backup jobs and restore tests' },
    ],
    report: `Ellery Mutual is an insurer, and its control ITGC-O02 covers backup and recovery. Every system takes a FULL BACKUP every Sunday night. Each system also has a RECOVERY POINT OBJECTIVE, or RPO: the most data the business can afford to lose if it has to restore. For a Critical system the RPO is seven days, which the weekly full backup is meant to guarantee.

Backup jobs are watched by a monitoring tool that raises an alert whenever a job fails, and every failure is investigated and re-run. Each Critical system must also pass a RESTORE TEST every quarter, because a backup that nobody has restored is a hope, not a control. Operations reported ITGC-O02 green for Q3: every Critical system's weekly backup completed, the one failed job in the quarter was re-run the next morning, and restore testing was described as "in hand".

On Monday 5 October, ransomware encrypted one of Ellery's Critical systems. It was restored from backup, and weeks of data were gone.

A job that reports Success has not necessarily backed anything up; the size of what it wrote is the evidence. You have the systems, every weekly backup job in Q3 with its status and the megabytes it wrote, and the restore tests. Find the system whose backups were hollow, when they went hollow, the last backup that could genuinely restore it, and when it last passed a restore test.`,
  },

  schemaSql: `
    CREATE TABLE systems (
      id INTEGER PRIMARY KEY,
      name TEXT,
      criticality TEXT,        -- 'Critical' or 'Standard'
      rpo_days INTEGER,
      owner TEXT
    );
    INSERT INTO systems (id, name, criticality, rpo_days, owner) VALUES
      (1, 'ClaimsDB',   'Critical', 7,  'Claims IT'),
      (2, 'DocuVault',  'Critical', 7,  'Records Management'),
      (3, 'HR Payroll', 'Critical', 7,  'People Systems'),
      (4, 'Intranet',   'Standard', 30, 'Digital');

    -- Every weekly full backup in Q3. Monitoring alerts on status = 'Failed'
    -- and on nothing else.
    CREATE TABLE backup_jobs (
      id INTEGER PRIMARY KEY,
      system_id INTEGER REFERENCES systems(id),
      run_date TEXT,
      status TEXT,             -- 'Success' or 'Failed'
      mb_written INTEGER
    );

    -- Thirteen Sundays, 5 July to 27 September. DocuVault's storage moved on
    -- 10 August and its job kept backing up the old, now empty, mount point.
    WITH RECURSIVE week(n, run_date) AS (
      SELECT 0, '2026-07-05'
      UNION ALL
      SELECT n + 1, date(run_date, '+7 days') FROM week WHERE n < 12
    )
    INSERT INTO backup_jobs (system_id, run_date, status, mb_written)
    SELECT 1, run_date, 'Success', 412000 + n * 1500 FROM week
    UNION ALL
    SELECT 2, run_date, 'Success',
           CASE WHEN run_date < '2026-08-16' THEN 1228000 + n * 2000 ELSE 12 END
    FROM week
    UNION ALL
    SELECT 3, run_date,
           CASE WHEN run_date = '2026-08-02' THEN 'Failed' ELSE 'Success' END,
           CASE WHEN run_date = '2026-08-02' THEN 0 ELSE 81000 + n * 200 END
    FROM week
    UNION ALL
    SELECT 4, run_date, 'Success', 20500 FROM week;

    -- The one failure, re-run the next morning.
    INSERT INTO backup_jobs (system_id, run_date, status, mb_written) VALUES
      (3, '2026-08-03', 'Success', 82000);

    -- Quarterly restore tests. Only Critical systems require one.
    CREATE TABLE restore_tests (
      id INTEGER PRIMARY KEY,
      system_id INTEGER REFERENCES systems(id),
      test_date TEXT,
      result TEXT,             -- 'Success', 'Failed' or 'Postponed'
      note TEXT
    );
    INSERT INTO restore_tests (id, system_id, test_date, result, note) VALUES
      (1, 2, '2026-05-14', 'Success',   'Q2 test, full restore to DR'),
      (2, 1, '2026-05-20', 'Success',   'Q2 test'),
      (3, 3, '2026-06-11', 'Success',   'Q2 test'),
      (4, 1, '2026-08-20', 'Success',   'Q3 test'),
      (5, 3, '2026-09-03', 'Failed',    'Restore target out of disk, retest booked'),
      (6, 2, '2026-09-24', 'Postponed', 'Change freeze, moved to Q4');
  `,

  erd: {
    tables: [
      {
        name: 'systems',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'name', type: 'TEXT' },
          { name: 'criticality', type: 'TEXT' },
          { name: 'rpo_days', type: 'INTEGER' },
          { name: 'owner', type: 'TEXT' },
        ],
      },
      {
        name: 'backup_jobs',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'system_id', type: 'INTEGER', fk: 'systems.id' },
          { name: 'run_date', type: 'TEXT' },
          { name: 'status', type: 'TEXT' },
          { name: 'mb_written', type: 'INTEGER' },
        ],
      },
      {
        name: 'restore_tests',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'system_id', type: 'INTEGER', fk: 'systems.id' },
          { name: 'test_date', type: 'TEXT' },
          { name: 'result', type: 'TEXT' },
          { name: 'note', type: 'TEXT' },
        ],
      },
    ],
  },

  report: {
    template:
      'Control ITGC-O02 reported green all quarter, but {{hollowSystem}} was not being backed up. From {{hollowSince}} its weekly full backup reported Success while writing almost nothing, and monitoring only alerts on failure. When ransomware struck, the newest usable backup was from {{lastGood}}, far outside a seven-day RPO. The restore test that would have exposed it was postponed; the last one it passed was on {{lastRestore}}.',
    blanks: {
      hollowSystem: {
        label: 'the system with hollow backups',
        targetValue: 'DocuVault',
        unlockedByColumn: 'hollow_system',
        triggerValue: 'DocuVault',
        options: ['ClaimsDB', 'DocuVault', 'HR Payroll', 'Intranet'],
        // Which system went hollow and from when come out of one grouped row.
        coUnlocksWith: 'hollowSince',
        provingQuery: `
          WITH typical AS (
            SELECT system_id, AVG(mb_written) AS avg_mb
            FROM backup_jobs WHERE status = 'Success'
            GROUP BY system_id
          )
          SELECT s.name AS hollow_system, MIN(b.run_date) AS hollow_since, COUNT(*) AS hollow_runs
          FROM backup_jobs b
          JOIN typical t ON t.system_id = b.system_id
          JOIN systems s ON s.id = b.system_id
          WHERE b.status = 'Success' AND b.mb_written < t.avg_mb * 0.1
          GROUP BY s.name
        `,
        hint: 'Failed jobs will not find it. Use WITH typical AS (...) to compute each system’s average mb_written for successful jobs, then look for Success jobs that wrote a tiny fraction of that. Alias the system AS hollow_system and MIN(run_date) AS hollow_since.',
      },
      hollowSince: {
        label: 'when the backups went hollow',
        targetValue: '2026-08-16',
        unlockedByColumn: 'hollow_since',
        triggerValue: '2026-08-16',
        options: ['2026-08-02', '2026-08-09', '2026-08-16', '2026-09-24'],
        coUnlocksWith: 'hollowSystem',
        provingQuery: `
          WITH typical AS (
            SELECT system_id, AVG(mb_written) AS avg_mb
            FROM backup_jobs WHERE status = 'Success'
            GROUP BY system_id
          )
          SELECT s.name AS hollow_system, MIN(b.run_date) AS hollow_since, COUNT(*) AS hollow_runs
          FROM backup_jobs b
          JOIN typical t ON t.system_id = b.system_id
          JOIN systems s ON s.id = b.system_id
          WHERE b.status = 'Success' AND b.mb_written < t.avg_mb * 0.1
          GROUP BY s.name
        `,
        hint: 'The same row: the first hollow run, MIN(run_date), aliased AS hollow_since.',
      },
      lastGood: {
        label: 'the last usable backup',
        targetValue: '2026-08-09',
        unlockedByColumn: 'last_good_backup',
        triggerValue: '2026-08-09',
        options: ['2026-07-05', '2026-08-09', '2026-08-16', '2026-09-27'],
        provingQuery: `
          SELECT MAX(b.run_date) AS last_good_backup
          FROM backup_jobs b JOIN systems s ON s.id = b.system_id
          WHERE s.name = 'DocuVault' AND b.status = 'Success'
            AND b.run_date < '2026-08-16'
        `,
        hint: 'The last full backup of that system before it went hollow. Alias MAX(run_date) AS last_good_backup.',
      },
      lastRestore: {
        label: 'its last successful restore test',
        targetValue: '2026-05-14',
        unlockedByColumn: 'last_restore_ok',
        triggerValue: '2026-05-14',
        options: ['2026-05-14', '2026-08-20', '2026-09-03', '2026-09-24'],
        provingQuery: `
          SELECT MAX(r.test_date) AS last_restore_ok
          FROM restore_tests r JOIN systems s ON s.id = r.system_id
          WHERE s.name = 'DocuVault' AND r.result = 'Success'
        `,
        hint: 'Join restore_tests to systems for that system and keep only tests that passed. Alias MAX(test_date) AS last_restore_ok.',
      },
    },
  },
}
