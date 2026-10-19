import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "./api";
import type { Content } from "./content/birthday";

type Saved = {
  content: Content;
  revision: number;
  gateConfigured: boolean;
  stickers: string[];
};
type Field = { path: string[]; value: string | number };
const pages = [
  "Umum",
  "Selamat datang",
  "Mood Bara",
  "Kado",
  "Studio kue",
  "Lilin",
  "Ucapan",
  "Penutup",
];
const labels: Record<string, string> = {
  recipient: "Nama penerima",
  sender: "Nama pengirim",
  title: "Judul",
  eyebrow: "Teks kecil di atas judul",
  heading: "Judul layar",
  headingLead: "Judul baris pertama",
  headingMiddle: "Judul baris kedua",
  description: "Penjelasan",
  button: "Teks tombol",
  note: "Catatan",
  name: "Nama pilihan",
  label: "Label pilihan",
  message: "Pesan",
  subtitle: "Teks pendamping",
  sticker: "Stiker",
  ending: "Pesan penutup",
  greeting: "Sapaan",
  finish: "Tombol ke penutup",
  continue: "Tombol lanjut",
  instruction: "Petunjuk",
  hint: "Petunjuk tambahan",
  limit: "Pesan batas pilihan",
  count: "Teks penghitung",
  caption: "Caption",
  age: "Usia di lilin",
  symbol: "Hiasan",
  next: "Tombol berikutnya",
  signature: "Teks tanda tangan",
  brandNote: "Catatan judul aplikasi",
  headerNote: "Catatan header",
  footer: "Teks footer",
  footerNote: "Catatan footer",
  number: "Nomor kado",
  soundOn: "Tombol saat suara aktif",
  soundOff: "Tombol saat suara mati",
  soundUnavailable: "Pesan saat suara tidak tersedia",
  skip: "Tombol lewati pembuka",
  progress: "Nama navigasi langkah",
  step: "Label langkah",
  of: "Penghubung penghitung halaman",
  welcomeStamp: "Teks stempel pembuka",
  welcomePhoto: "Deskripsi foto pembuka",
  welcomeTag: "Label paket pembuka",
  welcomeMini: "Catatan isi paket",
  welcomeAside: "Catatan tim Bara",
  return: "Tombol kembali",
  collected: "Status mood terpilih",
  open: "Tombol buka kado",
  reread: "Tombol baca lagi",
  palette: "Judul kotak hiasan",
  select: "Petunjuk pilihan hiasan",
  keyboard: "Petunjuk keyboard",
  surface: "Petunjuk akses kue",
  undo: "Tombol hapus hiasan terakhir",
  reset: "Tombol bersihkan kue",
  chaos: "Tombol hiasan acak",
  done: "Tombol selesai menghias",
  added: "Status hiasan ditambahkan",
  cleared: "Status kue dibersihkan",
  removed: "Status hiasan dihapus",
  optional: "Catatan di bawah kue",
  topNote: "Tulisan di atas kue",
  blow: "Tombol tiup lilin",
  blown: "Pesan setelah lilin padam",
  envelope: "Tulisan di amplop",
  revisit: "Judul pilihan main lagi",
  restart: "Tombol mulai ulang",
};
function fields(value: unknown, path: string[] = []): Field[] {
  if (typeof value === "string" || typeof value === "number")
    return path.at(-1) === "id" ? [] : [{ path, value }];
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) =>
    fields(child, [...path, key]),
  );
}
function groups(content: Content, page: number): [string, string[], unknown][] {
  const b = content.birthday,
    c = content.copy;
  if (page === 0)
    return [
      [
        "Nama & usia",
        ["birthday"],
        { recipient: b.recipient, sender: b.sender, title: b.title },
      ],
      ["Lilin", ["settings"], content.settings],
      ["Label langkah", ["birthday", "stages"], b.stages],
      [
        "Header & footer",
        ["copy"],
        Object.fromEntries(
          Object.entries(c).filter(([, v]) => typeof v === "string"),
        ),
      ],
    ];
  if (page === 1)
    return [["Selamat datang", ["birthday", "welcome"], b.welcome]];
  if (page === 2)
    return [
      ["Layar mood", ["copy", "moods"], c.moods],
      ...b.moods.map(
        (m, i) =>
          [`Pilihan ${i + 1}`, ["birthday", "moods", String(i)], m] as [
            string,
            string[],
            unknown,
          ],
      ),
    ];
  if (page === 3)
    return [
      ["Layar kado", ["copy", "gifts"], c.gifts],
      ...b.gifts.map(
        (g, i) =>
          [`Kado ${i + 1}`, ["birthday", "gifts", String(i)], g] as [
            string,
            string[],
            unknown,
          ],
      ),
    ];
  if (page === 4)
    return [
      ["Studio kue", ["copy", "cake"], c.cake],
      ...content.decorations.map(
        (d, i) =>
          [`Hiasan ${i + 1}`, ["decorations", String(i)], d] as [
            string,
            string[],
            unknown,
          ],
      ),
    ];
  if (page === 5) return [["Lilin", ["copy", "candles"], c.candles]];
  if (page === 6)
    return [
      ["Layar ucapan", ["copy", "letter"], c.letter],
      ["Paragraf ucapan", ["birthday", "letter"], b.letter],
    ];
  return [
    ["Layar penutup", ["copy", "finale"], c.finale],
    ["Pesan terakhir", ["birthday"], { ending: b.ending }],
  ];
}

