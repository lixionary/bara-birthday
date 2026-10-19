import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  createStore,
  dateDigest,
  equalDigest,
  hashPassword,
  makeLimiter,
  tokenKey,
  validDate,
  validateContent,
  verifyPassword,
} from "./service.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const defaults = JSON.parse(
  await readFile(new URL("./default-content.json", import.meta.url), "utf8"),
);
const stickers = (await readdir(path.join(root, "public/stickers")))
  .filter((n) => n.endsWith(".png"))
  .map((n) => n.slice(0, -4));
const loopback = (ip) => ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(ip);

export async function createBirthdayServer(options = {}) {
  const production =
    options.production ?? process.env.NODE_ENV === "production";
  const origin =
    options.origin ?? process.env.APP_ORIGIN ?? "http://localhost:5173";
  if (
    production &&
    ((!process.env.APP_ORIGIN && !options.origin) ||
      !origin.startsWith("https://"))
  )
    throw new Error("Production requires an HTTPS APP_ORIGIN.");
  const store = await createStore(
    options.dataDir ?? process.env.DATA_DIR ?? path.join(root, "data"),
    defaults,
    options.adminHash ?? process.env.ADMIN_PASSWORD_HASH,
  );
  if (production && !store.secrets.adminHash)
    throw new Error(
      "Configure an admin password with npm run setup before production startup.",
    );
  if (!validateContent(store.saved.content, defaults, stickers))
    throw new Error("Saved content is invalid; restore a valid backup.");
  const limiter = makeLimiter();
  const sessions = new Map();
  const ttl = { admin: 2 * 60 * 60 * 1000, guest: 12 * 60 * 60 * 1000 };
  const secure = production ? "; Secure" : "";
  const names = { admin: "bara_admin", guest: "bara_guest" };
  function session(req, role) {
    const cookies = Object.fromEntries(
      (req.headers.cookie ?? "").split(";").map((v) => {
        const i = v.indexOf("=");
        return [v.slice(0, i).trim(), v.slice(i + 1)];
      }),
    );
    const token = cookies[names[role]];
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    const key = tokenKey(token),
      value = sessions.get(key);
    if (!value || value.role !== role) return null;
    if (value.until <= Date.now()) {
      sessions.delete(key);
      return null;
    }
    return { ...value, key };
  }
  function issue(res, role) {
    for (const [key, value] of sessions)
      if (value.until <= Date.now()) sessions.delete(key);
    if (sessions.size >= 1000) sessions.delete(sessions.keys().next().value);
    const token = randomBytes(32).toString("hex"),
      csrf = randomBytes(24).toString("hex");
    sessions.set(tokenKey(token), {
      role,
      csrf,
      until: Date.now() + ttl[role],
    });
    res.setHeader(
      "Set-Cookie",
      `${names[role]}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${ttl[role] / 1000}${secure}`,
    );
    return csrf;
  }
  const server = createServer(async (req, res) => {
    const headers = {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Content-Security-Policy": `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'${production ? "" : " ws: http://localhost:5173 http://127.0.0.1:5173"}; frame-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'none'; form-action 'self'`,
    };
    for (const [key, value] of Object.entries(headers))
      res.setHeader(key, value);
    if (production)
      res.setHeader("Strict-Transport-Security", "max-age=31536000");
    function json(code, body) {
      res.statusCode = code;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(body));
    }
    try {
      const pathname = new URL(req.url, "http://server").pathname;
      const admin = session(req, "admin"),
        guest = session(req, "guest");
      const allowed = admin || guest;
      const setupAvailable =
        !production &&
        !store.secrets.adminHash &&
        loopback(req.socket.remoteAddress);
      if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
        const origins = production
          ? [origin]
          : [
              origin,
              origin.replace("127.0.0.1", "localhost"),
              origin.replace("localhost", "127.0.0.1"),
            ];
        if (!origins.includes(req.headers.origin))
          return json(403, { error: "Permintaan tidak diizinkan." });
        if (
          !String(req.headers["content-type"] ?? "").startsWith(
            "application/json",
          )
        )
          return json(415, { error: "Format permintaan tidak sesuai." });
      }
      async function body() {
        let bytes = 0,
          chunks = [];
        for await (const chunk of req) {
          bytes += chunk.length;
          if (bytes > 65536) {
            const error = new Error("Too large");
            error.status = 413;
            throw error;
          }
          chunks.push(chunk);
        }
        try {
          const value = JSON.parse(Buffer.concat(chunks).toString());
          if (!value || typeof value !== "object" || Array.isArray(value))
            throw new Error();
          return value;
        } catch {
          const error = new Error("Bad JSON");
          error.status = 400;
          throw error;
        }
      }
      function adminWrite() {
        return admin && equalDigest(req.headers["x-csrf-token"], admin.csrf);
      }
      let ip = req.socket.remoteAddress;
      if (
        process.env.TRUST_PROXY === "1" &&
        (loopback(ip) || ip === process.env.TRUSTED_PROXY_IP) &&
        typeof req.headers["x-real-ip"] === "string"
      )
        ip = req.headers["x-real-ip"];
      if (pathname === "/api/health" && req.method === "GET")
        return json(200, { ok: true });
      if (pathname === "/api/session" && req.method === "GET")
        return json(200, {
          admin: !!admin,
          guest: !!guest,
          csrf: admin?.csrf ?? null,
          setupAvailable,
        });
      if (
        ["/api/unlock", "/api/admin/login", "/api/admin/setup"].includes(
          pathname,
        ) &&
        req.method === "POST"
      ) {
        const role = pathname === "/api/unlock" ? "guest" : "admin";
        const key = `${role}:${ip}`,
          retry = limiter.allow(key);
        if (retry) {
          res.setHeader("Retry-After", String(retry));
          return json(429, {
            error: "Terlalu banyak percobaan. Coba lagi nanti.",
          });
        }
        const input = await body();
        if (pathname === "/api/admin/setup") {
          if (!setupAvailable)
            return json(403, { error: "Setup tidak tersedia." });
          if (
            typeof input.password !== "string" ||
            input.password.length < 12 ||
            input.password.length > 256
          )
            return json(400, {
              error: "Gunakan password minimal 12 karakter.",
            });
          if (!(await store.setup(await hashPassword(input.password))))
            return json(409, { error: "Admin sudah dikonfigurasi." });
        } else if (role === "admin") {
          if (
            typeof input.password !== "string" ||
            input.password.length > 256 ||
            !(await verifyPassword(
              input.password,
              store.secrets.adminHash ?? "",
            ))
          )
            return json(401, { error: "Password belum cocok." });
        } else if (
          !validDate(input.birthdate) ||
          !equalDigest(
            dateDigest(input.birthdate, store.secrets.secret),
            store.secrets.birthdateHash,
          )
        )
          return json(401, {
            error: "Tanggalnya belum cocok. Coba cek lagi, ya.",
          });
        limiter.reset(key);
        return json(200, { ok: true, csrf: issue(res, role) });
      }
      if (pathname === "/api/admin/logout" && req.method === "POST") {
        if (!adminWrite())
          return json(403, { error: "Sesi admin tidak valid." });
        sessions.delete(admin.key);
        res.setHeader(
          "Set-Cookie",
          `bara_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`,
        );
        return json(200, { ok: true });
      }
      if (pathname === "/api/content" && req.method === "GET") {
        if (!allowed) return json(401, { error: "Buka dulu paketnya." });
        return json(200, store.saved);
      }
      if (pathname === "/api/admin/content" && req.method === "GET") {
        if (!admin) return json(401, { error: "Login admin diperlukan." });
        return json(200, {
          ...store.saved,
          gateConfigured: !!store.secrets.birthdateHash,
          stickers,
        });
      }
      if (pathname === "/api/admin/content" && req.method === "PUT") {
        if (!adminWrite())
          return json(403, { error: "Sesi admin tidak valid." });
        const input = await body();
        if (!validateContent(input.content, defaults, stickers))
          return json(400, {
            error:
              "Periksa teks, usia, dan pilihan stikernya. Semua kolom harus terisi.",
          });
        const saved = await store.save(input.content, input.expectedRevision);
        if (!saved)
          return json(409, {
            error: "Ada perubahan dari tab lain. Muat ulang sebelum menyimpan.",
          });
        return json(200, saved);
      }
      if (pathname === "/api/admin/birthdate" && req.method === "PUT") {
        if (!adminWrite())
          return json(403, { error: "Sesi admin tidak valid." });
        const input = await body();
        if (!validDate(input.birthdate))
          return json(400, { error: "Masukkan tanggal lahir yang valid." });
        await store.setDate(input.birthdate);
        for (const [key, value] of sessions)
          if (value.role === "guest") sessions.delete(key);
        return json(200, { ok: true, gateConfigured: true });
      }
      if (pathname.startsWith("/api/"))
        return json(404, { error: "Tidak ditemukan." });
      if (!["GET", "HEAD"].includes(req.method))
        return json(405, { error: "Metode tidak tersedia." });
      if (pathname === "/robots.txt") {
        res.setHeader("Content-Type", "text/plain");
        return res.end("User-agent: *\nDisallow: /\n");
      }
      let filename;
      if (/^\/stickers\/[a-z_]+\.png$/.test(pathname)) {
        if (!allowed) return json(401, { error: "Buka dulu paketnya." });
        filename = path.join(root, "public", pathname);
      } else if (/^\/assets\/[a-zA-Z0-9_.-]+\.(js|css)$/.test(pathname))
        filename = path.join(root, "dist", pathname);
      else if (pathname === "/favicon.svg")
        filename = path.join(root, "dist/favicon.svg");
      else if (["/", "/admin", "/admin/preview"].includes(pathname))
        filename = path.join(root, "dist/index.html");
      else return json(404, { error: "Tidak ditemukan." });
      const info = await stat(filename);
      if (!info.isFile()) return json(404, { error: "Tidak ditemukan." });
      const type = {
        ".png": "image/png",
        ".js": "text/javascript",
        ".css": "text/css",
        ".html": "text/html",
        ".svg": "image/svg+xml",
      }[path.extname(filename)];
      res.setHeader("Content-Type", type);
      const data = await readFile(filename);
      res.statusCode = 200;
      res.end(req.method === "HEAD" ? undefined : data);
    } catch (error) {
      if (!res.headersSent)
        json(error.status ?? (error.code === "ENOENT" ? 404 : 500), {
          error: "Permintaan belum bisa diproses. Coba lagi.",
        });
      else res.end();
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  return { server, store };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    process.loadEnvFile(path.join(root, ".env"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const { server } = await createBirthdayServer();
  const host = process.env.HOST ?? "127.0.0.1",
    port = Number(process.env.PORT ?? 3001);
  server.listen(port, host, () =>
    console.log(`Birthday server: http://${host}:${port}`),
  );
  let closing = false;
  function stop() {
    if (closing) return;
    closing = true;
    const force = setTimeout(() => {
      server.closeAllConnections();
      process.exit(0);
    }, 5000);
    force.unref();
    server.close(() => process.exit(0));
  }
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}
