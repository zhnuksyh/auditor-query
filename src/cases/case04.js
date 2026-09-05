// @ts-check
/**
 * CASE 04 — "DEAD SIGNAL"
 *
 * A step harder than Case 03. Seven tables, five suspects, and a piece of
 * FABRICATED evidence the player must disprove before the real question even
 * makes sense:
 *
 *   - A text "from the victim" at 02:14 fixes everyone's attention after 2 AM,
 *     but tower_pings show his phone left the network at 01:50 for good.
 *     Proving that requires an aggregate with an alias (MAX(ping_time) AS
 *     last_ping), not a plain filter.
 *   - messages carries a `sent_via` column: every genuine text went out from
 *     the handset — the 02:14 one went through a cloud relay.
 *   - device_registry shows whose device was quietly paired to the victim's
 *     cloud account two days earlier (the relay's origin).
 *   - alibis all cover the FAKE window (post-02:00); two suspects have gaps in
 *     the coroner's REAL window, so the player must triangulate with
 *     tower_pings and cctv_sightings (joined through vehicle plates) to pick
 *     the right one.
 *
 * The difficulty is the misdirection: the data disproves its own headline fact.
 * Everything is still provable with SQL — no guessing.
 */

/** @type {import('../types.js').PlayableCase} */
export const case04 = {
  id: 'case_04',
  code: 'CODE_04',
  tag: 'SIGNAL',
  title: 'Dead Signal',
  teaser:
    'The last text was sent at 02:14. His phone was already off the grid at 01:50.',
  folderTheme: 'continuity',
  locked: true,

  engagement: {
    vitals: [
      { term: 'Victim', line1: 'Jonah Reyes, 37', line2: 'Investigative journalist' },
      { term: 'Location', line1: '4 Dockside Terrace, Apt 3C', line2: 'Home office' },
      { term: 'Time of death', line1: '01:20 – 01:55', line2: 'May 2nd' },
    ],
    report: `Jonah Reyes was found at his desk on the morning of May 2nd, dead from a single blow to the back of the head. He was mid-way through a story someone did not want printed.

At 02:14 his phone texted his editor: "Can't sleep — still polishing the draft. More tomorrow." Everyone anchored their statements to that text. It proves he was alive after two. Except it proves nothing: the carrier's records show his handset last touched a cell tower at 01:50 and never came back on the network. Dead phones don't type.

Every message before that one left the handset itself. Check HOW the 02:14 text was sent — and check the device registry for what else was recently paired to Jonah's cloud account.

The coroner puts the killing between 01:20 and 01:55. Five people orbit this story. Their alibis are all watertight — after 02:00. For the window that actually matters, the towers, the street cameras, and the registry will tell you who is lying.`,
  },

  schemaSql: `
    CREATE TABLE suspects (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      relationship TEXT,
      phone_id INTEGER,
      vehicle_plate TEXT
    );
    INSERT INTO suspects (id, name, relationship, phone_id, vehicle_plate) VALUES
      (1, 'Vera Lin',     'His editor',                901, 'KLM-201'),
      (2, 'Caleb Osei',   'Source he burned',          902, 'RGX-882'),
      (3, 'Marta Voss',   'Ex-partner',                903, 'JPD-410'),
      (4, 'Dominic Hale', 'Councilman in the story',   904, 'CVC-777'),
      (5, 'Ruth Kessler', 'Landlady, same building',   905, NULL);

    -- Statements about the night. Note what window each alibi actually covers,
    -- and whether anyone can corroborate it.
    CREATE TABLE alibis (
      id INTEGER PRIMARY KEY,
      suspect_id INTEGER REFERENCES suspects(id),
      statement TEXT,
      covered_from TEXT,   -- 'HH:MM'
      covered_to TEXT,
      corroborated TEXT    -- 'yes' or 'no'
    );
    INSERT INTO alibis (id, suspect_id, statement, covered_from, covered_to, corroborated) VALUES
      (1, 1, 'Newsroom all night, on deadline with the layout team.', '00:00', '03:00', 'yes'),
      (2, 2, 'Caught the night bus, then drinks at the Anchor Bar.',  '02:05', '03:10', 'yes'),
      (3, 3, 'Gym, then a video call with my sister overseas.',       '01:00', '02:40', 'yes'),
      (4, 4, 'Fundraiser dinner at Civic Plaza, dozens of witnesses.','00:00', '02:20', 'yes'),
      (5, 5, 'Asleep in the building office downstairs.',             '00:00', '06:00', 'no');

    -- Texts from the victim's phone (phone_id 900). 'sent_via' records whether
    -- the message left the handset or was dispatched by the cloud relay.
    CREATE TABLE messages (
      id INTEGER PRIMARY KEY,
      sender_phone INTEGER,
      recipient TEXT,
      body TEXT,
      sent_time TEXT,
      sent_via TEXT        -- 'handset' or 'cloud relay'
    );
    INSERT INTO messages (id, sender_phone, recipient, body, sent_time, sent_via) VALUES
      (1, 900, 'Vera Lin',   'Draft is close. Tonight, promise.',                  '23:48', 'handset'),
      (2, 900, 'Caleb Osei', 'We need to talk about what you gave me. It''s bad.', '01:12', 'handset'),
      (3, 900, 'Vera Lin',   'Can''t sleep — still polishing the draft. More tomorrow.', '02:14', 'cloud relay');

    -- Carrier tower pings. The victim's building sits under 'Dockside-2'.
    -- The victim's handset is phone_id 900.
    CREATE TABLE tower_pings (
      id INTEGER PRIMARY KEY,
      phone_id INTEGER,
      tower TEXT,
      ping_time TEXT
    );
    INSERT INTO tower_pings (id, phone_id, tower, ping_time) VALUES
      (1, 900, 'Dockside-2', '01:10'),
      (2, 900, 'Dockside-2', '01:32'),
      (3, 900, 'Dockside-2', '01:50'),   -- last ping; the handset never returns
      (4, 901, 'Midtown-1',  '01:30'),
      (5, 902, 'Dockside-2', '01:27'),   -- Caleb's phone, AT the building in the real window
      (6, 903, 'Northside-4','01:35'),
      (7, 904, 'Civic-1',    '01:25'),
      (8, 905, 'Dockside-2', '01:40'),   -- Ruth lives there; her phone always pings this tower
      (9, 902, 'Harbor-5',   '02:20');   -- Caleb, later, near the Anchor Bar

    -- Devices paired to cloud messaging accounts.
    CREATE TABLE device_registry (
      id INTEGER PRIMARY KEY,
      device TEXT,
      owner TEXT,
      paired_to TEXT,
      note TEXT
    );
    INSERT INTO device_registry (id, device, owner, paired_to, note) VALUES
      (1, 'laptop',     'Jonah Reyes',  'Jonah Reyes — cloud account', 'His own machine.'),
      (2, 'tablet',     'Caleb Osei',   'Jonah Reyes — cloud account', 'Pairing added April 30 — two days before the murder.'),
      (3, 'phone',      'Vera Lin',     'Vera Lin — cloud account',    'Normal.'),
      (4, 'smartwatch', 'Dominic Hale', 'Dominic Hale — cloud account','Normal.');

    -- Street cameras log plates with a location and time.
    CREATE TABLE cctv_sightings (
      id INTEGER PRIMARY KEY,
      plate TEXT,
      camera_location TEXT,
      seen_time TEXT
    );
    INSERT INTO cctv_sightings (id, plate, camera_location, seen_time) VALUES
      (1, 'RGX-882', 'Dockside Lot',        '01:23'),   -- Caleb's car arrives
      (2, 'RGX-882', 'Dockside Lot',        '01:58'),   -- and leaves right after the window
      (3, 'CVC-777', 'Civic Plaza Garage',  '01:15'),
      (4, 'KLM-201', 'Press Tower Garage',  '01:40'),
      (5, 'JPD-410', 'Northside Gym',       '01:05');

    CREATE TABLE coroner_reports (
      id INTEGER PRIMARY KEY,
      victim TEXT,
      tod_from TEXT,
      tod_to TEXT,
      cause TEXT
    );
    INSERT INTO coroner_reports (id, victim, tod_from, tod_to, cause) VALUES
      (1, 'Jonah Reyes', '01:20', '01:55', 'Blunt cranial trauma, single strike from behind');
  `,

  erd: {
    tables: [
      {
        name: 'suspects',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'name', type: 'TEXT' },
          { name: 'relationship', type: 'TEXT' },
          { name: 'phone_id', type: 'INTEGER', fk: 'tower_pings.phone_id' },
          { name: 'vehicle_plate', type: 'TEXT', fk: 'cctv_sightings.plate' },
        ],
      },
      {
        name: 'alibis',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'suspect_id', type: 'INTEGER', fk: 'suspects.id' },
          { name: 'statement', type: 'TEXT' },
          { name: 'covered_from', type: 'TEXT' },
          { name: 'covered_to', type: 'TEXT' },
          { name: 'corroborated', type: 'TEXT' },
        ],
      },
      {
        name: 'messages',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'sender_phone', type: 'INTEGER' },
          { name: 'recipient', type: 'TEXT' },
          { name: 'body', type: 'TEXT' },
          { name: 'sent_time', type: 'TEXT' },
          { name: 'sent_via', type: 'TEXT' },
        ],
      },
      {
        name: 'tower_pings',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'phone_id', type: 'INTEGER' },
          { name: 'tower', type: 'TEXT' },
          { name: 'ping_time', type: 'TEXT' },
        ],
      },
      {
        name: 'device_registry',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'device', type: 'TEXT' },
          { name: 'owner', type: 'TEXT' },
          { name: 'paired_to', type: 'TEXT' },
          { name: 'note', type: 'TEXT' },
        ],
      },
      {
        name: 'cctv_sightings',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'plate', type: 'TEXT' },
          { name: 'camera_location', type: 'TEXT' },
          { name: 'seen_time', type: 'TEXT' },
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

  report: {
    template:
      'Jonah was dead before his phone “spoke.” The handset last pinged a tower at {{lastPing}} and never came back online — yet the 02:14 text went out via {{sentVia}}, dispatched from a {{device}} that had been paired to his cloud account two days earlier. That device belongs to {{killer}}, whose alibi only begins AFTER the fake text, whose phone hit the Dockside-2 tower inside the coroner’s window, and whose car sat on camera in the {{lot}} from 01:23 to 01:58.',
    blanks: {
      lastPing: {
        label: 'last real signal',
        targetValue: '01:50',
        unlockedByColumn: 'last_ping',
        triggerValue: '01:50',
        options: ['01:32', '01:50', '02:14', '01:20'],
        provingQuery: `
          SELECT MAX(ping_time) AS last_ping FROM tower_pings WHERE phone_id = 900
        `,
        hint: 'When did the victim’s handset (phone_id 900) last touch a tower? SELECT MAX(ping_time) AS last_ping FROM tower_pings …',
      },
      sentVia: {
        label: 'how the 02:14 text was sent',
        targetValue: 'cloud relay',
        unlockedByColumn: 'sent_via',
        triggerValue: 'cloud relay',
        options: ['the handset', 'cloud relay', 'an SMS gateway', 'a burner phone'],
        provingQuery: `
          SELECT id, recipient, body, sent_time, sent_via FROM messages
          WHERE sent_time > (SELECT MAX(ping_time) FROM tower_pings WHERE phone_id = 900)
        `,
        hint: 'Compare sent_via across the messages from phone 900 — one of them is different.',
      },
      device: {
        label: 'the sending device',
        targetValue: 'tablet',
        unlockedByColumn: 'device',
        triggerValue: 'tablet',
        options: ['laptop', 'tablet', 'smartwatch', 'phone'],
        provingQuery: `
          SELECT device, owner, paired_to, note FROM device_registry
          WHERE owner <> 'Jonah Reyes' AND paired_to = 'Jonah Reyes — cloud account'
        `,
        hint: 'device_registry: which device that isn’t Jonah’s is paired to “Jonah Reyes — cloud account”?',
      },
      killer: {
        label: 'the killer',
        targetValue: 'Caleb Osei',
        unlockedByColumn: 'name',
        triggerValue: 'Caleb Osei',
        options: ['Vera Lin', 'Caleb Osei', 'Marta Voss', 'Dominic Hale', 'Ruth Kessler'],
        provingQuery: `
          SELECT s.name, c.seen_time
          FROM cctv_sightings c JOIN suspects s ON s.vehicle_plate = c.plate
          JOIN coroner_reports r ON r.victim = 'Jonah Reyes'
          WHERE c.seen_time >= r.tod_from AND c.seen_time <= r.tod_to
        `,
        hint: 'Two alibis fail to cover 01:20–01:55. Join tower_pings and the device registry to pick which of the two was really in play.',
      },
      lot: {
        label: 'where the car was parked',
        targetValue: 'Dockside Lot',
        unlockedByColumn: 'camera_location',
        triggerValue: 'Dockside Lot',
        options: ['Dockside Lot', 'Civic Plaza Garage', 'Press Tower Garage', 'Northside Gym'],
        provingQuery: `
          SELECT s.name, c.camera_location, c.seen_time
          FROM cctv_sightings c JOIN suspects s ON s.vehicle_plate = c.plate
          WHERE c.camera_location = 'Dockside Lot'
        `,
        hint: 'Join the killer’s vehicle_plate to cctv_sightings — where was the car during the window?',
      },
    },
  },
}
