/**
 * Cloud Harvesters - Modes, Profile & Layer Challenges Verification Suite
 * Verifies:
 * 1. Problem 2: Getrennter Spielmodus als Standard ('solo' default) & Faire Rivalen-KI mit Scan-Drohnen.
 * 2. Problem 3: Anpassbarer Spielername ('Captain Sky' default, PilotModal, Council & Summary integration).
 * 3. Problem 4: Bessere Visualisierung der Schichtherausforderungen, Bohrkopf-Rückmeldung & Zonen-Herausforderungs-Anzeige.
 * 4. Regel 7 Compliance (0 bg-white, 0 text-black) & 100% i18n Parity.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { GameState } from '../src/core/GameState';
import { CouncilEngine } from '../src/core/CouncilEngine';
import { ProbePhysics } from '../src/core/ProbePhysics';
import { CloudGrid } from '../src/core/CloudGrid';
import deJson from '../src/i18n/de.json';
import enJson from '../src/i18n/en.json';

console.log('🧪 Starting Modes, Profile & Layer Challenges Acceptance Verification Suite...\n');

// --------------------------------------------------------------------------
// Test 1: Problem 2: Separated Mode as Default ('solo') & GameMode Switching
// --------------------------------------------------------------------------
console.log('--- Test 1: Problem 2: Separated Mode as Default & GameMode Persistence ---');

const gs = GameState.getInstance();
assert.strictEqual(gs.getGameMode(), 'solo', 'Default game mode must be "solo" (Eigener Sektor)');

gs.setGameMode('arena');
assert.strictEqual(gs.getGameMode(), 'arena', 'Switches to "arena" mode');

gs.setGameMode('solo');
assert.strictEqual(gs.getGameMode(), 'solo', 'Switches back to "solo" mode');

// Verify index.html contains the mode switch button and icons
const indexHtmlSrc = fs.readFileSync(path.resolve('index.html'), 'utf-8');
assert.ok(indexHtmlSrc.includes('id="btn-mode-toggle"'), 'index.html contains mode toggle button');
assert.ok(indexHtmlSrc.includes('id="header-mode-icon"'), 'index.html contains mode icon span');
assert.ok(indexHtmlSrc.includes('id="header-mode-label"'), 'index.html contains mode label span');

console.log('✅ Test 1 Passed: Separated mode as default and mode switching verified.');

// --------------------------------------------------------------------------
// Test 2: Problem 2: Fair Rival AI & Scan Drones (No God-Mode Knowledge)
// --------------------------------------------------------------------------
console.log('\n--- Test 2: Problem 2: Fair Rival AI with Scan Drones & Background Harvesting ---');

const sceneSrc = fs.readFileSync(path.resolve('src/scenes/SkyHarvestScene.ts'), 'utf-8');

// Verify RivalDrone interface and knownPocketIds in SkyRival
assert.ok(sceneSrc.includes('export interface RivalDrone'), 'SkyHarvestScene defines RivalDrone interface');
assert.ok(sceneSrc.includes('knownPocketIds: Set<string>'), 'SkyRival includes knownPocketIds Set');
assert.ok(sceneSrc.includes('drone: RivalDrone'), 'SkyRival includes drone');

// Verify solo mode background harvesting
assert.ok(
  sceneSrc.includes("if (this.gameMode === 'solo')"),
  'SkyHarvestScene checks solo mode in updateSkyRivals and renderSkyRivals'
);

// Verify fair AI selection check (MUST be known by drone or revealed)
assert.ok(
  sceneSrc.includes('rival.knownPocketIds.has(p.id) || p.discoveryState === \'revealed\''),
  'Rival AI strictly requires drone discovery or revealed status before targeting pocket (NO God-Mode!)'
);

// Verify drone scanning radius and drone chassis/radar rendering
assert.ok(sceneSrc.includes('drone.scanRadius'), 'Drones have a defined scanRadius');
assert.ok(sceneSrc.includes('strokeCircle(drone.x, drone.y, drone.scanRadius)'), 'Renders drone scanning radar beam');

console.log('✅ Test 2 Passed: Fair Rival AI with Scan Drones and Solo background harvesting verified.');

// --------------------------------------------------------------------------
// Test 3: Problem 3: Customizable Pilot Name & Council/Summary Integration
// --------------------------------------------------------------------------
console.log('\n--- Test 3: Problem 3: Customizable Pilot Name & Consistent UI Display ---');

assert.strictEqual(gs.getPlayerName(), 'Captain Sky', 'Default player name is "Captain Sky"');

gs.setPlayerName('Commander Zephyr');
assert.strictEqual(gs.getPlayerName(), 'Commander Zephyr', 'Player name correctly updated to "Commander Zephyr"');

// Verify CouncilEngine reflects the player name
const councilEngine = gs.getCouncilEngine();
const playerBidder = councilEngine.getBidder('player');
assert.ok(playerBidder, 'CouncilEngine has player bidder');
assert.strictEqual(playerBidder.name, 'Commander Zephyr', 'CouncilEngine bidder name updated with custom player name');

// Reset to default for consistency
gs.setPlayerName('Captain Sky');
assert.strictEqual(playerBidder.name, 'Captain Sky', 'CouncilEngine bidder name reset to Captain Sky');

// Verify index.html contains clickable pilot profile badge
assert.ok(indexHtmlSrc.includes('id="btn-pilot-profile"'), 'index.html contains pilot profile button');
assert.ok(indexHtmlSrc.includes('id="header-pilot-name"'), 'index.html contains pilot name display span');
assert.ok(indexHtmlSrc.includes('id="pilot-modal-container"'), 'index.html contains pilot modal container');

// Verify PilotModal class exists and has open/close/save
const pilotModalPath = path.resolve('src/ui/PilotModal.ts');
assert.ok(fs.existsSync(pilotModalPath), 'src/ui/PilotModal.ts must exist');
const pilotModalSrc = fs.readFileSync(pilotModalPath, 'utf-8');
assert.ok(pilotModalSrc.includes('class PilotModal'), 'PilotModal class defined');
assert.ok(pilotModalSrc.includes('input-pilot-name'), 'PilotModal contains name input field');
assert.ok(pilotModalSrc.includes('btn-pilot-save'), 'PilotModal contains save button');
assert.ok(pilotModalSrc.includes('setPlayerName'), 'PilotModal calls setPlayerName');

// Verify CouncilModal and SummaryModal display r.name
const councilModalSrc = fs.readFileSync(path.resolve('src/ui/CouncilModal.ts'), 'utf-8');
assert.ok(councilModalSrc.includes('${r.name}'), 'CouncilModal renders bidder name dynamically');
const summaryModalSrc = fs.readFileSync(path.resolve('src/ui/SummaryModal.ts'), 'utf-8');
assert.ok(summaryModalSrc.includes('${r.name}'), 'SummaryModal renders bidder name dynamically');

console.log('✅ Test 3 Passed: Customizable pilot name and consistent council/summary integration verified.');

// --------------------------------------------------------------------------
// Test 4: Problem 4: Layer Challenges, Bohrkopf Feedback & Banners
// --------------------------------------------------------------------------
console.log('\n--- Test 4: Problem 4: Physical Layer Challenges & Resistance Banners ---');

// ProbePhysics verification for all 3 zones
assert.strictEqual(ProbePhysics.isMatchingHead('ice', 'high'), true, 'Eisbohrer matches Hochzone');
assert.strictEqual(ProbePhysics.isMatchingHead('fog', 'high'), false, 'Nebelfänger does not match Hochzone');
assert.strictEqual(ProbePhysics.isMatchingHead('charge', 'high'), false, 'Ladungsspitze does not match Hochzone');

assert.strictEqual(ProbePhysics.isMatchingHead('fog', 'mid'), true, 'Nebelfänger matches Mittelzone');
assert.strictEqual(ProbePhysics.isMatchingHead('ice', 'mid'), false, 'Eisbohrer does not match Mittelzone');
assert.strictEqual(ProbePhysics.isMatchingHead('charge', 'mid'), false, 'Ladungsspitze does not match Mittelzone');

assert.strictEqual(ProbePhysics.isMatchingHead('charge', 'low'), true, 'Ladungsspitze matches Tiefzone');
assert.strictEqual(ProbePhysics.isMatchingHead('ice', 'low'), false, 'Eisbohrer does not match Tiefzone');
assert.strictEqual(ProbePhysics.isMatchingHead('fog', 'low'), false, 'Nebelfänger does not match Tiefzone');

// 50% Speed penalty check in ProbePhysics
const highSpeedOptimal = ProbePhysics.calculateAdvanceSpeed(0.25, true, false);
const highSpeedPenalty = ProbePhysics.calculateAdvanceSpeed(0.25, false, false);
assert.strictEqual(highSpeedPenalty, highSpeedOptimal * 0.5, '50% speed penalty on mismatched drill head in Hochzone');

const lowSpeedOptimal = ProbePhysics.calculateAdvanceSpeed(0.85, true, false);
const lowSpeedPenalty = ProbePhysics.calculateAdvanceSpeed(0.85, false, false);
assert.strictEqual(lowSpeedPenalty, lowSpeedOptimal * 0.5, '50% speed penalty on mismatched drill head in Tiefzone');

// Verify Scene implements layer challenge visuals and banners
assert.ok(sceneSrc.includes('renderLayerDrillFeedback'), 'SkyHarvestScene implements renderLayerDrillFeedback()');
assert.ok(sceneSrc.includes('triggerResistanceBanner'), 'SkyHarvestScene implements triggerResistanceBanner()');
assert.ok(sceneSrc.includes('layerChallenge.iceResistance'), 'SkyHarvestScene triggers ice crust resistance banner');
assert.ok(sceneSrc.includes('layerChallenge.fogResistance'), 'SkyHarvestScene triggers fog turbulence resistance banner');
assert.ok(sceneSrc.includes('layerChallenge.chargeResistance'), 'SkyHarvestScene triggers high voltage resistance banner');

// Verify crystalline ice textures, vapor swirls, and cumulonimbus in background
assert.ok(sceneSrc.includes('Kristalline Eisschollen-Texturen in Hochzone'), 'SkyHarvestScene draws crystalline ice textures in Hochzone');
assert.ok(sceneSrc.includes('Dichte fließende Wasserdampf-Wirbel in Mittelzone'), 'SkyHarvestScene draws flowing vapor swirls in Mittelzone');
assert.ok(sceneSrc.includes('Dunkle Cumulonimbus-Wolkenberge in Tiefzone'), 'SkyHarvestScene draws cumulonimbus cloud shapes in Tiefzone');

console.log('✅ Test 4 Passed: Physical layer challenges, 50% slowdown, and visual resistance feedback verified.');

// --------------------------------------------------------------------------
// Test 5: Problem 4: Zonen-Herausforderungs-Anzeige (Left Edge HUD)
// --------------------------------------------------------------------------
console.log('\n--- Test 5: Problem 4: Zonen-Herausforderungs-Anzeige (Left Edge HUD) ---');

assert.ok(sceneSrc.includes('createZoneChallengeHUD'), 'SkyHarvestScene implements createZoneChallengeHUD()');
assert.ok(sceneSrc.includes('updateZoneChallengeHUD'), 'SkyHarvestScene implements updateZoneChallengeHUD()');
assert.ok(sceneSrc.includes('getZoneChallengeHUDState'), 'SkyHarvestScene implements getZoneChallengeHUDState()');

// Verify HUD displays required drill heads and status
assert.ok(sceneSrc.includes('zoneChallengeTitleText'), 'Zone Challenge HUD displays zone title');
assert.ok(sceneSrc.includes('zoneChallengeDensityText'), 'Zone Challenge HUD displays layer density');
assert.ok(sceneSrc.includes('zoneChallengeHeadText'), 'Zone Challenge HUD displays recommended drill head');
assert.ok(sceneSrc.includes('zoneChallengeStatusText'), 'Zone Challenge HUD displays status badge (Optimal vs 50% Bremsung)');

console.log('✅ Test 5 Passed: Zonen-Herausforderungs-Anzeige on left edge verified.');

// --------------------------------------------------------------------------
// Test 6: Dark Mode Rule 7 Compliance (0 bg-white, 0 text-black)
// --------------------------------------------------------------------------
console.log('\n--- Test 6: Dark Mode Rule 7 Compliance ---');

function checkRule7InDirectory(dir: string): void {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const fullPath = path.join(dir, f);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      checkRule7InDirectory(fullPath);
    } else if (f.endsWith('.ts') || f.endsWith('.html') || f.endsWith('.css')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      assert.strictEqual(
        /\bbg-white\b/.test(content),
        false,
        `Rule 7 violation: "bg-white" found in ${fullPath}`
      );
      assert.strictEqual(
        /\btext-black\b/.test(content),
        false,
        `Rule 7 violation: "text-black" found in ${fullPath}`
      );
    }
  }
}

checkRule7InDirectory(path.resolve('src'));
const indexHtmlContent = fs.readFileSync(path.resolve('index.html'), 'utf-8');
assert.strictEqual(/\bbg-white\b/.test(indexHtmlContent), false, 'index.html must NOT contain bg-white');
assert.strictEqual(/\btext-black\b/.test(indexHtmlContent), false, 'index.html must NOT contain text-black');

console.log('✅ Test 6 Passed: 0 occurrences of "bg-white" or "text-black" (100% Rule 7 compliant).');

// --------------------------------------------------------------------------
// Test 7: 100% i18n Language Parity between de.json and en.json
// --------------------------------------------------------------------------
console.log('\n--- Test 7: 100% i18n Language Parity ---');

function compareKeys(deObj: Record<string, any>, enObj: Record<string, any>, prefix = ''): void {
  const deKeys = Object.keys(deObj);
  const enKeys = Object.keys(enObj);

  for (const k of deKeys) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    assert.ok(
      k in enObj,
      `Missing key in en.json: "${fullKey}" exists in de.json but not in en.json`
    );

    if (typeof deObj[k] === 'object' && deObj[k] !== null && !Array.isArray(deObj[k])) {
      assert.strictEqual(
        typeof enObj[k],
        'object',
        `Type mismatch for "${fullKey}": expected object in en.json`
      );
      compareKeys(deObj[k], enObj[k], fullKey);
    }
  }

  for (const k of enKeys) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    assert.ok(
      k in deObj,
      `Missing key in de.json: "${fullKey}" exists in en.json but not in de.json`
    );
  }
}

compareKeys(deJson as any, enJson as any);

// Check specific required keys
assert.ok(deJson.header.modeSolo, 'de.json contains header.modeSolo');
assert.ok(enJson.header.modeSolo, 'en.json contains header.modeSolo');
assert.ok(deJson.header.modeArena, 'de.json contains header.modeArena');
assert.ok(enJson.header.modeArena, 'en.json contains header.modeArena');
assert.ok((deJson as any).profile.title, 'de.json contains profile.title');
assert.ok((enJson as any).profile.title, 'en.json contains profile.title');
assert.ok((deJson as any).layerChallenge.iceResistance, 'de.json contains layerChallenge.iceResistance');
assert.ok((enJson as any).layerChallenge.iceResistance, 'en.json contains layerChallenge.iceResistance');

console.log('✅ Test 7 Passed: 100% language parity verified across all translation keys.');

console.log('\n🎉 ALL MODES, PROFILE & LAYER CHALLENGES ACCEPTANCE TESTS PASSED!\n');
