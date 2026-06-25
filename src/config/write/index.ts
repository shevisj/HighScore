import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Returns the configured write password, or undefined when write
 * protection is disabled (no password set). When undefined, write
 * routes (POST/PUT/DELETE) stay open, preserving previous behaviour.
 */
const getWritePassword = () => process.env.HIGHSCORE_WRITE_PASSWORD || undefined;

const isWriteProtected = () => !!getWritePassword();

/**
 * When true, write routes expect a per-request HMAC token instead of the
 * raw password. The token binds the request to its payload, so a captured
 * token cannot be reused to write different data.
 */
const isWriteTokenMode = () => process.env.HIGHSCORE_WRITE_TOKEN === 'true';

/**
 * Canonical message a write token is computed over: the fields that
 * identify what is being written, coerced to strings and newline-joined
 * in a fixed order. Absent fields become an empty string.
 *
 * Order: name, value, category, id
 *  - POST  : name, value, category   (no id)
 *  - PUT   : name, value, category, id
 *  - DELETE: id                       (no body)
 */
const buildWriteMessage = (fields: {
  name?: unknown;
  value?: unknown;
  category?: unknown;
  id?: unknown;
}) => [fields.name, fields.value, fields.category, fields.id]
  .map((v) => (v === undefined || v === null ? '' : String(v)))
  .join('\n');

/** HMAC-SHA256 of `message`, keyed by the write password, as hex. */
const signWriteMessage = (message: string, password: string) => createHmac('sha256', password)
  .update(message)
  .digest('hex');

/** Constant-time string compare that is safe against length mismatches. */
const safeEqual = (a: string, b: string) => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);

  return ab.length === bb.length && timingSafeEqual(ab, bb);
};

export {
  getWritePassword,
  isWriteProtected,
  isWriteTokenMode,
  buildWriteMessage,
  signWriteMessage,
  safeEqual,
};
