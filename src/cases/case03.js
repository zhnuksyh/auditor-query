// @ts-check
/**
 * CASE 03 — "TERMINAL VELOCITY"
 *
 * A step harder again than Case 02. Seven tables, six suspects, and two linked
 * incidents. The trick here is a PATTERN across events, which pushes the player
 * toward subqueries / GROUP BY … HAVING rather than a single filter:
 *
 *   - Two people died a week apart in the same stairwell (incidents table).
 *   - access_logs record who badged into that stairwell for each incident.
 *   - The killer is the one suspect present at BOTH incidents (intersection).
 *   - A maintenance work_orders row shows they arranged to be alone in the
 *     stairwell each time (the "camera maintenance").
 *   - badge_audit reveals their badge was cloned onto a spare, explaining how
 *     they appear to be two places at once in other logs.
 *
 * Everything remains provable with SQL — the difficulty is in the query shape,
 * not in any hidden information.
 */

/** @type {import('../types.js').PlayableCase} */
export const case03 = {
  id: 'case_03',
  code: 'CODE_03',
  tag: 'FALLING',
  title: 'Terminal Velocity',
  teaser:
    'Two falls, one week apart, the same stairwell. Coincidence has a foreign key — and only one person badged into both.',
  folderTheme: 'change',
  locked: true,

  crimeScene: {
    victim: { line1: 'Two victims — Owen Pike & Rosa Delgado', line2: 'Both employees, Meridian Tower' },
    location: { line1: 'Meridian Tower, Stairwell C', line2: 'Between the 12th and 11th landings' },
    timeOfDeath: { line1: 'Incident 1: 18:30 · Incident 2: 18:20', line2: 'April 6th & April 13th' },
    report: `Two deaths, seven days apart, in the same place: Stairwell C of Meridian Tower, on the flight between the twelfth and eleventh landings. Owen Pike on April 6th; Rosa Delgado on April 13th. Both "fell." Both around the end of the workday.

One fall is an accident. Two identical falls in the same stairwell is a pattern — and patterns have a source. The stairwell is badge-controlled: every door swipe into it is logged against the incident it happened during. Facilities also logs WORK ORDERS, and both evenings someone had a camera-maintenance order that cleared Stairwell C of witnesses for exactly the wrong ten minutes.

There's a wrinkle. Security flagged that one employee's badge was CLONED onto a spare card, so their swipes sometimes appear in two places. Don't let the decoy swipes fool you — trace who actually badged into Stairwell C on both nights.

Six people had access that week. Only one of them connects to everything: both incidents, both work orders, and the cloned badge.`,
  },

  schemaSql: `
    CREATE TABLE suspects (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      department TEXT,
      badge_id INTEGER
    );
    INSERT INTO suspects (id, name, department, badge_id) VALUES
      (1, 'Gil Auerbach', 'Facilities',  201),
      (2, 'Hana Vos',     'Finance',     202),
      (3, 'Reuben Sato',  'Security',    203),
      (4, 'Delia Frost',  'Legal',       204),
      (5, 'Amos Bright',  'Facilities',  205),
      (6, 'Cora Nunn',    'IT',          206);

    CREATE TABLE incidents (
      id INTEGER PRIMARY KEY,
      victim TEXT,
      incident_date TEXT,
      location TEXT,
      fall_time TEXT
    );
    INSERT INTO incidents (id, victim, incident_date, location, fall_time) VALUES
      (1, 'Owen Pike',    '2026-04-06', 'Stairwell C', '18:30'),
      (2, 'Rosa Delgado', '2026-04-13', 'Stairwell C', '18:20');

    -- Every badge-in to Stairwell C, tagged with which incident it occurred during.
    CREATE TABLE access_logs (
      id INTEGER PRIMARY KEY,
      suspect_id INTEGER REFERENCES suspects(id),
      incident_id INTEGER REFERENCES incidents(id),
      area TEXT,
      swipe_time TEXT
    );
    INSERT INTO access_logs (id, suspect_id, incident_id, area, swipe_time) VALUES
      (1, 2, 1, 'Stairwell C', '18:05'),
      (2, 5, 1, 'Stairwell C', '18:26'),   -- Amos: present at incident 1
      (3, 3, 1, 'Stairwell C', '17:40'),
      (4, 5, 2, 'Stairwell C', '18:14'),   -- Amos: present at incident 2 as well
      (5, 4, 2, 'Stairwell C', '18:02'),
      (6, 2, 2, 'Lobby',       '18:15'),   -- Hana was elsewhere on night 2
      (7, 6, 1, 'Stairwell C', '18:40'),   -- Cora arrived after the fall
      (8, 1, 2, 'Stairwell C', '17:50');   -- Gil, only night 2

    -- Facilities work orders. 'assigned_to' is a suspect id.
    CREATE TABLE work_orders (
      id INTEGER PRIMARY KEY,
      assigned_to INTEGER REFERENCES suspects(id),
      task TEXT,
      area TEXT,
      order_date TEXT
    );
    INSERT INTO work_orders (id, assigned_to, task, area, order_date) VALUES
      (1, 5, 'Camera maintenance', 'Stairwell C', '2026-04-06'),  -- Amos, night 1
      (2, 5, 'Camera maintenance', 'Stairwell C', '2026-04-13'),  -- Amos, night 2
      (3, 1, 'Light replacement',  'Lobby',       '2026-04-10'),
      (4, 5, 'Filter change',      'Roof',        '2026-04-02');

    -- Security's badge audit: which badges were cloned onto a spare card.
    CREATE TABLE badge_audit (
      id INTEGER PRIMARY KEY,
      badge_id INTEGER,
      status TEXT,           -- 'ok' or 'cloned'
      note TEXT
    );
    INSERT INTO badge_audit (id, badge_id, status, note) VALUES
      (1, 201, 'ok',     'Normal usage.'),
      (2, 202, 'ok',     'Normal usage.'),
      (3, 205, 'cloned', 'Duplicate spare card detected on same badge id.'),  -- Amos's badge
      (4, 206, 'ok',     'Normal usage.');

    CREATE TABLE forensics (
      id INTEGER PRIMARY KEY,
      finding TEXT,
      detail TEXT,
      implicates TEXT
    );
    INSERT INTO forensics (id, finding, detail, implicates) VALUES
      (1, 'No defensive wounds', 'Both victims pushed from behind on the stairs.', NULL),
      (2, 'Camera gap',          'Stairwell C cameras offline during both falls.', 'work order'),
      (3, 'Scuff pattern',       'Heel scuffs consistent with a shove, both scenes.', NULL);
  `,

  erd: {
    tables: [
      {
        name: 'suspects',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'name', type: 'TEXT' },
          { name: 'department', type: 'TEXT' },
          { name: 'badge_id', type: 'INTEGER', fk: 'badge_audit.badge_id' },
        ],
      },
      {
        name: 'incidents',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'victim', type: 'TEXT' },
          { name: 'incident_date', type: 'TEXT' },
          { name: 'location', type: 'TEXT' },
          { name: 'fall_time', type: 'TEXT' },
        ],
      },
      {
        name: 'access_logs',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'suspect_id', type: 'INTEGER', fk: 'suspects.id' },
          { name: 'incident_id', type: 'INTEGER', fk: 'incidents.id' },
          { name: 'area', type: 'TEXT' },
          { name: 'swipe_time', type: 'TEXT' },
        ],
      },
      {
        name: 'work_orders',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'assigned_to', type: 'INTEGER', fk: 'suspects.id' },
          { name: 'task', type: 'TEXT' },
          { name: 'area', type: 'TEXT' },
          { name: 'order_date', type: 'TEXT' },
        ],
      },
      {
        name: 'badge_audit',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'badge_id', type: 'INTEGER' },
          { name: 'status', type: 'TEXT' },
          { name: 'note', type: 'TEXT' },
        ],
      },
      {
        name: 'forensics',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'finding', type: 'TEXT' },
          { name: 'detail', type: 'TEXT' },
          { name: 'implicates', type: 'TEXT' },
        ],
      },
    ],
  },

  report: {
    template:
      'The stairwell falls were serial, not accidental. {{killer}} of {{department}} was the only person who badged into Stairwell C during {{count}} separate incidents. Each time, a “{{task}}” work order assigned to them took the cameras offline. And Security had flagged their badge as {{badge}}, letting decoy swipes place them elsewhere while they waited on the stairs.',
    blanks: {
      killer: {
        label: 'the killer',
        targetValue: 'Amos Bright',
        unlockedByColumn: 'name',
        triggerValue: 'Amos Bright',
        options: ['Gil Auerbach', 'Hana Vos', 'Reuben Sato', 'Delia Frost', 'Amos Bright', 'Cora Nunn'],
        provingQuery: `
          SELECT s.name, COUNT(DISTINCT a.incident_id) AS incident_count
          FROM access_logs a JOIN suspects s ON s.id = a.suspect_id
          WHERE a.area = 'Stairwell C'
          GROUP BY s.name
          HAVING COUNT(DISTINCT a.incident_id) = 2
        `,
        hint: 'In access_logs, group by suspect and count DISTINCT incident_id — who has 2?',
      },
      department: {
        label: 'their department',
        targetValue: 'Facilities',
        unlockedByColumn: 'department',
        triggerValue: 'Facilities',
        options: ['Facilities', 'Finance', 'Security', 'Legal', 'IT'],
        provingQuery: `
          SELECT name, department, badge_id FROM suspects WHERE department = 'Facilities'
        `,
        hint: 'Look up the killer in the suspects table.',
      },
      count: {
        label: 'how many incidents',
        targetValue: 'two',
        unlockedByColumn: 'incident_count',
        triggerValue: 2,
        // Deliberately shares the killer's query: "who badged into both
        // incidents" and "how many incidents" are one deduction, and the count
        // IS the reason he's the killer. Splitting them would be busywork.
        coUnlocksWith: 'killer',
        options: ['one', 'two', 'three', 'four'],
        provingQuery: `
          SELECT s.name, COUNT(DISTINCT a.incident_id) AS incident_count
          FROM access_logs a JOIN suspects s ON s.id = a.suspect_id
          WHERE a.area = 'Stairwell C'
          GROUP BY s.name
          HAVING COUNT(DISTINCT a.incident_id) = 2
        `,
        hint: 'COUNT(DISTINCT incident_id) for the killer in access_logs.',
      },
      task: {
        label: 'the work order',
        targetValue: 'Camera maintenance',
        unlockedByColumn: 'task',
        triggerValue: 'Camera maintenance',
        options: ['Camera maintenance', 'Light replacement', 'Filter change', 'Elevator service'],
        provingQuery: `
          SELECT s.name, w.task, w.area, w.order_date FROM work_orders w
          JOIN suspects s ON s.id = w.assigned_to WHERE w.area = 'Stairwell C'
        `,
        hint: 'work_orders assigned to the killer in Stairwell C — what was the task?',
      },
      badge: {
        label: 'the badge status',
        targetValue: 'cloned',
        unlockedByColumn: 'status',
        triggerValue: 'cloned',
        options: ['cloned', 'expired', 'ok', 'suspended'],
        provingQuery: `
          SELECT s.name, b.badge_id, b.status, b.note FROM badge_audit b
          JOIN suspects s ON s.badge_id = b.badge_id WHERE b.status = 'cloned'
        `,
        hint: 'Join the killer’s badge_id to badge_audit — what status did Security flag?',
      },
    },
  },
}
