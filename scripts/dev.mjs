import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createBirthdayServer } from "../server/index.mjs";
import { hashPassword } from "../server/service.mjs";
try {
  process.loadEnvFile(".env");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const args = process.argv.slice(2),
  port = Number(
    args.includes("--port") ? args[args.indexOf("--port") + 1] : 5173,
  );
const test = process.env.BIRTHDAY_TEST === "1";
const dataDir = test
  ? await mkdtemp(path.join(os.tmpdir(), "bara-e2e-"))
  : process.env.DATA_DIR;
const { server, store } = await createBirthdayServer({
  production: false,
  origin: `http://127.0.0.1:${port}`,
  dataDir,
  adminHash: test ? await hashPassword("local-test-admin-only") : undefined,
});
if (test) await store.setDate("1996-01-01"); // Synthetic test date, not Bara's birthday.
const apiPort = port + 1000;
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(apiPort, "127.0.0.1", resolve);
});
const child = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", ...args],
  {
    stdio: "inherit",
    env: { ...process.env, BIRTHDAY_API_TARGET: `http://127.0.0.1:${apiPort}` },
  },
);
let closing = false;
async function stop(code = 0) {
  if (closing) return;
  closing = true;
  child.kill("SIGTERM");
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
  if (test) await rm(dataDir, { recursive: true, force: true });
  process.exit(code);
}
child.on("exit", (code) => void stop(code ?? 0));
process.on("SIGINT", () => void stop());
process.on("SIGTERM", () => void stop());
