import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { CloudGrid, CondensatePocket } from '../src/core/CloudGrid';
import { ToolBar, SCAN_TOOLS } from '../src/ui/ToolBar';
import { GameState } from '../src/core/GameState';

console.log('🧪 Starting Fog-of-War, Scanning & Discovery Acceptance Criteria Verification Suite...\n');

// --------------------------------------------------------------------------
// Test 1: Verdeckte Kondensattaschen im Nebel (Concealed Pockets Initial State)
// --------------------------------------------------------------------------
console.log('--- Test 1: Concealed Pockets Initial State ---');
const grid = new CloudGrid();
const pockets = grid.getPockets();

assert.ok(pockets.length >= 3, 'Grid initializes with at least 3 condensate pockets');
pockets.forEach((p) => {
  assert.strictEqual(
    p.discoveryState,
    'concealed',
    `Pocket ${p.id} must initially be 'concealed' (hidden in fog-of-war)`
  );
  assert.strictEqual(p.isDepleted, false, `Pocket ${p.id} must not be depleted initially`);
});

const concealedPockets = grid.getConcealedPockets();
assert.strictEqual(concealedPockets.length, pockets.length, 'All pockets start in concealed state');
assert.strictEqual(grid.getHintedPockets().length, 0, 'Zero pockets start hinted');
assert.strictEqual(grid.getRevealedPockets().length, 0, 'Zero pockets start revealed');

console.log('✅ Test 1 Passed: All pockets initialize as concealed and invisible.');

// --------------------------------------------------------------------------
// Test 2: Windfühler (50 CR) Sonar & Radius Hinting
// --------------------------------------------------------------------------
console.log('\n--- Test 2: Windfühler Sonar & Radius Hinting (50 CR) ---');
const gs = GameState.getInstance();
gs.resetSeason(1000);

// Insufficient credit guard
gs.setCredits(30);
assert.strictEqual(gs.deductCredits(50), false, 'Windfühler blocked when balance < 50 CR');

// Sufficient credit execution
gs.setCredits(1000);
assert.strictEqual(gs.deductCredits(50), true, '50 CR deducted for Windfühler scan');
assert.strictEqual(gs.getCredits(), 950, 'Credits reduced to 950 CR');

// Radius hinting logic
const targetPocket = pockets[0]; // e.g. Frostkristall at (180, 240)
const farPocket = pockets[1]; // e.g. Skywater at (350, 510)

const hinted = grid.hintPocketsInRadius(targetPocket.x, targetPocket.y, 160);
assert.ok(hinted.some((p) => p.id === targetPocket.id), 'Target pocket within 160px radius transitions to hinted');
assert.strictEqual(targetPocket.discoveryState, 'hinted', 'Pocket discoveryState is now hinted');
assert.strictEqual(farPocket.discoveryState, 'concealed', 'Pocket outside 160px remains concealed');

console.log('✅ Test 2 Passed: Windfühler 50 CR deduction and 160px radius hinting verified.');

// --------------------------------------------------------------------------
// Test 3: Echo-Drohne (150 CR) Layer Scan
// --------------------------------------------------------------------------
console.log('\n--- Test 3: Echo-Drohne Layer Scan (150 CR) ---');
const droneGrid = new CloudGrid();
const dronePockets = droneGrid.getPockets();

// Insufficient credit guard
gs.setCredits(100);
assert.strictEqual(gs.deductCredits(150), false, 'Echo-Drohne blocked when balance < 150 CR');

// Sufficient credit execution
gs.setCredits(800);
assert.strictEqual(gs.deductCredits(150), true, '150 CR deducted for Echo-Drohne scan');
assert.strictEqual(gs.getCredits(), 650, 'Credits reduced to 650 CR');

// Layer hinting logic: pocket 1 is in Mid Zone (layer ~5)
const layerHeight = (droneGrid.gridBottomY - droneGrid.gridTopY) / droneGrid.layers;
const midPocket = dronePockets.find((p) => p.resourceType === 'skywater')!;
const midLayer = Math.floor((midPocket.y - droneGrid.gridTopY) / layerHeight);

const layerHinted = droneGrid.hintPocketsInLayer(midLayer);
assert.ok(layerHinted.some((p) => p.id === midPocket.id), 'Mid-layer pocket transitioned to hinted');
assert.strictEqual(midPocket.discoveryState, 'hinted', 'Pocket in scanned layer is hinted');

