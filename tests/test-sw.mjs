// sw.js (13.6, F7): önbellek listesi uygulamanın gerçek dosyalarıyla uyumlu mu?
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const surum = /const SURUM = '([\d.]+)'/.exec(sw)[1];
assert.equal(surum, /APP_VERSION = '([\d.]+)'/.exec(fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'))[1] || surum, 'sw sürümü uygulama sürümüyle aynı');
const moduller = JSON.parse(/const MODULLER = (\[[^\]]+\])/.exec(sw)[1].replace(/'/g, '"'));
// Tüm .js modüllerinin içe aktardığı dosyalar listede olmalı
const ithal = new Set();
for (const f of fs.readdirSync(ROOT).filter((x) => x.endsWith('.js') && x !== 'sw.js')) {
  for (const m of fs.readFileSync(path.join(ROOT, f), 'utf8').matchAll(/['(]\.\/([a-z]+\.js)\?v=([\d.]+)/g)) {
    ithal.add(m[1]);
    assert.equal(m[2], surum, `${f} → ${m[1]} sürümü`);
  }
}
for (const m of ithal) assert.ok(moduller.includes(m), `sw.js MODULLER'de yok: ${m}`);
assert.ok(moduller.includes('app.js'));
for (const m of moduller) assert.ok(fs.existsSync(path.join(ROOT, m)), `dosya yok: ${m}`);
// Sabit dosyalar gerçekten var
for (const m of sw.matchAll(/'((?:img|fonts|icons)\/[^']+)'/g)) assert.ok(fs.existsSync(path.join(ROOT, m[1])), `dosya yok: ${m[1]}`);
for (const f of fs.readdirSync(path.join(ROOT, 'img/kas'))) assert.ok(sw.includes(`img/kas/${f}`), `kas görseli listede yok: ${f}`);
assert.ok(!/script\.google/.test(sw.replace(/\/\/.*$/gm, '')), 'tablo istekleri önbelleğe alınmaz');
assert.match(app, /register\('sw\.js'\)/);
console.log('sw.js testleri: TAMAM');
