// Tool components. Each component renders into #content, wires its inputs, and may return a
// cleanup function (used by the router when leaving the page). Pure logic lives in utils.js.
const U = Utils;
const $ = (id) => document.getElementById(id);

// ---------- storage ----------
const saveToStorage = (key, value) => localStorage.setItem(key, value);
const getFromStorage = (key) => localStorage.getItem(key);
const clearStorageWithPrefix = (prefix) => {
    Object.keys(localStorage)
        .filter((key) => key.startsWith(`${prefix}/`))
        .forEach((key) => localStorage.removeItem(key));
};

// Wires an input: persists on change, restores on load, and runs the handler for both.
const bindInput = (el, key, handler) => {
    const run = () => {
        saveToStorage(key, el.value);
        handler(el.value);
    };
    el.addEventListener('input', run);
    const saved = getFromStorage(key);
    if (saved !== null && saved !== '') {
        el.value = saved;
        handler(el.value);
    }
};

const bindCheckbox = (el, key, handler) => {
    el.addEventListener('change', () => {
        saveToStorage(key, el.checked ? '1' : '');
        handler();
    });
    if (getFromStorage(key) === '1') el.checked = true;
};

// ---------- markup helpers (all values are escaped here) ----------
const copyButton = () => '<button type="button" class="copy-btn" data-copy title="Copy"><i class="bi bi-clipboard"></i></button>';

// opts: { extra: html of more buttons, note: muted text after the buttons (not copied),
//         copy: false to hide the copy button, cls: extra class for the value }
const row = (label, value, opts = {}) => {
    const { extra = '', note = '', copy = true, cls = '' } = opts;
    const text = value === null || value === undefined ? '' : String(value);
    return `
        <span class="result-label">${U.escapeHtml(label)}</span>
        <span class="result-cell">
            <code class="result-value ${cls}">${U.escapeHtml(text)}</code>
            <span class="result-actions">${text && copy ? copyButton() : ''}${extra}</span>
            ${note ? `<span class="result-note">${U.escapeHtml(note)}</span>` : ''}
        </span>`;
};

const grid = (...rows) => `<div class="result-grid">${rows.join('')}</div>`;

const pre = (text) => {
    const value = text === null || text === undefined ? '' : String(text);
    return `<div class="pre-wrap"><pre class="result-pre">${U.escapeHtml(value)}</pre>${value ? copyButton() : ''}</div>`;
};

const message = (text, cls = 'text-secondary') => `<p class="${cls} mb-0">${U.escapeHtml(text)}</p>`;

const card = (title, body, headerExtra = '') => `
    <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
            <span>${U.escapeHtml(title)}</span>${headerExtra}
        </div>
        <div class="card-body">${body}</div>
    </div>`;

// One delegated handler: a copy button copies the text of the element right before it.
const installCopyHandler = () => {
    $('content').addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-copy]');
        if (!btn) return;
        let text = btn.dataset.copyValue;
        if (text === undefined) {
            const source = btn.closest('.result-actions')
                ? btn.closest('.result-actions').previousElementSibling
                : btn.previousElementSibling;
            text = source ? source.textContent : '';
        }
        const icon = btn.querySelector('i');
        if (!icon.dataset.original) icon.dataset.original = icon.className;
        const spacing = icon.className.includes('me-1') ? ' me-1' : '';
        try {
            await navigator.clipboard.writeText(text);
            icon.className = `bi bi-check-lg text-success${spacing}`;
        } catch (err) {
            icon.className = `bi bi-x-lg text-danger${spacing}`;
        }
        clearTimeout(btn.resetTimer);
        btn.resetTimer = setTimeout(() => { icon.className = icon.dataset.original; }, 1200);
    });
};

