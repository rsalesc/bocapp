class ScoreTableContentController {
    constructor(table) {
        this.table = table;
        this.storageKeyAlternative = 'boca_plusplus_alternative_scoreboard';
        // Common headers that come BEFORE problems
        // Note: We use lowercase for comparison
        this.metaHeaders = new Set([
            'rank', 'place', '#', 
            'user', 'team', 'name', 
            'site', 'version', 'time',
            'solved', 'points', 'score', 'total' // 'score' might be used instead of 'total'
        ]);
        
        // Ensure "Total" variants are handled in text matching logic
    }

    async init() {
        console.log("ScoreTableContentController initialized");
        
        // Wait for storage to determine initial layout
        const { [this.storageKeyAlternative]: isEnabled } = await chrome.storage.local.get(this.storageKeyAlternative);
        if (isEnabled) {
            this.moveTotalColumn(true);
        }
    }

    injectControls(container) {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'toggle-alt-scoreboard';
        
        // Restore state
        chrome.storage.local.get(this.storageKeyAlternative, (result) => {
             checkbox.checked = result[this.storageKeyAlternative] || false;
        });

        checkbox.addEventListener('change', (e) => {
            const checked = e.target.checked;
            chrome.storage.local.set({ [this.storageKeyAlternative]: checked });
            
            if (checked) {
                this.moveTotalColumn(true);
            } else {
                this.moveTotalColumn(false);
            }
        });

        const label = document.createElement('label');
        label.innerText = 'Alternative scoreboard';
        label.htmlFor = 'toggle-alt-scoreboard';
        label.style.marginLeft = '5px';
        label.style.cursor = 'pointer';

        wrapper.appendChild(checkbox);
        wrapper.appendChild(label);
        
        container.appendChild(wrapper);
    }
    
    moveTotalColumn(enable) {
        const headerRow = this.table.rows[0];
        if (!headerRow) return;

        // Use textContent for robustness, but trim() is essential
        const headers = Array.from(headerRow.cells);
        
        // 1. Find Total Column
        let totalIndex = headers.findIndex(th => {
            const t = th.textContent.trim();
            return t === 'Total' || t === 'Score';
        });

        if (totalIndex === -1) {
            console.warn("Total/Score column not found.");
            return;
        }

        if (enable) {
            // MOVE TO FRONT logic
            
            // Find insertion point (First non-meta column)
            let insertionIndex = -1;
            
            for (let i = 0; i < headers.length; i++) {
                if (i === totalIndex) continue;
                
                const text = headers[i].textContent.trim().toLowerCase();
                
                // If text is empty, it's often a meta column (like Rank #)
                if (text === '') continue; 

                // Check if it is a meta header
                // Note: user and team columns often have slash "User/Site"
                const isMeta = this.metaHeaders.has(text) || 
                               text.includes('user') || 
                               text.includes('team') || 
                               text.includes('rank') || 
                               text.includes('site') || 
                               text.includes('name'); 
                
                if (!isMeta) {
                    // This is likely the first problem column
                    insertionIndex = i;
                    break;
                }
            }
            
            if (insertionIndex === -1) {
                // If no problems found, maybe we shouldn't move? 
                // Or user has no problems.
                console.warn("No problem columns detected.");
                return;
            }

            // Only move if total is to the right of insertion
            if (totalIndex > insertionIndex) {
                 this.moveColumnFull(totalIndex, insertionIndex);
            } else {
                 console.log(`Total column (${totalIndex}) is already before or at insertion point (${insertionIndex}).`);
            }

        } else {
            // RESTORE logic: Move to End
            if (totalIndex < headers.length - 1) {
                this.moveColumnToEnd(totalIndex);
            }
        }
    }

    moveColumnFull(fromIndex, toIndex) {
        const rows = Array.from(this.table.rows);
        
        rows.forEach(row => {
            const cells = row.cells;
             if (cells.length > fromIndex && cells.length > toIndex) {
                 const cellToMove = cells[fromIndex];
                 const targetCell = cells[toIndex];
                 row.insertBefore(cellToMove, targetCell);
             }
        });
    }

    moveColumnToEnd(fromIndex) {
        const rows = Array.from(this.table.rows);
        rows.forEach(row => {
            const cells = row.cells;
            if (cells.length > fromIndex) {
                const cellToMove = cells[fromIndex];
                row.appendChild(cellToMove);
            }
        });
    }
}
