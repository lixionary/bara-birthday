import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test.beforeEach(async ({ context }) => {
  const response = await context.request.post("/api/unlock", {
    data: { birthdate: "1996-01-01" },
    headers: { Origin: "http://127.0.0.1:5175" },
  });
  expect(response.ok()).toBe(true);
});

async function collectMoods(page: Page) {
  await page.getByRole("button", { name: "Iya, aku Bara" }).click();
  await expect(
    page.getByRole("button", { name: "Intip kado rahasia" }),
  ).toBeDisabled();
  for (const name of ["Bara gemas", "Bara marah", "Bara mengantuk"])
    await page.getByRole("button", { name, exact: true }).click();
  await page.getByRole("button", { name: "Intip kado rahasia" }).click();
}

async function openGifts(page: Page) {
  for (const name of [
    "Satu fakta penting",
    "Pengumuman resmi",
    "Doa kecil untukmu",
  ])
    await page.getByRole("button", { name: new RegExp(name) }).click();
  await page.getByRole("button", { name: "Saatnya bikin kue" }).click();
}

async function assertLayout(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect
    .poll(() =>
      page
        .locator("img")
        .evaluateAll((images) =>
          images
            .filter((img) => !img.complete || img.naturalWidth === 0)
            .map((img) => img.src),
        ),
    )
    .toEqual([]);
}

test("moods can be deselected, cap at three, and preserve progress on revisit", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Iya, aku Bara" }).click();
  const cute = page.getByRole("button", { name: "Bara gemas", exact: true });
  const cool = page.getByRole("button", { name: "Bara keren", exact: true });
  const next = page.getByRole("button", { name: "Intip kado rahasia" });
  await cute.click();
  await expect(cute).toHaveAttribute("aria-pressed", "true");
  await cute.click();
  await expect(cute).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".message-panel")).toContainText("Pilih mood Bara");
  await expect(next).toBeDisabled();
  for (const name of ["Bara gemas", "Bara marah", "Bara mengantuk"])
    await page.getByRole("button", { name, exact: true }).click();
  await expect(page.locator('.mood-card[aria-pressed="true"]')).toHaveCount(3);
  await expect(page.locator(".scene-actions")).toContainText("3/3");
  await expect(next).toBeEnabled();
  await expect(cool).toBeDisabled();
  await expect(page.locator(".mood-selection-hint")).toContainText(
    "Sudah pilih 3 mood",
  );
  await cute.click();
  await expect(cool).toBeEnabled();
  await expect(next).toBeDisabled();
  await cool.click();
  await page.reload();
  await expect(cool).toHaveAttribute("aria-pressed", "true");
  await expect(cute).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator('.mood-card[aria-pressed="true"]')).toHaveCount(3);
  await next.click();
  await page.getByRole("button", { name: /Satu fakta penting/ }).click();
  await page.getByRole("button", { name: "Mood Bara", exact: false }).click();
  await cool.click();
  await page.reload();
  await expect(page.locator('.mood-card[aria-pressed="true"]')).toHaveCount(2);
  await expect(next).toBeDisabled();
  await cute.click();
  await next.click();
  await expect(
    page.getByRole("button", { name: /Satu fakta penting/ }),
  ).toContainText("Baca lagi");
  await assertLayout(page);
});

