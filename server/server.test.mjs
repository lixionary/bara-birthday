import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createBirthdayServer } from "./index.mjs";
import { equalDigest, validDate } from "./service.mjs";

const defaults = JSON.parse(
  await readFile(new URL("./default-content.json", import.meta.url), "utf8"),
);
const origin = "http://localhost:5173";
let directory, server, store, base, cookie, csrf;
beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), "bara-api-"));
  ({ server, store } = await createBirthdayServer({
    dataDir: directory,
    origin,
    production: false,
  }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  cookie = "";
  csrf = "";
});
afterEach(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await rm(directory, { recursive: true, force: true });
});
async function call(url, method = "GET", data, headers = {}) {
  return fetch(base + url, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json", Origin: origin } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      ...headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  });
}
async function admin() {
  const response = await call("/api/admin/setup", "POST", {
    password: "test-admin-password-123",
  });
  expect(response.status).toBe(200);
  cookie = response.headers.get("set-cookie").split(";")[0];
  csrf = (await response.json()).csrf;
}
describe("server-side surprise protection", () => {
  it("denies content, sticker files, admin access, and source paths before unlock", async () => {
    for (const url of [
      "/api/content",
      "/stickers/bara_birthday.png",
      "/api/admin/content",
    ])
      expect((await call(url)).status).toBe(401);
    for (const url of [
      "/server/default-content.json",
      "/data/secrets.json",
      "/.env",
      "/docs/stickers/bara_cute.png",
    ])
      expect((await call(url)).status).toBe(404);
    expect((await call("/api/session")).headers.get("cache-control")).toBe(
      "no-store",
    );
  });
  it("checks the full valid date on the server and never returns or stores it in plaintext", async () => {
    await admin();
    await call("/api/admin/birthdate", "PUT", { birthdate: "1996-02-29" });
    expect(
      await readFile(path.join(directory, "secrets.json"), "utf8"),
    ).not.toContain("1996-02-29");
    cookie = "";
    csrf = "";
    expect(
      (await call("/api/unlock", "POST", { birthdate: "1996-03-01" })).status,
    ).toBe(401);
    expect(
      (await call("/api/unlock", "POST", { birthdate: "1996-02-30" })).status,
    ).toBe(401);
    const response = await call("/api/unlock", "POST", {
      birthdate: "1996-02-29",
    });
    expect(response.status).toBe(200);
    const header = response.headers.get("set-cookie");
    expect(header).toContain("HttpOnly");
    expect(header).toContain("SameSite=Strict");
    cookie = header.split(";")[0];
    expect((await call("/api/content")).status).toBe(200);
    expect((await call("/api/admin/content")).status).toBe(401);
    expect((await call("/stickers/bara_birthday.png")).status).toBe(200);
  });
  it("limits repeated date and admin password guesses", async () => {
    for (let i = 0; i < 5; i++)
      expect(
        (await call("/api/unlock", "POST", { birthdate: "1996-01-01" })).status,
      ).toBe(401);
    const locked = await call("/api/unlock", "POST", {
      birthdate: "1996-01-01",
    });
    expect(locked.status).toBe(429);
    expect(Number(locked.headers.get("retry-after"))).toBeGreaterThan(0);
    await admin();
    cookie = "";
    csrf = "";
    for (let i = 0; i < 5; i++)
      expect(
        (await call("/api/admin/login", "POST", { password: "wrong" })).status,
      ).toBe(401);
    expect(
      (await call("/api/admin/login", "POST", { password: "wrong" })).status,
    ).toBe(429);
  });
  it("rejects cross-origin writes, missing CSRF tokens, invalid content and stale revisions", async () => {
    await admin();
    const changed = structuredClone(defaults);
    changed.birthday.welcome.note = "Updated through admin";
    expect(
      (
        await call(
          "/api/admin/content",
          "PUT",
          { content: changed, expectedRevision: 1 },
          { Origin: "https://attacker.example" },
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await call(
          "/api/admin/content",
          "PUT",
          { content: changed, expectedRevision: 1 },
          { "X-CSRF-Token": "" },
        )
      ).status,
    ).toBe(403);
    const bad = structuredClone(changed);
    bad.birthday.moods[0].id = "different";
    expect(
      (
        await call("/api/admin/content", "PUT", {
          content: bad,
          expectedRevision: 1,
        })
      ).status,
    ).toBe(400);
    const saved = await call("/api/admin/content", "PUT", {
      content: changed,
      expectedRevision: 1,
    });
    expect(saved.status).toBe(200);
    expect((await saved.json()).revision).toBe(2);
    expect(
      (
        await call("/api/admin/content", "PUT", {
          content: changed,
          expectedRevision: 1,
        })
      ).status,
    ).toBe(409);
    expect(
      JSON.parse(await readFile(path.join(directory, "content.json"), "utf8"))
        .content.birthday.welcome.note,
    ).toBe("Updated through admin");
  });
  it("revokes guest access when the birthdate changes and revokes admin sessions on logout", async () => {
    await admin();
    await call("/api/admin/birthdate", "PUT", { birthdate: "1996-01-01" });
    const unlocked = await call("/api/unlock", "POST", {
      birthdate: "1996-01-01",
    });
    const guestCookie = unlocked.headers.get("set-cookie").split(";")[0];
    await call("/api/admin/birthdate", "PUT", { birthdate: "1996-01-02" });
    expect(
      (await call("/api/content", "GET", undefined, { Cookie: guestCookie }))
        .status,
    ).toBe(401);
    expect((await call("/api/admin/logout", "POST", {})).status).toBe(200);
    expect((await call("/api/admin/content")).status).toBe(401);
  });
  it("disables setup publicly in production and sets secure cookies", async () => {
    await admin();
    await new Promise((resolve) => server.close(resolve));
    ({ server } = await createBirthdayServer({
      dataDir: directory,
      production: true,
      origin: "https://bara.lixionary.com",
    }));
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${server.address().port}`;
    expect((await (await call("/api/session")).json()).setupAvailable).toBe(
      false,
    );
    const response = await call(
      "/api/admin/login",
      "POST",
      { password: "test-admin-password-123" },
      { Origin: "https://bara.lixionary.com" },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("; Secure");
  });
  it("handles leap dates and malformed tokens without errors", () => {
    expect(validDate("1996-02-29")).toBe(true);
    expect(validDate("1997-02-29")).toBe(false);
    expect(validDate("2026-99-99")).toBe(false);
    expect(equalDigest("é", "a")).toBe(false);
  });
});
