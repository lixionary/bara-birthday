import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const origin = "http://127.0.0.1:5175";
test("birthday gate checks the full date and keeps the surprise protected", async ({
  page,
  context,
}, info) => {
  const denied = await context.request.get("/api/content");
  expect(denied.status()).toBe(401);
  expect((await context.request.get("/stickers/bara_cute.png")).status()).toBe(
    401,
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Ada paket buat kamu." }),
  ).toBeVisible();
  await expect(page.locator("img")).toHaveCount(0);
  await page.getByLabel("Tanggal lahir", { exact: true }).fill("1996-01-02");
  await page.getByRole("button", { name: "Buka paketnya" }).click();
  await expect(page.getByRole("alert")).toContainText("Tanggalnya belum cocok");
  await mkdir(".qa", { recursive: true });
  await page.screenshot({
    path: `.qa/gate-${info.project.name}.png`,
    animations: "disabled",
    fullPage: true,
  });
  await page.getByLabel("Tanggal lahir", { exact: true }).fill("1996-01-01");
  await page.getByRole("button", { name: "Buka paketnya" }).click();
  await expect(
    page.getByRole("button", { name: "Iya, aku Bara" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Iya, aku Bara" }),
  ).toBeVisible();
  expect((await context.request.get("/api/content")).ok()).toBe(true);
  expect((await context.request.get("/api/admin/content")).status()).toBe(401);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("admin edits actual pages live, saves persistently, previews age and logs out", async ({
  page,
  context,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Login admin." }),
  ).toBeVisible();
  await page.getByLabel("Password admin").fill("local-test-admin-only");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Edit kejutan Bara" }),
  ).toBeVisible();
  const session = await (await context.request.get("/api/session")).json();
  const original = await (
    await context.request.get("/api/admin/content")
  ).json();
  const preview = page.frameLocator(
    'iframe[title="Preview halaman ulang tahun"]',
  );
  const note = `Tim ube siap. Ini tes editor ${info.project.name}.`;
  try {
    await page.locator("#edit-birthday-welcome-note").fill(note);
    await expect(preview.getByText(note, { exact: true })).toBeVisible();
    // A draft must not change the published content before explicit Save.
    expect(
      (await (await context.request.get("/api/content")).json()).content
        .birthday.welcome.note,
    ).toBe(original.content.birthday.welcome.note);
    await page
      .getByRole("button", { name: "Simpan perubahan", exact: true })
      .click();
    await expect(
      page.getByText("Perubahan tersimpan.", { exact: false }),
    ).toBeVisible();
    await page.reload();
    await expect(page.locator("#edit-birthday-welcome-note")).toHaveValue(note);
    await expect(preview.getByText(note, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Umum", exact: true }).click();
    await expect(
      page.getByText("Tanggal akses sudah diatur.", { exact: false }),
    ).toBeVisible();
    await expect(page.locator("#admin-birthdate")).toHaveValue("");
    await page.locator("#edit-settings-age").fill("31");
    await page.getByRole("button", { name: "Lilin", exact: true }).click();
    await expect(preview.locator(".candle-digit")).toHaveText(["3", "1"]);
    await page
      .getByRole("button", { name: "Batalkan edit", exact: true })
      .click();
    await expect(preview.locator(".candle-digit")).toHaveText(["3", "0"]);
    await page.getByRole("button", { name: "HP", exact: true }).click();
    await page.getByRole("button", { name: "Studio kue", exact: true }).click();
    await expect(
      preview.getByRole("heading", { name: "Kue kamu. Aturan kamu." }),
    ).toBeVisible();
    await expect(preview.locator(".candle-digit")).toHaveText(["3", "0"]);
    await expect(preview.locator("img").first()).toBeVisible();
    await mkdir(".qa", { recursive: true });
    await page.screenshot({
      path: `.qa/admin-${info.project.name}.png`,
      animations: "disabled",
      fullPage: true,
    });
    // The frame is the actual mobile viewport, not a scaled desktop picture.
    const frame = page
      .frames()
      .find((f) => f.url().includes("/admin/preview"))!;
    expect(
      await frame.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const [tab, heading] of [
      ["Mood Bara", "Bara yang mana hari ini?"],
      ["Kado", "Tiga kado. Isinya agak random."],
      ["Ucapan", "Sebentar, ada ucapan dulu."],
      ["Penutup", "Selamat ulang tahun, Bara!"],
    ]) {
      await page.getByRole("button", { name: tab, exact: true }).click();
      await expect(
        preview.getByRole("heading", { name: heading }),
      ).toBeVisible();
    }
    expect(errors).toEqual([]);
  } finally {
    const current = await (
      await context.request.get("/api/admin/content")
    ).json();
    const restored = await context.request.put("/api/admin/content", {
      data: { content: original.content, expectedRevision: current.revision },
      headers: { Origin: origin, "X-CSRF-Token": session.csrf },
    });
    expect(restored.ok()).toBe(true);
  }
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Login admin." }),
  ).toBeVisible();
  expect((await context.request.get("/api/admin/content")).status()).toBe(401);
});
