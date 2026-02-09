// Global reference to controllers for UI to access if needed
let tableReorderer = null;
let contentController = null;

// Ensure the DOM is fully loaded before running
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

const ALLOWED_PAGES = [
    'admin/run.php',
    'judge/run.php',
    'judge/runchief.php'
];

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

    const currentUrl = window.location.href;
    console.log("Current URL:", currentUrl);

    // Apply generic modifications based on URL state
    applyStateFromUrl();

    // Find the table first
    const table = findRunsTable();
    
    if (table) {
        // Tag the table for Scoped Stylings
        table.classList.add('boca-runs-table');

        // Initialize Content Controller first to inject ++ column if needed
        contentController = new RunsTableContentController(table);
        contentController.ensurePlusPlusColumn();

        // Initialize Reorderer (will see the new column)
        tableReorderer = new RunsTableReorderer(table);
        tableReorderer.injectStyles();
        tableReorderer.init();

        // Initialize rest of Content Controller functionalities
        contentController.init();
    } else {
        console.log("Runs table not found.");
    }

    // Inject UI (Controls)
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

    // 2. Check allowed pages
    const pathname = window.location.pathname;
    const isAllowedPage = ALLOWED_PAGES.some(page => pathname.endsWith(page));
    if (!isAllowedPage) {
        console.log(`Current page ${pathname} is not in the allowed list. Bailing out.`);
        return false;
    }

    // 3. Check if navigation menu is present
    const menuLinks = document.querySelectorAll('.menu');
    if (menuLinks.length === 0) {
        console.log("Navigation menu not found. Bailing out.");
        return false;
    }

    return true;
}

function findRunsTable() {
    const tables = Array.from(document.querySelectorAll('table'));
    return tables.find(t => {
        // Check if the first row exists and contains "Run #"
        if (t.rows.length === 0) return false;
        // BOCA headers might be in th or td, usually td in the first tr
        const firstRowText = t.rows[0].innerText;
        return firstRowText.includes('Run #') && firstRowText.includes('Site') && firstRowText.includes('Time');
    });
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
    console.log("On run page - injecting controls.");

    let headerTable = null;
    const menuLinks = document.querySelectorAll('.menu');
    if (menuLinks.length > 0) {
        const firstLink = menuLinks[0];
        const table = firstLink.closest('table');
        if (table) headerTable = table;
    }
    
    if (!headerTable) {
        const tables = document.getElementsByTagName('table');
        for (let table of tables) {
            if (table.innerHTML.includes('run.php') && table.innerHTML.includes('score.php')) {
                headerTable = table;
                break; 
            }
        }
        if (!headerTable && tables.length > 0) headerTable = tables[0];
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

    // Problem Select (only if controller exists)
    if (contentController) {
        // --- Problem Select ---
        const problemSelect = document.createElement('select');
        problemSelect.id = 'boca-problem-select';
        problemSelect.style.padding = '5px';
        problemSelect.style.borderRadius = '4px';
        problemSelect.style.border = '1px solid #ccc';
        
        // Populate options
        const problems = contentController.getUniqueProblems();
        
        const allOption = document.createElement('option');
        allOption.value = '';
        allOption.text = 'All Problems';
        problemSelect.appendChild(allOption);
        
        problems.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.text = `${p}`;
            problemSelect.appendChild(opt);
        });

        // Set initial value
        problemSelect.value = contentController.problemFilter;

        // Bind events
        problemSelect.onchange = (e) => {
            contentController.setProblemFilter(e.target.value);
        };

        // Register callback for sync
        contentController.onProblemFilterChange = (val) => {
            problemSelect.value = val;
        };

        controlsRow.appendChild(problemSelect);

        // --- Team Select (with Tom Select) ---
        const teamWrap = document.createElement('div');
        teamWrap.style.width = '200px'; 
        // Prevent TomSelect from messing up layout if it tries to be too smart
        teamWrap.style.display = 'inline-block';

        const teamSelect = document.createElement('select');
        teamSelect.id = 'boca-team-select';
        teamSelect.setAttribute('placeholder', 'Filter by Team...');
        
        // Populate options
        const teams = contentController.getUniqueTeams();
        
        // Empty option for "All"
        const allTeamOption = document.createElement('option');
        allTeamOption.value = '';
        allTeamOption.text = 'All Teams';
        teamSelect.appendChild(allTeamOption);
        
        teams.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.text = t;
            teamSelect.appendChild(opt);
        });

        // Set initial value (needs to be done before TomSelect init if possible, or via API)
        teamSelect.value = contentController.teamFilter;

        teamWrap.appendChild(teamSelect);
        controlsRow.appendChild(teamWrap);

        // Initialize Tom Select
        // We need to wait a tick to ensure it's in the DOM if TomSelect requires it, 
        // though usually it works on the element.
        // Also checks if TomSelect is loaded.
        if (typeof TomSelect !== 'undefined') {
            const tsControl = new TomSelect(teamSelect, {
                create: false,
                sortField: {
                    field: "text",
                    direction: "asc"
                },
                maxOptions: null, // show all matches
                onChange: (value) => {
                    contentController.setTeamFilter(value);
                }
            });

            // Sync from Controller -> UI
            contentController.onTeamFilterChange = (val) => {
                // setValue(val, silent) to avoid triggering onChange loop if we wanted,
                // but our setTeamFilter checks duplicates or we simply re-set.
                // TomSelect setValue(val, silent)
                tsControl.setValue(val, true);
            };
        } else {
            console.warn("TomSelect library not found. Falling back to standard select.");
            // Fallback standard select events
            teamSelect.onchange = (e) => {
                contentController.setTeamFilter(e.target.value);
            };
            contentController.onTeamFilterChange = (val) => {
                teamSelect.value = val;
            };
        }
    }

    // Checkbox: Hide Jury Runs (only if controller exists)
    if (contentController) {
        const juryLabel = document.createElement('label');
        juryLabel.className = 'boca-checkbox-label';
        
        const juryCheckbox = document.createElement('input');
        juryCheckbox.type = 'checkbox';
        juryCheckbox.checked = contentController.juryHidden;
        juryCheckbox.onchange = (e) => contentController.toggleJury(e.target.checked);
        
        juryLabel.appendChild(juryCheckbox);
        juryLabel.appendChild(document.createTextNode('Hide jury runs'));
        controlsRow.appendChild(juryLabel);

        // Checkbox: Hide Deleted Runs
        const deletedLabel = document.createElement('label');
        deletedLabel.className = 'boca-checkbox-label';
        
        const deletedCheckbox = document.createElement('input');
        deletedCheckbox.type = 'checkbox';
        deletedCheckbox.checked = contentController.deletedHidden;
        deletedCheckbox.onchange = (e) => contentController.toggleDeleted(e.target.checked);
        
        deletedLabel.appendChild(deletedCheckbox);
        deletedLabel.appendChild(document.createTextNode('Hide deleted runs'));
        controlsRow.appendChild(deletedLabel);

        // Checkbox: HH:MM Format
        const timeLabel = document.createElement('label');
        timeLabel.className = 'boca-checkbox-label';
        
        const timeCheckbox = document.createElement('input');
        timeCheckbox.type = 'checkbox';
        timeCheckbox.checked = contentController.timeFormatHHMM;
        timeCheckbox.onchange = (e) => contentController.toggleTimeFormat(e.target.checked);
        
        timeLabel.appendChild(timeCheckbox);
        timeLabel.appendChild(document.createTextNode('Show time as HH:MM'));
        controlsRow.appendChild(timeLabel);
    }

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


