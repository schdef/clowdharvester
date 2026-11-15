import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { LogisticsNet, CONDENSER_RATES, PIPE_CAPACITIES, TANK_CAPACITIES, UPGRADE_COSTS } from '../src/core/LogisticsNet.ts';
import { MarketEconomy } from '../src/core/MarketEconomy.ts';
import { GameState } from '../src/core/GameState.ts';
import deJson from '../src/i18n/de.json';
import enJson from '../src/i18n/en.json';

console.log('🧪 Starting Phase 2 (P2: Logistiknetzwerk, Speicher & Hafenmarkt) Acceptance Criteria Verification Suite...\n');

// --------------------------------------------------------------------------
// Test 1: LogisticsNet & Flaschenhals (Bottleneck) Formula
// --------------------------------------------------------------------------
console.log('--- Test 1: Condenser Rates, Pipe Capacities & Bottleneck Formula ---');

// Condenser Rates: Stufe 1: 6, Stufe 2: 12, Stufe 3: 24 E/s
assert.strictEqual(LogisticsNet.getCondenserRate(1), 6, 'Condenser Level 1 provides 6 E/s');
assert.strictEqual(LogisticsNet.getCondenserRate(2), 12, 'Condenser Level 2 provides 12 E/s');
assert.strictEqual(LogisticsNet.getCondenserRate(3), 24, 'Condenser Level 3 provides 24 E/s');

// Pipe Capacities: Stufe 1: 10, Stufe 2: 20, Stufe 3: 40 E/s
assert.strictEqual(LogisticsNet.getPipeCapacity(1), 10, 'Pipe Level 1 provides 10 E/s');
assert.strictEqual(LogisticsNet.getPipeCapacity(2), 20, 'Pipe Level 2 provides 20 E/s');
assert.strictEqual(LogisticsNet.getPipeCapacity(3), 40, 'Pipe Level 3 provides 40 E/s');

// Engpass-Formel: Tatsächliche Förderrate = min(kondensatorRate, rohrKapazitaet)
const net = new LogisticsNet();

// Scenario A: Condenser L1 (6) + Pipe L1 (10) -> Flow is 6 (limited by condenser)
assert.strictEqual(net.calculateEffectiveFlow(6, 10), 6, 'Condenser L1 + Pipe L1: Flow = 6 E/s');

// Scenario B: Condenser L2 (12) + Pipe L1 (10) -> Flow is 10 (Pipe is BOTTLENECK!)
assert.strictEqual(net.calculateEffectiveFlow(12, 10), 10, 'Condenser L2 + Pipe L1: Flow = 10 E/s (Pipe bottleneck)');

// Scenario C: Condenser L2 (12) + Pipe L2 (20) -> Flow is 12
assert.strictEqual(net.calculateEffectiveFlow(12, 20), 12, 'Condenser L2 + Pipe L2: Flow = 12 E/s');

// Scenario D: Condenser L3 (24) + Pipe L2 (20) -> Flow is 20 (Pipe is BOTTLENECK!)
assert.strictEqual(net.calculateEffectiveFlow(24, 20), 20, 'Condenser L3 + Pipe L2: Flow = 20 E/s (Pipe bottleneck)');

// Scenario E: Condenser L3 (24) + Pipe L3 (40) -> Flow is 24
assert.strictEqual(net.calculateEffectiveFlow(24, 40), 24, 'Condenser L3 + Pipe L3: Flow = 24 E/s');

// Network Visual Status determination:
assert.strictEqual(net.getNetworkStatus(true, false), 'active', 'Extracting -> active (flowing dots)');
assert.strictEqual(net.getNetworkStatus(false, true), 'full', 'Storage full -> full (lock symbol)');
assert.strictEqual(net.getNetworkStatus(false, false), 'idle', 'Standby -> idle');