export default function Admin({
  csrf,
  onLogout,
}: {
  csrf: string;
  onLogout: () => void;
}) {
  const [saved, setSaved] = useState<Saved | null>(null),
    [draft, setDraft] = useState<Content | null>(null);
  const [page, setPage] = useState(1),
    [phone, setPhone] = useState(false),
    [ready, setReady] = useState(false);
  const [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [birthdate, setBirthdate] = useState("");
  const frame = useRef<HTMLIFrameElement>(null);
  const dirty =
    !!saved &&
    !!draft &&
    JSON.stringify(draft) !== JSON.stringify(saved.content);
  useEffect(() => {
    let active = true;
    api<Saved>("/api/admin/content")
      .then((s) => {
        if (active) {
          setSaved(s);
          setDraft(s.content);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const listener = (e: MessageEvent) => {
      if (
        e.origin === location.origin &&
        e.source === frame.current?.contentWindow &&
        e.data?.type === "birthday-preview-ready"
      )
        setReady(true);
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);
  useEffect(() => {
    if (ready && draft)
      frame.current?.contentWindow?.postMessage(
        {
          type: "birthday-preview",
          content: draft,
          stage: Math.max(0, Math.min(5, page - 1)),
          finale: page === 7,
        },
        location.origin,
      );
  }, [draft, page, ready]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function update(path: string[], value: string | number) {
    setMessage("");
    setError("");
    setDraft((current) => {
      if (!current) return current;
      const next = structuredClone(current);
      let target: any = next;
      for (const key of path.slice(0, -1)) target = target[key];
      target[path.at(-1)!] = value;
      return next;
    });
  }
  async function save() {
    if (!saved || !draft) return;
    setBusy(true);
    setMessage("");
    setError("");
    const snapshot = draft;
    try {
      const result = await api<{ content: Content; revision: number }>(
        "/api/admin/content",
        "PUT",
        { content: snapshot, expectedRevision: saved.revision },
        csrf,
      );
      setSaved({ ...saved, ...result });
      setMessage(
        "Perubahan tersimpan. Pengunjung yang baru membuka paket akan melihat versi ini.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function changeDate(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await api("/api/admin/birthdate", "PUT", { birthdate }, csrf);
      setSaved((s) => (s ? { ...s, gateConfigured: true } : s));
      setBirthdate("");
      setMessage(
        "Tanggal akses tersimpan. Sesi pengunjung sebelumnya sudah dikunci ulang.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      await api("/api/admin/logout", "POST", {}, csrf);
      onLogout();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  if (!saved || !draft)
    return (
      <main className="gate-shell">
        <p role="status">{error || "Memuat editor…"}</p>
      </main>
    );
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <div className="eyebrow">RUANG OPERATOR</div>
          <h1>Edit kejutan Bara</h1>
          <p>
            Tampilan aslinya di sebelah. Edit teks, cek preview, lalu simpan.
          </p>
        </div>
        <div className="admin-actions">
          <button
            className="secondary"
            disabled={busy || !dirty}
            onClick={() => {
              setDraft(saved.content);
              setMessage("Draft dikembalikan ke versi tersimpan.");
              setError("");
            }}
          >
            Batalkan edit
          </button>
          <button className="primary" disabled={busy || !dirty} onClick={save}>
            {busy ? "Menyimpan…" : "Simpan perubahan"}
          </button>
          <button
            className="text-button"
            disabled={busy || dirty}
            onClick={logout}
          >
            Keluar
          </button>
        </div>
      </header>
      <div className="admin-notices" aria-live="polite">
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {message && <p className="form-success">{message}</p>}
        {dirty && <p>Preview memakai draft. Perubahan belum tersimpan.</p>}
      </div>
      <nav className="admin-pages" aria-label="Layar yang diedit">
        {pages.map((name, i) => (
          <button
            key={name}
            className={`secondary ${page === i ? "selected" : ""}`}
            aria-pressed={page === i}
            onClick={() => setPage(i)}
          >
            {name}
          </button>
        ))}
      </nav>
      <div className="editor-layout">
        <aside className="editor-fields">
          {page === 0 && (
            <section className="editor-group gate-settings">
              <h2>Akses tanggal lahir</h2>
              <p>
                {saved.gateConfigured
                  ? "Tanggal akses sudah diatur. Tanggal yang tersimpan tidak ditampilkan."
                  : "Belum diatur. Paket belum bisa dibuka pengunjung."}
              </p>
              <form onSubmit={changeDate}>
                <label htmlFor="admin-birthdate">Tanggal lahir lengkap</label>
                <input
                  id="admin-birthdate"
                  type="date"
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  required
                  min="1900-01-01"
                  max={new Date().toISOString().slice(0, 10)}
                />
                <button className="secondary" disabled={busy || !birthdate}>
                  Simpan tanggal akses
                </button>
              </form>
              <small>
                Disimpan sebagai hash di server, bukan di halaman publik.
              </small>
            </section>
          )}
          {groups(draft, page).map(([name, base, value]) => (
            <section className="editor-group" key={name}>
              <h2>{name}</h2>
              {fields(value, base).map((field) => {
                const key = field.path.at(-1)!;
                const id = `edit-${field.path.join("-")}`;
                const label =
                  labels[key] ??
                  (/^\d+$/.test(key) ? `Teks ${Number(key) + 1}` : key);
                return (
                  <div className="editor-field" key={id}>
                    <label htmlFor={id}>{label}</label>
                    {key === "sticker" ? (
                      <select
                        id={id}
                        value={String(field.value)}
                        onChange={(e) => update(field.path, e.target.value)}
                      >
                        {saved.stickers.map((s) => (
                          <option key={s} value={s}>
                            {s.replace("bara_", "Bara ").replaceAll("_", " ")}
                          </option>
                        ))}
                      </select>
                    ) : typeof field.value === "number" ? (
                      <input
                        id={id}
                        type="number"
                        min={1}
                        max={120}
                        value={field.value}
                        onChange={(e) =>
                          update(field.path, Number(e.target.value))
                        }
                      />
                    ) : (
                      <textarea
                        id={id}
                        rows={String(field.value).length > 100 ? 4 : 2}
                        maxLength={3000}
                        value={field.value}
                        onChange={(e) => update(field.path, e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </section>
          ))}
        </aside>
        <section className="editor-preview" aria-label="Preview langsung">
          <div className="preview-toolbar">
            <span>Preview · {pages[page]}</span>
            <div>
              <button
                className="text-button"
                aria-pressed={!phone}
                onClick={() => setPhone(false)}
              >
                Desktop
              </button>
              <button
                className="text-button"
                aria-pressed={phone}
                onClick={() => setPhone(true)}
              >
                HP
              </button>
            </div>
          </div>
          <iframe
            className={phone ? "phone-preview" : ""}
            ref={frame}
            src="/admin/preview"
            title="Preview halaman ulang tahun"
          />
        </section>
      </div>
    </div>
  );
}
