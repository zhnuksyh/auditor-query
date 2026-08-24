// @ts-check
/**
 * CASE 07 — "SLACK WATER"
 *
 * The hardest file yet. Seven tables, six suspects, and the first case whose
 * central deduction needs a SELF-JOIN — two rows of the SAME table placed side
 * by side and shown to contradict each other:
 *
 *   - `tide_readings` logs the harbour's direction each hour: 'ebb' pulls water
 *     (and anything in it) seaward, 'flood' pushes it upstream, and 'slack'
 *     moves nothing. The body was found at Jetty 4, downstream of everything.
 *   - Drift only carries a body downstream on an EBB. Joining tide_readings to
 *     itself an hour apart shows the harbour ebbed for exactly one stretch that
 *     night, which fixes the window when the body could have entered the water.
 *   - `mooring_log` records which boat was in which berth each hour, so the
 *     player can ask who was upstream during that ebb — and three people were.
 *   - The killer is the one whose OWN statement puts them somewhere the harbour
 *     master's log says they were not: `statements` and `mooring_log` disagree
 *     for exactly one person. That is the planted contradiction.
 *   - `harbour_master_log` is the honest record (radioed in, timestamped);
 *     `statements` are what people said afterwards.
 *
 * Difficulty step: cases 03/05 needed GROUP BY, case 06 needed absence. This
 * one needs a table compared against ITSELF, and the final elimination is a set
 * difference — everyone upstream during the ebb, minus everyone the harbour
 * master actually saw leave. Everything is provable with SQL; no guessing.
 */

