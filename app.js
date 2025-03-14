// Add storage helper functions at the top
const saveToStorage = (key, value) => {
    localStorage.setItem(key, value);
};

const getFromStorage = (key) => {
    return localStorage.getItem(key);
};

const clearCurrentPageStorage = () => {
    const hash = window.location.hash.slice(1) || '/millis';
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.startsWith(hash)) {
            localStorage.removeItem(key);
        }
    });
};

// Utility components
const TimestampComponent = () => {
    const content = document.getElementById('content');
    
    const now = new Date();
    const currentMillis = now.getTime();
    
    // Format local time with timezone offset
    const localISOTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000))
        .toISOString()
        .slice(0, -1) + 
        (now.getTimezoneOffset() > 0 ? '-' : '+') +
        Math.abs(now.getTimezoneOffset() / 60)
            .toString()
            .padStart(2, '0') +
        ':' +
        (Math.abs(now.getTimezoneOffset() % 60))
            .toString()
            .padStart(2, '0');
    
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                Current Time
            </div>
            <div class="card-body">
                <div style="display: grid; grid-template-columns: 120px auto; gap: 10px;">
                    <span>Unix:</span> <span class="fw-bold">${currentMillis}</span>
                    <span>UTC:</span> <span class="fw-bold">${now.toISOString()}</span>
                    <span>Local ISO:</span> <span class="fw-bold">${localISOTime}</span>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                Timestamp to Date
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <input type="number" class="form-control" id="timestamp-input" 
                           placeholder="Enter Unix timestamp (milliseconds)">
                </div>
                <div id="timestamp-result" class="mt-3"></div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                Date to Timestamp
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <input type="datetime-local" class="form-control" id="datetime-input" step="0.001">
                </div>
                <div id="datetime-result" class="mt-3"></div>
            </div>
        </div>
    `;

    // Restore values from storage
    const timestampInput = document.getElementById('timestamp-input');
    const datetimeInput = document.getElementById('datetime-input');
    
    // First add event listeners
    timestampInput.addEventListener('input', (e) => {
        saveToStorage('/millis/timestamp', e.target.value);
        const timestamp = e.target.value;
        const date = new Date(Number(timestamp));
        const result = document.getElementById('timestamp-result');
        
        if (isNaN(date.getTime())) {
            result.innerHTML = '<p class="text-secondary">Invalid timestamp</p>';
            return;
        }
        
        result.innerHTML = `
            <div style="display: grid; grid-template-columns: 120px auto; gap: 10px;">
                <span>UTC:</span> <span class="fw-bold">${date.toISOString()}</span>
                <span>Local ISO:</span> <span class="fw-bold">${formatWithTimezone(date)}</span>
            </div>
        `;
    });

    datetimeInput.addEventListener('input', (e) => {
        saveToStorage('/millis/datetime', e.target.value);
        const datetime = e.target.value;
        const date = new Date(datetime);
        const result = document.getElementById('datetime-result');
        
        if (isNaN(date.getTime())) {
            result.innerHTML = '<p class="text-secondary">Invalid date</p>';
            return;
        }
        
        result.innerHTML = `
            <div style="display: grid; grid-template-columns: 120px auto; gap: 10px;">
                <span>Unix:</span> <span class="fw-bold">${date.getTime()}</span>
            </div>
        `;
    });

    // Then restore values and trigger events
    timestampInput.value = getFromStorage('/millis/timestamp') || '';
    datetimeInput.value = getFromStorage('/millis/datetime') || '';

    if (timestampInput.value) timestampInput.dispatchEvent(new Event('input'));
    if (datetimeInput.value) datetimeInput.dispatchEvent(new Event('input'));
    
    // Helper function to format date with timezone
    const formatWithTimezone = (date) => {
        return new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
            .toISOString()
            .slice(0, -1) + 
            (date.getTimezoneOffset() > 0 ? '-' : '+') +
            Math.abs(date.getTimezoneOffset() / 60)
                .toString()
                .padStart(2, '0') +
            ':' +
            (Math.abs(date.getTimezoneOffset() % 60))
                .toString()
                .padStart(2, '0');
    };
};

const Base64Component = () => {
    const content = document.getElementById('content');
    
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                Base64 to Text
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <textarea class="form-control" id="base64-input" 
                             placeholder="Paste base64 string"></textarea>
                </div>
                <div id="base64-result" class="mt-3">
                    <div style="display: grid; grid-template-columns: 120px auto; gap: 10px;">
                        <span>Text:</span> <span class="fw-bold"></span>
                    </div>
                </div>
            </div>
        </div>

        <div class="card mt-3">
            <div class="card-header">
                Text to Base64
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <textarea class="form-control" id="text-input" 
                             placeholder="Type or paste text"></textarea>
                </div>
                <div id="text-result" class="mt-3">
                    <div style="display: grid; grid-template-columns: 120px auto; gap: 10px;">
                        <span>Base64:</span> <span class="fw-bold"></span>
                    </div>
                </div>
            </div>
        </div>
    `;

    const base64Input = document.getElementById('base64-input');
    const textInput = document.getElementById('text-input');
    
    // First add event listeners
    base64Input.addEventListener('input', (e) => {
        saveToStorage('/base64/base64input', e.target.value);
        const base64 = e.target.value.trim();
        const result = document.getElementById('base64-result');
        
        try {
            const text = atob(base64);
            result.innerHTML = `
                <div style="display: grid; grid-template-columns: 120px auto; gap: 10px;">
                    <span>Text:</span> <span class="fw-bold">${text}</span>
                </div>
            `;
        } catch (error) {
            result.innerHTML = '<p class="text-secondary">Invalid base64 string</p>';
        }
    });

    textInput.addEventListener('input', (e) => {
        saveToStorage('/base64/textinput', e.target.value);
        const text = e.target.value;
        const result = document.getElementById('text-result');
        
        try {
            const base64 = btoa(text);
            result.innerHTML = `
                <div style="display: grid; grid-template-columns: 120px auto; gap: 10px;">
                    <span>Base64:</span> <span class="fw-bold">${base64}</span>
                </div>
            `;
        } catch (error) {
            result.innerHTML = '<p class="text-secondary">Invalid text</p>';
        }
    });

    // Then restore values and trigger events
    base64Input.value = getFromStorage('/base64/base64input') || '';
    textInput.value = getFromStorage('/base64/textinput') || '';

    if (base64Input.value) base64Input.dispatchEvent(new Event('input'));
    if (textInput.value) textInput.dispatchEvent(new Event('input'));
};