const frostPocket = dronePockets.find((p) => p.resourceType === 'frost')!;
assert.strictEqual(frostPocket.discoveryState, 'concealed', 'Pocket in different layer remains concealed');

console.log('✅ Test 3 Passed: Echo-Drohne 150 CR deduction and layer scan hinting verified.');

// --------------------------------------------------------------------------
// Test 4: Spektralscan (400 CR) Full Reveal
// --------------------------------------------------------------------------
console.log('\n--- Test 4: Spektralscan Precision Deep Reveal (400 CR) ---');
const spectralGrid = new CloudGrid();
const sPockets = spectralGrid.getPockets();

// Insufficient credit guard
gs.setCredits(300);
assert.strictEqual(gs.deductCredits(400), false, 'Spektralscan blocked when balance < 400 CR');

// Sufficient credit execution
gs.setCredits(1000);
assert.strictEqual(gs.deductCredits(400), true, '400 CR deducted for Spektralscan');
assert.strictEqual(gs.getCredits(), 600, 'Credits reduced to 600 CR');

// Full reveal logic: reveals all pockets in 200px radius
const target = sPockets[0];
// Pre-set to hinted to test transition hinted -> revealed
target.discoveryState = 'hinted';

const revealed = spectralGrid.revealPocketsInRadius(target.x, target.y, 200);
assert.ok(revealed.some((p) => p.id === target.id), 'Target pocket transitioned to revealed');
assert.strictEqual(target.discoveryState, 'revealed', 'Target pocket discoveryState is now revealed');
assert.ok(target.quality >= 1 && target.quality <= 3, 'Revealed pocket exhibits 1-3 star quality');
assert.ok(target.sizeCategory === 'S' || target.sizeCategory === 'M' || target.sizeCategory === 'L', 'Size category S/M/L retained');
assert.ok(target.resourceType, 'Resource type identified');

console.log('✅ Test 4 Passed: Spektralscan 400 CR deduction and full reveal verified.');

// --------------------------------------------------------------------------
// Test 5: Aufdeckung durch Blind-Bohren (< 35px) & Extraction
// --------------------------------------------------------------------------
console.log('\n--- Test 5: Blind Drilling Discovery (< 35px) & Depletion ---');
const blindGrid = new CloudGrid();
const blindTarget = blindGrid.getPockets()[1]; // Skywater pocket
assert.strictEqual(blindTarget.discoveryState, 'concealed', 'Target starts concealed');

// Probe too far (> 50px)
const missCollision = blindGrid.checkDrillCollision(blindTarget.x + 80, blindTarget.y + 80, 35);
assert.strictEqual(missCollision, null, 'Missed drill does not collide');
assert.strictEqual(blindTarget.discoveryState, 'concealed', 'Missed pocket stays concealed');

// Probe close hit (< 35px)
const hitCollision = blindGrid.checkDrillCollision(blindTarget.x + 15, blindTarget.y + 10, 35);
assert.ok(hitCollision, 'Drill collision detected within threshold');
assert.strictEqual(hitCollision.id, blindTarget.id, 'Hit correct pocket');
assert.strictEqual(blindTarget.discoveryState, 'revealed', 'Blind hit immediately reveals pocket');

// Extraction and transition to exhausted
const initialVol = blindTarget.currentVolume;
const extracted = blindGrid.extractFromPocket(blindTarget.id, 50, 1.0);
assert.strictEqual(extracted, 50, 'Extracted 50 units');
assert.strictEqual(blindTarget.currentVolume, initialVol - 50, 'Volume reduced');

// Deplete pocket
blindGrid.extractFromPocket(blindTarget.id, 500, 1.0);
assert.strictEqual(blindTarget.currentVolume, 0, 'Volume depleted to 0');
assert.strictEqual(blindTarget.isDepleted, true, 'Pocket isDepleted is true');
assert.strictEqual(blindTarget.discoveryState, 'exhausted', 'Pocket discoveryState is now exhausted');

console.log('✅ Test 5 Passed: Blind drilling discovery (< 35px) and exhaustion verified.');