net.setBlocked(true);
assert.strictEqual(net.calculateEffectiveFlow(24, 40), 0, 'Blocked pipe ceases throughput');
assert.strictEqual(net.getNetworkStatus(true, false), 'blocked', 'Blocked net -> blocked (warning triangle)');
net.setBlocked(false);

console.log('✅ Test 1 Passed: Condenser rates, pipe capacities, bottleneck formula, and status states verified.');

// --------------------------------------------------------------------------
// Test 2: Floating Storage Balloons & Capacity Progression
// --------------------------------------------------------------------------
console.log('\n--- Test 2: Floating Storage Balloons & Capacity Levels ---');

// Balloon Capacity Levels: Stufe 1: 40, Stufe 2: 80, Stufe 3: 160 Einheiten
assert.strictEqual(LogisticsNet.getTankCapacity(1), 40, 'Tank Level 1 has 40 units capacity');
assert.strictEqual(LogisticsNet.getTankCapacity(2), 80, 'Tank Level 2 has 80 units capacity');
assert.strictEqual(LogisticsNet.getTankCapacity(3), 160, 'Tank Level 3 has 160 units capacity');

const gs = GameState.getInstance();
gs.resetSeason(1000);

assert.strictEqual(gs.getMaxStorageCapacity(), 40, 'Starting storage capacity is 40 units (Level 1)');
assert.strictEqual(gs.getTotalStored(), 0, 'Initial stored amount is 0');

// Fill storage with mixed resources up to cap
const addedFrost = gs.addResource('frost', 20);
assert.strictEqual(addedFrost, 20, 'Stored 20 frost units');
assert.strictEqual(gs.getTotalStored(), 20, 'Total stored is 20');

const addedWater = gs.addResource('skywater', 15);
assert.strictEqual(addedWater, 15, 'Stored 15 skywater units');
assert.strictEqual(gs.getTotalStored(), 35, 'Total stored is 35');

// Attempt to add 10 storm charge, but only 5 units fit (max 40)
const addedStorm = gs.addResource('storm', 10);
assert.strictEqual(addedStorm, 5, 'Only 5 units fit before reaching 40 cap');
assert.strictEqual(gs.getTotalStored(), 40, 'Total stored reaches exact max capacity of 40');

// Any further additions must be rejected when full
const overflowAdd = gs.addResource('frost', 10);
assert.strictEqual(overflowAdd, 0, 'Zero units stored when at max capacity');

console.log('✅ Test 2 Passed: Floating balloon storage capacities (40/80/160) and overflow protection verified.');

// --------------------------------------------------------------------------
// Test 3: Continuous Evaporation (2% per week)
// --------------------------------------------------------------------------
console.log('\n--- Test 3: Evaporation (2% per week) ---');

const market = new MarketEconomy();
assert.strictEqual(MarketEconomy.EVAPORATION_RATE, 0.02, 'Evaporation rate is strictly 2% per week');

const initialAmount = 100;
const evaporated = market.applyEvaporation(initialAmount);
assert.strictEqual(Math.round(evaporated * 100) / 100, 98, '100 units evaporate to 98 units (-2%)');

// Test evaporation on GameState inventory
const prevFrost = gs.getInventory().frost;
const prevWater = gs.getInventory().skywater;
const prevStorm = gs.getInventory().storm;

gs.applyEvaporation();

assert.strictEqual(gs.getInventory().frost, prevFrost * 0.98, 'Frost inventory reduced by 2%');
assert.strictEqual(gs.getInventory().skywater, prevWater * 0.98, 'Skywater inventory reduced by 2%');
assert.strictEqual(gs.getInventory().storm, prevStorm * 0.98, 'Storm inventory reduced by 2%');

console.log('✅ Test 3 Passed: 2% weekly evaporation correctly applied across all commodities.');

// --------------------------------------------------------------------------
// Test 4: Harbor Market - 3 Commodities, Pricing, Damping & Recovery
// --------------------------------------------------------------------------
console.log('\n--- Test 4: Harbor Market Commodity Pricing, Damping & Recovery ---');

