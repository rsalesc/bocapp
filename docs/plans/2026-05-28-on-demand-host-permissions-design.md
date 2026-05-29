# On-demand host permissions (Web Store readiness)

**Date:** 2026-05-28
**Goal:** Replace the install-time broad `*://*/*` content-script match with on-demand,
per-origin host access so the extension is acceptable for the Chrome Web Store with no
scary install-time host warning.

## Problem

`manifest.json` declares a content script matching `*://*/*` ("read and change all your
data on all websites"). This is the #1 cause of Web Store rejection / slow manual review.
The broad match exists because the target BOCA server is chosen at runtime (`targetDomain`),
so the extension must *potentially* run on any host.

## Approach: optional host permissions + dynamic content-script registration

Activation flow chosen: **icon-click only**, as an enable/disable toggle.

### Manifest
- Remove the entire `content_scripts` block (no declarative injection).
- Add `"optional_host_permissions": ["*://*/*"]` (nothing granted at install).
- Remove `options_page`; drop `options.html` / `options.js` from the build.
- Keep `permissions`: `storage`, `scripting`, `activeTab`, `clipboardWrite` (all in use;
  `activeTab` lets the background read `tab.url` on the first click).

### Background (`background.js`) — icon toggle
- On `action.onClicked`, derive origin pattern from `tab.url` (e.g. `*://137.184.1.39/*`).
- Not enabled → `chrome.permissions.request({origins:[pattern]})` (click = user gesture).
  On grant: `chrome.scripting.registerContentScripts(...)` for that origin (same css/js
  lists the manifest used today, `runAt: 'document_end'`, `persistAcrossSessions: true`),
  save `targetDomain`, set active badge/icon, reload tab.
- Already enabled → toggle off: `unregisterContentScripts`, `permissions.remove`, clear
  `targetDomain`, reset icon, reload.
- Remove the `alert()` injection (violates project no-native-dialogs rule).

### Content script (`content.js`)
- Unchanged. Existing page-allowlist + `targetDomain` checks remain as a belt-and-suspenders
  guard on top of the now origin-scoped registration.

### Persistence
Granted permission and registered script both survive browser restarts; revisiting an
enabled server needs no re-prompt.

## Web Store submission (out of code scope, tracked separately)
- Rewrite the vague `description` to state the single purpose (enhances the BOCA contest
  admin/runs interface).
- Per-permission privacy justifications + data-use disclosure (only stores a domain string).
- At least one 1280×800 (or 640×400) screenshot; 128px icon already present.
- Build a clean versioned `.zip` excluding `.git`, `docs/`, `CLAUDE.md`, design files.
