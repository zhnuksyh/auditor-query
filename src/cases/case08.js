// @ts-check
/**
 * CASE 08 — "THE LONG SHIFT"
 *
 * The hardest file yet, and the first that needs a WINDOW FUNCTION. Seven
 * tables, six nurses. Every earlier case compared rows across tables; this one
 * asks the player to compare a row against THE ROW BEFORE IT IN TIME:
 *
 *   - `ward_roster` is the shift sheet: one row per nurse per shift, with a
 *     start and an end. Ordering it by start time and pulling the previous
 *     shift's end with LAG() exposes the HANDOVER GAP — the one stretch of the
 *     day when the ward sheet says nobody had signed on. That gap is the window
 *     the cabinet was opened in.
 *   - `cabinet_access` logs every door opening on the controlled-drug cabinet.
 *     Exactly one opening falls inside the gap, and it is the one that drew the
 *     fatal dose.
 *   - Every withdrawal needs a SECOND nurse to witness and countersign it
 *     (`withdrawals.countersigned_by`). The signature on the fatal withdrawal
 *     belongs to a nurse whose roster row had already ended — she was off the
 *     ward and could not have witnessed anything. The name was borrowed.
 *   - `badge_events` is the honest record — machine-written, unlike the
 *     handwritten countersignature. It says who was still physically on the
 *     ward during the gap, which is how the borrowed name gets attached to a
 *     real person.
 *
 * Difficulty step: case 06 needed absence (anti-join), case 07 needed a table
 * against ITSELF (self-join + EXCEPT). This one needs the ordered-sequence
 * shape — LAG() OVER (ORDER BY ...) — to see a gap that exists in no column.
 * The final elimination is still an intersection: three nurses were on the ward
 * during the gap, and only one of them also had a cabinet PIN.
 *
 * Deductive difficulty: the first obvious query (who was on the ward during the
 * gap?) returns THREE nurses. Presence alone never convicts.
 *
 * All times sit inside a single day (06:00–20:00) — no window crosses midnight,
 * so the 'HH:MM' TEXT comparisons stay lexicographically sound.
 */

