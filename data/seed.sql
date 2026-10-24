-- Legible seed data — Massachusetts (Newton + Cambridge local; statewide ballot + bills)
-- Compiled and verified 2026-10-24. SQLite dialect (also loads on Postgres with minor tweaks).
--
-- STATE vs LOCAL distinction is explicit in two places:
--   1. jurisdiction.level  -> 'state' | 'local'
--   2. civic_item.scope    -> 'state' | 'local'  (required, CHECK-constrained, mirrors the jurisdiction)
-- Every civic_item row is tagged, and a view (v_item_scope) lets you assert the two agree.
--
-- Honesty notes (kept, not hidden):
--   * verification = 'verified'       -> checked against a government or news source on checked_on.
--   * verification = 'schedule_based' -> date/time follow the body's published standing schedule;
--                                        no posted agenda for that specific date was read.
--   Specific future agenda line-items are intentionally NOT asserted as fact. Meetings carry the
--   real body, cadence, time, and location; agenda contents are left to the posted agenda.
--   Prompt-injection text found embedded in some source PDFs was ignored.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------
DROP VIEW  IF EXISTS v_item_scope;
DROP TABLE IF EXISTS item_topic;
DROP TABLE IF EXISTS civic_item;
DROP TABLE IF EXISTS topic;
DROP TABLE IF EXISTS jurisdiction;

CREATE TABLE jurisdiction (
  id         TEXT PRIMARY KEY,                 -- OCD-style division id
  name       TEXT NOT NULL,
  level      TEXT NOT NULL CHECK (level IN ('state','local')),
  gov_level  TEXT NOT NULL,                    -- finer grain: state | municipality | school_district
  state_code TEXT NOT NULL DEFAULT 'MA'
);

