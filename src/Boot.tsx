import { useEffect, useState, type FormEvent } from "react";
import { api, type Session } from "./api";
import { installContent, type Content } from "./content/birthday";
import App from "./App";
import Admin from "./Admin";
import type { Stage } from "./state";

function Gate({
  admin,
  setup,
  onSuccess,
}: {
  admin: boolean;
  setup: boolean;
  onSuccess: () => void;
}) {
  const [value, setValue] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (admin && setup && value !== confirmation) {
      setError("Kedua password belum sama.");
      return;
    }
    setBusy(true);
    try {
      await api(
        admin
          ? setup
            ? "/api/admin/setup"
            : "/api/admin/login"
          : "/api/unlock",
        "POST",
        admin ? { password: value } : { birthdate: value },
      );
      setValue("");
      setConfirmation("");
      onSuccess();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="gate-shell">
      <div className="gate-card">
        <span className="gate-icon" aria-hidden="true">
          {admin ? "✎" : "🎂"}
        </span>
        <div className="eyebrow">
          {admin ? "RUANG OPERATOR" : "SPECIAL DELIVERY"}
        </div>
        <h1>
          {admin
            ? setup
              ? "Siapkan admin dulu."
              : "Login admin."
            : "Ada paket buat kamu."}
        </h1>
        <p>
          {admin
            ? setup
              ? "Buat password minimal 12 karakter untuk mengatur kejutan ini."
              : "Masuk untuk edit tulisan dan cek tampilan."
            : "Masukkan tanggal lahirmu untuk membuka kejutan ini."}
        </p>
        <form onSubmit={submit}>
          <label htmlFor="gate-input">
            {admin ? "Password admin" : "Tanggal lahir"}
          </label>
          <input
            id="gate-input"
            type={admin ? "password" : "date"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
            minLength={admin && setup ? 12 : undefined}
            maxLength={admin ? 256 : undefined}
            min={admin ? undefined : "1900-01-01"}
            max={admin ? undefined : new Date().toISOString().slice(0, 10)}
            autoComplete={
              admin ? (setup ? "new-password" : "current-password") : "bday"
            }
          />
          {admin && setup && (
            <>
              <label htmlFor="confirm-password">Ulangi password</label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                required
                minLength={12}
                maxLength={256}
              />
            </>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <button className="primary" type="submit" disabled={busy}>
            {busy
              ? "Sebentar…"
              : admin
                ? setup
                  ? "Buat admin"
                  : "Masuk"
                : "Buka paketnya"}{" "}
            <span aria-hidden="true">↗</span>
          </button>
        </form>
        <small>
          {admin
            ? "Editor khusus operator."
            : "Tanggalnya cuma buat cek akses. Nggak perlu bikin akun."}
        </small>
      </div>
    </main>
  );
}

function Preview({ content }: { content: Content }) {
  const [view, setView] = useState({ content, stage: 0, finale: false });
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== window.parent ||
        event.data?.type !== "birthday-preview"
      )
        return;
      const { content, stage, finale } = event.data;
      if (
        !content?.birthday ||
        !content?.copy ||
        !Number.isInteger(stage) ||
        stage < 0 ||
        stage > 5
      )
        return;
      setView({ content, stage, finale: !!finale });
    };
    window.addEventListener("message", receive);
    window.parent.postMessage(
      { type: "birthday-preview-ready" },
      window.location.origin,
    );
    return () => window.removeEventListener("message", receive);
  }, []);
  installContent(view.content);
  return (
    <App
      key={`${view.stage}-${view.finale}`}
      preview
      initialStage={view.stage as Stage}
      previewFinale={view.finale}
    />
  );
}

export default function Boot() {
  const [session, setSession] = useState<Session | null>(null);
  const [content, setContent] = useState<Content | null>(null);
  const [error, setError] = useState("");
  const path = window.location.pathname;
  const adminRoute = path.startsWith("/admin");
  function refresh() {
    setSession(null);
    setContent(null);
    setError("");
    void api<Session>("/api/session")
      .then(setSession)
      .catch((e) => setError(e.message));
  }
  useEffect(() => {
    let active = true;
    api<Session>("/api/session")
      .then((s) => {
        if (active) setSession(s);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (
      !session ||
      !(adminRoute ? session.admin : session.admin || session.guest) ||
      path === "/admin"
    )
      return;
    let active = true;
    api<{ content: Content }>("/api/content")
      .then((result) => {
        if (active) {
          installContent(result.content);
          setContent(result.content);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [session, adminRoute, path]);
  if (error)
    return (
      <main className="gate-shell">
        <div className="gate-card">
          <h1>Belum bisa dibuka.</h1>
          <p role="alert">{error}</p>
          <button className="primary" onClick={refresh}>
            Coba lagi
          </button>
        </div>
      </main>
    );
  if (!session)
    return (
      <main className="gate-shell">
        <p role="status">Menyiapkan paket…</p>
      </main>
    );
  if (adminRoute && !session.admin)
    return <Gate admin setup={session.setupAvailable} onSuccess={refresh} />;
  if (!adminRoute && !session.admin && !session.guest)
    return <Gate admin={false} setup={false} onSuccess={refresh} />;
  if (path === "/admin")
    return <Admin csrf={session.csrf!} onLogout={refresh} />;
  if (!content)
    return (
      <main className="gate-shell">
        <p role="status">Membuka paket…</p>
      </main>
    );
  return path === "/admin/preview" ? <Preview content={content} /> : <App />;
}