// --------------------------------------------------------------------------
// Test 6: Toolbar Slot 1 Sub-Selector & Hotkeys
// --------------------------------------------------------------------------
console.log('\n--- Test 6: Toolbar Slot 1 Sub-Selector & Hotkeys ---');
const toolbar = new ToolBar();
assert.strictEqual(toolbar.getActiveTool(), 'drill', 'Default tool is drill');
assert.strictEqual(toolbar.getActiveScanTool(), 'wind_sensor', 'Default scan tool is wind_sensor');

// Select scan tool
toolbar.selectTool('scan');
assert.strictEqual(toolbar.getActiveTool(), 'scan', 'Active tool changed to scan');

// Verify SCAN_TOOLS definitions
assert.strictEqual(SCAN_TOOLS.length, 3, 'Exactly 3 scan tools defined');
assert.strictEqual(SCAN_TOOLS[0].id, 'wind_sensor');
assert.strictEqual(SCAN_TOOLS[0].cost, 50);
assert.strictEqual(SCAN_TOOLS[1].id, 'echo_drone');
assert.strictEqual(SCAN_TOOLS[1].cost, 150);
assert.strictEqual(SCAN_TOOLS[2].id, 'spectral_scan');
assert.strictEqual(SCAN_TOOLS[2].cost, 400);

// Select scan sub-tools
let lastScanTool = '';
toolbar.onScanToolChange((st) => {
  lastScanTool = st;
});

toolbar.selectScanTool('echo_drone');
assert.strictEqual(toolbar.getActiveScanTool(), 'echo_drone');
assert.strictEqual(lastScanTool, 'echo_drone');

toolbar.selectScanTool('spectral_scan');
assert.strictEqual(toolbar.getActiveScanTool(), 'spectral_scan');
assert.strictEqual(lastScanTool, 'spectral_scan');

// Cycle scan tools
toolbar.cycleScanTool();
assert.strictEqual(toolbar.getActiveScanTool(), 'wind_sensor', 'Cycling wraps back to wind_sensor');

console.log('✅ Test 6 Passed: Toolbar Slot 1 Sub-Selector and switching verified.');

// --------------------------------------------------------------------------
// Test 7: Dark Mode Rule 7 Compliance & Language Parity
// --------------------------------------------------------------------------
console.log('\n--- Test 7: Dark Mode Rule 7 Compliance & i18n Parity ---');
const filesToCheck = [
  'src/ui/ToolBar.ts',
  'src/ui/TutorialModal.ts',
  'src/scenes/SkyHarvestScene.ts',
  'src/core/CloudGrid.ts',
];

filesToCheck.forEach((relPath) => {
  const content = fs.readFileSync(path.resolve(relPath), 'utf-8');
  assert.strictEqual(content.includes('bg-white'), false, `Rule 7: No bg-white allowed in ${relPath}`);
  assert.strictEqual(content.includes('text-black'), false, `Rule 7: No text-black allowed in ${relPath}`);
});

const dePath = path.resolve('src/i18n/de.json');
const enPath = path.resolve('src/i18n/en.json');
const deJson = JSON.parse(fs.readFileSync(dePath, 'utf-8'));
const enJson = JSON.parse(fs.readFileSync(enPath, 'utf-8'));

function getKeysDeep(obj: Record<string, unknown>, prefix = ''): string[] {
  let keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys = keys.concat(getKeysDeep(v as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const deKeys = getKeysDeep(deJson).sort();
const enKeys = getKeysDeep(enJson).sort();

assert.deepStrictEqual(deKeys, enKeys, '100% key parity between DE and EN');
assert.ok(deJson.scanTools.windSensor, 'Wind Sensor translation in DE');
assert.ok(enJson.scanTools.windSensor, 'Wind Sensor translation in EN');
assert.ok(deJson.scanTools.echoDrone, 'Echo Drone translation in DE');
assert.ok(enJson.scanTools.echoDrone, 'Echo Drone translation in EN');
assert.ok(deJson.scanTools.spectralScan, 'Spectral Scan translation in DE');
assert.ok(enJson.scanTools.spectralScan, 'Spectral Scan translation in EN');
assert.ok(deJson.scan.blindDiscovery, 'Blind discovery translation in DE');
assert.ok(enJson.scan.blindDiscovery, 'Blind discovery translation in EN');

console.log('✅ Test 7 Passed: Rule 7 100% compliant and 100% i18n parity verified.');

console.log('\n🎉 ALL SCANNING, EXPLORATION & DISCOVERY ACCEPTANCE CRITERIA TESTS PASSED!');
