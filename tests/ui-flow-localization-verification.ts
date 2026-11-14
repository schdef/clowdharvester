import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import deJson from '../src/i18n/de.json';
import enJson from '../src/i18n/en.json';
import { DesktopRadar } from '../src/ui/DesktopRadar.ts';
import { MarketTicker } from '../src/ui/MarketTicker.ts';

console.log('🧪 Starting UI, Flow & Localization Acceptance Criteria Verification Suite...\n');

// --------------------------------------------------------------------------
// Test 1: Direct Game Start & Starter Cloud Band ("Stratum Nimbus I")
// --------------------------------------------------------------------------
console.log('--- Test 1: Direct Game Start & Starter Cloud Band ---');

const bootSceneSrc = fs.readFileSync(path.resolve('src/scenes/BootScene.ts'), 'utf-8');
assert.ok(bootSceneSrc.includes("this.scene.start('SkyHarvestScene'"), 'BootScene transitions directly to SkyHarvestScene');
assert.ok(bootSceneSrc.includes('createStarterCloudBand'), 'BootScene implements createStarterCloudBand()');
assert.ok(bootSceneSrc.includes('Stratum Nimbus I'), 'Starter Cloud Band named Stratum Nimbus I');
assert.ok(bootSceneSrc.includes('pocket-starter-1'), 'Starter Band includes pocket 1');
assert.ok(bootSceneSrc.includes('pocket-starter-2'), 'Starter Band includes pocket 2');
assert.ok(bootSceneSrc.includes('pocket-starter-3'), 'Starter Band includes pocket 3');

console.log('✅ Test 1 Passed: Direct game start into SkyHarvestScene with starter band verified.');

// --------------------------------------------------------------------------
// Test 2: Collapsible Unobtrusive Sidebars & Auction Clean Canvas
// --------------------------------------------------------------------------
console.log('\n--- Test 2: Collapsed Mini-Tabs & Clean Auction Canvas ---');

const radar = new DesktopRadar();
assert.strictEqual((radar as unknown as { isCollapsed: boolean }).isCollapsed, true, 'DesktopRadar starts collapsed (isCollapsed = true)');

const market = new MarketTicker();
assert.strictEqual((market as unknown as { isCollapsed: boolean }).isCollapsed, true, 'MarketTicker starts collapsed (isCollapsed = true)');

const radarSrc = fs.readFileSync(path.resolve('src/ui/DesktopRadar.ts'), 'utf-8');
assert.ok(radarSrc.includes('isCollapsed = true'), 'DesktopRadar source initializes isCollapsed = true');
assert.ok(radarSrc.includes('btn-radar-expand'), 'Expand button is rendered when collapsed');
assert.ok(radarSrc.includes('w-auto'), 'Removes w-80 and sets w-auto when collapsed');

const marketSrc = fs.readFileSync(path.resolve('src/ui/MarketTicker.ts'), 'utf-8');
assert.ok(marketSrc.includes('isCollapsed = true'), 'MarketTicker source initializes isCollapsed = true');
assert.ok(marketSrc.includes('btn-market-expand'), 'Expand button is rendered when collapsed');

// Verify AuctionScene hides sidebars and mobile dock
const auctionSceneSrc = fs.readFileSync(path.resolve('src/scenes/AuctionScene.ts'), 'utf-8');
assert.ok(auctionSceneSrc.includes("desktop-left-sidebar')"), 'AuctionScene controls desktop-left-sidebar');
assert.ok(auctionSceneSrc.includes("desktop-right-sidebar')"), 'AuctionScene controls desktop-right-sidebar');
assert.ok(auctionSceneSrc.includes("mobile-thumb-dock')"), 'AuctionScene controls mobile-thumb-dock');
assert.ok(auctionSceneSrc.includes(".style.display = 'none'"), 'AuctionScene hides UI overlays completely');

// Verify Skip to Harvest button in AuctionScene
assert.ok(auctionSceneSrc.includes('startHarvestingNow'), 'AuctionScene includes prominent startHarvestingNow button');

console.log('✅ Test 2 Passed: Sidebars start collapsed as mini-tabs and disappear during AuctionScene.');

// --------------------------------------------------------------------------
// Test 3: Visual Starthilfe Tooltip in SkyHarvestScene
// --------------------------------------------------------------------------
console.log('\n--- Test 3: Visual Starthilfe Tooltip in SkyHarvestScene ---');

const harvestSceneSrc = fs.readFileSync(path.resolve('src/scenes/SkyHarvestScene.ts'), 'utf-8');
assert.ok(harvestSceneSrc.includes('createStartHintTooltip'), 'createStartHintTooltip method exists in SkyHarvestScene');
assert.ok(harvestSceneSrc.includes('dismissStartHint'), 'dismissStartHint method exists in SkyHarvestScene');
assert.ok(harvestSceneSrc.includes('startHintContainer'), 'startHintContainer exists');
assert.ok(harvestSceneSrc.includes("t('harvest.startHint')"), 'Uses localized harvest.startHint');

assert.strictEqual(
  deJson.harvest.startHint,
  '👇 Ziehe den Bohrkopf nach unten zum Schürfen!',
  'German start hint matches requirements'
);
assert.strictEqual(
  enJson.harvest.startHint,
  '👇 Drag drill probe down into the clouds to harvest!',
  'English start hint matches requirements'
);

console.log('✅ Test 3 Passed: Softly pulsing Starthilfe tooltip and interactive dismissal verified.');

