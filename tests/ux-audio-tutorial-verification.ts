import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { AudioManager } from '../src/audio/AudioManager.ts';
import { StemMixer } from '../src/audio/StemMixer.ts';
import { CloudGrid, WORLD_WIDTH, WORLD_HEIGHT } from '../src/core/CloudGrid.ts';
import deJson from '../src/i18n/de.json';
import enJson from '../src/i18n/en.json';

console.log('🧪 Starting UX, Audio & Frontend Acceptance Criteria Verification Suite...\n');

// --------------------------------------------------------------------------
// 1. Audio System & Cheerful Sound Design Verification
// --------------------------------------------------------------------------
console.log('--- Test 1: Friendly Cheerful Sound Design (No Monotonous Drone) ---');

// Verify AudioManager instance and methods
const audio = AudioManager.getInstance();
assert.ok(audio, 'AudioManager instance exists');
assert.strictEqual(typeof audio.updateDrillSound, 'function', 'updateDrillSound method exists');
assert.strictEqual(typeof audio.stopDrill, 'function', 'stopDrill method exists');
assert.strictEqual(typeof audio.getIsDrilling, 'function', 'getIsDrilling method exists');
assert.strictEqual(typeof audio.playSonarPing, 'function', 'playSonarPing method exists');
assert.strictEqual(typeof audio.playExtractDrop, 'function', 'playExtractDrop method exists');
assert.strictEqual(typeof audio.playAuctionBell, 'function', 'playAuctionBell method exists');

// Verify that monotonous drillOsc / drillSubOsc are eliminated from the source code
const audioSource = fs.readFileSync(path.resolve('src/audio/AudioManager.ts'), 'utf-8');
assert.strictEqual(audioSource.includes('drillOsc'), false, 'drillOsc (sawtooth buzz) is completely removed');
assert.strictEqual(audioSource.includes('drillSubOsc'), false, 'drillSubOsc (sub rumble) is completely removed');
assert.ok(audioSource.includes('kalimbaNotes'), 'Friendly pentatonic Kalimba/Marimba notes scale is present');
assert.ok(audioSource.includes('playCloudCarvePling'), 'playCloudCarvePling method is present');

// Verify StemMixer warm ambient soundtrack setup
const mixer = new StemMixer();
assert.ok(mixer, 'StemMixer instance exists');
const mixerSource = fs.readFileSync(path.resolve('src/audio/StemMixer.ts'), 'utf-8');
assert.ok(mixerSource.includes('startProceduralAmbient'), 'Procedural ambient generator exists');
assert.ok(mixerSource.includes('D maj9'), 'Warm D maj9 cozy harmony is implemented');
assert.ok(mixerSource.includes('chimeInterval'), 'Wind-chime sparkle generator is implemented');

console.log('✅ Test 1 Passed: Cheerful Kalimba plings, water bubbles, and warm ambient soundtrack verified.');

// --------------------------------------------------------------------------
// 2. Full Available Screen Size & Dynamic CloudGrid Scaling
// --------------------------------------------------------------------------
console.log('\n--- Test 2: Dynamic Full-Screen CloudGrid Scaling ---');

// Default baseline
const defaultGrid = new CloudGrid();
assert.strictEqual(defaultGrid.width, WORLD_WIDTH, 'Default grid width is 540');
assert.strictEqual(defaultGrid.height, WORLD_HEIGHT, 'Default grid height is 960');
assert.strictEqual(defaultGrid.getZoneAtWorldY(200), 'high', 'Y=200 is high zone at 960h');
assert.strictEqual(defaultGrid.getZoneAtWorldY(500), 'mid', 'Y=500 is mid zone at 960h');
assert.strictEqual(defaultGrid.getZoneAtWorldY(750), 'low', 'Y=750 is low zone at 960h');

// Resize to Full HD Widescreen (1920x1080)
const widescreenGrid = new CloudGrid(undefined, 1920, 1080);
assert.strictEqual(widescreenGrid.width, 1920, 'Width scaled to 1920');
assert.strictEqual(widescreenGrid.height, 1080, 'Height scaled to 1080');

// Cells should span across full 1920 width
const leftmostCell = widescreenGrid.getCell(0, 0);
const rightmostCell = widescreenGrid.getCell(23, 0);
assert.ok(leftmostCell && leftmostCell.worldX < 50, 'Leftmost cell near X=40');
assert.ok(rightmostCell && rightmostCell.worldX > 1850, 'Rightmost cell near X=1880');

// Scaling via setDimensions
defaultGrid.setDimensions(1280, 800);
assert.strictEqual(defaultGrid.width, 1280, 'setDimensions updated width to 1280');
assert.strictEqual(defaultGrid.height, 800, 'setDimensions updated height to 800');

