// @ts-check
/**
 * CASE 02: "THE GREEN LIGHT"
 *
 * Change management. Vantor Mutual's claims system paid 214 claims twice in a
 * single overnight run. Every release that week passed the deployment
 * pipeline's approval gate. The control under test is change approval: every
 * production change needs a change ticket the CAB has approved, for that change,
 * on that system.
 *
 * The player must:
 *   1. List the releases to Claims Engine in the audit week: three of them.
 *   2. Triangulate each release across deployments, change_tickets and
 *      cab_approvals. One was blocked (the gate worked). Two carry an approved
 *      reference, and look identical at that depth.
 *   3. Notice that one of those approvals was granted for a DIFFERENT SYSTEM:
 *      a Broker Portal change, reused as a key to get a Claims Engine release
 *      past a gate that only checks "is this reference approved?".
 *   4. Follow that release to the engineer who shipped it and the commit it
 *      carried.
 *
 * Deductive shape: three releases reach the first obvious query. Status
 * eliminates one; the approval itself eliminates nobody, because both survivors
 * have one. Only comparing the ticket's system to the deployment's system
 * isolates the exception. The Friday-evening release looks the riskiest and is
 * clean.
 *
 * Also a trap on the deployer: CHG-4388 was deployed TWICE, legitimately to
 * Broker Portal, then again to Claims Engine. Filtering on the reference alone
 * names two engineers; the system has to be in the filter too.
 */

