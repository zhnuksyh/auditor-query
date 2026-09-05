// @ts-check
/**
 * CASE 01 — "THE MIDNIGHT DRIFT"
 *
 * A locked-room-ish timeline mystery. The victim, Adrian Vale, was found dead
 * in his study. Time of death is pinned to 23:10–23:25 by the coroner. Four
 * suspects each gave an alibi. The killer's alibi is a lie that the data
 * exposes: their keycard logged them ENTERING the building's east wing (where
 * the study is) during the time-of-death window, contradicting their statement
 * that they were off-site.
 *
 * The player must:
 *   1. Find the time-of-death window (coroner_reports).
 *   2. Cross-reference keycard_logs against the alibis.
 *   3. Identify the one suspect physically present when they claimed absence.
 *   4. Confirm the weapon via forensics (a left-handed strike + the letter opener).
 *
 * Every deduction is provable with a SELECT. No guessing.
 */

/** @type {import('../types.js').PlayableCase} */
export const case01 = {
  id: 'case_01',
  code: 'CODE_01',
  tag: 'DRIFT',
  title: 'The Midnight Drift',
  teaser:
    'A publisher found slumped over his desk at midnight. Four alibis. One of them drifts from the truth. The keycards never lie.',
  folderTheme: 'access', // maps to paper.access tone
  locked: false,

  // This case doubles as the tutorial. Each step pops an assist card; a step
  // with `tab` auto-switches the player to that tab and anchors the card there.
  tutorial: [
    {
      tab: 'scene',
      title: 'Welcome, Detective',
      body: 'You crack cases by querying evidence with SQL — no guessing. Work left to right through the four tabs. Let’s walk through this one.',
    },
    {
      tab: 'scene',
      title: '1 · Crime Scene',
      body: 'Read the report carefully. Every fact you’ll need to prove — the time of death, the wound, the missing weapon — is hidden in this narrative.',
    },
    {
      tab: 'board',
      title: '2 · Case Board',
      body: 'These are the database tables you can query, with their columns. Dotted lines are foreign keys — they show how tables connect (e.g. alibis.suspect_id → suspects.id).',
    },
    {
      tab: 'analysis',
      title: '3 · Analysis',
      body: 'Write SQL here and press RUN. Try “SELECT * FROM suspects;” to list everyone. Then dig deeper — join the keycard logs against the alibis to find who lied.',
    },
    {
      tab: 'analysis',
      title: 'Tip · The intercept',
      body: 'When a query returns the right row, a “CLUE VERIFIED” toast appears and unlocks a blank on the Report Card. That’s how you make progress.',
    },
    {
      tab: 'report',
      title: '4 · Report Card',
      body: 'Fill each blank from the dropdowns. A blank stays locked until you’ve run the query that proves it — then submit to close the case and unlock the next file.',
    },
    {
      title: 'Tip · Case Brief',
      body: 'Stuck on SQL? Click the book icon at the top right — or press the Tab key — to toggle the Case Brief, a cheat sheet of every clause you’ll need, without leaving the case. Good luck.',
    },
  ],

  engagement: {
    // Each vital renders as two stacked lines within one row cell.
    vitals: [
      { term: 'Victim', line1: 'Adrian Vale, 54', line2: 'Publisher' },
      { term: 'Location', line1: 'Vale Press, 118 Harbor St.', line2: 'East Wing study — Floor 3' },
      { term: 'Time of death', line1: '23:10 – 23:25', line2: 'June 14th' },
    ],
    report: `At 00:04 the night custodian found ADRIAN VALE face-down at his desk in the East Wing study. A single deep wound to the left side of the neck. No forced entry. The door was locked from the inside — but the East Wing is keycard-controlled, and every door logs every swipe.

The coroner fixed the time of death to a tight window: 23:10 to 23:25. The angle and depth of the wound indicate a downward left-handed strike from someone standing over the seated victim. The murder weapon was never recovered, but a brass LETTER OPENER is missing from the desk set.

Four people had reason to be in the building that night. Each gave a statement. Each swiped a keycard. The logs are in the database. One statement contradicts the swipes.`,
    constraints: [
      'Time of death: 23:10–23:25.',
      'Wound angle indicates a LEFT-HANDED attacker.',
      'East Wing access is keycard-logged on every swipe.',
      'The missing weapon is a brass letter opener from the desk set.',
    ],
  },

  // Plain SQL — schema + seed. No binary .db file needed.
  schemaSql: `
    CREATE TABLE suspects (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      relationship TEXT,
      handedness TEXT
    );
    INSERT INTO suspects (id, name, relationship, handedness) VALUES
      (1, 'Mara Quinn',   'Business partner',   'right'),
      (2, 'Elias Vale',   'Estranged brother',  'left'),
      (3, 'Nadia Frost',  'Lead editor',        'right'),
      (4, 'Theo Marsh',   'Debtor / author',    'left');

    CREATE TABLE alibis (
      id INTEGER PRIMARY KEY,
      suspect_id INTEGER REFERENCES suspects(id),
      statement TEXT,
      claimed_location TEXT,
      claimed_from TEXT,
      claimed_to TEXT
    );
    INSERT INTO alibis (id, suspect_id, statement, claimed_location, claimed_from, claimed_to) VALUES
      (1, 1, 'I was at the Harbor Bar until closing.',        'Harbor Bar',      '22:00', '00:30'),
      (2, 2, 'I left the building at 22:40 and drove home.',  'Off-site (home)', '22:40', '01:00'),
      (3, 3, 'I was proofing galleys in the West Wing.',      'West Wing',       '21:30', '23:50'),
      (4, 4, 'I never entered the East Wing that night.',     'Lobby / cafe',    '22:15', '23:40');

    CREATE TABLE keycard_logs (
      id INTEGER PRIMARY KEY,
      suspect_id INTEGER REFERENCES suspects(id),
      wing TEXT,
      direction TEXT,      -- 'IN' or 'OUT'
      swipe_time TEXT      -- 'HH:MM'
    );
    INSERT INTO keycard_logs (id, suspect_id, wing, direction, swipe_time) VALUES
      (1, 1, 'Lobby',     'OUT', '21:58'),
      (2, 2, 'East Wing', 'OUT', '22:40'),
      (3, 3, 'West Wing', 'IN',  '21:30'),
      (4, 4, 'East Wing', 'IN',  '23:12'),   -- contradicts alibi 4
      (5, 4, 'East Wing', 'OUT', '23:29'),
      (6, 3, 'West Wing', 'OUT', '23:50'),
      (7, 2, 'Lobby',     'OUT', '22:41'),
      (8, 4, 'Lobby',     'IN',  '22:15');

    CREATE TABLE forensics (
      id INTEGER PRIMARY KEY,
      finding TEXT,
      detail TEXT,
      implicates_handedness TEXT
    );
    INSERT INTO forensics (id, finding, detail, implicates_handedness) VALUES
      (1, 'Wound angle',       'Downward strike, left side of neck, attacker standing.', 'left'),
      (2, 'Missing item',      'Brass letter opener absent from the desk set.',          NULL),
      (3, 'Partial print',     'Smudged print on the desk lamp, inconclusive.',          NULL);

    CREATE TABLE coroner_reports (
      id INTEGER PRIMARY KEY,
      victim TEXT,
      tod_from TEXT,
      tod_to TEXT,
      cause TEXT
    );
    INSERT INTO coroner_reports (id, victim, tod_from, tod_to, cause) VALUES
      (1, 'Adrian Vale', '23:10', '23:25', 'Exsanguination from neck wound');
  `,

  // Entity-Relationship diagram for the Case Board tab.
  erd: {
    tables: [
      {
        name: 'suspects',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'name', type: 'TEXT' },
          { name: 'relationship', type: 'TEXT' },
          { name: 'handedness', type: 'TEXT' },
        ],
      },
      {
        name: 'alibis',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'suspect_id', type: 'INTEGER', fk: 'suspects.id' },
          { name: 'statement', type: 'TEXT' },
          { name: 'claimed_location', type: 'TEXT' },
          { name: 'claimed_from', type: 'TEXT' },
          { name: 'claimed_to', type: 'TEXT' },
        ],
      },
      {
        name: 'keycard_logs',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'suspect_id', type: 'INTEGER', fk: 'suspects.id' },
          { name: 'wing', type: 'TEXT' },
          { name: 'direction', type: 'TEXT' },
          { name: 'swipe_time', type: 'TEXT' },
        ],
      },
      {
        name: 'forensics',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'finding', type: 'TEXT' },
          { name: 'detail', type: 'TEXT' },
          { name: 'implicates_handedness', type: 'TEXT' },
        ],
      },
      {
        name: 'coroner_reports',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'victim', type: 'TEXT' },
          { name: 'tod_from', type: 'TEXT' },
          { name: 'tod_to', type: 'TEXT' },
          { name: 'cause', type: 'TEXT' },
        ],
      },
    ],
  },

  // The Deduction Report Card.
  report: {
    // Template: {{key}} tokens are replaced by dropdowns.
    template:
      'The killer was {{killer}}, who lied about their whereabouts — the keycard logs place them entering the East Wing at 23:12, squarely inside the coroner’s window of {{todStart}} to 23:25. The wound’s angle proves a {{handedness}} attacker, consistent with the suspect. The weapon was the missing {{weapon}} from the desk set.',
    blanks: {
      killer: {
        label: 'the killer',
        targetValue: 'Theo Marsh',
        unlockedByColumn: 'name',
        triggerValue: 'Theo Marsh',
        options: ['Mara Quinn', 'Elias Vale', 'Nadia Frost', 'Theo Marsh'],
        provingQuery: `
          SELECT s.name, k.wing, k.direction, k.swipe_time
          FROM keycard_logs k JOIN suspects s ON s.id = k.suspect_id
          JOIN alibis a ON a.suspect_id = s.id
          WHERE k.wing = 'East Wing' AND k.direction = 'IN'
            AND k.swipe_time >= '23:10' AND k.swipe_time <= '23:25'
        `,
        hint: 'Find the suspect whose keycard swipe contradicts their alibi during the time of death.',
      },
      todStart: {
        label: 'time-of-death start',
        targetValue: '23:10',
        unlockedByColumn: 'tod_from',
        triggerValue: '23:10',
        options: ['22:40', '23:10', '23:29', '23:50'],
        provingQuery: `
          SELECT victim, tod_from, tod_to FROM coroner_reports
        `,
        hint: 'Query the coroner report for the time-of-death window.',
      },
      handedness: {
        label: 'attacker handedness',
        targetValue: 'left-handed',
        unlockedByColumn: 'implicates_handedness',
        triggerValue: 'left',
        options: ['left-handed', 'right-handed', 'ambidextrous', 'unknown'],
        provingQuery: `
          SELECT finding, detail, implicates_handedness FROM forensics
          WHERE implicates_handedness IS NOT NULL
        `,
        hint: 'The forensics table records which hand the wound angle implicates.',
      },
      weapon: {
        label: 'the weapon',
        targetValue: 'letter opener',
        unlockedByColumn: 'finding',
        triggerValue: 'Missing item',
        options: ['candlestick', 'letter opener', 'kitchen knife', 'ice pick'],
        provingQuery: `
          SELECT finding, detail FROM forensics WHERE finding = 'Missing item'
        `,
        hint: 'The forensics "Missing item" finding names the weapon.',
      },
    },
  },
}