// ---------- Time ----------
const TimeComponent = () => {
    const content = $('content');
    let randomSuffix = U.randomHex(16);

    content.innerHTML = `
        ${card('Now', '<div id="now-grid"></div>', '<button type="button" class="btn btn-sm btn-outline-secondary" id="now-refresh" title="Refresh (R)"><i class="bi bi-arrow-clockwise me-1"></i>Refresh</button>')}
        ${card('Convert', `
            <div class="row g-2 mb-2">
                <div class="col-md-8">
                    <input type="text" class="form-control font-monospace" data-autofocus id="time-input" spellcheck="false"
                           placeholder="Unix seconds / millis / micros / nanos, ISO 8601, or ObjectId">
                </div>
                <div class="col-md-4">
                    <input type="datetime-local" class="form-control" id="time-picker" step="1" title="Pick a local date and time">
                </div>
            </div>
            <div id="time-detected" class="form-text mb-3"></div>
            <div id="time-result"></div>
        `)}
    `;

    const renderNow = () => {
        const t = U.describeTime(Date.now());
        $('now-grid').innerHTML = grid(
            row('Unix seconds', t.unixSeconds),
            row('Unix millis', t.unixMillis),
            row('UTC', t.utc),
            row('Local', t.local),
            row('ObjectId', t.objectId),
        );
    };
    renderNow();
    $('now-refresh').addEventListener('click', renderNow);
    // "r" refreshes Now when focus is not in a text field
    const onKey = (e) => {
        if (e.key !== 'r' || e.metaKey || e.ctrlKey || e.altKey) return;
        if (e.target.closest('input, textarea, select')) return;
        renderNow();
    };
    document.addEventListener('keydown', onKey);

    const renderConversion = (raw) => {
        const parsed = U.parseTimeInput(raw);
        const detected = $('time-detected');
        const result = $('time-result');
        if (!parsed) {
            detected.textContent = '';
            result.innerHTML = '';
            $('time-picker').value = '';
            return;
        }
        if (parsed.error) {
            detected.textContent = '';
            result.innerHTML = message(parsed.error);
            return;
        }
        const t = U.describeTime(parsed.ms);
        detected.textContent = `Read as ${parsed.kind}`;
        const regen = '<button type="button" class="copy-btn" id="time-regen" title="New random suffix"><i class="bi bi-arrow-repeat"></i></button>';
        result.innerHTML = grid(
            row('Unix seconds', t.unixSeconds),
            row('Unix millis', t.unixMillis),
            row('UTC', t.utc, { note: t.relative }),
            row('Local', t.local),
            t.objectId
                ? row('ObjectId', t.objectId, { note: 'zero suffix, for range queries' })
                : row('ObjectId', 'out of range (1970–2106)', { copy: false, cls: 'text-secondary' }),
            ...(t.objectId ? [row('ObjectId random', U.objectIdFromMs(parsed.ms, randomSuffix), { extra: regen })] : []),
        );
        syncPicker(parsed.ms);
    };

    // Mirror the parsed value into the date picker (local time, whole seconds). Setting .value
    // programmatically does not fire 'input', so this cannot loop back into the text field.
    const syncPicker = (ms) => {
        const picker = $('time-picker');
        if (document.activeElement === picker) return;
        const local = U.formatLocalIso(new Date(ms)).slice(0, 19);
        picker.value = /^\d{4}-/.test(local) ? local : '';
    };

    const input = $('time-input');
    bindInput(input, '/time/input', renderConversion);

    $('time-picker').addEventListener('input', (e) => {
        if (!e.target.value) return;
        input.value = e.target.value;
        saveToStorage('/time/input', input.value);
        renderConversion(input.value);
    });

    $('time-result').addEventListener('click', (e) => {
        if (!e.target.closest('#time-regen')) return;
        randomSuffix = U.randomHex(16);
        renderConversion(input.value);
    });

    return () => document.removeEventListener('keydown', onKey);
};

// ---------- Base64 ----------
const Base64Component = () => {
    $('content').innerHTML = `
        ${card('Base64 to Text', `
            <textarea class="form-control font-monospace mb-3" data-autofocus id="base64-input" rows="4" spellcheck="false"
                      placeholder="Paste base64 or base64url (padding optional)"></textarea>
            <div id="base64-result"></div>
        `)}
        ${card('Text to Base64', `
            <textarea class="form-control mb-3" id="text-input" rows="4"
                      placeholder="Type or paste text (UTF-8)"></textarea>
            <div id="text-result"></div>
        `)}
    `;

    bindInput($('base64-input'), '/base64/base64input', (value) => {
        const result = $('base64-result');
        if (!value.trim()) { result.innerHTML = ''; return; }
        try {
            result.innerHTML = grid(row('Text', U.base64ToUtf8(value)));
        } catch (err) {
            result.innerHTML = message(`Invalid base64: ${err.message}`);
        }
    });

    bindInput($('text-input'), '/base64/textinput', (value) => {
        const result = $('text-result');
        if (!value) { result.innerHTML = ''; return; }
        const b64 = U.utf8ToBase64(value);
        result.innerHTML = grid(row('Base64', b64), row('Base64url', U.toBase64Url(b64)));
    });
};

