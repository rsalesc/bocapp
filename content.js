// Global reference to controllers for UI to access if needed
let tableReorderer = null;
let contentController = null;

const PAGE_CONFIGS = [
    {
        name: 'Runs Page',
        matcher: (url) => {
           const allowed = [
                'admin/run.php',
                'judge/allrunlist.php',
                'judge/run.php',
                'judge/runchief.php',
            ];
            return allowed.some(page => url.pathname.endsWith(page));
        },
        init: () => {
             const tables = Array.from(document.querySelectorAll('table'));
             const table = tables.find(t => {
                if (t.rows.length === 0) return false;
                const firstRowText = t.rows[0].innerText;
                return firstRowText.includes('Run #') && firstRowText.includes('Site') && firstRowText.includes('Time');
            });

            if (table) {
                // Tag the table
                table.classList.add('boca-runs-table');

                // Initialize Content Controller
                contentController = new RunsTableContentController(table);
                contentController.ensureAliasColumn();
                contentController.ensurePlusPlusColumn();

                // Initialize Reorderer
                tableReorderer = new RunsTableReorderer(table);
                tableReorderer.injectStyles();
                tableReorderer.init();

                // Init Controller
                contentController.init();
            } else {
                console.log("Runs table not found.");
            }
        }
    },
    {
        name: 'Score Page',
        matcher: (url) => {
            // Match score.php in various directories
            return url.pathname.endsWith('score.php');
        },
        init: () => {
             const tables = Array.from(document.querySelectorAll('table'));
             // Helper: find table with Rank/User/Total usually
             const table = tables.find(t => {
                if (t.rows.length === 0) return false;
                const firstRowText = t.rows[0].innerText;
                // Adjust this heuristic as needed for Score table
                return firstRowText.includes('User/Site') && firstRowText.includes('Total') && firstRowText.includes('Name');
            });

            if (table) {
                table.classList.add('boca-score-table');

                contentController = new ScoreTableContentController(table);
                // Reorderer for Score Table (Reuse RunsTableReorderer as generic TableReorderer for now)
                // We need unique storage keys so they don't conflict with Runs table
                // However, RunsTableReorderer is currently hardcoded with specific keys.
                // TODO: Refactor RunsTableReorderer to accept keys in constructor if we want reordering here.
                // For now, let's just init the controller.
                contentController.init();
            } else {
                console.log("Score table not found.");
            }
        }
    },
    {
        name: 'Run Edit/View Page',
        matcher: (url) => {
            const allowed = [
                'admin/runedit.php',
                'judge/runview.php',
                'judge/runedit.php',
                'judge/runchiefedit.php'
            ];
            return allowed.some(page => url.pathname.endsWith(page));
        },
        init: () => {
             console.log("RunEditContentController: Page matched.");
             const controller = new RunEditContentController();
             controller.init();
             // Assign to global for debugging/access if needed, though mostly standalone
             contentController = controller;
        }
    }
];

// Ensure the DOM is fully loaded before running
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

async function init() {
    console.log("boca-plusplus: Content script loaded.");

    if (!(await shouldRun())) {
        return;
    }

    console.log("boca-plusplus: checks passed, initializing.");
    
    // Signal background script to set active icon
    try {
        chrome.runtime.sendMessage({ type: 'set_active_icon' });
    } catch (e) {
        console.warn("boca-plusplus: failed to send active icon message", e);
    }

    const currentUrl = new URL(window.location.href);
    console.log("Current URL:", currentUrl.href);

    // Apply generic modifications based on URL state
    applyStateFromUrl();

    // Identify Page
    const pageConfig = PAGE_CONFIGS.find(config => config.matcher(currentUrl));

    if (pageConfig) {
        console.log(`Detected page type: ${pageConfig.name}`);
        pageConfig.init();
    } else {
        console.log("No specific page config matched.");
    }

    // Inject UI (Controls) - generic injection that delegates to controller
    injectControls();
}