// Base Prices: Frostkristalle (10 CR), Skywater (22 CR), Sturmladung (40 CR)
assert.strictEqual(market.getBasePrice('frost'), 10, 'Frostkristalle base price is 10 CR');
assert.strictEqual(market.getBasePrice('skywater'), 22, 'Skywater base price is 22 CR');
assert.strictEqual(market.getBasePrice('storm'), 40, 'Sturmladung base price is 40 CR');

// Price Damping: Selling 10 units temporarily lowers price by 2%
const initialFrostPrice = market.getPrice('frost');
assert.strictEqual(initialFrostPrice, 10, 'Initial frost price is 10 CR');

const earnings10 = market.executeSale('frost', 10);
assert.strictEqual(earnings10, 100, '10 units sold at 10 CR yields 100 CR');

const dampedFrostPrice = market.getPrice('frost');
const expectedDamped = 10 * 0.98; // 9.8 CR
assert.strictEqual(Math.round(dampedFrostPrice * 1000) / 1000, expectedDamped, 'Price drops 2% after selling 10 units');

// Selling 20 units drops price by 2 batches (0.98^2)
const earnings20 = market.executeSale('skywater', 20);
assert.strictEqual(earnings20, 440, '20 units sold at 22 CR yields 440 CR');
const expectedWaterDamped = 22 * Math.pow(0.98, 2);
assert.strictEqual(Math.round(market.getPrice('skywater') * 1000) / 1000, Math.round(expectedWaterDamped * 1000) / 1000, 'Price drops 2x2% after selling 20 units');

// Weekly Recovery: Prices recover 5% towards base price
const priceBeforeRecovery = market.getPrice('frost');
market.stepWeeklyRecovery();
const priceAfterRecovery = market.getPrice('frost');
const expectedRecovered = priceBeforeRecovery + (10 - priceBeforeRecovery) * 0.05;
assert.strictEqual(Math.round(priceAfterRecovery * 1000) / 1000, Math.round(expectedRecovered * 1000) / 1000, 'Price recovers 5% towards base price');

// Sell All from GameState
gs.resetSeason(1000);
gs.addResource('frost', 10);
gs.addResource('skywater', 10);
gs.addResource('storm', 10);
assert.strictEqual(gs.getTotalStored(), 30, 'Stored 30 total units');

const sellAllResult = gs.sellAll();
assert.ok(sellAllResult.totalEarnings > 0, 'Sell all generates credit earnings');
assert.strictEqual(gs.getTotalStored(), 0, 'Inventory is empty after sell all');
assert.strictEqual(gs.getData().credits, 1000 + sellAllResult.totalEarnings, 'Credits deposited into account');

console.log('✅ Test 4 Passed: 3 commodity base prices, sales execution, 2% damping, and 5% recovery verified.');

// --------------------------------------------------------------------------
// Test 5: Harbor Equipment Upgrade Shop
// --------------------------------------------------------------------------
console.log('\n--- Test 5: Harbor Equipment Upgrade Shop ---');

// Upgrade Costs Specification:
// Condenser: L2 (200 CR), L3 (450 CR)
assert.strictEqual(LogisticsNet.getUpgradeCost('condenser', 2), 200, 'Condenser Level 2 costs 200 CR');
assert.strictEqual(LogisticsNet.getUpgradeCost('condenser', 3), 450, 'Condenser Level 3 costs 450 CR');

// Pipe: L2 (150 CR), L3 (350 CR)
assert.strictEqual(LogisticsNet.getUpgradeCost('pipe', 2), 150, 'Pipe Level 2 costs 150 CR');
assert.strictEqual(LogisticsNet.getUpgradeCost('pipe', 3), 350, 'Pipe Level 3 costs 350 CR');

// Tank: L2 (100 CR), L3 (250 CR)
assert.strictEqual(LogisticsNet.getUpgradeCost('tank', 2), 100, 'Tank Level 2 costs 100 CR');
assert.strictEqual(LogisticsNet.getUpgradeCost('tank', 3), 250, 'Tank Level 3 costs 250 CR');