CREATE TABLE topic (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE civic_item (
  id              TEXT PRIMARY KEY,
  scope           TEXT NOT NULL CHECK (scope IN ('state','local')),   -- explicit state/local tag
  kind            TEXT NOT NULL CHECK (kind IN
                    ('election','ballot_measure','bill','meeting','deadline','window')),
  jurisdiction_id TEXT NOT NULL REFERENCES jurisdiction(id),
  body            TEXT,                         -- who acts: "Newton City Council", "Voters", ...
  external_id     TEXT,                         -- "Question 7", "S.2581", ...
  title           TEXT NOT NULL,
  summary_plain   TEXT NOT NULL,
  yes_means       TEXT,                         -- ballot measures only
  no_means        TEXT,                         -- ballot measures only
  status          TEXT,
  starts_at       TEXT,                         -- ISO 8601 with offset; NULL for undated bills
  ends_at         TEXT,
  location        TEXT,
  source_name     TEXT NOT NULL,
  source_url      TEXT NOT NULL,
  verification    TEXT NOT NULL CHECK (verification IN ('verified','schedule_based')),
  checked_on      TEXT NOT NULL,
  note            TEXT
);

CREATE TABLE item_topic (
  item_id    TEXT NOT NULL REFERENCES civic_item(id) ON DELETE CASCADE,
  topic_slug TEXT NOT NULL REFERENCES topic(slug),
  PRIMARY KEY (item_id, topic_slug)
);

-- Guard: scope must agree with the item's jurisdiction level.
CREATE VIEW v_item_scope AS
SELECT ci.id, ci.scope, j.level AS jurisdiction_level,
       (ci.scope = j.level) AS scope_matches_jurisdiction
FROM civic_item ci
JOIN jurisdiction j ON j.id = ci.jurisdiction_id;

-- ---------------------------------------------------------------------------
-- Jurisdictions
-- ---------------------------------------------------------------------------
INSERT INTO jurisdiction (id, name, level, gov_level, state_code) VALUES
  ('ocd-division/country:us/state:ma',                        'Massachusetts',            'state', 'state',          'MA'),
  ('ocd-division/country:us/state:ma/place:cambridge',        'City of Cambridge',        'local', 'municipality',   'MA'),
  ('ocd-division/country:us/state:ma/school_district:cambridge','Cambridge Public Schools','local','school_district','MA'),
  ('ocd-division/country:us/state:ma/place:newton',           'City of Newton',           'local', 'municipality',   'MA'),
  ('ocd-division/country:us/state:ma/school_district:newton', 'Newton Public Schools',    'local', 'school_district','MA');

-- ---------------------------------------------------------------------------
-- Topics (neutral subjects, never sides)
-- ---------------------------------------------------------------------------
INSERT INTO topic (slug, name) VALUES
  ('housing',              'Housing and zoning'),
  ('education',            'Schools'),
  ('taxes_budget',         'Taxes and budget'),
  ('transportation',       'Transportation'),
  ('environment',          'Environment and energy'),
  ('public_safety',        'Public safety'),
  ('health',               'Health'),
  ('jobs_business',        'Jobs and business'),
  ('civil_rights',         'Civil rights'),
  ('elections_government', 'Elections and government'),
  ('parks_recreation',     'Parks and recreation');

-- ===========================================================================
-- STATE items
-- ===========================================================================

-- Election dates (statewide) -------------------------------------------------
INSERT INTO civic_item (id, scope, kind, jurisdiction_id, body, external_id, title, summary_plain,
  status, starts_at, ends_at, location, source_name, source_url, verification, checked_on, note) VALUES
('ma-2026-voter-registration-deadline','state','deadline','ocd-division/country:us/state:ma','Voters',NULL,
 'Last day to register to vote for the November 3 election',
 'Today is the deadline to register or update your address so you can vote on November 3. If you moved since the last election, update your registration so you get the right ballot.',
 'deadline','2026-10-24T23:59:00-04:00',NULL,'Online at the Secretary of the Commonwealth, or your city or town clerk',
 'Information for Voters 2026, Secretary of the Commonwealth',
 'https://www.sec.state.ma.us/divisions/elections/research-and-statistics/2026-information-for-voters/guide.htm',
 'verified','2026-10-24',NULL),
('ma-2026-early-voting','state','window','ocd-division/country:us/state:ma','Voters',NULL,
 'Early in-person voting is open',
 'Early voting started October 17. You can vote in person before Election Day at your town''s early voting locations; hours vary by town.',
 'open','2026-10-17T09:00:00-04:00','2026-10-30T17:00:00-04:00','Your city or town''s early voting sites',
 'Information for Voters 2026, Secretary of the Commonwealth',
 'https://www.sec.state.ma.us/divisions/elections/research-and-statistics/2026-information-for-voters/guide.htm',
 'verified','2026-10-24',NULL),
('ma-2026-general-election','state','election','ocd-division/country:us/state:ma','Voters',NULL,
 'State election — November 3, 2026',
 'Election Day. Along with candidates, Massachusetts voters decide nine statewide ballot questions, tying the state''s record from 1994.',
 'upcoming','2026-11-03T07:00:00-05:00',NULL,'Your assigned polling place',
 'Ballotpedia: Massachusetts 2026 ballot measures',
 'https://news.ballotpedia.org/2026/07/21/massachusetts-voters-will-decide-on-nine-ballot-measures-in-2026-tying-the-year-for-the-most-measures-on-a-massachusetts-ballot-since-1918/',
 'verified','2026-10-24',NULL);

-- Statewide ballot measures (Q1-Q9) -----------------------------------------
INSERT INTO civic_item (id, scope, kind, jurisdiction_id, body, external_id, title, summary_plain,
  yes_means, no_means, status, starts_at, source_name, source_url, verification, checked_on, note) VALUES
('ma-2026-q1','state','ballot_measure','ocd-division/country:us/state:ma','Voters','Question 1',
 'Question 1: Apply the public records law to the Legislature and governor''s office',
 'Right now the Legislature is fully exempt from the public records law, and the governor''s office has claimed an exemption. This question would make most of their records requestable, while still letting them withhold communications about helping constituents and developing policy.',
 'The Legislature and governor''s office would be covered by the public records law, with some exceptions.',
 'The Legislature stays exempt, and the governor''s office can keep claiming an exemption.',
 'on_ballot','2026-11-03T07:00:00-05:00',
 'CBS Boston: the 9 ballot questions','https://www.cbsnews.com/boston/news/massachusetts-ballot-questions-2026/','verified','2026-10-24',NULL),
('ma-2026-q2','state','ballot_measure','ocd-division/country:us/state:ma','Voters','Question 2',
 'Question 2: Let public defender office staff unionize',
 'Employees of the Committee for Public Counsel Services, the state''s public defender agency, cannot currently bargain collectively. This would let them form a union and negotiate pay, benefits, leave, and working conditions.',
 'CPCS employees could form a union and collectively bargain.',
 'CPCS employees still could not collectively bargain.',
 'on_ballot','2026-11-03T07:00:00-05:00',
 'CBS Boston: the 9 ballot questions','https://www.cbsnews.com/boston/news/massachusetts-ballot-questions-2026/','verified','2026-10-24',NULL),
('ma-2026-q3','state','ballot_measure','ocd-division/country:us/state:ma','Voters','Question 3',
 'Question 3: Replace party primaries with one all-party primary',
 'Starting in 2028, every candidate for state office would run in one shared primary, and the top two vote-getters would advance to November — even if they are from the same party.',
 'One all-party primary; the top two finishers advance to the general election, starting in 2028.',
 'Separate party primaries continue.',
 'on_ballot','2026-11-03T07:00:00-05:00',
 'CBS Boston: the 9 ballot questions','https://www.cbsnews.com/boston/news/massachusetts-ballot-questions-2026/','verified','2026-10-24',NULL),
('ma-2026-q4','state','ballot_measure','ocd-division/country:us/state:ma','Voters','Question 4',
 'Question 4: Allow voter registration on Election Day',
 'Today you have to register 10 days before an election. This would let eligible residents register and vote at their polling place on Election Day, and let registered voters update their address there (but not their party).',
 'Same-day registration at the polls on Election Day.',
 'The 10-day registration deadline stays.',
 'on_ballot','2026-11-03T07:00:00-05:00',
 'CBS Boston: the 9 ballot questions','https://www.cbsnews.com/boston/news/massachusetts-ballot-questions-2026/','verified','2026-10-24',NULL),
('ma-2026-q5','state','ballot_measure','ocd-division/country:us/state:ma','Voters','Question 5',
 'Question 5: Change the state tax revenue cap and rebates',
 'Massachusetts already limits how much tax revenue it can keep, and refunds the excess. This would base the cap on last year''s actual revenue (grown by wage growth) instead of last year''s cap, and count millionaire''s-surtax revenue toward it — making taxpayer rebates more likely.',
 'A tighter cap formula; the state would owe rebates more often.',
 'The current cap formula stays.',
 'on_ballot','2026-11-03T07:00:00-05:00',
 'CBS Boston: the 9 ballot questions','https://www.cbsnews.com/boston/news/massachusetts-ballot-questions-2026/','verified','2026-10-24',NULL),
('ma-2026-q6','state','ballot_measure','ocd-division/country:us/state:ma','Voters','Question 6',
 'Question 6: Dedicated conservation fund from sporting goods sales tax',
 'This would send up to $100 million a year of the existing sales tax collected on sporting goods into a new natural resource conservation fund, overseen by a 15-member board. It does not add a new tax; the Legislature would still control spending.',
 'Creates the fund and routes that sales tax revenue to it.',
 'Conservation stays in the regular budget; the revenue stays in the General Fund.',
 'on_ballot','2026-11-03T07:00:00-05:00',
 'CBS Boston: the 9 ballot questions','https://www.cbsnews.com/boston/news/massachusetts-ballot-questions-2026/','verified','2026-10-24',NULL),
('ma-2026-q7','state','ballot_measure','ocd-division/country:us/state:ma','Voters','Question 7',
 'Question 7: Allow single-family homes on smaller lots',
 'On lots with public water and sewer, towns could not require more than 5,000 square feet of land or 50 feet of street frontage to build a single-family home. It would move some lot-size decisions from towns to a statewide standard.',
 'A statewide cap on minimum lot size (5,000 sq ft) and frontage (50 ft) where public water and sewer exist.',
 'Lot-size rules stay mostly local.',
 'on_ballot','2026-11-03T07:00:00-05:00',
 'CBS Boston: the 9 ballot questions','https://www.cbsnews.com/boston/news/massachusetts-ballot-questions-2026/','verified','2026-10-24',NULL),
('ma-2026-q8','state','ballot_measure','ocd-division/country:us/state:ma','Voters','Question 8',
 'Question 8: Repeal recreational marijuana sales',
 'This would undo the recreational part of the 2016 law that legalized cannabis. Retail shops would have to become medical dispensaries or sell to one; medical marijuana would continue. Adults with one to two ounces could face a $100 fine.',
 'Ends recreational marijuana sales; medical stays.',
 'Licensed recreational sales to adults 21+ continue.',
 'on_ballot','2026-11-03T07:00:00-05:00',
 'CBS Boston: the 9 ballot questions','https://www.cbsnews.com/boston/news/massachusetts-ballot-questions-2026/','verified','2026-10-24',NULL),
('ma-2026-q9','state','ballot_measure','ocd-division/country:us/state:ma','Voters','Question 9',
 'Question 9: Keep or repeal the 2024 gun law',
 'A referendum on the gun law passed in 2024, which covers ghost guns and 3-D printed guns, expands the red flag law, and broadens the assault weapon definition. Because it is a referendum on an existing law, a YES vote keeps the law.',
 'Keeps the 2024 gun law in place.',
 'Repeals the 2024 gun law.',
 'on_ballot','2026-11-03T07:00:00-05:00',
 'CBS Boston: the 9 ballot questions','https://www.cbsnews.com/boston/news/massachusetts-ballot-questions-2026/','verified','2026-10-24',
 'YES = keep matches how MA veto referendums are worded. Confirm against the official ballot wording.');

-- Recent state bills --------------------------------------------------------
INSERT INTO civic_item (id, scope, kind, jurisdiction_id, body, external_id, title, summary_plain,
  status, source_name, source_url, verification, checked_on, note) VALUES
('ma-194-s2581','state','bill','ocd-division/country:us/state:ma','Massachusetts Legislature','S.2581',
 'Statewide school cellphone policy (An Act to promote student learning and mental health)',
 'Would require every public school district to adopt and enforce a policy limiting student cellphone use during the school day. The Senate passed it in July 2025; the House has not agreed on a final version.',
 'passed_senate',
 'Boston Globe','https://www.bostonglobe.com/2026/09/07/metro/cell-phone-ban-bill-massachusetts-legislature/','verified','2026-10-24',
 'Latest history: Passed Senate 2025-07-31; reported unresolved 2026-09-07.'),
('ma-194-yimby','state','bill','ocd-division/country:us/state:ma','Massachusetts Legislature','H.1572 / S.2836',
 'An Act to Promote Yes in My Backyard (YIMBY bill)',
 'A broad zoning reform bill meant to make it easier to build housing. The House did not act after a September hearing; a Senate committee advanced an amended version that has since sat in Senate Ways and Means.',
 'stalled',
 'Abundant Housing MA session recap','https://www.abundanthousingma.org/2025-2026-legislative-session-housing-policy-recap','verified','2026-10-24',NULL),
('ma-194-econ-dev','state','bill','ocd-division/country:us/state:ma','Massachusetts Legislature',NULL,
 'Economic development bill: duplexes by right, faith-based housing, tenant right to purchase',
 'The House and Senate passed different versions and are negotiating. Proposals include duplexes anywhere single-family homes are allowed, letting religious institutions build affordable multifamily housing on their land, and giving tenants a right to match an offer to buy their building.',
 'in_conference',
 'Abundant Housing MA session recap','https://www.abundanthousingma.org/2025-2026-legislative-session-housing-policy-recap','verified','2026-10-24',
 'Senate passed 2026-06-23; House passed a different version in 2026-07. Session deadline 2027-01-05.'),
('ma-194-fy27-variance','state','bill','ocd-division/country:us/state:ma','Massachusetts Legislature','FY2027 budget',
 'Zoning variance reform (in the FY2027 state budget) — now law',
 'Makes it easier for local zoning boards to grant exceptions for housing: the standard drops from substantial hardship to practical difficulty, boards can weigh the public need for housing, and approvals last two years instead of one.',
 'signed',
 'Abundant Housing MA session recap','https://www.abundanthousingma.org/2025-2026-legislative-session-housing-policy-recap','verified','2026-10-24',
 'Signed by Governor Healey 2026-07-09; effective immediately.'),
('ma-194-multifamily-sales-tax','state','bill','ocd-division/country:us/state:ma','Massachusetts Legislature','Supplemental budget',
 'Sales tax exemption for multifamily construction materials — now law',
 'Building materials for multifamily housing are exempt from sales tax when the project is in a lower-income census tract or at least 15% of units are income-restricted.',
 'signed',
 'Abundant Housing MA session recap','https://www.abundanthousingma.org/2025-2026-legislative-session-housing-policy-recap','verified','2026-10-24',
 'Signed by Governor Healey 2026-06-28.'),
('ma-194-single-stair','state','bill','ocd-division/country:us/state:ma','Massachusetts Legislature','H.1542 / S.964',
 'Study single-stair apartment buildings',
 'Would study when small apartment buildings with one staircase could be allowed. The bill is parked in Ways and Means; the governor created an advisory group based on it by executive order.',
 'in_committee',
 'Abundant Housing MA session recap','https://www.abundanthousingma.org/2025-2026-legislative-session-housing-policy-recap','verified','2026-10-24',NULL),
('ma-194-adu-trust','state','bill','ocd-division/country:us/state:ma','Massachusetts Legislature','H.1482 / S.969',
 'Accessory dwelling unit (ADU) trust fund',
 'Would create a state fund to help homeowners build backyard or in-law apartments. Reported favorably by the Housing committee but has not moved out of Ways and Means.',
 'in_committee',
 'Abundant Housing MA session recap','https://www.abundanthousingma.org/2025-2026-legislative-session-housing-policy-recap','verified','2026-10-24',NULL),
('ma-194-energy','state','bill','ocd-division/country:us/state:ma','Massachusetts Legislature',NULL,
 'Energy affordability bill',
 'The House and Senate passed different energy bills and are still negotiating. One major difference: the House version would cut the Mass Save efficiency program budget by about $1 billion.',
 'in_conference',
 'Associated Industries of Massachusetts','https://aimnet.org/key-bills-remain-active-as-legislature-ends-formal-sessions/','verified','2026-10-24',NULL);

-- ===========================================================================
-- LOCAL items — Cambridge
-- ===========================================================================
INSERT INTO civic_item (id, scope, kind, jurisdiction_id, body, title, summary_plain,
  status, starts_at, location, source_name, source_url, verification, checked_on, note) VALUES
('cam-council-2026-11-09','local','meeting','ocd-division/country:us/state:ma/place:cambridge','Cambridge City Council',
 'City Council regular meeting',
 'The council''s weekly Monday meeting. Residents can sign up for public comment at the start.',
 'scheduled','2026-11-09T17:30:00-05:00','Sullivan Chamber, City Hall, 795 Massachusetts Ave',
 'Cambridge City Council','https://www.cambridgema.gov/citycouncil','schedule_based','2026-10-24',
 'Standing Monday 5:30pm schedule; read the posted agenda in the Open Meeting Portal for items.'),
('cam-council-2026-11-16','local','meeting','ocd-division/country:us/state:ma/place:cambridge','Cambridge City Council',
 'City Council regular meeting',
 'Weekly council meeting. Public comment opens at the start.',
 'scheduled','2026-11-16T17:30:00-05:00','Sullivan Chamber, City Hall, 795 Massachusetts Ave',
 'Cambridge City Council','https://www.cambridgema.gov/citycouncil','schedule_based','2026-10-24',
 'Standing Monday 5:30pm schedule; agenda via Open Meeting Portal.'),
('cam-council-2026-11-23','local','meeting','ocd-division/country:us/state:ma/place:cambridge','Cambridge City Council',
 'City Council regular meeting',
 'Weekly council meeting. Public comment opens at the start.',
 'scheduled','2026-11-23T17:30:00-05:00','Sullivan Chamber, City Hall, 795 Massachusetts Ave',
 'Cambridge City Council','https://www.cambridgema.gov/citycouncil','schedule_based','2026-10-24',
 'Standing Monday 5:30pm schedule; agenda via Open Meeting Portal.'),
('cam-school-committee-2026-11-17','local','meeting','ocd-division/country:us/state:ma/school_district:cambridge','Cambridge School Committee',
 'School Committee regular meeting',
 'The School Committee sets policy and the budget for Cambridge Public Schools. Families can speak during public comment.',
 'scheduled','2026-11-17T18:00:00-05:00','Dr. Henrietta Attles Meeting Room, Cambridge Rindge and Latin School, 459 Broadway',
 'Cambridge Public Schools — School Committee','https://www.cpsd.us/school-committee/overview','schedule_based','2026-10-24',
 'Committee meets 1st and 3rd Tuesday, Sept-June, 6pm; agenda posted before each meeting.'),
('cam-school-committee-2026-12-01','local','meeting','ocd-division/country:us/state:ma/school_district:cambridge','Cambridge School Committee',
 'School Committee regular meeting',
 'Regular School Committee meeting with public comment.',
 'scheduled','2026-12-01T18:00:00-05:00','Dr. Henrietta Attles Meeting Room, Cambridge Rindge and Latin School, 459 Broadway',
 'Cambridge Public Schools — School Committee','https://www.cpsd.us/school-committee/overview','schedule_based','2026-10-24',
 'Standing 1st/3rd Tuesday 6pm schedule; agenda posted before the meeting.');

-- ===========================================================================
-- LOCAL items — Newton
-- ===========================================================================
INSERT INTO civic_item (id, scope, kind, jurisdiction_id, body, title, summary_plain,
  status, starts_at, location, source_name, source_url, verification, checked_on, note) VALUES
('newton-council-2026-11-02','local','meeting','ocd-division/country:us/state:ma/place:newton','Newton City Council',
 'City Council regular meeting',
 'Newton''s City Council meeting, held as a hybrid meeting. The posted docket lists the orders and reports up for action.',
 'scheduled','2026-11-02T19:45:00-05:00','City Hall Chambers, Newton City Hall, 1000 Commonwealth Ave (hybrid)',
 'City of Newton — City Council docket','https://www.newtonma.gov/government/city-council','schedule_based','2026-10-24',
 'Standing schedule: Council convenes Mondays at 7:45 PM in City Hall Chambers (hybrid), per 2026 dockets. Read the posted docket for items.'),
('newton-council-2026-11-16','local','meeting','ocd-division/country:us/state:ma/place:newton','Newton City Council',
 'City Council regular meeting',
 'Hybrid City Council meeting. The docket is posted on the City''s Electronic Posting Board ahead of time.',
 'scheduled','2026-11-16T19:45:00-05:00','City Hall Chambers, Newton City Hall, 1000 Commonwealth Ave (hybrid)',
 'City of Newton — City Council docket','https://www.newtonma.gov/government/city-council','schedule_based','2026-10-24',
 'Standing Monday 7:45 PM schedule; agenda via the Electronic Posting Board.'),
('newton-landuse-2026-11-10','local','meeting','ocd-division/country:us/state:ma/place:newton','Newton City Council Land Use Committee',
 'Land Use Committee meeting',
 'A standing committee of the City Council that reviews zoning petitions and special permits before they reach the full Council. Public hearings are posted on the agenda.',
 'scheduled','2026-11-10T19:00:00-05:00','City Hall, Newton City Hall, 1000 Commonwealth Ave (hybrid)',
 'City of Newton — City Council committees','https://www.newtonma.gov/government/city-council','schedule_based','2026-10-24',
 'Committee meeting time/room are set per posting; confirm on the Electronic Posting Board agenda.'),
('newton-school-committee-2026-11-09','local','meeting','ocd-division/country:us/state:ma/school_district:newton','Newton School Committee',
 'School Committee regular meeting',
 'The School Committee oversees Newton Public Schools. Meetings are hybrid; residents get up to three minutes during public comment.',
 'scheduled','2026-11-09T18:30:00-05:00','Education Center, 100 Walnut St, Room 210 (hybrid via Zoom)',
 'Newton Public Schools — School Committee','https://www.newton.k12.ma.us/Domain/44','schedule_based','2026-10-24',
 'Regular meetings are held in Room 210 at the Education Center, 100 Walnut St, hybrid via Zoom, with 3-minute public comment. Agenda on the City Electronic Posting Board / School Committee Calendar.'),
('newton-school-committee-2026-11-23','local','meeting','ocd-division/country:us/state:ma/school_district:newton','Newton School Committee',
 'School Committee regular meeting',
 'Hybrid regular meeting of the Newton School Committee with public comment.',
 'scheduled','2026-11-23T18:30:00-05:00','Education Center, 100 Walnut St, Room 210 (hybrid via Zoom)',
 'Newton Public Schools — School Committee','https://www.newton.k12.ma.us/Domain/44','schedule_based','2026-10-24',
 'Education Center, 100 Walnut St, Room 210, hybrid via Zoom; agenda posted before the meeting.');

-- ---------------------------------------------------------------------------
-- Item topics
-- ---------------------------------------------------------------------------
INSERT INTO item_topic (item_id, topic_slug) VALUES
  ('ma-2026-voter-registration-deadline','elections_government'),
  ('ma-2026-early-voting','elections_government'),
  ('ma-2026-general-election','elections_government'),
  ('ma-2026-q1','elections_government'), ('ma-2026-q1','civil_rights'),
  ('ma-2026-q2','jobs_business'),        ('ma-2026-q2','public_safety'),
  ('ma-2026-q3','elections_government'),
  ('ma-2026-q4','elections_government'), ('ma-2026-q4','civil_rights'),
  ('ma-2026-q5','taxes_budget'),
  ('ma-2026-q6','environment'),          ('ma-2026-q6','parks_recreation'), ('ma-2026-q6','taxes_budget'),
  ('ma-2026-q7','housing'),
  ('ma-2026-q8','health'),               ('ma-2026-q8','jobs_business'),     ('ma-2026-q8','public_safety'),
  ('ma-2026-q9','public_safety'),
  ('ma-194-s2581','education'),          ('ma-194-s2581','health'),
  ('ma-194-yimby','housing'),
  ('ma-194-econ-dev','housing'),         ('ma-194-econ-dev','jobs_business'),
  ('ma-194-fy27-variance','housing'),
  ('ma-194-multifamily-sales-tax','housing'), ('ma-194-multifamily-sales-tax','taxes_budget'),
  ('ma-194-single-stair','housing'),     ('ma-194-single-stair','public_safety'),
  ('ma-194-adu-trust','housing'),
  ('ma-194-energy','environment'),       ('ma-194-energy','taxes_budget'),
  ('cam-council-2026-11-09','elections_government'),
  ('cam-council-2026-11-16','elections_government'),
  ('cam-council-2026-11-23','elections_government'),
  ('cam-school-committee-2026-11-17','education'),
  ('cam-school-committee-2026-12-01','education'),
  ('newton-council-2026-11-02','elections_government'),
  ('newton-council-2026-11-16','elections_government'),
  ('newton-landuse-2026-11-10','housing'),
  ('newton-school-committee-2026-11-09','education'),
  ('newton-school-committee-2026-11-23','education');