// ---------- HMAC ----------
const HmacComponent = () => {
    $('content').innerHTML = card('HMAC', `
        <textarea class="form-control mb-3" data-autofocus id="text-input" rows="4" placeholder="Message"></textarea>
        <div class="row g-2 mb-3">
            <div class="col-md-8">
                <input type="text" class="form-control" id="secret-input" placeholder="Secret key" autocomplete="off">
            </div>
            <div class="col-md-4">
                <select class="form-select" id="hash-select">
                    <option value="SHA-256">SHA-256</option>
                    <option value="SHA-384">SHA-384</option>
                    <option value="SHA-512">SHA-512</option>
                    <option value="SHA-1">SHA-1</option>
                </select>
            </div>
        </div>
        <div id="hmac-result"></div>
    `);

    const textInput = $('text-input');
    const secretInput = $('secret-input');
    const hashSelect = $('hash-select');

    let runId = 0;
    const calculate = async () => {
        const id = ++runId;
        const result = $('hmac-result');
        if (!textInput.value || !secretInput.value) { result.innerHTML = ''; return; }
        try {
            const r = await U.hmac(textInput.value, secretInput.value, hashSelect.value);
            if (id !== runId) return; // a newer keystroke superseded this one
            result.innerHTML = grid(row('Hex', r.hex), row('Base64', r.base64), row('Base64url', r.base64url));
        } catch (err) {
            result.innerHTML = message('Error calculating HMAC');
        }
    };

    bindInput(textInput, '/hmac/text', calculate);
    bindInput(secretInput, '/hmac/secret', calculate);
    bindInput(hashSelect, '/hmac/hash', calculate);
};

// ---------- JSON ----------
const JsonComponent = () => {
    $('content').innerHTML = `
        ${card('Format JSON', `
            <textarea class="form-control font-monospace mb-2" data-autofocus id="json-input" rows="6" spellcheck="false"
                      placeholder="Paste JSON"></textarea>
            <div class="form-check mb-3">
                <input class="form-check-input" type="checkbox" id="json-sort">
                <label class="form-check-label" for="json-sort">Sort keys</label>
            </div>
            <div id="json-result"></div>
        `)}
        ${card('Unescape JSON string', `
            <textarea class="form-control font-monospace mb-3" id="escaped-input" rows="4" spellcheck="false"
                      placeholder='Paste an escaped string, e.g. {\\"a\\":1} or "{\\"a\\":1}"'></textarea>
            <div id="escaped-result"></div>
        `)}
        ${card('Escape to JSON string', `
            <textarea class="form-control font-monospace mb-3" id="raw-input" rows="4" spellcheck="false"
                      placeholder="Text to embed as a JSON string value"></textarea>
            <div id="raw-result"></div>
        `)}
    `;

    const jsonInput = $('json-input');
    const sortCheckbox = $('json-sort');

    const renderJson = () => {
        const result = $('json-result');
        const text = jsonInput.value.trim();
        if (!text) { result.innerHTML = ''; return; }
        const parsed = U.parseJson(text);
        if (parsed.error) { result.innerHTML = message(parsed.error, 'text-danger'); return; }
        const value = sortCheckbox.checked ? U.sortKeysDeep(parsed.value) : parsed.value;
        result.innerHTML = `
            ${pre(JSON.stringify(value, null, 2))}
            <div class="mt-3">${grid(row('Minified', JSON.stringify(value)))}</div>`;
    };

    bindCheckbox(sortCheckbox, '/json/sort', renderJson);
    bindInput(jsonInput, '/json/jsoninput', renderJson);

    bindInput($('escaped-input'), '/json/escapedinput', (value) => {
        const result = $('escaped-result');
        if (!value.trim()) { result.innerHTML = ''; return; }
        const r = U.unescapeJsonString(value);
        if (r.error) { result.innerHTML = message(r.error, 'text-danger'); return; }
        result.innerHTML = pre(typeof r.value === 'string' ? r.value : JSON.stringify(r.value, null, 2));
    });

    bindInput($('raw-input'), '/json/rawinput', (value) => {
        $('raw-result').innerHTML = value ? grid(row('Escaped', JSON.stringify(value))) : '';
    });
};