// Drone: L2 (300 CR)
assert.strictEqual(LogisticsNet.getUpgradeCost('drone', 2), 300, 'Drone Level 2 costs 300 CR');

// Execute Upgrades in GameState
gs.resetSeason(1000);
assert.strictEqual(gs.getUpgrades().condenserLevel, 1, 'Starts at Condenser Level 1');
assert.strictEqual(gs.getUpgradeCost('condenser'), 200, 'Next condenser upgrade costs 200 CR');

const upgradedCondenser = gs.upgradeEquipment('condenser');
assert.strictEqual(upgradedCondenser, true, 'Condenser upgrade succeeds');
assert.strictEqual(gs.getUpgrades().condenserLevel, 2, 'Condenser level is now 2');
assert.strictEqual(gs.getData().credits, 800, '200 CR deducted (1000 -> 800)');
assert.strictEqual(LogisticsNet.getCondenserRate(gs.getUpgrades().condenserLevel), 12, 'Flow rate increased to 12 E/s');

// Upgrade Tank to Level 2
const upgradedTank = gs.upgradeEquipment('tank');
assert.strictEqual(upgradedTank, true, 'Tank upgrade succeeds');
assert.strictEqual(gs.getUpgrades().tankLevel, 2, 'Tank level is now 2');
assert.strictEqual(gs.getData().credits, 700, '100 CR deducted (800 -> 700)');
assert.strictEqual(gs.getMaxStorageCapacity(), 80, 'Storage capacity increased to 80 units');

// Upgrade Pipe to Level 2
const upgradedPipe = gs.upgradeEquipment('pipe');
assert.strictEqual(upgradedPipe, true, 'Pipe upgrade succeeds');
assert.strictEqual(gs.getUpgrades().pipeLevel, 2, 'Pipe level is now 2');
assert.strictEqual(gs.getData().credits, 550, '150 CR deducted (700 -> 550)');
assert.strictEqual(LogisticsNet.getPipeCapacity(gs.getUpgrades().pipeLevel), 20, 'Pipe throughput increased to 20 E/s');

// Test Insufficient Funds Rejection
gs.setCredits(50);
const failedUpgrade = gs.upgradeEquipment('drone'); // costs 300 CR
assert.strictEqual(failedUpgrade, false, 'Upgrade rejected when insufficient credits');
assert.strictEqual(gs.getUpgrades().droneLevel, 1, 'Drone level remains unchanged');

console.log('✅ Test 5 Passed: All upgrade shop costs, level increments, and credit checks verified.');

// --------------------------------------------------------------------------
// Test 6: Dark Mode & Language Parity
// --------------------------------------------------------------------------
console.log('\n--- Test 6: Dark Mode & i18n Language Parity ---');

// Audit HarborModal.ts and LogisticsNet.ts for Rule 7
const harborModalSrc = fs.readFileSync(path.resolve('src/ui/HarborModal.ts'), 'utf-8');
assert.strictEqual(/\bbg-white\b/.test(harborModalSrc), false, 'HarborModal must NOT contain bg-white');
assert.strictEqual(/\btext-black\b/.test(harborModalSrc), false, 'HarborModal must NOT contain text-black');

// Verify i18n keys for harbor
assert.ok(deJson.harbor, 'de.json contains harbor section');
assert.ok(enJson.harbor, 'en.json contains harbor section');

const deHarborKeys = Object.keys(deJson.harbor).sort();
const enHarborKeys = Object.keys(enJson.harbor).sort();
assert.deepStrictEqual(deHarborKeys, enHarborKeys, 'All harbor translation keys match 100% between DE and EN');

console.log('✅ Test 6 Passed: Dark Mode Rule 7 compliance and 100% harbor translation parity verified.');

console.log('\n🎉 ALL PHASE 2 ACCEPTANCE CRITERIA UNIT TESTS PASSED!');
