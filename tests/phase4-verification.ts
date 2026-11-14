import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { CouncilEngine, CampaignRegion } from '../src/core/CouncilEngine.ts';
import { GameState } from '../src/core/GameState.ts';
import { DriftSystem } from '../src/core/DriftSystem.ts';
import deJson from '../src/i18n/de.json';
import enJson from '../src/i18n/en.json';

console.log('🧪 Starting Phase 4 (P4: Sky-Council, 12-Wochen-Saisonloop & Kampagne) Acceptance Criteria Verification Suite...\n');

// --------------------------------------------------------------------------
// Test 1: 12-Week Season Loop & Time Scaling (0.5x, 1.0x, 2.0x, PAUSE)
// --------------------------------------------------------------------------
console.log('--- Test 1: 12-Week Season Loop & Time Scaling ---');
const gs = GameState.getInstance();
gs.resetSeason(1000);

// Default game speed: 1.0x
assert.strictEqual(gs.getGameSpeed(), 1.0, 'Default game speed is 1.0x');
assert.strictEqual(gs.getData().week, 1, 'Season starts at Week 1');

// Time scaling validation
gs.setGameSpeed(0.5);
assert.strictEqual(gs.getGameSpeed(), 0.5, '0.5x speed scaling');
gs.setGameSpeed(2.0);
assert.strictEqual(gs.getGameSpeed(), 2.0, '2.0x speed scaling');
gs.setGameSpeed(0.0);
assert.strictEqual(gs.getGameSpeed(), 0.0, 'PAUSE speed scaling');

// Reset to 1.0x
gs.setGameSpeed(1.0);

// Weekly transition verification: Evaporation (2%), Market recovery (+5%), Drift
gs.addResource('skywater', 100);
const preEvapTotal = gs.getData().inventory.skywater;
assert.strictEqual(preEvapTotal, 40, 'Storage capped at tank capacity 40');

const initialPrice = gs.getMarketEconomy().getPrice('skywater');
gs.advanceWeek(); // Week 1 -> Week 2
assert.strictEqual(gs.getData().week, 2, 'Advanced to Week 2');

// 2% evaporation applied
const postEvapTotal = gs.getData().inventory.skywater;
const expectedEvap = Math.round(40 * 0.98 * 10) / 10;
assert.strictEqual(postEvapTotal, expectedEvap, 'Weekly 2% evaporation applied');

// Market price recovery (+5%)
const postPrice = gs.getMarketEconomy().getPrice('skywater');
assert.ok(postPrice >= initialPrice, 'Market price steps weekly recovery');

// Pendulum drift progression
const highOffsetW1 = DriftSystem.getPendulumOffset('high', 1);
const highOffsetW2 = DriftSystem.getPendulumOffset('high', 2);
const highOffsetW4 = DriftSystem.getPendulumOffset('high', 4);
assert.strictEqual(highOffsetW1, 0, 'Week 1 pendulum offset at 0');
assert.strictEqual(highOffsetW2, 3, 'Week 2 high zone shifted 3 columns East');
assert.strictEqual(highOffsetW4, 3, 'Week 4 swings back harmonic step');

console.log('✅ Test 1 Passed: 12-week time scaling, weekly evaporation, recovery, and pendulum drift verified.');

// --------------------------------------------------------------------------
// Test 2: Sky-Council Sessions (Weeks 4, 8, 12) & 30 Total Shares Allocation
// --------------------------------------------------------------------------
console.log('\n--- Test 2: Sky-Council Sessions & Exactly 30 Total Shares ---');
const ce = new CouncilEngine(1000);

// Session weeks
assert.deepStrictEqual(CouncilEngine.SESSIONS, [4, 8, 12], 'Sessions occur in weeks 4, 8, and 12');
assert.strictEqual(ce.isCouncilWeek(4), true, 'Week 4 is Council week');
assert.strictEqual(ce.isCouncilWeek(8), true, 'Week 8 is Council week');
assert.strictEqual(ce.isCouncilWeek(12), true, 'Week 12 is Council week');
assert.strictEqual(ce.isCouncilWeek(3), false, 'Week 3 is not Council week');
assert.strictEqual(ce.isCouncilWeek(7), false, 'Week 7 is not Council week');

// 10 Shares per session, 30 Total Shares
assert.strictEqual(CouncilEngine.SHARES_PER_SESSION, 10, 'Exactly 10 shares per session');
assert.strictEqual(CouncilEngine.TOTAL_SHARES, 30, 'Exactly 30 total shares across season');

// Execute Session 1 (Week 4)
const session1 = ce.executeSession(4, { bidPerShare: 40, requestedShares: 5 }, 'storm_season');
assert.strictEqual(session1.week, 4);
assert.strictEqual(session1.sessionNumber, 1);
assert.strictEqual(session1.sharesDistributed, 10, 'Session 1 distributed exactly 10 shares');

// Execute Session 2 (Week 8)
const session2 = ce.executeSession(8, { bidPerShare: 45, requestedShares: 6 }, 'storm_season');
assert.strictEqual(session2.week, 8);
assert.strictEqual(session2.sessionNumber, 2);
assert.strictEqual(session2.sharesDistributed, 10, 'Session 2 distributed exactly 10 shares');