// ---------- Diff ----------
const DiffComponent = () => {
    $('content').innerHTML = card('Text Diff', `
        <div class="row g-2">
            <div class="col-md-6">
                <textarea class="form-control font-monospace" data-autofocus id="text1-input" rows="10" spellcheck="false" placeholder="Original"></textarea>
            </div>
            <div class="col-md-6">
                <textarea class="form-control font-monospace" id="text2-input" rows="10" spellcheck="false" placeholder="Modified"></textarea>
            </div>
        </div>
        <div id="diff-result" class="mt-3"></div>
    `);

    const text1 = $('text1-input');
    const text2 = $('text2-input');

    const render = () => {
        const result = $('diff-result');
        if (!text1.value && !text2.value) { result.innerHTML = ''; return; }
        const withNewline = (t) => (t.endsWith('\n') ? t : `${t}\n`);
        const patch = U.stripPatchHeader(Diff.createPatch('diff', withNewline(text1.value), withNewline(text2.value), 'Original', 'Modified'));
        if (!patch) { result.innerHTML = message('No differences'); return; }
        const html = patch.split('\n').map((line) => {
            const safe = U.escapeHtml(line);
            if (line.startsWith('+')) return `<span class="diff-add">${safe}</span>`;
            if (line.startsWith('-')) return `<span class="diff-del">${safe}</span>`;
            if (line.startsWith('@')) return `<span class="diff-hunk">${safe}</span>`;
            return safe;
        }).join('\n');
        result.innerHTML = `<pre class="result-pre">${html}</pre>`;
    };

    bindInput(text1, '/diff/text1', render);
    bindInput(text2, '/diff/text2', render);
};

// ---------- URL ----------
const UrlComponent = () => {
    $('content').innerHTML = `
        ${card('URL Encode', `
            <textarea class="form-control mb-3" data-autofocus id="text-input" rows="4" placeholder="Text or URL to encode"></textarea>
            <div id="encode-result"></div>
        `)}
        ${card('URL Decode', `
            <textarea class="form-control font-monospace mb-3" id="encoded-input" rows="4" spellcheck="false" placeholder="Percent-encoded text"></textarea>
            <div id="decode-result"></div>
        `)}
    `;

    bindInput($('text-input'), '/url/text', (value) => {
        $('encode-result').innerHTML = value ? grid(
            row('Component', encodeURIComponent(value)),
            row('Full URI', encodeURI(value)),
        ) : '';
    });

    bindInput($('encoded-input'), '/url/encoded', (value) => {
        const result = $('decode-result');
        if (!value) { result.innerHTML = ''; return; }
        try {
            result.innerHTML = grid(row('Decoded', decodeURIComponent(value)));
        } catch (err) {
            result.innerHTML = message('Invalid percent-encoding');
        }
    });
};

// ---------- Text ----------
const TextComponent = () => {
    $('content').innerHTML = card('Text Statistics', `
        <textarea class="form-control mb-3" data-autofocus id="text-input" rows="10" placeholder="Type or paste text"></textarea>
        <div id="text-result"></div>
    `);

    const render = (value) => {
        const s = U.textStats(value);
        $('text-result').innerHTML = grid(
            row('Bytes (UTF-8)', s.bytes),
            row('Characters', s.characters),
            row('Words', s.words),
            row('Lines', s.lines),
        );
    };
    render('');
    bindInput($('text-input'), '/text/input', render);
};

// ---------- UUID ----------
const UuidComponent = () => {
    $('content').innerHTML = card('UUID v4', `
        <div class="d-flex gap-2 align-items-center mb-3">
            <label for="uuid-count" class="form-label mb-0">Count</label>
            <input type="number" class="form-control" id="uuid-count" value="1" min="1" max="100" style="width: 6rem">
            <button type="button" class="btn btn-outline-secondary" id="uuid-generate">
                <i class="bi bi-arrow-repeat me-1"></i>Generate
            </button>
            <button type="button" class="btn btn-outline-secondary" id="uuid-copy-all" data-copy title="Copy all, one per line">
                <i class="bi bi-clipboard me-1"></i>Copy all
            </button>
        </div>
        <div id="uuid-result"></div>
    `);

    const countInput = $('uuid-count');
    const generate = () => {
        const count = Math.min(100, Math.max(1, parseInt(countInput.value, 10) || 1));
        countInput.value = count;
        saveToStorage('/uuid/count', count);
        const uuids = Array.from({ length: count }, U.uuidV4);
        $('uuid-result').innerHTML = grid(...uuids.map((id, i) => row(`#${i + 1}`, id)));
        const copyAll = $('uuid-copy-all');
        copyAll.dataset.copyValue = uuids.join('\n');
        copyAll.style.display = count > 1 ? '' : 'none';
    };

    countInput.value = getFromStorage('/uuid/count') || '1';
    $('uuid-generate').addEventListener('click', generate);
    countInput.addEventListener('change', generate);
    generate();
};