/** @type {import('../types.js').PlayableCase} */
export const case02 = {
  id: 'case_02',
  code: 'CODE_02',
  tag: 'CHANGE',
  title: 'The Green Light',
  teaser:
    'Every release that week passed the pipeline’s approval gate. On Saturday morning the claims system had paid 214 people twice.',
  folderTheme: 'change', // maps to paper.change tone
  locked: true,

  engagement: {
    vitals: [
      { term: 'Control', line1: 'ITGC-C02: Change approval', line2: 'Every production change CAB-approved first' },
      { term: 'System', line1: 'Vantor Mutual: Claims Engine', line2: 'Claim assessment and payment runs' },
      { term: 'Audit period', line1: '13 – 17 July 2026', line2: 'Releases before incident INC-2207' },
    ],
    report: `Vantor Mutual is an insurer, and its Claims Engine decides which claims get paid. Before each overnight payment run, the engine checks every claim against those already paid, so nobody is paid twice. On Saturday 18 July, the run paid 214 claims twice. Finance opened incident INC-2207 at 09:10 and clawed most of it back by Wednesday. Internal Audit has been asked how a change that broke the duplicate-claim check reached production.

The control is ITGC-C02, change approval. Every change to a production system is raised as a CHANGE TICKET with its own reference, such as CHG-4410. The ticket names the one system the change is for. The CHANGE ADVISORY BOARD (CAB) meets on Mondays and approves or rejects each ticket. A CAB approval covers the change on its ticket, to the system on its ticket, and nothing else.

Nobody enforces this by hand. The deployment pipeline has a gate: every release must quote a change reference, and the gate refuses any release whose reference the CAB has not approved. The gate passed every release that week except one. IT management's position is that the control operated as designed.

THREE RELEASES REACHED CLAIMS ENGINE BETWEEN 13 AND 17 JULY. You have the engineers, every deployment, the change tickets, the CAB's decisions, the commits each release carried and the incident log. One of those releases went through without an approval that covered it. Find which change reference it quoted, what that approval was actually for, who shipped it, and what it changed.`,
  },

  schemaSql: `
    -- The delivery engineers. Anyone on this list can trigger a release.
    CREATE TABLE engineers (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      team TEXT
    );
    INSERT INTO engineers (id, name, team) VALUES
      (1, 'Mei Tanaka',    'Broker'),
      (2, 'Leon Varga',    'Claims'),
      (3, 'Sade Adeyemi',  'Claims'),
      (4, 'Ruth Ellison',  'Platform'),
      (5, 'Kofi Mensah',   'Claims');

    -- A change ticket names ONE system. The CAB approves the ticket, so its
    -- approval is only good for that system.
    CREATE TABLE change_tickets (
      id INTEGER PRIMARY KEY,
      change_ref TEXT UNIQUE,
      system_name TEXT,
      summary TEXT,
      requested_by INTEGER REFERENCES engineers(id),
      risk TEXT
    );
    INSERT INTO change_tickets (id, change_ref, system_name, summary, requested_by, risk) VALUES
      (1, 'CHG-4388', 'Broker Portal', 'Round broker commission to 2 d.p.',   1, 'Low'),
      (2, 'CHG-4410', 'Claims Engine', 'Add postcode to claim letters',       3, 'Low'),
      (3, 'CHG-4415', 'Broker Portal', 'Refresh broker login page',           1, 'Low'),
      (4, 'CHG-4421', 'Claims Engine', 'Raise auto-approve limit to 5000',    5, 'High');

    -- The CAB's decision on each ticket. Monday meetings.
    CREATE TABLE cab_approvals (
      id INTEGER PRIMARY KEY,
      change_ref TEXT REFERENCES change_tickets(change_ref),
      meeting_date TEXT,
      decision TEXT,           -- 'Approved' or 'Rejected'
      chair TEXT
    );
    INSERT INTO cab_approvals (id, change_ref, meeting_date, decision, chair) VALUES
      (1, 'CHG-4388', '2026-07-06', 'Approved', 'Ruth Ellison'),
      (2, 'CHG-4410', '2026-07-13', 'Approved', 'Ruth Ellison'),
      (3, 'CHG-4415', '2026-07-13', 'Approved', 'Ruth Ellison'),
      (4, 'CHG-4421', '2026-07-13', 'Rejected', 'Ruth Ellison');

    -- What was in each release.
    CREATE TABLE commits (
      hash TEXT PRIMARY KEY,
      author_id INTEGER REFERENCES engineers(id),
      repo TEXT,
      message TEXT
    );
    INSERT INTO commits (hash, author_id, repo, message) VALUES
      ('a1f3c9e', 1, 'broker-portal', 'Round commission to 2 d.p.'),
      ('e02b7aa', 1, 'broker-portal', 'Refresh login page styles'),
      ('7be2d04', 3, 'claims-engine', 'Add postcode to claim letter'),
      ('5d0a8f2', 5, 'claims-engine', 'Raise auto-approve limit'),
      ('c94e11b', 2, 'claims-engine', 'Skip duplicate check on rerun');

    -- Every release the pipeline handled. The gate sets status: 'Succeeded'
    -- if the quoted change_ref was approved, 'Blocked' if it was not.
    CREATE TABLE deployments (
      id INTEGER PRIMARY KEY,
      system_name TEXT,
      deployed_on TEXT,
      deployed_time TEXT,
      deployed_by INTEGER REFERENCES engineers(id),
      change_ref TEXT REFERENCES change_tickets(change_ref),
      commit_hash TEXT REFERENCES commits(hash),
      status TEXT
    );
    INSERT INTO deployments (id, system_name, deployed_on, deployed_time, deployed_by, change_ref, commit_hash, status) VALUES
      (1, 'Broker Portal', '2026-07-07', '10:15', 1, 'CHG-4388', 'a1f3c9e', 'Succeeded'), -- the approval's real use
      (2, 'Broker Portal', '2026-07-14', '11:40', 1, 'CHG-4415', 'e02b7aa', 'Succeeded'),
      (3, 'Claims Engine', '2026-07-15', '16:20', 5, 'CHG-4421', '5d0a8f2', 'Blocked'),   -- rejected; the gate held
      (4, 'Claims Engine', '2026-07-16', '14:05', 2, 'CHG-4388', 'c94e11b', 'Succeeded'), -- a Broker Portal approval on Claims Engine
      (5, 'Claims Engine', '2026-07-17', '17:30', 3, 'CHG-4410', '7be2d04', 'Succeeded'); -- Friday evening, and clean

    -- Incidents raised against production systems.
    CREATE TABLE incidents (
      id INTEGER PRIMARY KEY,
      ref TEXT,
      system_name TEXT,
      opened_on TEXT,
      opened_time TEXT,
      summary TEXT
    );
    INSERT INTO incidents (id, ref, system_name, opened_on, opened_time, summary) VALUES
      (1, 'INC-2198', 'Broker Portal', '2026-07-08', '14:30', 'Commission statement off by 1p on two brokers'),
      (2, 'INC-2207', 'Claims Engine', '2026-07-18', '09:10', '214 claims paid twice in overnight payment run');
  `,

  // Entity-Relationship diagram for the Data Map tab.
  erd: {
    tables: [
      {
        name: 'engineers',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'name', type: 'TEXT' },
          { name: 'team', type: 'TEXT' },
        ],
      },
      {
        name: 'deployments',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'system_name', type: 'TEXT' },
          { name: 'deployed_on', type: 'TEXT' },
          { name: 'deployed_time', type: 'TEXT' },
          { name: 'deployed_by', type: 'INTEGER', fk: 'engineers.id' },
          { name: 'change_ref', type: 'TEXT', fk: 'change_tickets.change_ref' },
          { name: 'commit_hash', type: 'TEXT', fk: 'commits.hash' },
          { name: 'status', type: 'TEXT' },
        ],
      },
      {
        name: 'change_tickets',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'change_ref', type: 'TEXT' },
          { name: 'system_name', type: 'TEXT' },
          { name: 'summary', type: 'TEXT' },
          { name: 'requested_by', type: 'INTEGER', fk: 'engineers.id' },
          { name: 'risk', type: 'TEXT' },
        ],
      },
      {
        name: 'cab_approvals',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'change_ref', type: 'TEXT', fk: 'change_tickets.change_ref' },
          { name: 'meeting_date', type: 'TEXT' },
          { name: 'decision', type: 'TEXT' },
          { name: 'chair', type: 'TEXT' },
        ],
      },
      {
        name: 'commits',
        columns: [
          { name: 'hash', type: 'TEXT', pk: true },
          { name: 'author_id', type: 'INTEGER', fk: 'engineers.id' },
          { name: 'repo', type: 'TEXT' },
          { name: 'message', type: 'TEXT' },
        ],
      },
      {
        name: 'incidents',
        columns: [
          { name: 'id', type: 'INTEGER', pk: true },
          { name: 'ref', type: 'TEXT' },
          { name: 'system_name', type: 'TEXT' },
          { name: 'opened_on', type: 'TEXT' },
          { name: 'opened_time', type: 'TEXT' },
          { name: 'summary', type: 'TEXT' },
        ],
      },
    ],
  },

  // The Finding write-up. The template stays silent on the release's date and
  // time: the Finding tab is visible from the start, and either would name the
  // exception before a query was run.
  report: {
    template:
      'Control ITGC-C02 failed. A release to Claims Engine quoted change reference {{changeRef}}, which the pipeline gate accepted as approved. But the CAB had approved that reference for {{approvedFor}}: a different change, to a different system. The gate checked that a reference was approved, never what it was approved for. The release was shipped by {{deployer}} and carried the commit “{{commit}}”. The overnight payment run that followed paid 214 claims twice.',
    blanks: {
      changeRef: {
        label: 'the change reference it quoted',
        targetValue: 'CHG-4388',
        // Keyed on an alias. A dump of deployments lists every reference, and
        // the approved ones look alike; only the ticket-vs-deployment system
        // comparison singles this one out.
        unlockedByColumn: 'unapproved_change',
        triggerValue: 'CHG-4388',
        options: ['CHG-4388', 'CHG-4410', 'CHG-4415', 'CHG-4421'],
        // Shares its query with `approvedFor`: the mismatch row IS the finding,
        // and both halves of it sit side by side in that row.
        coUnlocksWith: 'approvedFor',
        provingQuery: `
          SELECT d.change_ref AS unapproved_change, d.system_name AS deployed_to,
                 t.system_name AS approved_for, c.decision
          FROM deployments d
          JOIN change_tickets t ON t.change_ref = d.change_ref
          JOIN cab_approvals c ON c.change_ref = d.change_ref
          WHERE d.status = 'Succeeded' AND t.system_name <> d.system_name
        `,
        hint: 'Join deployments to change_tickets and cab_approvals. Both Claims Engine releases that got through have an approval, so compare the system on the ticket with the system deployed to. Alias the reference AS unapproved_change.',
      },
      approvedFor: {
        label: 'what the approval actually covered',
        targetValue: 'Broker Portal',
        unlockedByColumn: 'approved_for',
        triggerValue: 'Broker Portal',
        options: ['Broker Portal', 'Claims Engine', 'Payments Hub', 'Policy Admin'],
        coUnlocksWith: 'changeRef',
        provingQuery: `
          SELECT d.change_ref AS unapproved_change, d.system_name AS deployed_to,
                 t.system_name AS approved_for, c.decision
          FROM deployments d
          JOIN change_tickets t ON t.change_ref = d.change_ref
          JOIN cab_approvals c ON c.change_ref = d.change_ref
          WHERE d.status = 'Succeeded' AND t.system_name <> d.system_name
        `,
        hint: 'The same row: the system named on the ticket the CAB approved. Alias it AS approved_for.',
      },
      deployer: {
        label: 'who shipped it',
        targetValue: 'Leon Varga',
        // CHG-4388 was released twice, so filtering on the reference alone
        // returns two engineers. The system filter is the deduction.
        unlockedByColumn: 'deployer_name',
        triggerValue: 'Leon Varga',
        options: ['Mei Tanaka', 'Leon Varga', 'Sade Adeyemi', 'Kofi Mensah'],
        provingQuery: `
          SELECT e.name AS deployer_name, d.deployed_on, d.deployed_time
          FROM deployments d JOIN engineers e ON e.id = d.deployed_by
          WHERE d.change_ref = 'CHG-4388' AND d.system_name = 'Claims Engine'
        `,
        hint: 'Join deployments to engineers for that reference. Careful, it was released more than once. Alias the name AS deployer_name.',
      },
      commit: {
        label: 'the commit it carried',
        targetValue: 'Skip duplicate check on rerun',
        unlockedByColumn: 'deployed_commit',
        triggerValue: 'Skip duplicate check on rerun',
        options: [
          'Add postcode to claim letter',
          'Raise auto-approve limit',
          'Skip duplicate check on rerun',
          'Round commission to 2 d.p.',
        ],
        provingQuery: `
          SELECT d.commit_hash, m.message AS deployed_commit
          FROM deployments d JOIN commits m ON m.hash = d.commit_hash
          WHERE d.change_ref = 'CHG-4388' AND d.system_name = 'Claims Engine'
        `,
        hint: 'Follow the release’s commit_hash into commits. Alias the message AS deployed_commit.',
      },
    },
  },
}