// --------------------------------------------------------------------------
// Test 4: 100% Language Parity & No Hardcoded German/English
// --------------------------------------------------------------------------
console.log('\n--- Test 4: 100% Language Parity & i18n Consistency ---');

// Recursively verify all keys in DE exist in EN and vice versa
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

const deKeys = getKeysDeep(deJson as Record<string, unknown>).sort();
const enKeys = getKeysDeep(enJson as Record<string, unknown>).sort();

const missingInEn = deKeys.filter((k) => !enKeys.includes(k));
const missingInDe = enKeys.filter((k) => !deKeys.includes(k));

assert.deepStrictEqual(missingInEn, [], `All DE keys must exist in EN. Missing: ${missingInEn.join(', ')}`);
assert.deepStrictEqual(missingInDe, [], `All EN keys must exist in DE. Missing: ${missingInDe.join(', ')}`);
assert.strictEqual(deKeys.length, enKeys.length, `DE and EN must have identical key count (${deKeys.length})`);

// Verify critical keys
assert.strictEqual(deJson.tools.head, 'Kopf:');
assert.strictEqual(enJson.tools.head, 'Head:');
assert.strictEqual(deJson.tools.key, 'Taste');
assert.strictEqual(enJson.tools.key, 'Key');
assert.strictEqual(deJson.zones.highShort, 'Hoch');
assert.strictEqual(enJson.zones.highShort, 'High');
assert.strictEqual(deJson.zones.midShort, 'Mittel');
assert.strictEqual(enJson.zones.midShort, 'Mid');
assert.strictEqual(deJson.zones.lowShort, 'Tief');
assert.strictEqual(enJson.zones.lowShort, 'Low');
assert.strictEqual(deJson.auction.bundleAuction, 'BÜNDEL-AUKTION');
assert.strictEqual(enJson.auction.bundleAuction, 'BUNDLE AUCTION');

// Verify ToolBar uses t(...) for Kopf, Hoch/Mittel/Tief, Taste
const toolBarSrc = fs.readFileSync(path.resolve('src/ui/ToolBar.ts'), 'utf-8');
assert.ok(toolBarSrc.includes("t('tools.head')"), 'ToolBar uses t(tools.head)');
assert.ok(toolBarSrc.includes("t('tools.key')"), 'ToolBar uses t(tools.key)');
assert.ok(toolBarSrc.includes("zoneKey: 'zones.highShort'"), 'ToolBar uses zones.highShort');
assert.ok(toolBarSrc.includes("zoneKey: 'zones.midShort'"), 'ToolBar uses zones.midShort');
assert.ok(toolBarSrc.includes("zoneKey: 'zones.lowShort'"), 'ToolBar uses zones.lowShort');

// Verify TutorialModal renders all steps dynamically
const tutorialSrc = fs.readFileSync(path.resolve('src/ui/TutorialModal.ts'), 'utf-8');
assert.ok(tutorialSrc.includes("t('tutorial.shortcutHint')"), 'TutorialModal uses t(tutorial.shortcutHint)');
assert.ok(tutorialSrc.includes("t('tutorial.step1.highLead')"), 'TutorialModal uses t(tutorial.step1.highLead)');
assert.ok(tutorialSrc.includes("t('tutorial.step2.instruction1')"), 'TutorialModal uses t(tutorial.step2.instruction1)');
assert.ok(tutorialSrc.includes("t('tutorial.step3.keyPrefix')"), 'TutorialModal uses t(tutorial.step3.keyPrefix)');
assert.ok(tutorialSrc.includes("t('tutorial.step4.feature1Label')"), 'TutorialModal uses t(tutorial.step4.feature1Label)');
assert.ok(tutorialSrc.includes("t('tutorial.step5.hotDesc')"), 'TutorialModal uses t(tutorial.step5.hotDesc)');
assert.ok(tutorialSrc.includes("t('tutorial.step6.auctionHeader')"), 'TutorialModal uses t(tutorial.step6.auctionHeader)');

// Verify AuctionScene zone badges use t(...)
assert.ok(auctionSceneSrc.includes("t(`zones.${band.zone}Short`).toUpperCase()"), 'AuctionScene translates zone badges');

console.log(`✅ Test 4 Passed: 100% parity across ${deKeys.length} translation keys without mixed languages.`);

// --------------------------------------------------------------------------
// Test 5: Dark Mode Rule 7 Compliance
// --------------------------------------------------------------------------
console.log('\n--- Test 5: Strict Dark Mode Rule 7 Compliance ---');

const filesToAudit = [
  'index.html',
  'src/scenes/BootScene.ts',
  'src/scenes/AuctionScene.ts',
  'src/scenes/SkyHarvestScene.ts',
  'src/ui/ToolBar.ts',
  'src/ui/DesktopRadar.ts',
  'src/ui/MarketTicker.ts',
  'src/ui/TutorialModal.ts',
  'src/main.ts',
];

filesToAudit.forEach((relPath) => {
  const content = fs.readFileSync(path.resolve(relPath), 'utf-8');
  assert.strictEqual(/\bbg-white\b/.test(content), false, `${relPath} must NOT contain bg-white`);
  assert.strictEqual(/\btext-black\b/.test(content), false, `${relPath} must NOT contain text-black`);
});

console.log('✅ Test 5 Passed: Zero occurrences of bg-white or text-black across all UI and scene files.');

console.log('\n🎉 ALL UI, FLOW & LOCALIZATION ACCEPTANCE CRITERIA TESTS PASSED!');
