import assert from 'node:assert';
import { CloudGrid } from '../src/core/CloudGrid.ts';
import { ProbePhysics } from '../src/core/ProbePhysics.ts';
import { DriftSystem } from '../src/core/DriftSystem.ts';
import { ZoneType } from '../src/gfx/ColorPalette.ts';

console.log('🧪 Starting Phase 1 (P1) Acceptance Criteria Verification Suite...\n');

// 1. Probe & Tool Matching Logic
console.log('--- Test 1: Drill Head Matching Logic ---');
assert.strictEqual(ProbePhysics.isMatchingHead('ice', 'high'), true, 'Eisbohrer matches High Zone');
assert.strictEqual(ProbePhysics.isMatchingHead('ice', 'mid'), false, 'Eisbohrer fails Mid Zone');
assert.strictEqual(ProbePhysics.isMatchingHead('ice', 'low'), false, 'Eisbohrer fails Low Zone');

assert.strictEqual(ProbePhysics.isMatchingHead('fog', 'mid'), true, 'Nebelfänger matches Mid Zone');
assert.strictEqual(ProbePhysics.isMatchingHead('fog', 'high'), false, 'Nebelfänger fails High Zone');
assert.strictEqual(ProbePhysics.isMatchingHead('fog', 'low'), false, 'Nebelfänger fails Low Zone');

assert.strictEqual(ProbePhysics.isMatchingHead('charge', 'low'), true, 'Ladungsspitze matches Low Zone');
assert.strictEqual(ProbePhysics.isMatchingHead('charge', 'high'), false, 'Ladungsspitze fails High Zone');
assert.strictEqual(ProbePhysics.isMatchingHead('charge', 'mid'), false, 'Ladungsspitze fails Mid Zone');
console.log('✅ Test 1 Passed: Drill head zone matching verified.');

// 2. Resistance & Dynamic Speed Braking (50% penalty on wrong head)
console.log('\n--- Test 2: Resistance & 50% Speed Penalty ---');
const highDensity = 0.25;
const midDensity = 0.50;
const lowDensity = 0.85;

const speedHighMatching = ProbePhysics.calculateAdvanceSpeed(highDensity, true, false);
const speedHighUnmatched = ProbePhysics.calculateAdvanceSpeed(highDensity, false, false);
assert.strictEqual(speedHighUnmatched, speedHighMatching * 0.5, '50% speed penalty in High Zone');

const speedMidMatching = ProbePhysics.calculateAdvanceSpeed(midDensity, true, false);
const speedMidUnmatched = ProbePhysics.calculateAdvanceSpeed(midDensity, false, false);
assert.strictEqual(speedMidUnmatched, speedMidMatching * 0.5, '50% speed penalty in Mid Zone');

const speedLowMatching = ProbePhysics.calculateAdvanceSpeed(lowDensity, true, false);
const speedLowUnmatched = ProbePhysics.calculateAdvanceSpeed(lowDensity, false, false);
assert.strictEqual(speedLowUnmatched, speedLowMatching * 0.5, '50% speed penalty in Low Zone');

// Density ordering: High zone faster than Mid zone faster than Low zone
assert.ok(speedHighMatching > speedMidMatching, 'High Zone is faster than Mid Zone');
assert.ok(speedMidMatching > speedLowMatching, 'Mid Zone is faster than Low Zone');

// Gliding in carved channel
const carvedSpeed = ProbePhysics.calculateAdvanceSpeed(lowDensity, false, true);
assert.strictEqual(carvedSpeed, 380, 'Carved channel glides freely at 380 px/s with zero drag');
console.log('✅ Test 2 Passed: Dynamic braking force and 50% penalty verified.');

// 3. CloudGrid: 24x12 Dimensions, Densities, and Carved Channel Trail
console.log('\n--- Test 3: CloudGrid Structure & Channel Carving ---');
const grid = new CloudGrid();
assert.strictEqual(grid.columns, 24, 'Grid has 24 columns');
assert.strictEqual(grid.layers, 12, 'Grid has 12 layers');

// Verify initial density gradient
const highCell = grid.getCell(12, 1);
const midCell = grid.getCell(12, 5);
const lowCell = grid.getCell(12, 9);
assert.ok(highCell && midCell && lowCell);
assert.ok(highCell.baseDensity < midCell.baseDensity, 'Layer 1 density < Layer 5 density');
assert.ok(midCell.baseDensity < lowCell.baseDensity, 'Layer 5 density < Layer 9 density');