/** @type {import('../types.js').PlayableCase} */
export const case08 = {
  id: 'case_08',
  code: 'CODE_08',
  tag: 'RELAY',
  title: 'The Long Shift',
  teaser:
    'Six nurses, one locked drug cabinet, and a signature that was never on shift.',
  folderTheme: 'work',
  locked: true,

  crimeScene: {
    victim: { line1: 'Devrim Aslan, 47', line2: 'Post-operative patient, Bed 12' },
    location: { line1: 'St. Brannock Infirmary, Ward 3B', line2: 'Recovery bay, east end' },
    timeOfDeath: { line1: '13:20 – 14:10', line2: 'March 9th' },
    report: `DEVRIM ASLAN came through his surgery cleanly and was expected to walk out within the week. He died in his bed on Ward 3B some time between 13:20 and 14:10, and the ward wrote it up as a cardiac event until toxicology came back: a dose of MORPHINE far past anything on his chart, given by injection, in a man prescribed none of it.

Ward 3B keeps its controlled drugs in a locked cabinet that opens only to a numbered PIN, and it keeps two records of every dose. The CABINET ACCESS log is machine-written — every opening, stamped with the minute and the PIN used. The WITHDRAWAL BOOK is handwritten: the nurse drawing a dose writes it down, and a SECOND nurse must witness the draw and countersign it. No controlled drug leaves that cabinet on one signature alone.

The ward runs on a relay. Shifts are supposed to overlap so the ward is never uncovered — one nurse signs off only after the next has signed on and taken handover. The shift sheet for March 9th looks ordinary at a glance. It is not: somewhere in that day the relay breaks, and for one stretch the sheet has nobody at all signed on to Ward 3B. The cabinet was opened during that stretch.

Six nurses worked St. Brannock that day, and not all of them are licensed to draw a controlled drug — only a nurse issued a cabinet PIN can open that door at all. The countersignature on the fatal withdrawal belongs to one of the licensed ones, but her own shift had already ended by the time it was written and her badge had read her out of the building. Her name was borrowed. So was the PIN beside it: the cabinet believed her, because a cabinet only knows the number it was given.

That leaves the badges. A name can be written, and a PIN can be memorised over someone's shoulder, but the door reader logs a physical person going in and coming out, and it cannot be argued with. Work out when the relay broke, find the opening inside it, and ask who was still standing on Ward 3B — with a PIN of their own to lose.`,
    constraints: [
      'Time of death: 13:20–14:10, March 9th.',
      'Cause: an unprescribed morphine dose given by injection.',
      'Shifts must overlap — a gap in the roster means the ward was uncovered.',
      'Every withdrawal needs a second nurse to witness and countersign it.',
      'Cabinet access is machine-logged by PIN; the withdrawal book is handwritten.',
      'Only a nurse issued a cabinet PIN can draw a controlled drug.',
      'A PIN identifies a number, not a person — it can be borrowed.',
      'Badge events are machine-written and cannot be forged.',
    ],
  },

  schemaSql: `
    CREATE TABLE nurses (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      grade TEXT,
      cabinet_pin INTEGER      -- NULL for nurses not licensed to draw controlled drugs
    );
    INSERT INTO nurses (id, name, grade, cabinet_pin) VALUES
      (1, 'Ilse Vandermeer', 'Charge nurse',      4417),
      (2, 'Petra Nasilo',    'Staff nurse',       2298),
      (3, 'Rowan Achterberg','Staff nurse',       NULL),
      (4, 'Guri Halvorsen',  'Senior staff nurse',6135),
      (5, 'Milena Rask',     'Staff nurse',       NULL),
      (6, 'Bexley Tunstall', 'Agency nurse',      NULL);

    -- The shift sheet. Ordering by shift_start and looking at the PREVIOUS
    -- shift's end is the whole case: the relay is supposed to overlap, and
    -- exactly once that day it does not.
    CREATE TABLE ward_roster (
      id INTEGER PRIMARY KEY,
      nurse_id INTEGER REFERENCES nurses(id),
      ward TEXT,
      shift_start TEXT,        -- 'HH:MM'
      shift_end TEXT           -- 'HH:MM'
    );
    INSERT INTO ward_roster (id, nurse_id, ward, shift_start, shift_end) VALUES
      (1, 1, 'Ward 3B', '06:00', '13:00'),   -- covers her own draws at 07:15/11:40/12:50
      (2, 4, 'Ward 3B', '11:00', '13:20'),   -- overlaps Ilse: relay intact
      (3, 2, 'Ward 3B', '14:05', '19:00'),   -- starts 45 min AFTER Guri ends: THE GAP
      (4, 5, 'Ward 3B', '18:30', '20:00'),   -- overlaps Petra: relay intact
      (5, 3, 'Ward 5A', '07:00', '15:00'),   -- a different ward entirely
      (6, 6, 'Ward 5A', '12:00', '20:00');   -- a different ward entirely

    -- Machine-written. Every opening of the controlled-drug cabinet on 3B.
    CREATE TABLE cabinet_access (
      id INTEGER PRIMARY KEY,
      pin_used INTEGER,
      opened_at TEXT,          -- 'HH:MM'
      drawer TEXT
    );
    INSERT INTO cabinet_access (id, pin_used, opened_at, drawer) VALUES
      (1, 4417, '07:15', 'Schedule 2'),
      (2, 6135, '11:40', 'Schedule 2'),
      (3, 6135, '12:50', 'Schedule 3'),
      (4, 6135, '13:45', 'Schedule 2'),   -- inside the 13:20-14:05 gap
      (5, 2298, '15:10', 'Schedule 2'),
      (6, 2298, '17:35', 'Schedule 3'),
      (7, 4417, '09:20', 'Schedule 3');

    -- Handwritten. The drawing nurse writes the line; a second nurse witnesses
    -- and countersigns it. The countersignature is the forgeable part.
    CREATE TABLE withdrawals (
      id INTEGER PRIMARY KEY,
      drug TEXT,
      dose_mg INTEGER,
      logged_at TEXT,          -- 'HH:MM'
      patient_bed INTEGER,
      countersigned_by TEXT
    );
    INSERT INTO withdrawals (id, drug, dose_mg, logged_at, patient_bed, countersigned_by) VALUES
      (1, 'Morphine',   10, '07:15', 4,  'Guri Halvorsen'),
      (2, 'Morphine',   10, '11:40', 9,  'Ilse Vandermeer'),
      (3, 'Oxycodone',   5, '12:50', 7,  'Ilse Vandermeer'),
      (4, 'Morphine',   60, '13:45', 12, 'Guri Halvorsen'),  -- Guri went off at 13:20
      (5, 'Morphine',   10, '15:10', 2,  'Milena Rask'),
      (6, 'Oxycodone',   5, '17:35', 9,  'Milena Rask'),
      (7, 'Oxycodone',   5, '09:20', 7,  'Guri Halvorsen');

    -- Machine-written badge reads at the Ward 3B door. Cannot be forged.
    CREATE TABLE badge_events (
      id INTEGER PRIMARY KEY,
      nurse_id INTEGER REFERENCES nurses(id),
      ward TEXT,
      event_time TEXT,         -- 'HH:MM'
      direction TEXT           -- 'IN' | 'OUT'
    );
    INSERT INTO badge_events (id, nurse_id, ward, event_time, direction) VALUES
      (1,  1, 'Ward 3B', '05:54', 'IN'),
      (2,  1, 'Ward 3B', '13:04', 'OUT'),
      (3,  4, 'Ward 3B', '10:58', 'IN'),
      (4,  4, 'Ward 3B', '13:22', 'OUT'),   -- Guri really did leave at her shift end
      -- All three came onto the ward early, before their shifts began: the
      -- staff room is on 3B, and the gap is exactly when nobody was signed on
      -- to notice. Being present is not the same as being rostered.
      (5,  2, 'Ward 3B', '13:31', 'IN'),    -- Petra: on the ward, off the roster
      (6,  2, 'Ward 3B', '19:04', 'OUT'),
      (7,  5, 'Ward 3B', '13:38', 'IN'),    -- Milena: in early, shift starts 18:30
      (8,  5, 'Ward 3B', '20:02', 'OUT'),
      (9,  6, 'Ward 3B', '13:12', 'IN'),    -- Bexley: agency, no PIN, no draw
      (10, 6, 'Ward 3B', '16:45', 'OUT'),
      (11, 3, 'Ward 5A', '06:58', 'IN'),
      (12, 3, 'Ward 5A', '15:03', 'OUT');

    CREATE TABLE prescriptions (
      id INTEGER PRIMARY KEY,
      patient TEXT,
      bed INTEGER,
      drug TEXT,
      max_dose_mg INTEGER
    );
    INSERT INTO prescriptions (id, patient, bed, drug, max_dose_mg) VALUES
      (1, 'Devrim Aslan',   12, 'Paracetamol', 1000),
      (2, 'Devrim Aslan',   12, 'Enoxaparin',    40),
      (3, 'Halina Ozdemir',  9, 'Morphine',      10),
      (4, 'Tomas Brill',     4, 'Morphine',      10),
      (5, 'Ana Sereda',      2, 'Morphine',      10),
      (6, 'Rufus Ibbotson',  7, 'Oxycodone',      5);

    CREATE TABLE toxicology (
      id INTEGER PRIMARY KEY,
      patient TEXT,
      substance TEXT,
      finding TEXT,
      tod_from TEXT,
      tod_to TEXT
    );
    INSERT INTO toxicology (id, patient, substance, finding, tod_from, tod_to) VALUES
      (1, 'Devrim Aslan', 'Morphine',
          'Serum concentration consistent with a single large injected dose',
          '13:20', '14:10');
  `,

  erd: {
    tables: [
      {
        name: 'nurses',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'name', type: 'TEXT' },
          { name: 'grade', type: 'TEXT' },
          { name: 'cabinet_pin', type: 'INTEGER' },
        ],
      },
      {
        name: 'ward_roster',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'nurse_id', type: 'INTEGER', fk: 'nurses.id' },
          { name: 'ward', type: 'TEXT' },
          { name: 'shift_start', type: 'TEXT' },
          { name: 'shift_end', type: 'TEXT' },
        ],
      },
      {
        name: 'cabinet_access',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'pin_used', type: 'INTEGER' },
          { name: 'opened_at', type: 'TEXT' },
          { name: 'drawer', type: 'TEXT' },
        ],
      },
      {
        name: 'withdrawals',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'drug', type: 'TEXT' },
          { name: 'dose_mg', type: 'INTEGER' },
          { name: 'logged_at', type: 'TEXT' },
          { name: 'patient_bed', type: 'INTEGER' },
          { name: 'countersigned_by', type: 'TEXT' },
        ],
      },
      {
        name: 'badge_events',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'nurse_id', type: 'INTEGER', fk: 'nurses.id' },
          { name: 'ward', type: 'TEXT' },
          { name: 'event_time', type: 'TEXT' },
          { name: 'direction', type: 'TEXT' },
        ],
      },
      {
        name: 'prescriptions',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'patient', type: 'TEXT' },
          { name: 'bed', type: 'INTEGER' },
          { name: 'drug', type: 'TEXT' },
          { name: 'max_dose_mg', type: 'INTEGER' },
        ],
      },
      {
        name: 'toxicology',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'patient', type: 'TEXT' },
          { name: 'substance', type: 'TEXT' },
          { name: 'finding', type: 'TEXT' },
          { name: 'tod_from', type: 'TEXT' },
          { name: 'tod_to', type: 'TEXT' },
        ],
      },
    ],
  },

  report: {
    template:
      'The relay broke. Ordering the shift sheet by start time shows one handover that never overlapped: the ward was uncovered from {{gapStart}} until the next nurse signed on at 14:05, and the controlled-drug cabinet was opened at {{openedAt}} — inside that gap, and inside the coroner’s window. The withdrawal drawn from it was {{doseMg}}mg of morphine for Bed 12, a patient prescribed none. The book says {{borrowedName}} witnessed that draw, but her own shift had ended and her badge had already read her off the ward — both her signature and the PIN under it were borrowed from a nurse who had gone home. The door reader could not be borrowed. Three nurses were still on 3B when that cabinet opened, and only one of them was licensed to draw a controlled drug at all: {{killer}} drew the dose, signed a colleague’s name under it, and let the broken relay cover the difference.',
    blanks: {
      gapStart: {
        label: 'when the ward went uncovered',
        targetValue: '13:20',
        unlockedByColumn: 'gap_from',
        triggerValue: '13:20',
        // THE NEW SHAPE: LAG() over the roster ordered by shift_start pulls the
        // previous shift's end alongside each shift's start. Where the previous
        // end is EARLIER than this start, the relay failed. `gap_from` is an
        // alias that exists in no table, so SELECT * cannot unlock this.
        provingQuery: `
          SELECT gap_from, shift_start AS covered_again FROM (
            SELECT
              shift_start,
              LAG(shift_end) OVER (ORDER BY shift_start) AS gap_from
            FROM ward_roster
            WHERE ward = 'Ward 3B'
          )
          WHERE gap_from < shift_start
        `,
        options: ['11:30', '13:20', '14:05', '19:00'],
        hint: 'Order the Ward 3B roster by shift_start and use LAG(shift_end) OVER (ORDER BY shift_start) to put each shift beside the one before it. Alias the previous end AS gap_from and find where it lands before the next start.',
      },
      openedAt: {
        label: 'when the cabinet was opened',
        targetValue: '13:45',
        unlockedByColumn: 'opened_in_gap',
        triggerValue: '13:45',
        // Only one opening falls inside the uncovered stretch. Aliased so a
        // plain SELECT * FROM cabinet_access does not hand it over.
        provingQuery: `
          SELECT c.opened_at AS opened_in_gap, c.pin_used, c.drawer
          FROM cabinet_access c
          JOIN toxicology t ON t.patient = 'Devrim Aslan'
          WHERE c.opened_at > '13:20' AND c.opened_at < '14:05'
            AND c.opened_at >= t.tod_from AND c.opened_at <= t.tod_to
        `,
        options: ['11:40', '12:50', '13:45', '15:10'],
        hint: 'Which cabinet opening falls inside the uncovered stretch AND the coroner’s window? Alias it AS opened_in_gap.',
      },
      doseMg: {
        label: 'the size of the dose',
        targetValue: '60',
        unlockedByColumn: 'overdose_mg',
        triggerValue: 60,
        // Aggregate alias again, but the real work is the anti-join: Bed 12 has
        // no morphine prescription at all, so the comparison is against absence.
        provingQuery: `
          SELECT w.dose_mg AS overdose_mg, w.patient_bed
          FROM withdrawals w
          WHERE w.drug = 'Morphine'
            AND NOT EXISTS (
              SELECT 1 FROM prescriptions p
              WHERE p.bed = w.patient_bed AND p.drug = w.drug
            )
        `,
        options: ['5', '10', '40', '60'],
        hint: 'Find the morphine withdrawal drawn for a bed with no morphine prescription behind it. Alias the dose AS overdose_mg.',
      },
      borrowedName: {
        label: 'the borrowed signature',
        targetValue: 'Guri Halvorsen',
        unlockedByColumn: 'signed_off_at',
        triggerValue: '13:20',
        // Keyed on her shift END, not her name: the countersignature is already
        // visible in the withdrawals table, so triggering on the name would let
        // a plain SELECT * unlock it. The player has to prove she was OFF.
        provingQuery: `
          SELECT r.shift_end AS signed_off_at, w.logged_at
          FROM withdrawals w
          JOIN nurses n ON n.name = w.countersigned_by
          JOIN ward_roster r ON r.nurse_id = n.id AND r.ward = 'Ward 3B'
          WHERE w.dose_mg = 60 AND r.shift_end < w.logged_at
        `,
        options: ['Ilse Vandermeer', 'Guri Halvorsen', 'Milena Rask', 'Bexley Tunstall'],
        hint: 'Join the fatal withdrawal to the roster row of whoever countersigned it. Did her shift end before the line was written? Alias that end AS signed_off_at.',
      },
      killer: {
        label: 'the killer',
        targetValue: 'Petra Nasilo',
        unlockedByColumn: 'name',
        triggerValue: 'Petra Nasilo',
        // The intersection, and the last turn of the screw: the PIN recorded at
        // 13:45 is Guri's (6135), the same nurse whose name was forged onto the
        // countersignature — so the PIN proves nothing about who stood there.
        // Identification rests on the badges, which cannot be borrowed: three
        // nurses were on the ward across the opening, and only one of them is
        // licensed to draw a controlled drug at all.
        provingQuery: `
          SELECT n.name, n.cabinet_pin
          FROM nurses n
          JOIN badge_events b ON b.nurse_id = n.id AND b.ward = 'Ward 3B' AND b.direction = 'IN'
          JOIN cabinet_access c ON c.opened_at > '13:20' AND c.opened_at < '14:05'
          WHERE b.event_time < c.opened_at
            AND n.cabinet_pin IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM badge_events o
              WHERE o.nurse_id = n.id AND o.ward = 'Ward 3B'
                AND o.direction = 'OUT' AND o.event_time < c.opened_at
            )
        `,
        options: ['Ilse Vandermeer', 'Petra Nasilo', 'Guri Halvorsen', 'Milena Rask', 'Bexley Tunstall'],
        hint: 'The PIN was borrowed too — ignore it. Who was badged onto Ward 3B before the cabinet opened, had not badged out again, and was licensed to draw controlled drugs at all?',
      },
    },
  },
}