test("full journey, refresh recovery, decorations, rereading, and restart", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Tanpa suara" }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Tanpa suara" }).click();
  await expect(
    page.getByRole("button", { name: "Suara aktif" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Suara aktif" }).click();
  await expect(
    page.getByRole("button", { name: "Tanpa suara" }),
  ).toHaveAttribute("aria-pressed", "false");
  await assertLayout(page);
  await collectMoods(page);
  await expect(
    page.getByRole("button", { name: "Saatnya bikin kue" }),
  ).toBeDisabled();
  await openGifts(page);
  await assertLayout(page);
  await expect(page.locator(".candle-digit")).toHaveText(["3", "0"]);
  await mkdir(".qa", { recursive: true });
  await page.screenshot({
    path: `.qa/ube-cake-${info.project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
  await expect(
    page.getByRole("button", { name: "Ube", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Bunga ungu", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Krim ube", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Bara gemas", exact: true }).click();
  await page.getByRole("button", { name: "Kue ulang tahun;" }).click();
  await expect(page.locator(".decoration")).toHaveCount(1);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Kue kamu. Aturan kamu." }),
  ).toBeVisible();
  await expect(page.locator(".decoration")).toHaveCount(1);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator(".decoration")).toHaveCount(0);
  await page.getByRole("button", { name: "Tambah kekacauan" }).click();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.locator(".decoration")).toHaveCount(0);
  await page.getByRole("button", { name: "Bunga ungu", exact: true }).click();
  await page.getByRole("button", { name: "Kue ulang tahun;" }).click();
  await expect(page.locator(".decoration-ube-flower")).toHaveCount(1);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.getByRole("button", { name: "Mahakarya selesai" }).click();
  await assertLayout(page);
  await expect(page.locator(".flame").first()).toHaveCSS(
    "animation-name",
    "flame-dance",
  );
  await page.screenshot({
    path: `.qa/ube-candles-${info.project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Tiup lilinnya" }).click();
  for (const flame of await page.locator(".flame").all())
    await expect(flame).toHaveCSS("opacity", "0");
  await expect(page.locator(".smoke-one").first()).toHaveCSS(
    "animation-name",
    "smoke-rise",
  );
  await expect(
    page.getByRole("status").filter({ hasText: "Lilin sudah padam" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ada surat untukmu" }).click();
  await assertLayout(page);
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "Baca selanjutnya" }).click();
  await page.getByRole("button", { name: "Lihat kejutan terakhir" }).click();
  await expect(
    page.getByRole("heading", { name: "Selamat ulang tahun, Bara!" }),
  ).toBeVisible();
  await assertLayout(page);
  await page.getByRole("button", { name: "Baca surat lagi" }).click();
  await expect(page.locator(".letter-paragraph")).toContainText(
    "Bara, selamat ulang tahun!",
  );
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "Baca selanjutnya" }).click();
  await page.getByRole("button", { name: "Lihat kejutan terakhir" }).click();
  await page.getByRole("button", { name: "Intip kado", exact: true }).click();
  await expect(page.getByRole("button", { name: /Baca lagi/ })).toHaveCount(3);
  await page.getByRole("button", { name: "Pesan buat Bara" }).click();
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "Baca selanjutnya" }).click();
  await page.getByRole("button", { name: "Lihat kejutan terakhir" }).click();
  await page.getByRole("button", { name: "Ulang dari awal" }).click();
  await expect(
    page.getByRole("button", { name: "Iya, aku Bara" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => sessionStorage.getItem("bara-birthday:v1")),
  ).toBeNull();
  expect(errors).toEqual([]);
});

test("reduced motion and keyboard placement work without storage or audio", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    Object.defineProperty(window, "sessionStorage", {
      get() {
        throw new Error("Storage blocked");
      },
    });
    Object.defineProperty(window, "AudioContext", { value: undefined });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Tanpa suara" }).click();
  await expect(
    page.getByRole("button", { name: "Suara tidak tersedia" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Iya, aku Bara" }).click();
  await expect(page.locator(".mood-card img").first()).toHaveCSS(
    "animation-name",
    "none",
  );
  for (const name of ["Bara gemas", "Bara marah", "Bara mengantuk"])
    await page.getByRole("button", { name, exact: true }).click();
  await page.getByRole("button", { name: "Intip kado rahasia" }).click();
  await openGifts(page);
  const cake = page.getByRole("button", { name: "Kue ulang tahun;" });
  await cake.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".decoration")).toHaveCount(1);
  for (let i = 1; i < 24; i++)
    await page.getByRole("button", { name: "Tambah kekacauan" }).click();
  await expect(
    page.getByRole("button", { name: "Tambah kekacauan" }),
  ).toBeDisabled();
  await cake.click();
  await expect(page.locator(".decoration")).toHaveCount(24);
  await page.getByRole("button", { name: "Mahakarya selesai" }).click();
  await expect(page.locator(".flame").first()).toHaveCSS(
    "animation-name",
    "none",
  );
  await page.getByRole("button", { name: "Tiup lilinnya" }).click();
  await expect(page.locator(".static-confetti")).toBeVisible();
  await assertLayout(page);
});