// Execute Session 3 (Week 12)
const session3 = ce.executeSession(12, { bidPerShare: 60, requestedShares: 8 }, 'storm_season');
assert.strictEqual(session3.week, 12);
assert.strictEqual(session3.sessionNumber, 3);
assert.strictEqual(session3.sharesDistributed, 10, 'Session 3 distributed exactly 10 shares');

// Verify total distributed across all 3 sessions is exactly 30 shares
assert.strictEqual(ce.getTotalSeasonSharesDistributed(), 30, 'Total distributed across 3 sessions is 30 shares');

console.log('✅ Test 2 Passed: Week 4, 8, 12 sessions and 30 total shares allocation verified.');

// --------------------------------------------------------------------------
// Test 3: AI Rival Profiles & Distinct Bidding Behaviors
// --------------------------------------------------------------------------
console.log('\n--- Test 3: AI Rival Profiles (Draufgänger, Rechner, Spürnase) ---');
const personalityEngine = new CouncilEngine(1000);

// Draufgänger bids aggressively in Week 4
const daredevilW4 = personalityEngine.generateRivalBid('daredevil', 4, 10);
assert.ok(daredevilW4.bidPerShare >= 35, `Draufgänger bids high price in W4 (${daredevilW4.bidPerShare} CR)`);
assert.ok(daredevilW4.requestedShares >= 6, `Draufgänger requests high share count in W4 (${daredevilW4.requestedShares} shares)`);

// Rechner is conservative in Week 4, saves credits
const calcW4 = personalityEngine.generateRivalBid('calculator', 4, 10);
assert.ok(calcW4.bidPerShare <= 28, `Rechner bids conservatively in W4 (${calcW4.bidPerShare} CR)`);
assert.ok(calcW4.requestedShares <= 5, `Rechner requests moderate shares in W4 (${calcW4.requestedShares} shares)`);

// Rechner strikes massively in Week 12
const calcW12 = personalityEngine.generateRivalBid('calculator', 12, 10);
assert.ok(calcW12.bidPerShare >= 45, `Rechner strikes aggressively in W12 (${calcW12.bidPerShare} CR)`);
assert.ok(calcW12.requestedShares >= 5, `Rechner requests heavy share volume in W12 (${calcW12.requestedShares} shares)`);

// Spürnase bids tactically
const trackerW4 = personalityEngine.generateRivalBid('tracker', 4, 10);
assert.ok(trackerW4.bidPerShare >= 20 && trackerW4.bidPerShare <= 38, `Spürnase bids tactically in W4 (${trackerW4.bidPerShare} CR)`);

console.log('✅ Test 3 Passed: AI Rival personalities and distinct bidding strategies verified.');

// --------------------------------------------------------------------------
// Test 4: Aurora Bonus Discovery (+1 Council Share)
// --------------------------------------------------------------------------
console.log('\n--- Test 4: Aurora Bonus Discovery (+1 Council Share) ---');
const auroraEngine = new CouncilEngine(1000);
auroraEngine.awardAuroraShare('player', 1);

const playerProfile = auroraEngine.getBidder('player')!;
assert.strictEqual(playerProfile.auroraShares, 1, 'Player received +1 Aurora bonus share');

const rankingsWithAurora = auroraEngine.calculateRankings('spring_winds');
const playerRanking = rankingsWithAurora.find((r) => r.participantId === 'player')!;
assert.strictEqual(playerRanking.totalShares, 1, 'Total shares reflect Aurora bonus (+1)');

console.log('✅ Test 4 Passed: Aurora discovery awards +1 Council share verified.');

// --------------------------------------------------------------------------
// Test 5: Season Finale Standings, Tie-Breaker & Star Allocations
// --------------------------------------------------------------------------
console.log('\n--- Test 5: Standings, Tie-Breakers & Star Allocations (0-3 Stars) ---');
const tieEngine = new CouncilEngine(1000);

// Setup tie scenario: Player and Daredevil both have 8 shares, but Player has more credits
const p = tieEngine.getBidder('player')!;
const d = tieEngine.getBidder('daredevil')!;
const c = tieEngine.getBidder('calculator')!;
const tr = tieEngine.getBidder('tracker')!;

p.sharesWon = 8;
p.credits = 550; // Higher cash

d.sharesWon = 8;
d.credits = 300; // Lower cash

c.sharesWon = 10;
c.credits = 200;

tr.sharesWon = 4;
tr.credits = 400;

const finalRanks = tieEngine.calculateRankings('storm_season');

// Verify primary ranking: Total shares DESC
assert.strictEqual(finalRanks[0].participantId, 'calculator', 'Rank 1 is Calculator with 10 shares');
assert.strictEqual(finalRanks[0].stars, 3, 'Rank 1 receives 3 Stars ⭐⭐⭐');

