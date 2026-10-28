// Run with: node --test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const U = require('../utils.js');

test('escapeHtml neutralises markup', () => {
    assert.equal(U.escapeHtml('<b a="1">&\'</b>'), '&lt;b a=&quot;1&quot;&gt;&amp;&#39;&lt;/b&gt;');
});

test('base64 round-trips UTF-8 and accepts base64url without padding', () => {
    const text = 'héllo привет 👋';
    const b64 = U.utf8ToBase64(text);
    assert.equal(U.base64ToUtf8(b64), text);
    assert.equal(U.base64ToUtf8(U.toBase64Url(b64)), text);
    assert.throws(() => U.base64ToUtf8('abc!'));
});

test('detectTimestamp picks the unit by digit count', () => {
    assert.deepEqual(U.detectTimestamp('1700000000'), { unit: 'seconds', ms: 1700000000000 });
    assert.deepEqual(U.detectTimestamp('1700000000123'), { unit: 'milliseconds', ms: 1700000000123 });
    assert.equal(U.detectTimestamp('1700000000123456').unit, 'microseconds');
    assert.equal(U.detectTimestamp('1700000000123456789').unit, 'nanoseconds');
    assert.equal(U.detectTimestamp('1700000000.5').ms, 1700000000500);
    assert.equal(U.detectTimestamp('abc'), null);
});

test('parseTimeInput handles numbers, ISO strings and ObjectIds', () => {
    assert.equal(U.parseTimeInput(''), null);
    assert.deepEqual(U.parseTimeInput('1700000000'), { kind: 'unix seconds', ms: 1700000000000 });
    assert.deepEqual(U.parseTimeInput('2023-11-14T22:13:20Z'), { kind: 'date string', ms: 1700000000000 });
    assert.deepEqual(U.parseTimeInput('6553f100aaaaaaaaaaaaaaaa'), { kind: 'ObjectId', ms: 1700000000000 });
    assert.equal(U.parseTimeInput('2023-11-14T22:13').kind, 'date string (local time)');
    assert.ok(U.parseTimeInput('nonsense').error);
    assert.ok(U.parseTimeInput('99999999999999.0').error);
});

test('objectId conversions', () => {
    assert.equal(U.objectIdFromMs(1700000000999), '6553f1000000000000000000');
    assert.equal(U.objectIdFromMs(1700000000000, 'ffffffffffffffff'), '6553f100ffffffffffffffff');
    assert.equal(U.objectIdFromMs(-1), null);
    assert.equal(U.objectIdToMs('6553f1000000000000000000'), 1700000000000);
    assert.equal(U.randomHex(16).length, 16);
});

test('formatLocalIso carries a well-formed offset', () => {
    assert.match(U.formatLocalIso(new Date(1700000000000)), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/);
});

test('formatRelative', () => {
    const now = 1700000000000;
    assert.equal(U.formatRelative(now - 3 * 86400000, now), '3 days ago');
    assert.equal(U.formatRelative(now + 2 * 3600000, now), 'in 2 hours');
});

test('decodeJwt reads base64url with non-ASCII claims', () => {
    const header = U.toBase64Url(U.utf8ToBase64(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
    const payload = U.toBase64Url(U.utf8ToBase64(JSON.stringify({ name: 'José Ñandú 👋', exp: 1 })));
    const decoded = U.decodeJwt(`${header}.${payload}.sig`);
    assert.equal(decoded.payload.name, 'José Ñandú 👋');
    assert.ok(U.decodeJwt('a.b').error);
});

test('verifyJwtHmac agrees with a known HS256 token', async () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    assert.deepEqual(await U.verifyJwtHmac(token, 'your-256-bit-secret'), { valid: true });
    assert.deepEqual(await U.verifyJwtHmac(token, 'wrong'), { valid: false });
});

test('hmac SHA-256 matches a known vector', async () => {
    const r = await U.hmac('The quick brown fox jumps over the lazy dog', 'key', 'SHA-256');
    assert.equal(r.hex, 'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8');
});

test('evaluate uses BigInt for integer expressions and floats otherwise', () => {
    assert.deepEqual(U.evaluate('2^64'), { value: 2n ** 64n, exact: true });
    assert.deepEqual(U.evaluate('0xff + 1'), { value: 256n, exact: true });
    assert.deepEqual(U.evaluate('7/2'), { value: 3.5, exact: false });
    assert.deepEqual(U.evaluate('Math.sqrt(16)'), { value: 4, exact: true });
    assert.throws(() => U.evaluate('alert(1)'));
    assert.throws(() => U.evaluate('process.exit()'));
});

test('integerBases', () => {
    assert.deepEqual(U.integerBases(255), { hex: '0xff', binary: '0b11111111', octal: '0o377' });
    assert.equal(U.integerBases(1.5), null);
});

test('uuidV4 shape', () => {
    assert.match(U.uuidV4(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('json helpers', () => {
    assert.deepEqual(U.sortKeysDeep({ b: 1, a: { d: 1, c: [{ z: 1, y: 2 }] } }), { a: { c: [{ y: 2, z: 1 }], d: 1 }, b: 1 });
    assert.ok(U.parseJson('{bad').error);
    assert.deepEqual(U.unescapeJsonString('"{\\"a\\":1}"'), { value: { a: 1 } });
    assert.deepEqual(U.unescapeJsonString('{\\"a\\":1}'), { value: { a: 1 } });
    assert.deepEqual(U.unescapeJsonString('"plain"'), { value: 'plain' });
});

test('textStats', () => {
    assert.deepEqual(U.textStats('héllo wörld\nx'), { bytes: 15, characters: 13, words: 3, lines: 2 });
    assert.deepEqual(U.textStats(''), { bytes: 0, characters: 0, words: 0, lines: 0 });
});

test('stripPatchHeader', () => {
    assert.equal(U.stripPatchHeader('Index: x\n===\n--- a\n+++ b\n@@ -1 +1 @@\n-a\n+b'), '@@ -1 +1 @@\n-a\n+b');
    assert.equal(U.stripPatchHeader('Index: x\n'), '');
    assert.equal(U.stripPatchHeader('@@ -1 +1 @@\n-a\n\\ No newline at end of file\n+b\n'), '@@ -1 +1 @@\n-a\n+b');
});
