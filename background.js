// Background service worker for Boca++
//
// The extension uses on-demand host permissions: nothing runs anywhere until the
// user clicks the toolbar icon on a BOCA server. That click (a user gesture) lets us
// request host access for just that origin, register the content script for it, and
// reload. Clicking again on the enabled server disables it; clicking on a different
// server switches the active server.

const SCRIPT_ID = 'boca-content';

// Mirrors what the manifest's content_scripts block used to declare.
const CONTENT_SCRIPT = {
    id: SCRIPT_ID,
    css: [
        'libs/tom-select.css',
        'libs/highlight.min.css',
        'libs/toastify.css'
    ],
    js: [
        'libs/tom-select.js',
        'libs/highlight.min.js',
        'libs/toastify.js',
        'libs/diff_match_patch.js',
        'utils.js',
        'ModalHelper.js',
        'RunsTableReorderer.js',
        'CodeViewer.js',
        'RunsTableContentController.js',
        'ScoreTableContentController.js',
        'RunEditContentController.js',
        'content.js'
    ],
    runAt: 'document_end',
    persistAcrossSessions: true
};

const GRAY_ICON = {
    16: 'icons/icon_gray_16.png',
    48: 'icons/icon_gray_48.png',
    128: 'icons/icon_gray_128.png'
};

const ACTIVE_ICON = {
    16: 'icons/icon_16.png',
    48: 'icons/icon_48.png',
    128: 'icons/icon_128.png'
};

function originPatternFor(hostname) {
    return `*://${hostname}/*`;
}

async function unregisterScript() {
    try {
        await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
    } catch (e) {
        // Not registered yet — fine.
    }
}

async function disableDomain(hostname) {
    await unregisterScript();
    try {
        await chrome.permissions.remove({ origins: [originPatternFor(hostname)] });
    } catch (e) {
        console.warn('Boca++: failed to remove host permission', e);
    }
    await chrome.storage.sync.remove('targetDomain');
}

// Registers the content script for an already-granted origin and remembers it.
// Assumes host permission for `hostname` has already been granted by the caller.
async function activateDomain(hostname) {
    const originPattern = originPatternFor(hostname);

    // Re-register cleanly (handles switching from a previously enabled server).
    await unregisterScript();
    await chrome.scripting.registerContentScripts([{
        ...CONTENT_SCRIPT,
        matches: [originPattern]
    }]);

    await chrome.storage.sync.set({ targetDomain: hostname });
}

async function setIcon(tabId, active) {
    try {
        await chrome.action.setIcon({ tabId, path: active ? ACTIVE_ICON : GRAY_ICON });
    } catch (e) {
        // Tab may have navigated/closed; ignore.
    }
}

chrome.action.onClicked.addListener(async (tab) => {
    if (!tab || !tab.url || !tab.id) return;

    let url;
    try {
        url = new URL(tab.url);
    } catch (e) {
        return;
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        console.log('Boca++: can only run on http(s) pages.');
        return;
    }

    const hostname = url.hostname;
    const originPattern = originPatternFor(hostname);

    // CRITICAL: permissions.request() must be the FIRST async call so the click's
    // user activation is still valid. Awaiting storage/permissions.contains first
    // consumes the gesture and makes request() throw "must be called during a user
    // gesture". For an origin we already hold, request() resolves true with no prompt,
    // so we can safely call it before deciding enable vs. disable.
    let granted;
    try {
        granted = await chrome.permissions.request({ origins: [originPattern] });
    } catch (e) {
        console.error('Boca++: permission request failed for', hostname, e);
        return;
    }
    if (!granted) {
        console.log(`Boca++: host permission for ${hostname} was denied.`);
        return;
    }

    try {
        const { targetDomain } = await chrome.storage.sync.get('targetDomain');

        if (targetDomain === hostname) {
            // Already enabled here → toggle OFF (also drops the permission we just
            // re-confirmed above).
            await disableDomain(hostname);
            await setIcon(tab.id, false);
        } else {
            // Switching servers? Clean up the previously enabled one first.
            if (targetDomain) {
                await disableDomain(targetDomain);
            }
            await activateDomain(hostname);
            await setIcon(tab.id, true);
        }
        chrome.tabs.reload(tab.id);
    } catch (e) {
        console.error('Boca++: error toggling extension for', hostname, e);
    }
});

// Content script signals it is active so we can light up the icon for that tab.
chrome.runtime.onMessage.addListener((message, sender) => {
    if (message && message.type === 'set_active_icon' && sender.tab) {
        setIcon(sender.tab.id, true);
    }
});