const HmacComponent = () => {
    const content = document.getElementById('content');
    
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                HMAC SHA512
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <textarea class="form-control" id="text-input" 
                             placeholder="Type or paste text"></textarea>
                </div>
                <div class="mb-3">
                    <input type="text" class="form-control" id="secret-input" 
                           placeholder="Enter secret key">
                </div>
                <div id="hmac-result" class="mt-3">
                    <div style="display: grid; grid-template-columns: 120px auto; gap: 10px;">
                        <span>Signature:</span> <span class="fw-bold"></span>
                    </div>
                </div>
            </div>
        </div>
    `;

    const calculateHmac = async () => {
        const text = document.getElementById('text-input').value;
        const secret = document.getElementById('secret-input').value;
        
        // Add storage save
        saveToStorage('/hmac/text', text);
        saveToStorage('/hmac/secret', secret);
        
        const result = document.getElementById('hmac-result');

        if (!text || !secret) {
            result.innerHTML = `
                <div style="display: grid; grid-template-columns: 120px auto; gap: 10px;">
                    <span>Signature:</span> <span class="fw-bold"></span>
                </div>
            `;
            return;
        }

        try {
            const encoder = new TextEncoder();
            const keyData = encoder.encode(secret);
            const messageData = encoder.encode(text);

            const cryptoKey = await crypto.subtle.importKey(
                'raw',
                keyData,
                { name: 'HMAC', hash: 'SHA-512' },
                false,
                ['sign']
            );

            const signature = await crypto.subtle.sign(
                'HMAC',
                cryptoKey,
                messageData
            );

            const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)));

            result.innerHTML = `
                <div style="display: grid; grid-template-columns: 120px auto; gap: 10px;">
                    <span>Signature:</span> <span class="fw-bold">${base64Signature}</span>
                </div>
            `;
        } catch (error) {
            result.innerHTML = '<p class="text-secondary">Error calculating HMAC</p>';
        }
    };

    const textInput = document.getElementById('text-input');
    const secretInput = document.getElementById('secret-input');
    
    // First add event listeners
    textInput.addEventListener('input', calculateHmac);
    secretInput.addEventListener('input', calculateHmac);

    // Then restore values and trigger event
    textInput.value = getFromStorage('/hmac/text') || '';
    secretInput.value = getFromStorage('/hmac/secret') || '';

    if (textInput.value && secretInput.value) calculateHmac();
};

const JsonComponent = () => {
    const content = document.getElementById('content');
    
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                Format JSON
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <textarea class="form-control" id="json-input" rows="5"
                             placeholder="Paste JSON to format"></textarea>
                </div>
                <div id="json-result" class="mt-3">
                    <div style="display: grid; grid-template-columns: 120px auto; gap: 10px;">
                        <span>Formatted:</span> <span class="fw-bold"><pre style="margin: 0"></pre></span>
                    </div>
                </div>
            </div>
        </div>

        <div class="card mt-3">
            <div class="card-header">
                Unescape JSON String
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <textarea class="form-control" id="escaped-input" rows="5"
                             placeholder="Paste escaped JSON string (e.g. with \\\")"></textarea>
                </div>
                <div id="escaped-result" class="mt-3">
                    <div style="display: grid; grid-template-columns: 120px auto; gap: 10px;">
                        <span>Unescaped:</span> <span class="fw-bold"><pre style="margin: 0"></pre></span>
                    </div>
                </div>
            </div>
        </div>
    `;

    const jsonInput = document.getElementById('json-input');
    const escapedInput = document.getElementById('escaped-input');
    
    // First add event listeners
    jsonInput.addEventListener('input', (e) => {
        saveToStorage('/json/jsoninput', e.target.value);
        const text = e.target.value.trim();
        const result = document.getElementById('json-result').querySelector('pre');
        
        try {
            const formatted = JSON.stringify(JSON.parse(text), null, 2);
            result.textContent = formatted;
        } catch (error) {
            result.textContent = '';
        }
    });

    escapedInput.addEventListener('input', (e) => {
        saveToStorage('/json/escapedinput', e.target.value);
        const text = e.target.value.trim();
        const result = document.getElementById('escaped-result').querySelector('pre');
        
        try {
            // First try to parse as JSON
            let unescaped = JSON.parse(text);
            
            // If it's a string, try to parse it as JSON again
            if (typeof unescaped === 'string') {
                try {
                    unescaped = JSON.parse(unescaped);
                } catch (e) {
                    // If it fails, keep the string version
                }
            }
            
            result.textContent = JSON.stringify(unescaped, null, 2);
        } catch (error) {
            result.textContent = '';
        }
    });

    // Then restore values and trigger events
    jsonInput.value = getFromStorage('/json/jsoninput') || '';
    escapedInput.value = getFromStorage('/json/escapedinput') || '';

    if (jsonInput.value) jsonInput.dispatchEvent(new Event('input'));
    if (escapedInput.value) escapedInput.dispatchEvent(new Event('input'));
};

