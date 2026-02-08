// Background service worker for Boca++

// Listen for icon clicks
chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.url) return;

    try {
        const url = new URL(tab.url);
        const domain = url.hostname;

        // Save the domain
        await chrome.storage.sync.set({ targetDomain: domain });
        console.log(`Boca++: Target domain set to ${domain}`);

        // Notify the user via script injection (since we can't easily show a UI from background)
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (domain) => {
                alert(`Boca++ configured for domain: ${domain}\nReloading page...`);
            },
            args: [domain]
        });

        // Reload the tab to apply changes
        chrome.tabs.reload(tab.id);

    } catch (e) {
        console.error("Boca++: Error setting domain from icon click", e);
    }
});

// Listen for messages from content script to set active icon
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'set_active_icon' && sender.tab) {
        chrome.action.setIcon({
            tabId: sender.tab.id,
            path: {
                "16": "icons/icon_16.png",
                "48": "icons/icon_48.png",
                "128": "icons/icon_128.png"
            }
        });
    }
});