// ---------- Calculator ----------
const CalculatorComponent = () => {
    $('content').innerHTML = card('Calculator', `
        <input type="text" class="form-control font-monospace mb-1" data-autofocus id="calc-input" spellcheck="false"
               placeholder="e.g. 2^64 - 1, 0xff * 3, Math.sqrt(2)">
        <div class="form-text mb-3">Integer expressions are exact (BigInt). Use / to get a float.</div>
        <div id="calc-result"></div>
    `);

    bindInput($('calc-input'), '/calc/input', (value) => {
        const result = $('calc-result');
        if (!value.trim()) { result.innerHTML = ''; return; }
        try {
            const r = U.evaluate(value);
            const bases = U.integerBases(r.value);
            result.innerHTML = grid(
                row(r.exact ? 'Result' : 'Result (float)', r.value.toString()),
                ...(bases ? [row('Hex', bases.hex), row('Binary', bases.binary), row('Octal', bases.octal)] : []),
            );
        } catch (err) {
            result.innerHTML = message(`Invalid expression: ${err.message}`);
        }
    });
};

// ---------- JWT ----------
const JwtComponent = () => {
    $('content').innerHTML = card('JWT', `
        <textarea class="form-control font-monospace mb-3" data-autofocus id="jwt-input" rows="3" spellcheck="false" placeholder="Paste JWT"></textarea>
        <div id="jwt-result"></div>
        <div id="jwt-verify" class="mt-3" style="display: none;">
            <h6>Verify HMAC signature</h6>
            <input type="text" class="form-control mb-2" id="secret-input" placeholder="Secret key" autocomplete="off">
            <div id="verify-result"></div>
        </div>
    `);

    const jwtInput = $('jwt-input');
    const secretInput = $('secret-input');
    const verifySection = $('jwt-verify');

    const claimRow = (label, seconds) => (typeof seconds === 'number'
        ? row(label, new Date(seconds * 1000).toISOString(), { note: U.formatRelative(seconds * 1000) })
        : row(label, 'not set', { copy: false, cls: 'text-secondary fw-normal' }));

    const renderVerify = async () => {
        const result = $('verify-result');
        if (!secretInput.value || !jwtInput.value.trim()) { result.innerHTML = ''; return; }
        const r = await U.verifyJwtHmac(jwtInput.value, secretInput.value);
        if (r.error) { result.innerHTML = message(r.error); return; }
        result.innerHTML = message(r.valid ? 'Signature valid' : 'Signature does not match', r.valid ? 'text-success fw-bold' : 'text-danger fw-bold');
    };

    const render = (value) => {
        const result = $('jwt-result');
        const token = value.trim();
        if (!token) { result.innerHTML = ''; verifySection.style.display = 'none'; return; }
        const d = U.decodeJwt(token);
        if (d.error) { result.innerHTML = message(d.error); verifySection.style.display = 'none'; return; }

        const now = Date.now() / 1000;
        const p = d.payload || {};
        let status = 'no expiration claim';
        let statusCls = 'text-secondary';
        if (typeof p.exp === 'number') {
            if (p.exp < now) { status = 'expired'; statusCls = 'text-danger'; } else { status = 'not expired'; statusCls = 'text-success'; }
        }
        if (typeof p.nbf === 'number' && p.nbf > now) { status = 'not yet valid (nbf in the future)'; statusCls = 'text-warning'; }

        result.innerHTML = `
            <h6>Header</h6>${pre(JSON.stringify(d.header, null, 2))}
            <h6 class="mt-3">Payload</h6>${pre(JSON.stringify(d.payload, null, 2))}
            <h6 class="mt-3">Claims</h6>
            ${grid(
                row('Status', status, { copy: false, cls: statusCls }),
                row('Algorithm', (d.header && d.header.alg) || 'missing'),
                claimRow('Issued at', p.iat),
                claimRow('Not before', p.nbf),
                claimRow('Expires', p.exp),
            )}`;

        const alg = d.header && d.header.alg;
        verifySection.style.display = U.HMAC_HASHES[alg] ? 'block' : 'none';
        renderVerify();
    };

    bindInput(jwtInput, '/jwt/token', render);
    secretInput.addEventListener('input', renderVerify);
};

// ---------- routes ----------
const routes = [
    { path: '/time', component: TimeComponent, default: true },
    { path: '/base64', component: Base64Component },
    { path: '/calc', component: CalculatorComponent },
    { path: '/diff', component: DiffComponent },
    { path: '/hmac', component: HmacComponent },
    { path: '/json', component: JsonComponent },
    { path: '/jwt', component: JwtComponent },
    { path: '/text', component: TextComponent },
    { path: '/url', component: UrlComponent },
    { path: '/uuid', component: UuidComponent },
    // old bookmarks
    { path: '/millis', redirect: '/time' },
    { path: '/objectid', redirect: '/time' },
];

installCopyHandler();
const router = new Router(routes);

$('clean-button').addEventListener('click', () => {
    if (!router.currentRoute) return;
    clearStorageWithPrefix(router.currentRoute.path);
    router.reload();
});
