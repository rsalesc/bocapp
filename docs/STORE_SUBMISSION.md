# Chrome Web Store submission guide — Boca++

Copy-paste-ready listing content and a step-by-step checklist.

## 0. Prerequisites
- A Chrome Web Store **developer account** ($5 one-time fee) at
  https://chrome.google.com/webstore/devconsole
- The build: run `./build.sh` → upload `dist/boca-plusplus-<version>.zip`
- A public URL for the privacy policy (e.g. the raw `PRIVACY.md` in your repo, or a
  GitHub Pages link).

## 1. Upload
Dev console → **Add new item** → upload the zip from `dist/`.

## 2. Store listing
- **Name:** Boca++
- **Summary (≤132 chars):**
  `Enhances the BOCA contest admin/judge interface: richer runs table, aliases, reordering, and an inline code viewer with diffs.`
- **Description:**
  ```
  Boca++ improves the admin and judge interface of the BOCA programming-contest
  control system.

  Enable it on a server by clicking the toolbar icon (it asks for access to just
  that one server). Then on the runs and score pages you get:

  • An enhanced runs table with aliases, custom ordering, and quick filtering
  • An inline code viewer with syntax highlighting and diffs between submissions
  • Improved score views

  The extension runs only on the BOCA server you explicitly enable, and stores
  nothing beyond that server's hostname and your local UI preferences.
  ```
- **Category:** Developer Tools (or Productivity)
- **Language:** English

## 3. Graphic assets (you must capture these from the live UI)
- **Icon:** 128×128 — already in `icons/icon_128.png`.
- **Screenshots:** at least 1 (up to 5), **1280×800** or **640×400** PNG/JPG.
  Capture the enhanced runs table and the code viewer on your BOCA server after
  enabling the extension.
- *(Optional)* Small promo tile 440×280.

## 4. Privacy practices tab (this is what gets extensions rejected — be precise)
- **Single purpose:**
  `Enhance the admin and judge interface of the BOCA programming-contest control system.`
- **Permission justifications:**
  | Permission | Justification |
  |---|---|
  | `activeTab` | Reads the current tab's URL when the user clicks the toolbar icon, to know which server to enable on. |
  | `scripting` | Registers the content script for the specific server the user enables (`chrome.scripting.registerContentScripts`). |
  | `storage` | Remembers which server is enabled (a hostname) so it persists across sessions. |
  | `clipboardWrite` | Lets the user copy values/code from the runs and code-viewer UI. |
  | Host permission (`optional`, requested at runtime) | Granted only when the user clicks the icon on a specific server; lets the extension read and modify that server's BOCA pages to enhance the interface. |
- **Data usage:** declare that the extension does **not** collect or transmit user
  data. Check the certification that you comply with the Developer Program Policies.
- **Privacy policy URL:** link to your published `PRIVACY.md`.

## 5. Submit for review
- Distribution: **Public** (or **Unlisted** if you only want to share a direct link
  with other admins — a good fit for a niche internal tool).
- Submit. Review for a low-permission extension is typically a few days.

## Notes / likely friction points
- Because host access is now requested **at runtime** (no install-time host
  warning), this should pass automated review smoothly.
- If a reviewer asks why broad `optional_host_permissions` (`*://*/*`) is needed,
  the answer: BOCA is self-hosted on arbitrary domains/IPs chosen by each contest
  organizer, so the user must be able to grant access to any host — but only one at
  a time, via an explicit click.
