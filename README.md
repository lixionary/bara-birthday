# Departemen Ulang Tahun Bara 🎂

A casual Indonesian birthday adventure with Bara's stickers, three mood choices, gifts, an Ube cake studio, animated “30” candles, birthday wishes, and a finale. React/Vite renders the interface; a small Node server protects the surprise and stores admin edits.

## Run locally

Use Node.js 24 LTS (Node 22.12+ also works).

```sh
npm ci
npm run dev
```

Open **http://localhost:5173/admin** first. Create your own admin password (at least 12 characters), then choose **Umum → Akses tanggal lahir** and save Bara's full birthdate. Open **http://localhost:5173/** in a private browser window to try the visitor gate. An authenticated admin can open the surprise directly.

The development servers bind to loopback. The initial password setup is available only locally and is disabled in production. No real password or birthday is included in the project. `data/` is created when you start the server; it and real `.env` files are ignored by Git and Docker builds.

## Edit the surprise

Go to `/admin` and sign in with the separate admin password. Choose a screen, edit its wording, names, sticker choices, or decoration labels, and see the actual page update in the preview. **HP** sets the preview to a 360px phone viewport. Each birthday screen and option has editable copy, including the letter, finale, and cake caption. **Umum** also contains the age shown by the candles (default: 30).

Edits stay in the preview until **Simpan perubahan** is pressed. **Batalkan edit** restores the saved version. Saves persist across server restarts. Visitors who open or refresh the surprise load the saved version. Existing open tabs keep their current version. Conflicting saves from another admin tab are rejected instead of overwriting its changes.

The date field never displays the saved birthday. Updating the access date revokes existing visitor sessions. Admin sessions last two hours and visitor sessions last twelve hours; restarting the server ends both.

`server/default-content.json` contains the initial casual copy. Once initialized, the saved version in `data/content.json` is the source of truth. Editing the seed file does not overwrite admin changes. Runtime stickers live in `public/stickers/`; originals remain in `docs/stickers/`. Replace a public PNG using the same filename to change its image. The editor keeps option IDs and list lengths fixed so saved adventure progress remains compatible.

## Adventure

1. Enter the full birthdate to unlock the surprise.
2. Confirm the birthday delivery.
3. Select exactly three moods. Tap a selected mood to deselect it; the remaining choices disable at the cap.
4. Open all three gifts and reread them whenever you like.
5. Decorate the purple Ube cake with stickers, Ube, purple flowers, or cream. Tap the cake to place a decoration, or use Enter. Undo, Reset, and random decorations are available (maximum 24).
6. Make a private wish and tap to blow out the number candles. Flames flicker, glow, and leave a brief wisp of smoke. No microphone is needed.
7. Read the birthday wishes, celebrate, revisit activities, or restart.

Progress survives refreshes in the tab's `sessionStorage`. Restart clears it. Unavailable storage or audio does not block the adventure. Sound starts muted. Reduced-motion preferences disable movement and use static confetti.

## Protection

The server checks the birthdate and password. Personalized content and sticker files require an authenticated session; the private messages are absent from the public JavaScript bundle. The birthdate is stored as a keyed digest, and the password as a salted scrypt hash. Neither is returned to the browser or written to logs.

Cookies are HttpOnly and SameSite=Strict, with Secure required in production. Admin writes require both the correct origin and a CSRF token. There are five login/date attempts per IP per fifteen minutes, a 64KiB request limit, restrictive response headers, and no indexing. Session handling follows [OWASP guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), using [Node's built-in cryptography](https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback).

A birthday is light access protection: someone who knows the full date can unlock it. Use a strong, separate admin password. Do not publish `dist/` on a static host or configure Nginx to serve the sticker directory directly; run the Node server so the access checks apply.

## Validate

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Tests cover adventure state, protected content/assets, date validation, guesses, CSRF/origin checks, persistent edits, stale revisions, session revocation, and production cookie/setup rules. Browser tests cover the birthday journey and actual admin preview at desktop and 360px mobile sizes. They start an isolated temporary server on port 5175 with synthetic credentials and a synthetic birthday, then delete its data. They never change `data/` or use Bara's actual birthday.

To try the compiled app locally after a build:

```sh
npm run preview
```

Open http://localhost:3001/admin. This uses the same saved local data. Stop another server that is writing that data before changing settings; use one server per data directory.

## Prepare a Linux VPS

`compose.yaml` is intended for Docker Engine on a Linux VPS with an existing native Nginx. It uses [host networking](https://docs.docker.com/engine/network/drivers/host/) and binds Node to `127.0.0.1:3180`. Nginx is the public entry point and supplies the visitor IP for rate limiting. `APP_ORIGIN` is fixed to `https://bara.lixionary.com`; change it if the public hostname changes.

From the project directory on the VPS:

```sh
docker compose build
docker compose run --rm -it birthday npm run setup
docker compose up -d
```

Setup prompts for a new password without echoing it. The named volume persists the password hash, keyed date digest, and editable content. The runtime image runs as an unprivileged user with a read-only filesystem, apart from that volume and temporary files.

Point the hostname's DNS to the VPS. Install `deploy/nginx.conf` as a new site, enable it, run `nginx -t`, and reload Nginx. Issue its HTTPS certificate with your existing certificate workflow (for example, `certbot --nginx -d bara.lixionary.com`, choosing the HTTP-to-HTTPS redirect). Do not replace an existing unrelated site's configuration. Once HTTPS works, open **https://bara.lixionary.com/admin**, log in, and configure the birthdate and messages.

Check the running app:

```sh
docker compose ps
curl -fsS http://127.0.0.1:3180/api/health
curl -I https://bara.lixionary.com/
```

Confirm that a private browser requires the date and that `/api/content` and `/stickers/bara_cute.png` reject requests before unlock. Test admin editing and refresh persistence through HTTPS. Updating the image uses `docker compose build` followed by `docker compose up -d`; keep the data volume.

For a password reset, stop the server to avoid concurrent file writes:

```sh
docker compose stop birthday
docker compose run --rm -it birthday npm run setup -- --reset-admin
docker compose up -d birthday
```

Back up both files in `/app/data` securely. Restoring content alone loses the admin credentials and the key used for date verification. Do not delete the named volume with `down -v` unless you intend to reset everything.

Deployment is prepared here; this change does not publish the application or modify the VPS.