const DiffComponent = () => {
    const content = document.getElementById('content');
    
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                Text Diff
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <textarea class="form-control" id="text1-input" rows="10"
                                 placeholder="First text"></textarea>
                    </div>
                    <div class="col-md-6">
                        <textarea class="form-control" id="text2-input" rows="10"
                                 placeholder="Second text"></textarea>
                    </div>
                </div>
                <div id="diff-result" class="mt-3">
                    <pre style="margin: 0; white-space: pre-wrap;"></pre>
                </div>
            </div>
        </div>
    `;

    const calculateDiff = () => {
        const text1 = document.getElementById('text1-input').value;
        const text2 = document.getElementById('text2-input').value;
        
        // Add storage save
        saveToStorage('/diff/text1', text1);
        saveToStorage('/diff/text2', text2);
        
        const result = document.getElementById('diff-result').querySelector('pre');

        const diff = Diff.createPatch('diff',
            text1,
            text2,
            'Original',
            'Modified'
        );

        // Style the diff output
        const coloredDiff = diff.split('\n').map(line => {
            if (line.startsWith('+')) {
                return `<span style="color: green; background-color: #e6ffe6">${line}</span>`;
            } else if (line.startsWith('-')) {
                return `<span style="color: red; background-color: #ffe6e6">${line}</span>`;
            } else if (line.startsWith('@')) {
                return `<span style="color: purple">${line}</span>`;
            }
            return line;
        }).join('\n');

        result.innerHTML = coloredDiff;
    };

    const text1Input = document.getElementById('text1-input');
    const text2Input = document.getElementById('text2-input');
    
    // First add event listeners
    text1Input.addEventListener('input', calculateDiff);
    text2Input.addEventListener('input', calculateDiff);

    // Then restore values and trigger event
    text1Input.value = getFromStorage('/diff/text1') || '';
    text2Input.value = getFromStorage('/diff/text2') || '';

    if (text1Input.value || text2Input.value) calculateDiff();
};

const ObjectIdComponent = () => {
    const content = document.getElementById('content');
    
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                ObjectId to Timestamp
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <input type="text" class="form-control" id="objectid-input" 
                           placeholder="Enter ObjectId">
                </div>
                <div id="objectid-result" class="mt-3">
                    <div style="display: grid; grid-template-columns: 120px auto; gap: 10px;">
                        <span>Timestamp:</span> <span class="fw-bold"></span>
                    </div>
                </div>
            </div>
        </div>

        <div class="card mt-3">
            <div class="card-header">
                Timestamp to ObjectId
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <input type="number" class="form-control" id="timestamp-input" 
                           placeholder="Enter Unix timestamp (milliseconds)">
                </div>
                <div id="timestamp-result" class="mt-3">
                    <div style="display: grid; grid-template-columns: 120px auto; gap: 10px;">
                        <span>ObjectId:</span> <span class="fw-bold"></span>
                    </div>
                </div>
            </div>
        </div>
    `;

    const objectIdInput = document.getElementById('objectid-input');
    const timestampInput = document.getElementById('timestamp-input');

    // First add event listeners
    objectIdInput.addEventListener('input', (e) => {
        saveToStorage('/objectid/objectid', e.target.value);
        const objectId = e.target.value.trim();
        const result = document.getElementById('objectid-result');

        if (!/^[0-9a-fA-F]{24}$/.test(objectId)) {
            result.innerHTML = '<p class="text-secondary">Invalid ObjectId</p>';
            return;
        }

        try {
            // Extract timestamp from ObjectId (first 4 bytes)
            const timestamp = parseInt(objectId.substring(0, 8), 16) * 1000;
            const date = new Date(timestamp);

            result.innerHTML = `
                <div style="display: grid; grid-template-columns: 120px auto; gap: 10px;">
                    <span>Unix:</span> <span class="fw-bold">${timestamp}</span>
                    <span>UTC:</span> <span class="fw-bold">${date.toISOString()}</span>
                </div>
            `;
        } catch (error) {
            result.innerHTML = '<p class="text-secondary">Error processing ObjectId</p>';
        }
    });

    timestampInput.addEventListener('input', (e) => {
        saveToStorage('/objectid/timestamp', e.target.value);
        const timestamp = parseInt(e.target.value);
        const result = document.getElementById('timestamp-result');

        if (isNaN(timestamp)) {
            result.innerHTML = '<p class="text-secondary">Invalid timestamp</p>';
            return;
        }

        try {
            // Convert timestamp to hex and pad to 8 characters
            const timestampHex = Math.floor(timestamp / 1000)
                .toString(16)
                .padStart(8, '0');
            
            // Generate random hex for remaining bytes (16 characters)
            const randomHex = Array.from(
                { length: 16 }, 
                () => Math.floor(Math.random() * 16).toString(16)
            ).join('');

            const objectId = timestampHex + randomHex;

            result.innerHTML = `
                <div style="display: grid; grid-template-columns: 120px auto; gap: 10px;">
                    <span>ObjectId:</span> <span class="fw-bold">${objectId}</span>
                </div>
            `;
        } catch (error) {
            result.innerHTML = '<p class="text-secondary">Error generating ObjectId</p>';
        }
    });

    // Then restore values and trigger events
    objectIdInput.value = getFromStorage('/objectid/objectid') || '';
    timestampInput.value = getFromStorage('/objectid/timestamp') || '';

    if (objectIdInput.value) objectIdInput.dispatchEvent(new Event('input'));
    if (timestampInput.value) timestampInput.dispatchEvent(new Event('input'));
};

