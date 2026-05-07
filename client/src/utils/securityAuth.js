const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;

function stableStringify(value) {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const keys = Object.keys(value)
    .filter((key) => value[key] !== undefined)
    .sort();
  const serialized = keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(',');

  return `{${serialized}}`;
}

function toHex(buffer) {
  return Array.from(buffer)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256Hex(secret, message) {
  if (typeof window === 'undefined' || !window.crypto?.subtle || !encoder) {
    return '';
  }

  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: { name: 'SHA-256' } },
    false,
    ['sign']
  );

  const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return toHex(new Uint8Array(signature));
}

export async function createSecurityHeaders({ url, method, body, keyId }) {
  const sharedSecret = process.env.NEXT_PUBLIC_SECURITY_SHARED_SECRET
    || process.env.NEXT_PUBLIC_LEDGER_SHARED_SECRET
    || 'safespot-demo-secret';
  const resolvedKeyId = keyId || process.env.NEXT_PUBLIC_SECURITY_KEY_ID || 'default';

  if (!sharedSecret || sharedSecret === 'disabled') {
    return {};
  }

  const timestamp = Date.now().toString();
  const canonicalBody = stableStringify(body && Object.keys(body).length ? body : {});
  const bodyHash = await hmacSha256Hex('safespot-body-salt', canonicalBody);

  if (!bodyHash) {
    return {};
  }

  const targetUrl = (() => {
    try {
      return new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    } catch (error) {
      return null;
    }
  })();

  if (!targetUrl) {
    return {};
  }

  const pathWithQuery = `${targetUrl.pathname}${targetUrl.search}`;
  const message = `SafeSpotSecurity|${timestamp}|${method.toUpperCase()}|${pathWithQuery}|${bodyHash}|${resolvedKeyId}`;
  const signature = await hmacSha256Hex(`${sharedSecret}|${resolvedKeyId}`, message);

  if (!signature) {
    return {};
  }

  return {
    'x-security-signature': signature,
    'x-security-timestamp': timestamp,
    'x-security-key': resolvedKeyId,
  };
}

export { stableStringify };
