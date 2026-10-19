import {
  createHash,
  createHmac,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const derive = promisify(scrypt);
export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = await derive(password, salt, 64, {
    N: 32768,
    r: 8,
    p: 3,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt:${salt}:${hash.toString("hex")}`;
}
export async function verifyPassword(password, encoded) {
  try {
    const [scheme, salt, value] = encoded.split(":");
    if (
      scheme !== "scrypt" ||
      !/^[a-f0-9]{32}$/.test(salt) ||
      !/^[a-f0-9]{128}$/.test(value)
    )
      return false;
    const candidate = await derive(password, salt, 64, {
      N: 32768,
      r: 8,
      p: 3,
      maxmem: 64 * 1024 * 1024,
    });
    return timingSafeEqual(candidate, Buffer.from(value, "hex"));
  } catch {
    return false;
  }
}
export function validDate(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date &&
    date >= "1900-01-01" &&
    date <= new Date().toISOString().slice(0, 10)
  );
}
export function dateDigest(date, secret) {
  return createHmac("sha256", secret).update(date).digest("hex");
}
export function equalDigest(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const left = Buffer.from(a),
    right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function atomicJson(filename, value) {
  const temporary = `${filename}.${randomBytes(6).toString("hex")}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2) + "\n", {
    mode: 0o600,
  });
  await rename(temporary, filename);
}

// Fixed IDs and list lengths keep the journey and saved progress compatible.
// Every wording and sticker choice can change, but not its structural meaning.
export function validateContent(value, defaults, stickers) {
  function check(candidate, reference, key = "") {
    if (typeof reference === "string") {
      if (
        typeof candidate !== "string" ||
        !candidate.trim() ||
        candidate.length > 3000
      )
        return false;
      if (key === "id" && candidate !== reference) return false;
      if (key === "sticker" && !stickers.includes(candidate)) return false;
      return true;
    }
    if (typeof reference === "number")
      return (
        key === "age" &&
        Number.isInteger(candidate) &&
        candidate >= 1 &&
        candidate <= 120
      );
    if (Array.isArray(reference))
      return (
        Array.isArray(candidate) &&
        candidate.length === reference.length &&
        reference.every((item, i) => check(candidate[i], item, key))
      );
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate))
      return false;
    const keys = Object.keys(reference);
    return (
      Object.keys(candidate).length === keys.length &&
      keys.every(
        (k) =>
          Object.hasOwn(candidate, k) && check(candidate[k], reference[k], k),
      )
    );
  }
  return check(value, defaults);
}

export async function createStore(dataDir, defaults, bootstrapHash) {
  await mkdir(dataDir, { recursive: true, mode: 0o700 });
  const secretPath = path.join(dataDir, "secrets.json");
  const contentPath = path.join(dataDir, "content.json");
  let secrets, saved;
  try {
    secrets = JSON.parse(await readFile(secretPath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    secrets = {
      secret: randomBytes(32).toString("hex"),
      adminHash: bootstrapHash || null,
      birthdateHash: null,
    };
    await atomicJson(secretPath, secrets);
  }
  if (bootstrapHash && secrets.adminHash !== bootstrapHash) {
    secrets.adminHash = bootstrapHash;
    await atomicJson(secretPath, secrets);
  }
  try {
    saved = JSON.parse(await readFile(contentPath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    saved = { revision: 1, content: structuredClone(defaults) };
    await atomicJson(contentPath, saved);
  }
  let queue = Promise.resolve();
  function mutate(operation) {
    const next = queue.then(operation);
    queue = next.catch(() => {});
    return next;
  }
  return {
    get secrets() {
      return secrets;
    },
    get saved() {
      return saved;
    },
    setup: (hash) =>
      mutate(async () => {
        if (secrets.adminHash) return false;
        const next = { ...secrets, adminHash: hash };
        await atomicJson(secretPath, next);
        secrets = next;
        return true;
      }),
    setDate: (date) =>
      mutate(async () => {
        const next = {
          ...secrets,
          birthdateHash: dateDigest(date, secrets.secret),
        };
        await atomicJson(secretPath, next);
        secrets = next;
      }),
    save: (content, expectedRevision) =>
      mutate(async () => {
        if (expectedRevision !== saved.revision) return null;
        const next = { revision: saved.revision + 1, content };
        await atomicJson(contentPath, next);
        saved = next;
        return next;
      }),
  };
}

export function makeLimiter(limit = 5, windowMs = 15 * 60 * 1000) {
  const records = new Map();
  return {
    allow(key) {
      const now = Date.now();
      if (records.size > 5000)
        for (const [k, v] of records) if (v.until <= now) records.delete(k);
      let entry = records.get(key);
      if (!entry || entry.until <= now) {
        if (records.size >= 10000) records.delete(records.keys().next().value);
        entry = { count: 0, until: now + windowMs };
        records.set(key, entry);
      }
      if (entry.count >= limit) return Math.ceil((entry.until - now) / 1000);
      entry.count++;
      return 0;
    },
    reset(key) {
      records.delete(key);
    },
  };
}

export function tokenKey(token) {
  return createHash("sha256").update(token).digest("hex");
}