// Verify Tie-Breaker: Player (550 CR) beats Daredevil (300 CR) for Rank 2
assert.strictEqual(finalRanks[1].participantId, 'player', 'Rank 2 is Player via credit tie-breaker');
assert.strictEqual(finalRanks[1].stars, 2, 'Rank 2 receives 2 Stars ⭐⭐');

assert.strictEqual(finalRanks[2].participantId, 'daredevil', 'Rank 3 is Daredevil');
assert.strictEqual(finalRanks[2].stars, 1, 'Rank 3 receives 1 Star ⭐');

assert.strictEqual(finalRanks[3].participantId, 'tracker', 'Rank 4 is Tracker');
assert.strictEqual(finalRanks[3].stars, 0, 'Rank 4 receives 0 Stars');

console.log('✅ Test 5 Passed: Standings, Tie-Breaker (cash in Credits), and 0-3 star allocations verified.');

// --------------------------------------------------------------------------
// Test 6: 3-Region Campaign Progression & Next Season Reset
// --------------------------------------------------------------------------
console.log('\n--- Test 6: 3-Region Campaign Progression & Next Season Reset ---');
assert.strictEqual(GameState.getRegionForSeason(1), 'spring_winds', 'Season 1 is Frühlingswinde');
assert.strictEqual(GameState.getRegionForSeason(3), 'spring_winds', 'Season 3 is Frühlingswinde');
assert.strictEqual(GameState.getRegionForSeason(4), 'summer_drifts', 'Season 4 is Sommerzüge');
assert.strictEqual(GameState.getRegionForSeason(6), 'summer_drifts', 'Season 6 is Sommerzüge');
assert.strictEqual(GameState.getRegionForSeason(7), 'storm_season', 'Season 7 is Sturmsaison');

// Active rivals per region
const campEngine = new CouncilEngine(1000);
const r1Bidders = campEngine.getActiveBidders('spring_winds');
assert.strictEqual(r1Bidders.length, 2, 'Region 1 has Player + 1 Rival (Daredevil)');
assert.ok(r1Bidders.some((b) => b.id === 'daredevil'));

const r2Bidders = campEngine.getActiveBidders('summer_drifts');
assert.strictEqual(r2Bidders.length, 3, 'Region 2 has Player + 2 Rivals (Daredevil, Calculator)');

const r3Bidders = campEngine.getActiveBidders('storm_season');
assert.strictEqual(r3Bidders.length, 4, 'Region 3 has Player + 3 Rivals (All rivals)');

// Next season reset test
const state = GameState.getInstance();
state.resetSeason(1000);
state.recordSeasonStars(2);
state.upgradeEquipment('condenser');
state.startNextSeason(1000);

const nextData = state.getData();
assert.strictEqual(nextData.season, 2, 'Season advanced to 2');
assert.strictEqual(nextData.week, 1, 'Week reset to 1');
assert.strictEqual(nextData.credits, 1000, 'Credits reset to starting 1000 CR');
assert.strictEqual(nextData.upgrades.condenserLevel, 1, 'Equipment upgrades reset for new season');
assert.strictEqual(nextData.stars, 2, 'Cumulative campaign stars preserved');

console.log('✅ Test 6 Passed: 3 campaign regions and clean next season reset verified.');

// --------------------------------------------------------------------------
// Test 7: Dark Mode Rule 7 & 100% i18n Language Parity
// --------------------------------------------------------------------------
console.log('\n--- Test 7: Dark Mode Rule 7 Compliance & 100% i18n Language Parity ---');

// Check Rule 7: Zero bg-white or text-black
const filesToCheck = [
  path.resolve(__dirname, '../index.html'),
  path.resolve(__dirname, '../src/ui/CouncilModal.ts'),
  path.resolve(__dirname, '../src/ui/SummaryModal.ts'),
  path.resolve(__dirname, '../src/scenes/SkyHarvestScene.ts'),
];

for (const file of filesToCheck) {
  const content = fs.readFileSync(file, 'utf-8');
  assert.ok(!content.includes('bg-white'), `File ${path.basename(file)} must not contain bg-white`);
  assert.ok(!content.includes('text-black'), `File ${path.basename(file)} must not contain text-black`);
}

// Check i18n keys parity for council, summary, and regions
function getDeepKeys(obj: Record<string, any>, prefix = ''): string[] {
  let keys: string[] = [];
  for (const k of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      keys = keys.concat(getDeepKeys(obj[k], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const deKeys = getDeepKeys(deJson);
const enKeys = getDeepKeys(enJson);

assert.strictEqual(deKeys.length, enKeys.length, `Total key count match (${deKeys.length} vs ${enKeys.length})`);

const deOnly = deKeys.filter((k) => !enKeys.includes(k));
const enOnly = enKeys.filter((k) => !deKeys.includes(k));

assert.deepStrictEqual(deOnly, [], 'No keys missing in EN');
assert.deepStrictEqual(enOnly, [], 'No keys missing in DE');

console.log(`✅ Test 7 Passed: Dark Mode Rule 7 compliant and 100% i18n language parity across ${deKeys.length} keys.`);

console.log('\n🎉 ALL PHASE 4 (P4) ACCEPTANCE CRITERIA UNIT TESTS PASSED!');