async function shouldRun() {
    // 1. Check configured domain
    const { targetDomain } = await chrome.storage.sync.get('targetDomain');
    if (targetDomain) {
        const currentHostname = window.location.hostname;
        if (!currentHostname.includes(targetDomain)) {
            console.log(`Current hostname ${currentHostname} does not match target domain ${targetDomain}. Bailing out.`);
            return false;
        }
    } else {
        console.log("No target domain configured. Baling out.");
        return false;
    }

    // 2. Check allowed pages (Generic check + internal matchers)
    // If we have a matcher, it's allowed.
    const currentUrl = new URL(window.location.href);
    const isAllowed = PAGE_CONFIGS.some(config => config.matcher(currentUrl));
    
    if (!isAllowed) {
         console.log(`Current page ${currentUrl.pathname} is not in the allowed list. Bailing out.`);
         return false;
    }

    // 3. Check if navigation menu is present
    // 3. Check if navigation menu is present - DISABLED as some valid pages (runview) might not have it
    // const menuLinks = document.querySelectorAll('.menu');
    // if (menuLinks.length === 0) {
    //     console.log("Navigation menu not found. Bailing out.");
    //     return false;
    // }

    return true;
}

function applyStateFromUrl() {
    const state = getAllUrlState();
    console.log("Applying state from URL:", state);
    
    // Example: If 'bg_color' is in URL, change background color
    if (state.bg_color) {
        document.body.style.backgroundColor = state.bg_color;
    }
}

function injectControls() {
    console.log("Injecting controls.");

    let headerTable = null;
    const menuLinks = document.querySelectorAll('.menu');
    if (menuLinks.length > 0) {
        const firstLink = menuLinks[0];
        const table = firstLink.closest('table');
        if (table) headerTable = table;
    }
    
    // Fallback finding of where to inject
    if (!headerTable) {
        const tables = document.getElementsByTagName('table');
        if (tables.length > 0) headerTable = tables[0];
    }

    // Create a container for our extension's UI
    const container = document.createElement('div');
    container.style.width = '98%'; 
    container.style.margin = '10px auto';
    container.style.padding = '10px';
    container.style.backgroundColor = '#f0f0f0';
    container.style.border = '1px solid #ccc';
    container.style.fontFamily = 'Arial, sans-serif';
    container.id = 'boca-plusplus-container';

    // Add a title
    const title = document.createElement('h4');
    title.innerText = 'BOCA++';
    title.style.margin = '0 0 10px 0';
    container.appendChild(title);

    // Controls Row
    const controlsRow = document.createElement('div');
    controlsRow.style.display = 'flex';
    controlsRow.style.gap = '20px'; // Increased gap for better spacing
    controlsRow.style.alignItems = 'center';
    container.appendChild(controlsRow);

    // Let the specific controller inject its controls
    if (contentController && typeof contentController.injectControls === 'function') {
        contentController.injectControls(controlsRow);
    }

    // Common Controls (like Reset, etc.)
    
    // Button to change background color (Demo)
    const colorButton = document.createElement('button');
    colorButton.innerText = 'Random BG';
    colorButton.onclick = () => {
        const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16);
        document.body.style.backgroundColor = randomColor;
        updateUrlState('bg_color', randomColor); // Keep legacy demo param
    };
    controlsRow.appendChild(colorButton);

    // Reset button
    const resetButton = document.createElement('button');
    resetButton.innerText = 'Reset URL';
    resetButton.onclick = () => {
        const url = new URL(window.location);
        url.search = '';
        window.history.pushState({}, '', url);
        location.reload(); 
    };
    controlsRow.appendChild(resetButton);


    if (headerTable) {
        headerTable.insertAdjacentElement('afterend', container);
    } else {
        document.body.insertBefore(container, document.body.firstChild);
    }

    // Attempt to render chips if reorderer was already initialized
    if (tableReorderer) {
        tableReorderer.renderHiddenChips(); // This will find the new container
    }
}