const UrlComponent = () => {
    const content = document.getElementById('content');
    
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                URL Encode
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <textarea class="form-control" id="text-input" rows="5"
                             placeholder="Type or paste text to encode"></textarea>
                </div>
                <div id="encode-result" class="mt-3">
                    <div style="display: grid; grid-template-columns: 120px auto; gap: 10px;">
                        <span>Encoded:</span> <span class="fw-bold"></span>
                    </div>
                </div>
            </div>
        </div>

        <div class="card mt-3">
            <div class="card-header">
                URL Decode
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <textarea class="form-control" id="encoded-input" rows="5"
                             placeholder="Paste URL encoded text"></textarea>
                </div>
                <div id="decode-result" class="mt-3">
                    <div style="display: grid; grid-template-columns: 120px auto; gap: 10px;">
                        <span>Decoded:</span> <span class="fw-bold"></span>
                    </div>
                </div>
            </div>
        </div>
    `;

    const textInput = document.getElementById('text-input');
    const encodedInput = document.getElementById('encoded-input');

    // First add event listeners
    textInput.addEventListener('input', (e) => {
        saveToStorage('/url/text', e.target.value);
        const text = e.target.value;
        const result = document.getElementById('encode-result');
        
        try {
            const encoded = encodeURIComponent(text);
            result.innerHTML = `
                <div style="display: grid; grid-template-columns: 120px auto; gap: 10px;">
                    <span>Encoded:</span> <span class="fw-bold">${encoded}</span>
                </div>
            `;
        } catch (error) {
            result.innerHTML = '<p class="text-secondary">Error encoding text</p>';
        }
    });

    encodedInput.addEventListener('input', (e) => {
        saveToStorage('/url/encoded', e.target.value);
        const encoded = e.target.value;
        const result = document.getElementById('decode-result');
        
        try {
            const decoded = decodeURIComponent(encoded);
            result.innerHTML = `
                <div style="display: grid; grid-template-columns: 120px auto; gap: 10px;">
                    <span>Decoded:</span> <span class="fw-bold">${decoded}</span>
                </div>
            `;
        } catch (error) {
            result.innerHTML = '<p class="text-secondary">Invalid URL encoded text</p>';
        }
    });

    // Then restore values and trigger events
    textInput.value = getFromStorage('/url/text') || '';
    encodedInput.value = getFromStorage('/url/encoded') || '';

    if (textInput.value) textInput.dispatchEvent(new Event('input'));
    if (encodedInput.value) encodedInput.dispatchEvent(new Event('input'));
};

const TextComponent = () => {
    const content = document.getElementById('content');
    
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                Text Statistics
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <textarea class="form-control" id="text-input" rows="10"
                             placeholder="Type or paste text to analyze"></textarea>
                </div>
                <div id="text-result" class="mt-3">
                    <div style="display: grid; grid-template-columns: 120px auto; gap: 10px;">
                        <span>Bytes:</span> <span class="fw-bold">0</span>
                        <span>Symbols:</span> <span class="fw-bold">0</span>
                        <span>Words:</span> <span class="fw-bold">0</span>
                        <span>Lines:</span> <span class="fw-bold">0</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    const textInput = document.getElementById('text-input');

    // First add event listener
    textInput.addEventListener('input', (e) => {
        saveToStorage('/text/input', e.target.value);
        const text = e.target.value;
        const result = document.getElementById('text-result');
        
        // Calculate statistics
        const bytes = new TextEncoder().encode(text).length;
        const symbols = text.length;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const lines = text.trim() ? text.trim().split(/\n/).length : 0;

        result.innerHTML = `
            <div style="display: grid; grid-template-columns: 120px auto; gap: 10px;">
                <span>Bytes:</span> <span class="fw-bold">${bytes}</span>
                <span>Symbols:</span> <span class="fw-bold">${symbols}</span>
                <span>Words:</span> <span class="fw-bold">${words}</span>
                <span>Lines:</span> <span class="fw-bold">${lines}</span>
            </div>
        `;
    });

    // Then restore value and trigger event
    textInput.value = getFromStorage('/text/input') || '';
    if (textInput.value) textInput.dispatchEvent(new Event('input'));
};

const UuidComponent = () => {
    const content = document.getElementById('content');
    
    const generateUuid = () => {
        // Get 16 random bytes
        const randomBytes = new Uint8Array(16);
        crypto.getRandomValues(randomBytes);
        
        // Set version (4) and variant (RFC4122) bits
        randomBytes[6] = (randomBytes[6] & 0x0f) | 0x40;  // version 4
        randomBytes[8] = (randomBytes[8] & 0x3f) | 0x80;  // variant RFC4122
        
        // Convert to hex string with proper formatting
        const hex = Array.from(randomBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
            
        return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
    };
    
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="d-flex justify-content-between align-items-center">
                    <span>Generate UUID v4</span>
                    <button class="btn btn-outline-secondary btn-sm" onclick="location.reload()">
                        Generate New
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div style="display: grid; grid-template-columns: 120px auto; gap: 10px;">
                    <span>UUID:</span> <span class="fw-bold">${generateUuid()}</span>
                </div>
            </div>
        </div>
    `;
};