/** @type {import('../types.js').PlayableCase} */
export const case07 = {
  id: 'case_07',
  code: 'CODE_07',
  tag: 'TIDE',
  title: 'Slack Water',
  teaser:
    'The harbour gave the body back at dawn. The tide tables say it should never have reached that jetty.',
  folderTheme: 'signal',
  locked: true,

  crimeScene: {
    victim: { line1: 'Rurik Mallen, 52', line2: 'Harbour pilot' },
    location: { line1: 'Kestrel Harbour, Jetty 4', line2: 'Recovered from the water at 05:40' },
    timeOfDeath: { line1: '21:00 – 23:00', line2: 'October 11th' },
    report: `RURIK MALLEN came back with the dawn tide, face-down against the pilings of Jetty 4. The harbour police wrote it up as a fall from a deck — Mallen knew these waters better than anyone, but men slip. The coroner disagreed: water in the lungs says he drowned, but the fracture above his ear came first, and it came from a blow.

Jetty 4 sits at the seaward end of the harbour. Everything upstream of it — the boatyard, the fuel dock, the row of private berths — drains past that jetty on an outgoing tide and nothing at all moves past it on an incoming one. A body in this harbour drifts one way, and only while the water is ebbing.

The harbour keeps its own memory. The tide board logs the state of the water every hour: EBB going out, FLOOD coming in, SLACK when it hangs still between them. The mooring log records which boat sat in which berth, hour by hour. And the harbour master radios in every vessel that passes the seaward light, with the time it went by.

Six people had a berth here and a reason to resent Mallen, who had spent the summer reporting them for one thing or another. Each told the police where they were that night. The water tells a different story about one of them.`,
    constraints: [
      'Time of death: 21:00–23:00, October 11th.',
      'Blunt trauma preceded drowning — he was struck, then went in.',
      'A body drifts seaward ONLY while the tide is ebbing.',
      'Jetty 4 is the seaward end; everything upstream drains past it.',
      'The harbour master logs every vessel passing the seaward light.',
    ],
  },

  schemaSql: `
    CREATE TABLE suspects (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      vessel TEXT,
      grievance TEXT
    );
    INSERT INTO suspects (id, name, vessel, grievance) VALUES
      (1, 'Corin Vasilyev', 'Northern Gale',  'Reported for an unlit mooring'),
      (2, 'Halina Brecht',  'Sable Marie',    'Reported for dumping bilge'),
      (3, 'Osgood Lyle',    'Tern',           'Reported for an expired licence'),
      (4, 'Marisol Quint',  'Ardent',         'Lost a berth to Mallen''s complaint'),
      (5, 'Teodor Fisk',    'Grey Heron',     'Reported for overloading'),
      (6, 'Annike Sorrel',  'Kittiwake',      'Fined after Mallen''s report');

    -- The tide board. One row per hour; 'ebb' is the only state that carries a
    -- body seaward. Comparing consecutive hours is the point of the case.
    CREATE TABLE tide_readings (
      id INTEGER PRIMARY KEY,
      reading_hour TEXT,     -- 'HH:MM', on the hour
      state TEXT,            -- 'ebb' | 'flood' | 'slack'
      height_m REAL
    );
    INSERT INTO tide_readings (id, reading_hour, state, height_m) VALUES
      (1,  '18:00', 'flood', 3.1),
      (2,  '19:00', 'flood', 3.6),
      (3,  '20:00', 'slack', 3.8),
      (4,  '21:00', 'ebb',   3.5),
      (5,  '22:00', 'ebb',   2.9),
      (6,  '23:00', 'slack', 2.4),
      (7,  '00:00', 'flood', 2.7),
      (8,  '01:00', 'flood', 3.2),
      (9,  '02:00', 'slack', 3.5),
      (10, '03:00', 'ebb',   3.1),
      (11, '04:00', 'ebb',   2.6),
      (12, '05:00', 'slack', 2.2);

    -- Which berth each vessel occupied, hour by hour. Berths 1-3 are upstream
    -- of Jetty 4; berth 9 is the seaward visitor pontoon, downstream of it.
    CREATE TABLE mooring_log (
      id INTEGER PRIMARY KEY,
      suspect_id INTEGER REFERENCES suspects(id),
      berth INTEGER,
      log_hour TEXT          -- 'HH:MM'
    );
    INSERT INTO mooring_log (id, suspect_id, berth, log_hour) VALUES
      (1,  1, 2, '20:00'),
      (2,  1, 2, '21:00'),
      (3,  1, 2, '22:00'),   -- Corin upstream through the whole ebb
      (4,  2, 9, '20:00'),
      (5,  2, 9, '21:00'),
      (6,  2, 9, '22:00'),   -- Halina downstream all night
      (7,  3, 1, '20:00'),
      (8,  3, 1, '21:00'),
      (9,  3, 1, '22:00'),   -- Osgood upstream through the whole ebb
      (10, 4, 3, '20:00'),
      (11, 4, 3, '21:00'),
      (12, 4, 3, '22:00'),   -- Marisol upstream through the whole ebb
      (13, 5, 9, '20:00'),
      (14, 5, 9, '21:00'),
      (15, 5, 9, '22:00'),   -- Teodor downstream all night
      (16, 6, 9, '20:00'),
      (17, 6, 9, '21:00'),
      (18, 6, 9, '22:00');   -- Annike downstream all night

    -- What each person told the police afterwards.
    CREATE TABLE statements (
      id INTEGER PRIMARY KEY,
      suspect_id INTEGER REFERENCES suspects(id),
      claimed_berth INTEGER,
      account TEXT
    );
    INSERT INTO statements (id, suspect_id, claimed_berth, account) VALUES
      (1, 1, 2, 'Aboard the Northern Gale in my own berth, turned in early.'),
      (2, 2, 9, 'On the visitor pontoon, playing cards until midnight.'),
      (3, 3, 1, 'In berth one, scraping the hull. Never left her.'),
      (4, 4, 9, 'Down on the visitor pontoon with the others all evening.'),
      (5, 5, 9, 'Visitor pontoon, cards with Halina and Annike.'),
      (6, 6, 9, 'Visitor pontoon. We were all there.');

    -- Vessels radioed past the seaward light. Honest, timestamped record.
    CREATE TABLE harbour_master_log (
      id INTEGER PRIMARY KEY,
      vessel TEXT,
      passed_light TEXT,     -- 'HH:MM'
      direction TEXT         -- 'outbound' | 'inbound'
    );
    INSERT INTO harbour_master_log (id, vessel, passed_light, direction) VALUES
      (1, 'Tern',          '19:30', 'inbound'),
      (2, 'Sable Marie',   '18:45', 'inbound'),
      (3, 'Ardent',        '23:40', 'outbound'),
      (4, 'Kittiwake',     '17:20', 'inbound');

    CREATE TABLE coroner_reports (
      id INTEGER PRIMARY KEY,
      victim TEXT,
      tod_from TEXT,
      tod_to TEXT,
      finding TEXT
    );
    INSERT INTO coroner_reports (id, victim, tod_from, tod_to, finding) VALUES
      (1, 'Rurik Mallen', '21:00', '23:00',
          'Drowning preceded by blunt trauma above the left ear');

    CREATE TABLE recovery (
      id INTEGER PRIMARY KEY,
      victim TEXT,
      found_at TEXT,
      found_hour TEXT,
      note TEXT
    );
    INSERT INTO recovery (id, victim, found_at, found_hour, note) VALUES
      (1, 'Rurik Mallen', 'Jetty 4', '05:40',
          'Against the seaward pilings. Nothing upstream of Jetty 4 reaches it except on an ebb.');
  `,

  erd: {
    tables: [
      {
        name: 'suspects',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'name', type: 'TEXT' },
          { name: 'vessel', type: 'TEXT' },
          { name: 'grievance', type: 'TEXT' },
        ],
      },
      {
        name: 'tide_readings',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'reading_hour', type: 'TEXT' },
          { name: 'state', type: 'TEXT' },
          { name: 'height_m', type: 'INTEGER' },
        ],
      },
      {
        name: 'mooring_log',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'suspect_id', type: 'INTEGER', fk: 'suspects.id' },
          { name: 'berth', type: 'INTEGER' },
          { name: 'log_hour', type: 'TEXT' },
        ],
      },
      {
        name: 'statements',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'suspect_id', type: 'INTEGER', fk: 'suspects.id' },
          { name: 'claimed_berth', type: 'INTEGER' },
          { name: 'account', type: 'TEXT' },
        ],
      },
      {
        name: 'harbour_master_log',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'vessel', type: 'TEXT' },
          { name: 'passed_light', type: 'TEXT' },
          { name: 'direction', type: 'TEXT' },
        ],
      },
      {
        name: 'coroner_reports',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'victim', type: 'TEXT' },
          { name: 'tod_from', type: 'TEXT' },
          { name: 'tod_to', type: 'TEXT' },
          { name: 'finding', type: 'TEXT' },
        ],
      },
      {
        name: 'recovery',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'victim', type: 'TEXT' },
          { name: 'found_at', type: 'TEXT' },
          { name: 'found_hour', type: 'TEXT' },
          { name: 'note', type: 'TEXT' },
        ],
      },
    ],
  },

  report: {
    template:
      'Mallen never fell. The harbour only carried him seaward while it was going out, and it ebbed for one stretch that night — from {{ebbStart}} until the water went slack at 23:00 — which puts him in the water inside the coroner’s window. Only a berth upstream of Jetty 4 drains past it, and three vessels sat upstream through that ebb. Two of them told the truth about it. {{killer}} did not: their statement puts them in berth {{claimedBerth}} on the visitor pontoon, while the mooring log has the {{vessel}} tied up upstream the entire time. They struck him, put him in the water on the outgoing tide, and slipped past the seaward light at {{passedLight}} once the harbour had gone quiet.',
    blanks: {
      ebbStart: {
        label: 'when the ebb began',
        targetValue: '21:00',
        unlockedByColumn: 'ebb_from',
        triggerValue: '21:00',
        // Self-join: pair each hour with the one before it and find where the
        // tide turns. The alias `ebb_from` exists in no table.
        provingQuery: `
          SELECT prev.reading_hour AS turned_at, cur.reading_hour AS ebb_from
          FROM tide_readings cur
          JOIN tide_readings prev ON prev.reading_hour < cur.reading_hour
          JOIN coroner_reports c ON c.victim = 'Rurik Mallen'
          WHERE cur.state = 'ebb' AND prev.state = 'slack'
            AND cur.reading_hour >= c.tod_from AND cur.reading_hour <= c.tod_to
            AND prev.reading_hour = (
              SELECT MAX(p.reading_hour) FROM tide_readings p
              WHERE p.reading_hour < cur.reading_hour
            )
        `,
        options: ['20:00', '21:00', '22:00', '23:00'],
        hint: 'Join tide_readings to itself on consecutive hours to find where slack turns to ebb. Alias it AS ebb_from.',
      },
      killer: {
        label: 'the killer',
        targetValue: 'Marisol Quint',
        unlockedByColumn: 'name',
        triggerValue: 'Marisol Quint',
        options: ['Corin Vasilyev', 'Halina Brecht', 'Osgood Lyle', 'Marisol Quint', 'Teodor Fisk'],
        // The planted contradiction: mooring_log and statements disagree for
        // exactly one person.
        provingQuery: `
          SELECT s.name, m.berth AS actual_berth, st.claimed_berth
          FROM suspects s
          JOIN mooring_log m ON m.suspect_id = s.id
          JOIN statements st ON st.suspect_id = s.id
          WHERE m.log_hour = '21:00' AND m.berth <> st.claimed_berth
        `,
        hint: 'Compare where the mooring log puts each vessel against where its owner claimed to be.',
      },
      claimedBerth: {
        label: 'the berth they claimed',
        targetValue: '9',
        // Keyed on the account text, not claimed_berth: the killer's proving
        // query already selects claimed_berth, so triggering on that would
        // unlock this blank for free. The player has to read the statement.
        unlockedByColumn: 'account',
        triggerValue: 'Down on the visitor pontoon with the others all evening.',
        provingQuery: `
          SELECT s.name, st.account, st.claimed_berth
          FROM statements st JOIN suspects s ON s.id = st.suspect_id
          WHERE s.name = 'Marisol Quint'
        `,
        options: ['1', '2', '3', '9'],
        hint: 'Read the killer’s own statement in full — where did they put themselves?',
      },
      vessel: {
        label: 'their vessel',
        targetValue: 'Ardent',
        unlockedByColumn: 'vessel',
        triggerValue: 'Ardent',
        // EXCEPT: everyone upstream during the ebb, minus everyone the harbour
        // master actually saw leave.
        provingQuery: `
          SELECT s.vessel FROM suspects s
          JOIN mooring_log m ON m.suspect_id = s.id
          JOIN statements st ON st.suspect_id = s.id
          WHERE m.log_hour = '22:00' AND m.berth <= 3
            AND m.berth <> st.claimed_berth
          EXCEPT
          SELECT vessel FROM harbour_master_log WHERE direction = 'inbound'
        `,
        options: ['Northern Gale', 'Sable Marie', 'Tern', 'Ardent'],
        hint: 'List the vessels upstream during the ebb, then EXCEPT the ones the harbour master logged inbound.',
      },
      passedLight: {
        label: 'when the Ardent passed the light',
        targetValue: '23:40',
        unlockedByColumn: 'passed_light',
        triggerValue: '23:40',
        provingQuery: `
          SELECT vessel, passed_light, direction
          FROM harbour_master_log WHERE direction = 'outbound'
        `,
        options: ['17:20', '19:30', '23:40', '05:40'],
        hint: 'Only one vessel was logged outbound that night. When did it pass the seaward light?',
      },
    },
  },
}
