// Faction detection tests against the live ES modules in src/js/.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { detectFactionFromText } from '../src/js/detect.js';

const fixture = fs.readFileSync(new URL('./fixtures/skaven-bcp.txt', import.meta.url), 'utf8');

test('detects skaven from the BCP fixture', () => {
  assert.equal(detectFactionFromText(fixture), 'skaven');
});

test('detects wood-elf-realms from an explicit header', () => {
  assert.equal(detectFactionFromText('Wood Elves\n\n100 - Glade Guard'), 'wood-elf-realms');
});

test('returns null for unrelated text', () => {
  assert.equal(detectFactionFromText('completely unrelated text'), null);
});