// Carving test
const testX = 270;
const testY = 400;
assert.strictEqual(grid.isCarvedAt(testX, testY), false, 'Initially uncarved');
const freshCarved = grid.carveAt(testX, testY, 22);
assert.strictEqual(freshCarved, true, 'First carve marks fresh cloud cut');
assert.strictEqual(grid.isCarvedAt(testX, testY), true, 'Position is now carved');
assert.strictEqual(grid.getEffectiveDensityAt(testX, testY), 0, 'Carved position has 0 effective density');

// Channel healing test over 60 seconds (1 week)
grid.update(30, 1, 0.5); // Advance 30 seconds (half week)
const cellAfter30s = grid.getCellAtWorldPos(testX, testY);
assert.ok(cellAfter30s && cellAfter30s.carveFactor > 0.4 && cellAfter30s.carveFactor < 0.6, 'After 30s, channel is ~50% healed');

grid.update(35, 1, 0.0); // Advance remaining 35 seconds (past 60s total)
assert.strictEqual(grid.isCarvedAt(testX, testY), false, 'After 60s (1 week), channel is fully healed');
console.log('✅ Test 3 Passed: 24x12 grid, carving, and 60-second channel healing verified.');

// 4. Condensate Pockets, Drift & Extraction
console.log('\n--- Test 4: Condensate Pockets, Drift & Extraction ---');
const freshGrid = new CloudGrid();
const pockets = freshGrid.getPockets();
assert.ok(pockets.length >= 3, 'At least 3 condensate pockets initialized');

const frostPocket = pockets.find((p) => p.resourceType === 'frost');
const waterPocket = pockets.find((p) => p.resourceType === 'skywater');
const stormPocket = pockets.find((p) => p.resourceType === 'storm');
assert.ok(frostPocket, 'Frost crystal pocket exists in High Zone');
assert.ok(waterPocket, 'Skywater pocket exists in Mid Zone');
assert.ok(stormPocket, 'Storm charge pocket exists in Low Zone');

// Drift update test
const initialFrostX = frostPocket.x;
freshGrid.update(10, 1, 0.5); // Advance 10s with 0.5 weekProgress
assert.notStrictEqual(frostPocket.x, initialFrostX, 'Pockets drift horizontally with cloud bands');

// Extraction test
const initialVol = waterPocket.currentVolume;
const extractedAmount = freshGrid.extractFromPocket(waterPocket.id, 20, 1.0); // Extract 20 units/s for 1s
assert.strictEqual(extractedAmount, 20, 'Extracted 20 units');
assert.strictEqual(waterPocket.currentVolume, initialVol - 20, 'Pocket volume decreased accordingly');

// Depletion test
freshGrid.extractFromPocket(waterPocket.id, 200, 1.0);
assert.strictEqual(waterPocket.currentVolume, 0, 'Pocket volume clamped to 0');
assert.strictEqual(waterPocket.isDepleted, true, 'Pocket is marked depleted');
console.log('✅ Test 4 Passed: Condensate pockets, zone drift, and extraction verified.');

// 5. Wind Sensor (Windfühler) Sonar
console.log('\n--- Test 5: Windfühler Sonar Nearest Pocket Detection ---');
const sonarGrid = new CloudGrid();
const nearestToHigh = sonarGrid.findNearestPocket(180, 240);
assert.ok(nearestToHigh, 'Found nearest pocket to High Zone coordinates');
assert.strictEqual(nearestToHigh.pocket.resourceType, 'frost', 'Identified Frostkristall pocket accurately');
assert.ok(nearestToHigh.distance < 10, 'Distance matches proximity');
console.log('✅ Test 5 Passed: Windfühler sonar accurately locates nearest pocket.');

// 6. Cable Catenary Sag & Turbulence Curve
console.log('\n--- Test 6: Catenary Bezier Curve & Turbulence Wobble ---');
const curveHigh = ProbePhysics.calculateCableCurve(270, 60, 270, 300, 1.5, 'high');
const curveLow = ProbePhysics.calculateCableCurve(270, 60, 270, 800, 1.5, 'low');
assert.ok(curveHigh.controlY > (60 + 300) / 2, 'Catenary sag pulls control point downwards in High Zone');
assert.ok(curveLow.controlY > (60 + 800) / 2, 'Catenary sag pulls control point downwards in Low Zone');
console.log('✅ Test 6 Passed: Dynamic Catenary sag and turbulence curve verified.');

console.log('\n🎉 ALL PHASE 1 ACCEPTANCE CRITERIA UNIT TESTS PASSED!');
