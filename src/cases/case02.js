/**
 * CASE 02 — "A LONG WAY DOWN"
 *
 * A step harder than Case 01. Six tables, five suspects. Solving it needs the
 * player to JOIN across several tables and reason over more moving parts:
 *   - an elevator log (who rode to which floor, when),
 *   - phone tower pings (where each suspect's phone actually was),
 *   - purchase records (who bought the sabotaged item),
 *   - plus alibis and forensics.
 *
 * The victim, Celeste Bloom, fell from her 7th-floor gallery balcony. Ruled a
 * possible suicide — but the balcony railing bracket was loosened (sabotage),
 * and the data exposes the one suspect who: (a) rode the elevator to Floor 7 in
 * the fall window while claiming to be off-site, (b) whose phone pinged the
 * gallery's tower at that time, and (c) bought a hex wrench matching the tool
 * marks on the bracket.
 *
 * Every step is provable with SQL; nothing is guessable.
 */

export const case02 = {
  id: 'case_02',
  code: 'CODE_02',
  tag: 'FALLING',
  title: 'A Long Way Down',
  teaser:
    'A gallery owner falls seven floors onto the atrium. The coroner says jump. The elevator, the towers, and a hardware receipt say otherwise.',
  folderTheme: 'fall',
  locked: true,

  crimeScene: {
    victim: { line1: 'Celeste Bloom, 41', line2: 'Gallery owner' },
    location: { line1: 'Bloom Contemporary, 9 Wharf Rd.', line2: '7th-floor balcony → atrium' },
    timeOfDeath: { line1: '20:40 – 21:00', line2: 'March 3rd' },
    report: `Celeste Bloom fell from the seventh-floor balcony of her own gallery during a private viewing and was found in the atrium below at 21:07. The coroner's window for the fall is 20:40 to 21:00.

At first glance it read as a jump — the balcony was empty, the door to it unlocked. But the maintenance team found the railing's corner BRACKET had been deliberately loosened: fresh tool marks from a HEX WRENCH, and two bolts backed most of the way out. Someone wanted that railing to give.

The building is instrumented. The service elevator logs every trip and floor. Every phone in range pings the nearest cell tower, and the gallery sits under the "Wharf-7" tower. And the hardware shop two blocks over keeps card receipts.

Five guests had a reason to want Celeste gone, and each gave a statement about where they were at 20:50. One of those statements is a lie the records don't support.`,
  },

  schemaSql: `
    CREATE TABLE suspects (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      relationship TEXT,
      phone_id INTEGER
    );
    INSERT INTO suspects (id, name, relationship, phone_id) VALUES
      (1, 'Iris Kwan',    'Rival gallerist',      101),
      (2, 'Damien Roth',  'Ex-husband',           102),
      (3, 'Priya Anand',  'Lead artist (unpaid)', 103),
      (4, 'Marcus Feld',  'Insurance beneficiary',104),
      (5, 'Lena Sorkin',  'Gallery assistant',    105);

    CREATE TABLE alibis (
      id INTEGER PRIMARY KEY,
      suspect_id INTEGER REFERENCES suspects(id),
      statement TEXT,
      claimed_location TEXT
    );
    INSERT INTO alibis (id, suspect_id, statement, claimed_location) VALUES
      (1, 1, 'I was on the ground floor by the bar the whole evening.', 'Atrium bar'),
      (2, 2, 'I left before eight and was driving home.',               'Off-site'),
      (3, 3, 'I was hanging my canvases on the third floor.',           'Floor 3'),
      (4, 4, 'I stepped out to take a call in the street.',             'Off-site'),
      (5, 5, 'I was in the second-floor office doing guest lists.',     'Floor 2');

    -- Service elevator: every trip records who swiped, the floor, and the time.
    CREATE TABLE elevator_logs (
      id INTEGER PRIMARY KEY,
      suspect_id INTEGER REFERENCES suspects(id),
      to_floor INTEGER,
      ride_time TEXT       -- 'HH:MM'
    );
    INSERT INTO elevator_logs (id, suspect_id, to_floor, ride_time) VALUES
      (1, 3, 3, '20:15'),
      (2, 5, 2, '20:22'),
      (3, 4, 7, '20:48'),   -- rode to Floor 7 during the fall window, but claims off-site
      (4, 1, 1, '20:05'),
      (5, 4, 1, '21:02'),   -- came back down just after
      (6, 3, 3, '20:55'),
      (7, 5, 2, '20:59');

    -- Cell tower pings. The gallery is under 'Wharf-7'; 'Downtown' is far away.
    CREATE TABLE phone_pings (
      id INTEGER PRIMARY KEY,
      phone_id INTEGER,
      tower TEXT,
      ping_time TEXT       -- 'HH:MM'
    );
    INSERT INTO phone_pings (id, phone_id, tower, ping_time) VALUES
      (1, 101, 'Wharf-7',  '20:50'),
      (2, 102, 'Downtown', '20:50'),   -- Damien really was away
      (3, 103, 'Wharf-7',  '20:50'),
      (4, 104, 'Wharf-7',  '20:50'),   -- Marcus's phone was AT the gallery, not off-site
      (5, 105, 'Wharf-7',  '20:50'),
      (6, 104, 'Wharf-7',  '20:47');

    -- Hardware shop card receipts (buyer name is free text).
    CREATE TABLE purchases (
      id INTEGER PRIMARY KEY,
      buyer TEXT,
      item TEXT,
      purchase_date TEXT   -- 'YYYY-MM-DD'
    );
    INSERT INTO purchases (id, buyer, item, purchase_date) VALUES
      (1, 'Priya Anand', 'Canvas stretchers', '2026-03-01'),
      (2, 'Marcus Feld', 'Hex wrench set',    '2026-03-02'),   -- the sabotage tool
      (3, 'Iris Kwan',   'Picture wire',      '2026-02-28'),
      (4, 'Lena Sorkin', 'Printer toner',     '2026-03-01');

    CREATE TABLE forensics (
      id INTEGER PRIMARY KEY,
      finding TEXT,
      detail TEXT,
      implicates_tool TEXT
    );
    INSERT INTO forensics (id, finding, detail, implicates_tool) VALUES
      (1, 'Bracket tampering', 'Railing bracket bolts backed out; fresh tool marks.', 'hex wrench'),
      (2, 'Tool marks',        'Hex-pattern scoring on the bolt heads.',              'hex wrench'),
      (3, 'No note',           'No suicide note found on the victim or in the office.', NULL);
  `,

  erd: {
    tables: [
      {
        name: 'suspects',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'name', type: 'TEXT' },
          { name: 'relationship', type: 'TEXT' },
          { name: 'phone_id', type: 'INTEGER', fk: 'phone_pings.phone_id' },
        ],
      },
      {
        name: 'alibis',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'suspect_id', type: 'INTEGER', fk: 'suspects.id' },
          { name: 'statement', type: 'TEXT' },
          { name: 'claimed_location', type: 'TEXT' },
        ],
      },
      {
        name: 'elevator_logs',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'suspect_id', type: 'INTEGER', fk: 'suspects.id' },
          { name: 'to_floor', type: 'INTEGER' },
          { name: 'ride_time', type: 'TEXT' },
        ],
      },
      {
        name: 'phone_pings',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'phone_id', type: 'INTEGER' },
          { name: 'tower', type: 'TEXT' },
          { name: 'ping_time', type: 'TEXT' },
        ],
      },
      {
        name: 'purchases',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'buyer', type: 'TEXT' },
          { name: 'item', type: 'TEXT' },
          { name: 'purchase_date', type: 'TEXT' },
        ],
      },
      {
        name: 'forensics',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'finding', type: 'TEXT' },
          { name: 'detail', type: 'TEXT' },
          { name: 'implicates_tool', type: 'TEXT' },
        ],
      },
    ],
  },

  report: {
    template:
      'Celeste’s fall was no suicide — it was staged. {{killer}} rode the service elevator to Floor {{floor}} at 20:48, during the coroner’s window, even though they claimed to be {{alibiLie}}. Their phone pinged the {{tower}} tower at the gallery at the same moment. And the loosened bracket bore the marks of a {{tool}}, which the hardware receipts show they had just bought.',
    blanks: {
      killer: {
        label: 'the killer',
        targetValue: 'Marcus Feld',
        unlockedByColumn: 'name',
        triggerValue: 'Marcus Feld',
        options: ['Iris Kwan', 'Damien Roth', 'Priya Anand', 'Marcus Feld', 'Lena Sorkin'],
        provingQuery: `
          SELECT s.name, e.to_floor, e.ride_time, a.claimed_location
          FROM elevator_logs e JOIN suspects s ON s.id = e.suspect_id
          JOIN alibis a ON a.suspect_id = s.id
          WHERE e.to_floor = 7
        `,
        hint: 'Join elevator_logs to suspects: who rode to Floor 7 inside the 20:40–21:00 window?',
      },
      floor: {
        label: 'the floor',
        targetValue: '7',
        unlockedByColumn: 'to_floor',
        triggerValue: 7,
        options: ['2', '3', '7', '1'],
        provingQuery: `
          SELECT s.name, e.to_floor, e.ride_time FROM elevator_logs e
          JOIN suspects s ON s.id = e.suspect_id WHERE e.to_floor = 7
        `,
        hint: 'The elevator log records which floor each ride went to.',
      },
      alibiLie: {
        label: 'their false alibi',
        targetValue: 'off-site',
        unlockedByColumn: 'claimed_location',
        triggerValue: 'Off-site',
        options: ['off-site', 'Floor 2', 'Floor 3', 'the atrium bar'],
        provingQuery: `
          SELECT s.name, a.claimed_location, a.statement FROM alibis a
          JOIN suspects s ON s.id = a.suspect_id WHERE a.claimed_location = 'Off-site'
        `,
        hint: 'Check the killer’s alibi row — where did they claim to be?',
      },
      tower: {
        label: 'the cell tower',
        targetValue: 'Wharf-7',
        unlockedByColumn: 'tower',
        triggerValue: 'Wharf-7',
        options: ['Wharf-7', 'Downtown', 'Harbor-3', 'Midtown'],
        provingQuery: `
          SELECT s.name, p.tower, p.ping_time FROM phone_pings p
          JOIN suspects s ON s.phone_id = p.phone_id WHERE p.tower = 'Wharf-7'
        `,
        hint: 'Join the killer’s phone_id to phone_pings — which tower did it hit at 20:50?',
      },
      tool: {
        label: 'the sabotage tool',
        targetValue: 'hex wrench',
        unlockedByColumn: 'implicates_tool',
        triggerValue: 'hex wrench',
        options: ['hex wrench', 'crowbar', 'screwdriver', 'bolt cutter'],
        provingQuery: `
          SELECT finding, detail, implicates_tool FROM forensics
          WHERE implicates_tool IS NOT NULL
        `,
        hint: 'Forensics names the tool that left the marks; purchases show who bought it.',
      },
    },
  },
}