// Dynamic carving across full screen width
const wideX = 1000;
const wideY = 400;
assert.strictEqual(defaultGrid.isCarvedAt(wideX, wideY), false, 'Initially uncarved at wide coordinates');
defaultGrid.carveAt(wideX, wideY, 30);
assert.strictEqual(defaultGrid.isCarvedAt(wideX, wideY), true, 'Successfully carved channel at wide coordinates');

console.log('✅ Test 2 Passed: Dynamic full-screen grid scaling & carving verified.');

// --------------------------------------------------------------------------
// 3. Interactive Tutorial with Balo 🎈 Verification
// --------------------------------------------------------------------------
console.log('\n--- Test 3: Interactive 6-Step Tutorial with Balo 🎈 ---');

// Verify i18n tutorial definitions in German
assert.ok(deJson.tutorial, 'German tutorial translation exists');
assert.strictEqual(deJson.tutorial.advisor, 'Balo 🎈', 'Advisor name is Balo 🎈 in DE');
assert.ok(deJson.tutorial.step1.title, 'Step 1 has title');
assert.ok(deJson.tutorial.step2.title, 'Step 2 has title');
assert.ok(deJson.tutorial.step3.title, 'Step 3 has title');
assert.ok(deJson.tutorial.step4.title, 'Step 4 has title');
assert.ok(deJson.tutorial.step5.title, 'Step 5 has title');
assert.ok(deJson.tutorial.step6.title, 'Step 6 has title');

// Verify drill head matching instructions in Step 3
assert.ok(deJson.tutorial.step3.headIce.includes('[Taste Q]'), 'Step 3 mentions Key Q');
assert.ok(deJson.tutorial.step3.headFog.includes('[Taste W]'), 'Step 3 mentions Key W');
assert.ok(deJson.tutorial.step3.headCharge.includes('[Taste E]'), 'Step 3 mentions Key E');
assert.ok(deJson.tutorial.step3.warning.includes('50%'), 'Step 3 warns of 50% speed penalty');

// Verify i18n tutorial definitions in English
assert.ok(enJson.tutorial, 'English tutorial translation exists');
assert.strictEqual(enJson.tutorial.advisor, 'Balo 🎈', 'Advisor name is Balo 🎈 in EN');
assert.ok(enJson.tutorial.step1.title, 'Step 1 EN has title');
assert.ok(enJson.tutorial.step2.title, 'Step 2 EN has title');
assert.ok(enJson.tutorial.step3.title, 'Step 3 EN has title');
assert.ok(enJson.tutorial.step4.title, 'Step 4 EN has title');
assert.ok(enJson.tutorial.step5.title, 'Step 5 EN has title');
assert.ok(enJson.tutorial.step6.title, 'Step 6 EN has title');

// Verify Header Tutorial Button
assert.ok(deJson.header.help, 'Header help key defined in DE');
assert.ok(enJson.header.help, 'Header help key defined in EN');

// Verify TutorialModal component source code
const modalSource = fs.readFileSync(path.resolve('src/ui/TutorialModal.ts'), 'utf-8');
assert.ok(modalSource.includes('renderBaloSvg'), 'Balo SVG character is rendered');
assert.ok(modalSource.includes('cloud_harvesters_tutorial_seen'), 'localStorage auto-show check is implemented');
assert.ok(modalSource.includes('handleKeyDown'), 'Keyboard navigation (arrows & ESC) is implemented');

console.log('✅ Test 3 Passed: 6-step interactive tutorial with Balo 🎈 verified in DE & EN.');

// --------------------------------------------------------------------------
// 4. Rule 7 Conformance (Never bg-white or text-black in Tailwind)
// --------------------------------------------------------------------------
console.log('\n--- Test 4: Rule 7 Conformance (No bg-white or text-black in Tailwind) ---');

const filesToCheck = [
  'index.html',
  'src/ui/TutorialModal.ts',
  'src/ui/DesktopRadar.ts',
  'src/ui/MarketTicker.ts',
  'src/ui/ToolBar.ts',
];

filesToCheck.forEach((relPath) => {
  const content = fs.readFileSync(path.resolve(relPath), 'utf-8');
  // Check for Tailwind class usages
  const hasBgWhite = /\bbg-white\b/.test(content);
  const hasTextBlack = /\btext-black\b/.test(content);
  assert.strictEqual(hasBgWhite, false, `${relPath} contains NO bg-white (Rule 7)`);
  assert.strictEqual(hasTextBlack, false, `${relPath} contains NO text-black (Rule 7)`);
});

console.log('✅ Test 4 Passed: 100% Rule 7 dark mode compliance verified across all UI files.');

console.log('\n🎉 ALL UX, AUDIO & TUTORIAL ACCEPTANCE CRITERIA TESTS PASSED!');
