import { emitKeypressEvents } from "node:readline";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createStore, hashPassword, atomicJson } from "../server/service.mjs";
try {
  process.loadEnvFile(".env");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
async function hidden(prompt) {
  if (!process.stdin.isTTY)
    throw new Error("Run setup in an interactive terminal.");
  process.stdout.write(prompt);
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return await new Promise((resolve, reject) => {
    let value = "";
    const listener = (text, key) => {
      if (key?.ctrl && key.name === "c") {
        cleanup();
        reject(new Error("Cancelled"));
      } else if (key?.name === "return") {
        cleanup();
        resolve(value);
      } else if (key?.name === "backspace") value = value.slice(0, -1);
      else if (!key?.ctrl && !key?.meta && text) value += text;
    };
    function cleanup() {
      process.stdin.off("keypress", listener);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
    }
    process.stdin.on("keypress", listener);
  });
}
const first = await hidden("Admin password (minimum 12 characters): "),
  second = await hidden("Repeat password: ");
if (first.length < 12 || first.length > 256 || first !== second)
  throw new Error("Passwords must match and have 12–256 characters.");
const dir = process.env.DATA_DIR ?? "data";
const defaults = JSON.parse(
  await readFile(
    new URL("../server/default-content.json", import.meta.url),
    "utf8",
  ),
);
const store = await createStore(dir, defaults);
if (store.secrets.adminHash && !process.argv.includes("--reset-admin"))
  throw new Error(
    "Admin already exists. Use --reset-admin for an intentional password reset.",
  );
await atomicJson(path.join(dir, "secrets.json"), {
  ...store.secrets,
  adminHash: await hashPassword(first),
});
console.log("Admin password configured. Set the birthdate in /admin.");
