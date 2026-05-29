# Boca++

A Chrome extension that enhances the [BOCA](https://github.com/cassiopc/boca)
programming-contest control system's admin and judge interface — a richer runs
table (aliases, reordering, filtering, highlighting) and an inline code viewer
with syntax highlighting and diffs between submissions.

| Enhanced runs table | Inline code viewer |
| --- | --- |
| ![Runs table](docs/screenshots/01-runs-table.png) | ![Code viewer](docs/screenshots/02-code-viewer.png) |

> **Not yet on the Chrome Web Store.** Until it is published, install it manually
> as an *unpacked* extension using the steps below. It only ever runs on a BOCA
> server you explicitly turn it on for — see [How it works](#how-it-works).

---

## Requirements

- Google Chrome, or any Chromium-based browser (Edge, Brave, Vivaldi, …).
- Access to a BOCA server (e.g. `http://your-boca-host/boca/`).

## Install manually (unpacked)

### 1. Get the code onto your computer

**Option A — download a ZIP (no git needed):**

1. On the GitHub page, click the green **`< > Code`** button → **Download ZIP**.
2. Unzip it. You'll get a folder like `bocapp-main`.

**Option B — clone with git:**

```bash
git clone https://github.com/rsalesc/bocapp.git
```

Either way, remember the folder path — you'll point Chrome at it in step 3.

> Load the **whole repository folder** (the one containing `manifest.json`), *not*
> the `dist/…zip`. Chrome's "Load unpacked" expects an unzipped folder.

### 2. Open the Extensions page

1. Go to `chrome://extensions` (type it in the address bar and press Enter).
2. Turn on **Developer mode** using the toggle in the **top-right** corner.

   Three buttons appear on the top-left: **Load unpacked**, **Pack extension**,
   **Update**.

### 3. Load the extension

1. Click **Load unpacked**.
2. Select the folder from step 1 — the one that **directly contains
   `manifest.json`** (e.g. `bocapp-main/`).
3. **Boca++** now appears in your extensions list. There is **no permission
   prompt yet** — that's expected; access is requested only when you enable it on
   a server.

### 4. Pin the toolbar icon (recommended)

Click the puzzle-piece **Extensions** button in Chrome's toolbar, find **Boca++**,
and click the pin so its icon stays visible. You'll click this icon to turn the
extension on.

## Usage

1. Open your BOCA server in the browser (e.g. the admin runs page,
   `http://your-boca-host/boca/admin/run.php`).
2. Click the **Boca++** toolbar icon.
3. Chrome asks for permission to access **that one server** — click **Allow**.
4. The page reloads and the **Boca++** controls appear.

**To turn it off:** click the icon again on that server — it disables and reloads
the page clean.

**To use a different BOCA server:** just click the icon on the new server. It moves
the access over to the new one (the previous server is automatically disabled).

The choice persists across browser restarts, so you only grant access once per
server.

### Where it activates

Boca++ only enhances these BOCA pages (and only on a server you've enabled):

- Runs lists — `admin/run.php`, `judge/run.php`, `judge/runchief.php`, `judge/allrunlist.php`
- Run view/edit — `admin/runedit.php`, `judge/runview.php`, `judge/runedit.php`, `judge/runchiefedit.php`
- Scoreboard — `score.php`

## Updating

When you pull or download a newer version:

1. Replace the folder contents (`git pull`, or re-download and unzip over it).
2. Go to `chrome://extensions` and click the **reload** ↻ icon on the Boca++ card.
3. Refresh your BOCA tab.

> After a structural change to the extension, a full **Remove** + **Load unpacked**
> is the most reliable way to pick it up cleanly.

## Permissions — what and why

| Permission | Why it's needed |
| --- | --- |
| Host access to a server *(requested on click)* | To read and enhance that server's BOCA pages. Granted per-server, only when you click the icon. |
| `storage` | Remembers which server is enabled, plus local UI preferences (ordering, aliases). |
| `scripting` | Registers the page-enhancing script for the server you enable. |
| `activeTab` | Reads the current tab's URL when you click the icon, to know which server to enable. |
| `clipboardWrite` | Lets you copy values/code from the runs and code-viewer UI. |

Boca++ does **not** collect, transmit, or sell any data. See [PRIVACY.md](PRIVACY.md).

## Troubleshooting

- **Clicking the icon does nothing / shows no prompt.** Make sure you're on an
  `http(s)` BOCA page (not a `chrome://` page). If it still misbehaves after an
  update, do a clean **Remove** + **Load unpacked**.
- **See what the extension is doing.** On `chrome://extensions`, open the Boca++
  card and click the **service worker** link to view its console/log.
- **Controls don't appear after enabling.** Confirm the page is one of the
  [supported pages](#where-it-activates) and that the page finished reloading.

## License / source

Source lives in this repository. Issues and contributions welcome.