const CalculatorComponent = () => {
    const content = document.getElementById('content');
    
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                Calculator
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <input type="text" class="form-control" id="calc-input">
                </div>
                <div id="calc-result" class="mt-3">
                    <div style="display: grid; grid-template-columns: 120px auto; gap: 10px;">
                        <span>Result:</span> <span class="fw-bold"></span>
                    </div>
                </div>
            </div>
        </div>
    `;

    const calcInput = document.getElementById('calc-input');

    // First add event listener
    calcInput.addEventListener('input', (e) => {
        saveToStorage('/calc/input', e.target.value);
        const expression = e.target.value.trim();
        const result = document.getElementById('calc-result');
        
        if (!expression) {
            result.innerHTML = `
                <div style="display: grid; grid-template-columns: 120px auto; gap: 10px;">
                    <span>Result:</span> <span class="fw-bold"></span>
                </div>
            `;
            return;
        }

        try {
            // Replace ^ with ** for exponentiation
            const sanitizedExpr = expression.replace(/\^/g, '**');
            
            // Evaluate using Function to support big numbers
            const evalResult = new Function('return ' + sanitizedExpr)();
            
            result.innerHTML = `
                <div style="display: grid; grid-template-columns: 120px auto; gap: 10px;">
                    <span>Result:</span> <span class="fw-bold">${evalResult}</span>
                </div>
            `;
        } catch (error) {
            result.innerHTML = '<p class="text-secondary">Invalid expression</p>';
        }
    });

    // Then restore value and trigger event
    calcInput.value = getFromStorage('/calc/input') || '';
    if (calcInput.value) calcInput.dispatchEvent(new Event('input'));
};

const JwtComponent = () => {
    const content = document.getElementById('content');
    
    content.innerHTML = `
        <div class="card">
            <div class="card-header">
                JWT Token Analysis
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <textarea class="form-control" id="jwt-input" rows="3"
                             placeholder="Paste JWT token"></textarea>
                </div>
                <div id="jwt-result" class="mt-3">
                    <div class="mb-4">
                        <h6>Header</h6>
                        <pre id="jwt-header" class="bg-light p-2 rounded" style="margin: 0"></pre>
                    </div>
                    <div class="mb-4">
                        <h6>Payload</h6>
                        <pre id="jwt-payload" class="bg-light p-2 rounded" style="margin: 0"></pre>
                    </div>
                    <div id="jwt-signature" class="mb-4">
                        <h6>Signature Info</h6>
                        <div style="display: grid; grid-template-columns: 120px auto; gap: 10px;">
                            <span>Algorithm:</span> <span class="fw-bold"></span>
                            <span>Expiration:</span> <span class="fw-bold"></span>
                            <span>Valid:</span> <span class="fw-bold"></span>
                        </div>
                    </div>
                    <div id="jwt-verify" class="mb-4" style="display: none;">
                        <h6>Verify Signature</h6>
                        <div class="mb-3">
                            <input type="text" class="form-control" id="secret-input" 
                                   placeholder="Enter secret key">
                        </div>
                        <div id="verify-result">
                            <div style="display: grid; grid-template-columns: 120px auto; gap: 10px;">
                                <span>Status:</span> <span class="fw-bold"></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const jwtInput = document.getElementById('jwt-input');

    // First add event listener
    jwtInput.addEventListener('input', async (e) => {
        saveToStorage('/jwt/token', e.target.value);
        const token = e.target.value.trim();
        const headerPre = document.getElementById('jwt-header');
        const payloadPre = document.getElementById('jwt-payload');
        const signatureInfo = document.getElementById('jwt-signature');

        if (!token) {
            headerPre.textContent = '';
            payloadPre.textContent = '';
            signatureInfo.innerHTML = `
                <h6>Signature Info</h6>
                <div style="display: grid; grid-template-columns: 120px auto; gap: 10px;">
                    <span>Algorithm:</span> <span class="fw-bold"></span>
                    <span>Expiration:</span> <span class="fw-bold"></span>
                    <span>Valid:</span> <span class="fw-bold"></span>
                </div>
            `;
            return;
        }

        try {
            const [headerB64, payloadB64] = token.split('.');
            
            // Decode header
            const header = JSON.parse(atob(headerB64));
            headerPre.textContent = JSON.stringify(header, null, 2);
            
            // Show verification section only for HMAC algorithms
            const verifySection = document.getElementById('jwt-verify');
            verifySection.style.display = header.alg.startsWith('HS') ? 'block' : 'none';
            
            // Decode payload
            const payload = JSON.parse(atob(payloadB64));
            payloadPre.textContent = JSON.stringify(payload, null, 2);
            
            // Check expiration and show info
            const now = Math.floor(Date.now() / 1000);
            const isExpired = payload.exp && payload.exp < now;
            const expirationDate = payload.exp ? new Date(payload.exp * 1000).toISOString() : 'Not set';
            
            signatureInfo.innerHTML = `
                <h6>Signature Info</h6>
                <div style="display: grid; grid-template-columns: 120px auto; gap: 10px;">
                    <span>Algorithm:</span> <span class="fw-bold">${header.alg || 'Unknown'}</span>
                    <span>Expiration:</span> <span class="fw-bold">${expirationDate}</span>
                    <span>Valid:</span> <span class="fw-bold ${isExpired ? 'text-danger' : 'text-success'}">
                        ${isExpired ? 'Expired' : (payload.exp ? 'Valid' : 'No expiration')}
                    </span>
                </div>
            `;
        } catch (error) {
            headerPre.textContent = '';
            payloadPre.textContent = '';
            signatureInfo.innerHTML = `
                <h6>Signature Info</h6>
                <p class="text-secondary">Invalid JWT token</p>
            `;
        }
    });

    // Add secret input handler
    const secretInput = document.getElementById('secret-input');
    secretInput.addEventListener('input', async (e) => {
        const secret = e.target.value;
        const token = jwtInput.value.trim();
        const verifyResult = document.getElementById('verify-result');
        
        if (!secret || !token) {
            verifyResult.innerHTML = `
                <div style="display: grid; grid-template-columns: 120px auto; gap: 10px;">
                    <span>Status:</span> <span class="fw-bold"></span>
                </div>
            `;
            return;
        }

        const isValid = await verifyJwtSignature(token, secret);
        verifyResult.innerHTML = `
            <div style="display: grid; grid-template-columns: 120px auto; gap: 10px;">
                <span>Status:</span> <span class="fw-bold ${isValid ? 'text-success' : 'text-danger'}">
                    ${isValid ? 'Valid signature' : 'Invalid signature'}
                </span>
            </div>
        `;
    });

    // Add verification function
    const verifyJwtSignature = async (token, secret) => {
        try {
            const [headerB64, payloadB64, signatureB64] = token.split('.');
            const header = JSON.parse(atob(headerB64));
            
            // Only support HMAC algorithms
            if (!header.alg.startsWith('HS')) {
                return false;
            }

            const hashAlg = {
                'HS256': 'SHA-256',
                'HS384': 'SHA-384',
                'HS512': 'SHA-512'
            }[header.alg];

            const encoder = new TextEncoder();
            const keyData = encoder.encode(secret);
            const messageData = encoder.encode(headerB64 + '.' + payloadB64);

            const key = await crypto.subtle.importKey(
                'raw',
                keyData,
                { name: 'HMAC', hash: hashAlg },
                false,
                ['sign']
            );

            const signature = await crypto.subtle.sign(
                'HMAC',
                key,
                messageData
            );

            // Convert signature to base64url
            const calculatedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
                .replace(/=/g, '')
                .replace(/\+/g, '-')
                .replace(/\//g, '_');

            return calculatedSignature === signatureB64;
        } catch (error) {
            return false;
        }
    };

    // Then restore value and trigger event
    jwtInput.value = getFromStorage('/jwt/token') || '';
    if (jwtInput.value) jwtInput.dispatchEvent(new Event('input'));
};

// Routes configuration
const routes = [
    { path: '/base64', component: Base64Component },
    { path: '/calc', component: CalculatorComponent },
    { path: '/diff', component: DiffComponent },
    { path: '/hmac', component: HmacComponent },
    { path: '/json', component: JsonComponent },
    { path: '/jwt', component: JwtComponent },
    { path: '/millis', component: TimestampComponent },
    { path: '/objectid', component: ObjectIdComponent },
    { path: '/text', component: TextComponent },
    { path: '/url', component: UrlComponent },
    { path: '/uuid', component: UuidComponent }
];

// Initialize router
new Router(routes);

// Add clean button handler
document.getElementById('clean-button').addEventListener('click', () => {
    clearCurrentPageStorage();
    // Reload current component
    const currentRoute = routes.find(route => window.location.hash.startsWith(`#${route.path}`));
    if (currentRoute) {
        currentRoute.component();
    }
}); 