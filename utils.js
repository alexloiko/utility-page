// Pure, DOM-free helpers shared by the tools in app.js.
// Also loadable in Node (see test/utils.test.js), so keep it free of browser-only APIs
// except TextEncoder/TextDecoder/atob/btoa/crypto, which Node 20+ provides globally.
const Utils = (() => {
    const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));

    // ---------- Base64 (UTF-8 safe, base64url tolerant) ----------
    const bytesToBase64 = (bytes) => {
        let bin = '';
        for (const b of bytes) bin += String.fromCharCode(b);
        return btoa(bin);
    };

    const base64ToBytes = (input) => {
        let s = String(input).replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
        if (s.length % 4 === 1) throw new Error('Invalid base64 length');
        s += '='.repeat((4 - (s.length % 4)) % 4);
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(s)) throw new Error('Invalid base64 characters');
        const bin = atob(s);
        return Uint8Array.from(bin, (c) => c.charCodeAt(0));
    };

    const toBase64Url = (b64) => b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const utf8ToBase64 = (text) => bytesToBase64(new TextEncoder().encode(text));
    const base64ToUtf8 = (input) => new TextDecoder('utf-8').decode(base64ToBytes(input));

    const bytesToHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

    // ---------- Time ----------
    const MAX_DATE_MS = 8.64e15;

    const pad2 = (n) => String(n).padStart(2, '0');

    // ISO 8601 in the browser's local zone, with the real offset (handles :30 offsets).
    const formatLocalIso = (date) => {
        const offsetMin = -date.getTimezoneOffset();
        const sign = offsetMin >= 0 ? '+' : '-';
        const abs = Math.abs(offsetMin);
        const local = new Date(date.getTime() + offsetMin * 60000).toISOString().slice(0, -1);
        return `${local}${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
    };

    const formatRelative = (ms, nowMs = Date.now()) => {
        const diffSec = Math.round((ms - nowMs) / 1000);
        const abs = Math.abs(diffSec);
        const units = [
            ['year', 31536000], ['month', 2592000], ['day', 86400],
            ['hour', 3600], ['minute', 60], ['second', 1],
        ];
        const [unit, size] = units.find(([, s]) => abs >= s) || ['second', 1];
        const value = Math.round(diffSec / size);
        if (typeof Intl !== 'undefined' && Intl.RelativeTimeFormat) {
            return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(value, unit);
        }
        return `${value} ${unit}s`;
    };

    // Numeric timestamp with unit detection by digit count.
    const detectTimestamp = (raw) => {
        const s = String(raw).trim();
        if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
        const negative = s.startsWith('-');
        const digits = s.replace(/^-/, '').split('.')[0];
        let unit;
        let ms;
        if (s.includes('.') || digits.length <= 10) {
            unit = 'seconds';
            ms = Number(s) * 1000;
        } else if (digits.length <= 13) {
            unit = 'milliseconds';
            ms = Number(s);
        } else if (digits.length <= 16) {
            unit = 'microseconds';
            ms = Number(s) / 1000;
        } else {
            unit = 'nanoseconds';
            ms = Number(s) / 1e6;
        }
        void negative;
        return { unit, ms };
    };

    const isObjectId = (s) => /^[0-9a-f]{24}$/i.test(String(s).trim());

    const objectIdToMs = (objectId) => parseInt(String(objectId).trim().slice(0, 8), 16) * 1000;

    const randomHex = (length) => {
        const bytes = new Uint8Array(Math.ceil(length / 2));
        crypto.getRandomValues(bytes);
        return bytesToHex(bytes).slice(0, length);
    };

    // suffix: 16 hex chars; defaults to zeros (the canonical range-query boundary).
    const objectIdFromMs = (ms, suffix = '0'.repeat(16)) => {
        const seconds = Math.floor(ms / 1000);
        if (!Number.isFinite(seconds) || seconds < 0 || seconds > 0xffffffff) return null;
        return seconds.toString(16).padStart(8, '0') + suffix;
    };

    // Accepts: unix seconds/ms/us/ns, ISO 8601 or anything Date.parse takes, or an ObjectId.
    // Returns { kind, ms } or { error }.
    const parseTimeInput = (raw) => {
        const s = String(raw).trim();
        if (!s) return null;

        const numeric = detectTimestamp(s);
        if (numeric && s.replace(/^-/, '').split('.')[0].length <= 19) {
            if (!Number.isFinite(numeric.ms) || Math.abs(numeric.ms) > MAX_DATE_MS) {
                return { error: `Out of range for a date (read as ${numeric.unit})` };
            }
            return { kind: `unix ${numeric.unit}`, ms: numeric.ms };
        }

        if (isObjectId(s)) {
            return { kind: 'ObjectId', ms: objectIdToMs(s) };
        }

        const parsed = Date.parse(s);
        if (!Number.isNaN(parsed)) {
            const hasZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(s) || /^\d{4}-\d{2}-\d{2}$/.test(s);
            return { kind: hasZone ? 'date string' : 'date string (local time)', ms: parsed };
        }

        return { error: 'Not a timestamp, date string or ObjectId' };
    };

    const describeTime = (ms) => {
        const date = new Date(ms);
        return {
            unixSeconds: Math.floor(ms / 1000),
            unixMillis: Math.round(ms),
            utc: date.toISOString(),
            local: formatLocalIso(date),
            relative: formatRelative(ms),
            objectId: objectIdFromMs(ms),
        };
    };

    // ---------- JWT ----------
    const decodeJwt = (token) => {
        const parts = String(token).trim().split('.');
        if (parts.length !== 3) return { error: 'A JWT has three dot-separated parts' };
        const [headerB64, payloadB64, signatureB64] = parts;
        let header;
        let payload;
        try {
            header = JSON.parse(base64ToUtf8(headerB64));
        } catch (e) {
            return { error: 'Header is not valid base64url JSON' };
        }
        try {
            payload = JSON.parse(base64ToUtf8(payloadB64));
        } catch (e) {
            return { error: 'Payload is not valid base64url JSON' };
        }
        return { header, payload, signatureB64, signingInput: `${headerB64}.${payloadB64}` };
    };

    const HMAC_HASHES = { HS256: 'SHA-256', HS384: 'SHA-384', HS512: 'SHA-512' };

    const hmac = async (text, secret, hash = 'SHA-256') => {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw', encoder.encode(secret), { name: 'HMAC', hash }, false, ['sign'],
        );
        const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(text)));
        const base64 = bytesToBase64(signature);
        return { hex: bytesToHex(signature), base64, base64url: toBase64Url(base64) };
    };

    const verifyJwtHmac = async (token, secret) => {
        const decoded = decodeJwt(token);
        if (decoded.error) return { error: decoded.error };
        const alg = decoded.header && decoded.header.alg;
        const hash = HMAC_HASHES[alg];
        if (!hash) return { error: `Only HS256/HS384/HS512 can be verified here (alg: ${alg || 'none'})` };
        const { base64url } = await hmac(decoded.signingInput, secret, hash);
        return { valid: base64url === toBase64Url(decoded.signatureB64) };
    };

    // ---------- Calculator ----------
    const INTEGER_EXPR = /^[\s()+\-*%^]*((0x[0-9a-f]+|0b[01]+|0o[0-7]+|\d+)[\s()+\-*%^]*)+$/i;

    const evaluate = (expression) => {
        const expr = String(expression).trim().replace(/\^/g, '**');
        if (!/^[\w\s.()+\-*/%,]+$/.test(expr) || /[A-Za-z_$][\w$]*\s*\(/.test(expr.replace(/Math\.\w+/g, ''))) {
            throw new Error('Only numbers, operators, parentheses and Math.* are allowed');
        }
        if (INTEGER_EXPR.test(expr) && !expr.includes('/')) {
            const big = expr.replace(/\b(0x[0-9a-f]+|0b[01]+|0o[0-7]+|\d+)\b/gi, '$&n');
            try {
                const value = new Function(`"use strict"; return (${big});`)();
                if (typeof value === 'bigint') return { value, exact: true };
            } catch (e) {
                // fall through to float evaluation (e.g. negative exponent)
            }
        }
        const value = new Function(`"use strict"; return (${expr});`)();
        if (typeof value !== 'number' || Number.isNaN(value)) throw new Error('Not a number');
        return { value, exact: Number.isSafeInteger(value) };
    };

    const integerBases = (value) => {
        const isInt = typeof value === 'bigint' || Number.isInteger(value);
        if (!isInt) return null;
        const big = BigInt(value);
        const sign = big < 0n ? '-' : '';
        const abs = big < 0n ? -big : big;
        return {
            hex: `${sign}0x${abs.toString(16)}`,
            binary: `${sign}0b${abs.toString(2)}`,
            octal: `${sign}0o${abs.toString(8)}`,
        };
    };

    // ---------- UUID ----------
    const uuidV4 = () => {
        if (crypto.randomUUID) return crypto.randomUUID();
        const b = new Uint8Array(16);
        crypto.getRandomValues(b);
        b[6] = (b[6] & 0x0f) | 0x40;
        b[8] = (b[8] & 0x3f) | 0x80;
        const h = bytesToHex(b);
        return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
    };

    // ---------- JSON ----------
    const sortKeysDeep = (value) => {
        if (Array.isArray(value)) return value.map(sortKeysDeep);
        if (value && typeof value === 'object') {
            return Object.keys(value).sort().reduce((acc, k) => {
                acc[k] = sortKeysDeep(value[k]);
                return acc;
            }, {});
        }
        return value;
    };

    const parseJson = (text) => {
        try {
            return { value: JSON.parse(text) };
        } catch (e) {
            return { error: e.message };
        }
    };

    // Unescape a JSON-encoded string; if the result is itself JSON, parse that too.
    const unescapeJsonString = (text) => {
        const trimmed = String(text).trim();
        const outer = parseJson(trimmed.startsWith('"') ? trimmed : `"${trimmed}"`);
        if (outer.error) return outer;
        if (typeof outer.value !== 'string') return outer;
        const inner = parseJson(outer.value);
        return inner.error ? { value: outer.value } : inner;
    };

    // ---------- Text ----------
    const textStats = (text) => ({
        bytes: new TextEncoder().encode(text).length,
        characters: Array.from(text).length,
        words: text.trim() ? text.trim().split(/\s+/).length : 0,
        lines: text ? text.split(/\r?\n/).length : 0,
    });

    // ---------- Diff ----------
    // Drops the "Index:", "===", "---", "+++" preamble that createPatch adds.
    // Also drops "\ No newline at end of file" markers and the trailing empty line.
    const stripPatchHeader = (patch) => {
        const lines = patch.split('\n');
        const start = lines.findIndex((l) => l.startsWith('@@'));
        return (start === -1 ? [] : lines.slice(start))
            .filter((l) => !l.startsWith('\\ No newline'))
            .join('\n')
            .replace(/\n+$/, '');
    };

    return {
        escapeHtml,
        bytesToBase64, base64ToBytes, toBase64Url, utf8ToBase64, base64ToUtf8, bytesToHex,
        formatLocalIso, formatRelative, detectTimestamp, isObjectId, objectIdToMs, objectIdFromMs,
        randomHex, parseTimeInput, describeTime,
        decodeJwt, hmac, verifyJwtHmac, HMAC_HASHES,
        evaluate, integerBases,
        uuidV4,
        sortKeysDeep, parseJson, unescapeJsonString,
        textStats,
        stripPatchHeader,
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}
