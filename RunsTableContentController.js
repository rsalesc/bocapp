class RunsTableContentController {
    constructor(table) {
        this.table = table;
        this.storageKeyTimeFormat = 'boca_plusplus_time_format';
        this.juryHidden = false;
        this.deletedHidden = false;
        this.timeFormatHHMM = false;
        this.problemFilter = '';
        this.teamFilter = '';
        this.onProblemFilterChange = null;
        this.onTeamFilterChange = null;
        
        // New Run Highlighting State
        this.storageKeyMaxJudged = 'boca_plusplus_max_judged_run';
        this.storageKeyMaxNonJudged = 'boca_plusplus_max_non_judged_run';
        this.storedMaxJudged = 0;
        this.storedMaxNonJudged = 0;
        this.currentMaxJudged = 0;
        this.currentMaxNonJudged = 0;

        // Problem Notifications
        this.storageKeyNotifications = 'boca_plusplus_notifications';
        this.notifications = []; // Array of { problem: 'A', color: '#ff0000', textColor: '#ffffff' }
    }

    init() {
        this.loadState(); // This now calls updateRowVisibility to handle jury, problem, and team filtering
        this.setupProblemColumnInteractions();
        this.setupTeamColumnInteractions();
        this.setupRowClickHandlers();
        this.applyAnswerColors();
        this.setupCodeViewerButtons();
        this.setupRunHighlighting();
        this.applyProblemHighlights();
    }

    loadState() {
        // Load Jury Hidden State from URL
        const hideJuryParam = getUrlState('bppHideJury');
        this.juryHidden = hideJuryParam === 'true';

        // Load Deleted Hidden State from URL
        const hideDeletedParam = getUrlState('bppHideDeleted');
        this.deletedHidden = hideDeletedParam === 'true';

        // Load Problem Filter State from URL
        const problemParam = getUrlState('problem');
        this.problemFilter = problemParam || '';

        // Load Team Filter State from URL
        const teamParam = getUrlState('team');
        this.teamFilter = teamParam || '';

        // Load Time Format State from LocalStorage
        const savedTimeFormat = localStorage.getItem(this.storageKeyTimeFormat);
        this.timeFormatHHMM = savedTimeFormat === 'hhmm';

        // Apply all
        this.updateRowVisibility();
        this.updateRowVisibility();
        this.applyTimeFormat();
        
        // Load Notifications
        try {
            const savedNotifications = localStorage.getItem(this.storageKeyNotifications);
            if (savedNotifications) {
                this.notifications = JSON.parse(savedNotifications);
            }
        } catch (e) {
            console.error("Error loading notifications:", e);
            this.notifications = [];
        }
    }

    getUniqueProblems() {
        const problemColIndex = this.getColumnIndex('Problem');
        if (problemColIndex === -1) return [];

        const problems = new Set();
        const rows = Array.from(this.table.rows);
        // Skip header
        for (let i = 1; i < rows.length; i++) {
            const cell = rows[i].cells[problemColIndex];
            if (cell) {
                problems.add(cell.textContent.trim());
            }
        }
        return Array.from(problems).sort();
    }

    getUniqueTeams() {
        const teamColIndex = this.getUserColumnIndex();
        if (teamColIndex === -1) return [];

        const teams = new Set();
        const rows = Array.from(this.table.rows);
        // Skip header
        for (let i = 1; i < rows.length; i++) {
            const cell = rows[i].cells[teamColIndex];
            if (cell) {
                teams.add(cell.textContent.trim());
            }
        }
        return Array.from(teams).sort();
    }

    setProblemFilter(problemName) {
        this.problemFilter = problemName || '';
        
        // Sync to URL
        updateUrlState('problem', this.problemFilter ? this.problemFilter : null);
        
        // Sync to UI (if callback registered)
        if (this.onProblemFilterChange) {
            this.onProblemFilterChange(this.problemFilter);
        }

        this.updateRowVisibility();
    }

    setTeamFilter(teamName) {
        this.teamFilter = teamName || '';
        
        // Sync to URL
        updateUrlState('team', this.teamFilter ? this.teamFilter : null);
        
        // Sync to UI (if callback registered)
        if (this.onTeamFilterChange) {
            this.onTeamFilterChange(this.teamFilter);
        }

        this.updateRowVisibility();
    }

    toggleJury(shouldHide) {
        this.juryHidden = shouldHide;
        updateUrlState('bppHideJury', shouldHide ? 'true' : null);
        this.updateRowVisibility();
    }

    toggleDeleted(shouldHide) {
        this.deletedHidden = shouldHide;
        updateUrlState('bppHideDeleted', shouldHide ? 'true' : null);
        this.updateRowVisibility();
    }

    toggleTimeFormat(showHHMM) {
        this.timeFormatHHMM = showHHMM;
        localStorage.setItem(this.storageKeyTimeFormat, showHHMM ? 'hhmm' : 'min');
        this.applyTimeFormat();
    }

    getColumnIndex(headerName) {
        if (!this.table.rows.length) return -1;
        const cells = Array.from(this.table.rows[0].cells);
        return cells.findIndex(cell => cell.textContent.trim().includes(headerName));
    }

    getUserColumnIndex() {
        const user = this.getColumnIndex('User');
        if (user === -1) {
            return this.getColumnIndex('Team');
        }
        return user;
    }

    setupProblemColumnInteractions() {
        const problemColIndex = this.getColumnIndex('Problem');
        if (problemColIndex === -1) return;

        // Header Styling
        if (this.table.rows.length > 0) {
            const th = this.table.rows[0].cells[problemColIndex];
            if (th) {
                th.style.width = '1%'; // Shrink to fit
                th.style.whiteSpace = 'nowrap';
            }
        }

        const rows = Array.from(this.table.rows);
        // Skip header
        for (let i = 1; i < rows.length; i++) {
            const cell = rows[i].cells[problemColIndex];
            if (!cell) continue;

            const problemName = cell.textContent.trim();
            
            // Clear previous click handlers on cell if any (though we are replacing content mostly)
            cell.onclick = null;
            cell.style.cursor = '';
            cell.title = '';
            
            // UI Refinements: Compact width, padding
            cell.style.whiteSpace = 'nowrap';
            cell.style.paddingLeft = '12px';
            cell.style.paddingRight = '12px';

            // Create link
            const link = document.createElement('a');
            link.href = '#';
            link.textContent = problemName;
            link.title = `Filter by Problem ${problemName}`;
            link.style.color = 'inherit';
            link.style.textDecoration = 'underline';
            
            link.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Toggle: if already filtered to this, unfilter.
                if (this.problemFilter === problemName) {
                    this.setProblemFilter('');
                } else {
                    this.setProblemFilter(problemName);
                }
            };

            // Replace content
            cell.innerHTML = '';
            cell.appendChild(link);
        }
    }

    setupTeamColumnInteractions() {
        const teamColIndex = this.getUserColumnIndex();
        if (teamColIndex === -1) return;

        const rows = Array.from(this.table.rows);
        // Skip header
        for (let i = 1; i < rows.length; i++) {
            const cell = rows[i].cells[teamColIndex];
            if (!cell) continue;

            const teamName = cell.textContent.trim();
            
            // Clear previous click handlers on cell if any
            cell.onclick = null;
            cell.style.cursor = '';
            cell.title = '';

            // Create link
            const link = document.createElement('a');
            link.href = '#';
            link.textContent = teamName;
            link.title = `Filter by Team ${teamName}`;
            // Use inherit color to match theme, but underline to show it is a link
            link.style.color = 'inherit';
            link.style.textDecoration = 'underline';
            
            link.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Toggle: if already filtered to this, unfilter.
                if (this.teamFilter === teamName) {
                    this.setTeamFilter('');
                } else {
                    this.setTeamFilter(teamName);
                }
            };

            // Replace content
            cell.innerHTML = '';
            cell.appendChild(link);
        }
    }

    updateRowVisibility() {
        const userColIndex = this.getUserColumnIndex();
        const problemColIndex = this.getColumnIndex('Problem');
        
        const rows = Array.from(this.table.rows);
        // Skip header
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            let isVisible = true;

            // 1. Jury Filter
            if (this.juryHidden && userColIndex !== -1) {
                const cell = row.cells[userColIndex];
                if (cell) {
                    const userText = cell.textContent.toLowerCase();
                    if (userText.includes('judge')) {
                        isVisible = false;
                    }
                }
            }

            // 2. Problem Filter
            if (isVisible && this.problemFilter && problemColIndex !== -1) {
                const cell = row.cells[problemColIndex];
                if (cell) {
                    const problemText = cell.textContent.trim();
                    if (problemText !== this.problemFilter) {
                        isVisible = false;
                    }
                }
            }

            // 3. Team Filter
            if (isVisible && this.teamFilter && userColIndex !== -1) {
                const cell = row.cells[userColIndex];
                if (cell) {
                    const teamText = cell.textContent.trim();
                    if (teamText !== this.teamFilter) {
                        isVisible = false;
                    }
                }
            }

            // 4. Deleted Filter
            if (isVisible && this.deletedHidden) {
                const answerColIndex = this.getColumnIndex('Status');
                if (answerColIndex !== -1) {
                    const cell = row.cells[answerColIndex];
                    if (cell) {
                        const answerText = cell.textContent.toLowerCase();
                        if (answerText.includes('deleted')) {
                            isVisible = false;
                        }
                    }
                }
            }

            row.style.display = isVisible ? '' : 'none';
        }
    }

    applyTimeFormat() {
        const timeColIndex = this.getColumnIndex('Time');
        if (timeColIndex === -1) {
            console.warn("Time column not found for formatting");
            return;
        }

        const rows = Array.from(this.table.rows);
        // Skip header
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const cell = row.cells[timeColIndex];
            if (!cell) continue;

            // Store original if not present
            if (!cell.hasAttribute('data-original-time')) {
                cell.setAttribute('data-original-time', cell.textContent.trim());
            }

            const originalTime = cell.getAttribute('data-original-time');
            
            if (this.timeFormatHHMM) {
                cell.innerText = this.convertMinutesToHHMM(originalTime);
            } else {
                cell.innerText = originalTime;
            }
        }
    }

    convertMinutesToHHMM(minutesStr) {
        const minutes = parseInt(minutesStr, 10);
        if (isNaN(minutes)) return minutesStr;
        
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        const mStr = m < 10 ? '0' + m : m;
        return `${h}:${mStr}`;
    }


    applyAnswerColors() {
        const answerColIndex = this.getColumnIndex('Answer');
        if (answerColIndex === -1) {
            console.warn("Answer column not found for coloring");
            return;
        }

        const rows = Array.from(this.table.rows);
        // Skip header
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const cell = row.cells[answerColIndex];
            if (!cell) continue;

            const answerText = cell.textContent.trim();
            const lowerAnswer = answerText.toLowerCase();

            cell.style.fontWeight = 'bold';

            if (lowerAnswer === 'yes' || lowerAnswer.includes('accepted')) {
                cell.style.color = 'green';
            } else if (lowerAnswer.includes('time limit')) {
                cell.style.color = '#d4ac0d'; // Search gold/dark yellow
            } else if (lowerAnswer.includes('wrong answer')) {
                cell.style.color = 'red';
            } else if (lowerAnswer.includes('runtime error')) {
                cell.style.color = '#00acc1'; // Darker cyan
            } else if (lowerAnswer.includes('contact')) {
                cell.style.backgroundColor = '#e91e63'; // Pink background
                cell.style.color = 'white'; // White text
            }
        }
    }

    ensurePlusPlusColumn() {
        if (this.getColumnIndex('++') !== -1) return true;

        const headerRow = this.table.rows[0];
        const th = document.createElement('th');
        th.innerText = '++';
        th.style.textAlign = 'center';
        // Ensure it looks like a header (some BOCA themes use TD for header)
        if (headerRow.cells[0].tagName === 'TD') {
            const td = document.createElement('td');
            td.innerText = '++';
            td.style.textAlign = 'center';
            td.style.fontWeight = 'bold';
            headerRow.appendChild(td);
        } else {
            headerRow.appendChild(th);
        }

        const rows = Array.from(this.table.rows);
        for (let i = 1; i < rows.length; i++) {
            const td = document.createElement('td');
            td.style.textAlign = 'center';
            rows[i].appendChild(td);
        }
        return true;
    }

    setupRowClickHandlers() {
        const rows = Array.from(this.table.rows);
        // Skip header
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            
            // Add click handler
            row.onclick = (e) => {
                // Ignore if clicking on interactive elements
                if (e.target.closest('a') || 
                    e.target.closest('button') || 
                    e.target.closest('input') || 
                    e.target.closest('select') ||
                    e.target.closest('.boca-view-btn') || 
                    e.target.closest('.boca-hide-btn') ||
                    e.target.closest('.boca-column-chip')) {
                    return;
                }

                // Get Run Info
                const { runPageUrl, runId } = this.extractRunInfo(row);
                if (!runPageUrl) return;

                // Get Metadata
                const metadata = this.extractRowMetadata(row, runId);
                
                this.openCodeViewer(runPageUrl, metadata);
            };
        }
    }

    extractRunInfo(row) {
        const runColIndex = this.getColumnIndex('Run #');
        let runPageUrl = null;
        let runId = '?';

        if (runColIndex !== -1) {
            const runCell = row.cells[runColIndex];
            if (runCell) {
                const runLink = runCell.querySelector('a');
                if (runLink) {
                    runPageUrl = runLink.href;
                    runId = runCell.textContent.trim();
                }
            }
        }
        return { runPageUrl, runId };
    }

    extractRowMetadata(row, runId) {
        const timeColIndex = this.getColumnIndex('Time');
        const problemColIndex = this.getColumnIndex('Problem');
        const langColIndex = this.getColumnIndex('Language');
        const answerColIndex = this.getColumnIndex('Answer');

        const userColIndex = this.getUserColumnIndex();
        const siteColIndex = this.getColumnIndex('Site');

        return {
            runId: runId,
            time: timeColIndex !== -1 ? row.cells[timeColIndex].textContent.trim() : '?',
            problem: problemColIndex !== -1 ? row.cells[problemColIndex].textContent.trim() : '?',
            language: langColIndex !== -1 ? row.cells[langColIndex].textContent.trim() : '?',
            answer: answerColIndex !== -1 ? row.cells[answerColIndex].textContent.trim() : '?',
            team: userColIndex !== -1 ? row.cells[userColIndex].textContent.trim() : '?',
            site: siteColIndex !== -1 ? row.cells[siteColIndex].textContent.trim() : '1'
        };
    }

    setupCodeViewerButtons() {
        const plusPlusColIndex = this.getColumnIndex('++');
        if (plusPlusColIndex === -1) return;

        const rows = Array.from(this.table.rows);
        // Skip header
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const cell = row.cells[plusPlusColIndex];
            if (!cell) continue;

            // Check if we already injected
            if (cell.querySelector('.boca-view-btn')) continue;

            const { runPageUrl, runId } = this.extractRunInfo(row);
            if (!runPageUrl) continue;

            // Create view button
            const viewBtn = document.createElement('span');
            viewBtn.className = 'boca-view-btn';
            viewBtn.innerHTML = '👁️'; // Eye icon
            viewBtn.title = 'View Source Code';
            viewBtn.style.cursor = 'pointer';
            viewBtn.style.fontSize = '14px';

            viewBtn.onclick = (e) => {
                e.stopPropagation(); 
                e.preventDefault();

                // Extract metadata on click to ensure it's up-to-date (e.g. time format)
                const metadata = this.extractRowMetadata(row, runId);
                this.openCodeViewer(runPageUrl, metadata);
            };

            // RBX Run Button
            const rbxBtn = document.createElement('span');
            rbxBtn.className = 'boca-rbx-btn';
            rbxBtn.innerHTML = '💻'; // Terminal icon
            rbxBtn.title = 'Copy RBX Run Command';
            rbxBtn.style.cursor = 'pointer';
            rbxBtn.style.fontSize = '14px';
            rbxBtn.style.marginLeft = '8px';

            rbxBtn.onclick = (e) => {
                e.stopPropagation();
                e.preventDefault();
                const metadata = this.extractRowMetadata(row, runId);
                this.copyRbxCommand(metadata);
            };

            cell.appendChild(viewBtn);
            cell.appendChild(rbxBtn);
        }
    }

    async openCodeViewer(runPageUrl, metadata) {
        this.createModalIfNotExists();
        this.showModal();
        this.updateModalTitle(metadata);
        
        // Reset state
        const pre = document.querySelector('#boca-code-modal pre');
        if (pre) {
            pre.innerHTML = '';
            const newCode = document.createElement('code');
            newCode.id = 'boca-code-content';
            newCode.style.fontFamily = 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace';
            newCode.style.fontSize = '13px';
            newCode.style.display = 'block';
            newCode.style.padding = '15px';
            pre.appendChild(newCode);
        }

        // Add Diff Button if not present
        const actions = document.querySelector('#boca-code-modal .modal-actions');
        if (actions && !document.getElementById('boca-modal-diff-btn')) {
            const diffBtn = document.createElement('button');
            diffBtn.id = 'boca-modal-diff-btn';
            diffBtn.style.marginRight = '10px';
            diffBtn.style.padding = '5px 10px';
            diffBtn.style.cursor = 'pointer';
            diffBtn.style.backgroundColor = '#d19a66'; // Orange-ish
            diffBtn.style.border = 'none';
            diffBtn.style.color = 'white';
            diffBtn.style.borderRadius = '4px';
            diffBtn.innerHTML = '⇄ Diff with Last';
            diffBtn.onclick = () => this.handleDiffWithLast(metadata, runPageUrl);
            
            // Insert before download button
            const downloadBtn = document.getElementById('boca-modal-download-btn');
            actions.insertBefore(diffBtn, downloadBtn);
        }

        const codeBlock = document.getElementById('boca-code-content');
        const statusEl = document.getElementById('boca-code-status');
        const downloadLinkBtn = document.getElementById('boca-modal-download-btn');
        const diffBtn = document.getElementById('boca-modal-diff-btn');
        
        statusEl.textContent = 'Loading source code...';
        statusEl.style.display = 'block';
        downloadLinkBtn.style.display = 'none';
        if (diffBtn) diffBtn.style.display = 'none'; // Hide until loaded

        try {
            this.currentRunSource = await this.fetchRunSource(runPageUrl);
            const { code, filename, downloadUrl } = this.currentRunSource;

            if (code) {
                // Determine language
                let langClass = '';
                const langLower = metadata.language.toLowerCase();
                const filenameLower = filename.toLowerCase();

                if (langLower.includes('c++') || langLower.includes('cpp') || filenameLower.endsWith('.cpp') || filenameLower.endsWith('.cc')) langClass = 'language-cpp';
                else if (langLower.includes('java') || filenameLower.endsWith('.java')) langClass = 'language-java';
                else if (langLower.includes('python') || filenameLower.endsWith('.py')) langClass = 'language-python';
                else if (langLower.includes('c') || filenameLower.endsWith('.c')) langClass = 'language-c';
                else if (langLower.includes('kotlin') || filenameLower.endsWith('.kt')) langClass = 'language-kotlin';
                
                statusEl.style.display = 'none';
                codeBlock.textContent = code;
                if (langClass) codeBlock.classList.add(langClass);
                if (window.hljs) window.hljs.highlightElement(codeBlock);

                if (downloadUrl) {
                    downloadLinkBtn.onclick = () => window.open(downloadUrl, '_blank');
                    downloadLinkBtn.style.display = 'inline-block';
                    downloadLinkBtn.innerText = `Download`;
                }

                if (diffBtn) diffBtn.style.display = 'inline-block';
            } else {
                statusEl.textContent = "Could not find source code.";
            }

        } catch (e) {
            console.error("Error loading code:", e);
            statusEl.textContent = "Error loading source code.";
        }
    }

    async fetchRunSource(runPageUrl) {
        console.log("Fetching run page:", runPageUrl);
        const response = await fetch(runPageUrl);
        const text = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        const tds = Array.from(doc.querySelectorAll('td'));
        let downloadUrl = null;
        let filename = 'source';

        for (const td of tds) {
            if (td.textContent.trim().toLowerCase().endsWith("code:")) {
                const nextTd = td.nextElementSibling;
                if (nextTd && nextTd.tagName === 'TD') {
                    const link = nextTd.querySelector('a[href*="filedownload.php"]');
                    if (link) {
                        filename = link.textContent.trim();
                        const relativeHref = link.getAttribute('href');
                        if (relativeHref) {
                            const base = new URL(runPageUrl);
                            downloadUrl = new URL(relativeHref, base).href;
                        }
                    }
                }
                break;
            }
        }

        if (downloadUrl) {
            console.log("Fetching source from:", downloadUrl);
            const sourceResponse = await fetch(downloadUrl);
            const sourceText = await sourceResponse.text();
            return { code: sourceText, filename, downloadUrl };
        }
        return { code: null, filename: null, downloadUrl: null };
    }

    async handleDiffWithLast(metadata, currentRunPageUrl) {
        const statusEl = document.getElementById('boca-code-status');
        const codeBlock = document.getElementById('boca-code-content');
        
        statusEl.textContent = 'Finding last run...';
        statusEl.style.display = 'block';
        codeBlock.innerHTML = ''; // Clear current code

        const lastRun = this.findLastRun(metadata.runId, metadata.problem, metadata.team);

        if (!lastRun) {
            statusEl.textContent = 'No previous run found for comparison.';
            return;
        }

        const lastRunMetadata = this.extractRowMetadata(lastRun.row, lastRun.runId);

        statusEl.textContent = `Fetching run ${lastRun.runId}...`;
        
        try {
            const { runPageUrl } = this.extractRunInfo(lastRun.row);
             // Ensure current source logic
            if (!this.currentRunSource) {
                 this.currentRunSource = await this.fetchRunSource(currentRunPageUrl);
            }

            const lastRunSource = await this.fetchRunSource(runPageUrl);

            if (this.currentRunSource.code && lastRunSource.code) {
                statusEl.style.display = 'none';
                this.renderDiff(lastRunSource.code, this.currentRunSource.code, lastRunMetadata, metadata);
            } else {
                 statusEl.textContent = 'Failed to fetch source codes for diff.';
            }

        } catch (e) {
            console.error("Error in handleDiffWithLast:", e);
            statusEl.textContent = 'Error computing diff.';
        }
    }

    findLastRun(currentRunIdStr, problem, team) {
        // ... (findLastRun implementation unchanged, but needed for context if this wasn't replace_file_content. 
        // Since it is, I can skip including unchanged methods in replacement if I target correctly, 
        // but here I need to replace handleDiffWithLast which calls renderDiff)
        // CHECK: I can just replace handleDiffWithLast and renderDiff separately or together if contiguous.
        // They are separated by findLastRun. I will replace handleDiffWithLast first.
        
        const currentRunId = parseInt(currentRunIdStr, 10);
        let maxRunId = -1;
        let foundRow = null;

        const rows = Array.from(this.table.rows);
        // Skip header
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const meta = this.extractRowMetadata(row, '?');
            const { runId: rIdStr } = this.extractRunInfo(row);
            const rId = parseInt(rIdStr, 10);

            if (isNaN(rId)) continue;
            if (rId >= currentRunId) continue;

            if (meta.problem !== problem) continue;
            if (meta.team !== team) continue;
            
            if (meta.answer.toUpperCase().includes('YES') || meta.answer.toUpperCase().includes('ACCEPTED')) continue;

            if (rId > maxRunId) {
                maxRunId = rId;
                foundRow = row;
            }
        }
        return foundRow ? { row: foundRow, runId: maxRunId } : null;
    }

    renderDiff(oldText, newText, oldMetadata, newMetadata) {
        try {
            if (typeof diff_match_patch === 'undefined') {
                throw new Error("diff_match_patch library not loaded");
            }

            const dmp = new diff_match_patch();
            const a = dmp.diff_linesToChars_(oldText, newText);
            const lineText1 = a.chars1;
            const lineText2 = a.chars2;
            const lineArray = a.lineArray;
            
            const diffs = dmp.diff_main(lineText1, lineText2, false);
            dmp.diff_charsToLines_(diffs, lineArray);
            dmp.diff_cleanupSemantic(diffs);

            const container = document.getElementById('boca-code-content');
            container.innerHTML = '';
            container.classList = ''; // Remove language class

            const diffContainer = document.createElement('div');
            diffContainer.style.fontFamily = 'Consolas, monospace';
            diffContainer.style.whiteSpace = 'pre-wrap';

            const header = document.createElement('div');
            header.style.marginBottom = '10px';
            header.style.paddingBottom = '10px';
            header.style.borderBottom = '1px solid #555';
            header.style.fontSize = '14px';
            
            const oldInfo = `Run ${oldMetadata.runId} (${oldMetadata.answer}, ${oldMetadata.time} - ${oldMetadata.language})`;
            const newInfo = `Run ${newMetadata.runId} (Current)`;

            header.innerHTML = `Comparing: <strong>${oldInfo}</strong> <br/> vs <br/> <strong>${newInfo}</strong>`;
            diffContainer.appendChild(header);

            diffs.forEach(diff => {
                const type = diff[0];
                const text = diff[1];
                
                const span = document.createElement('span');
                span.textContent = text;
                
                if (type === 1) { // Insert (DIFF_INSERT)
                    span.style.backgroundColor = 'rgba(40, 167, 69, 0.2)';
                    span.style.color = '#a6e22e';
                } else if (type === -1) { // Delete (DIFF_DELETE)
                    span.style.backgroundColor = 'rgba(220, 53, 69, 0.2)';
                    span.style.color = '#f92672';
                    span.style.textDecoration = 'line-through'; 
                }
                diffContainer.appendChild(span);
            });
            
            container.appendChild(diffContainer);

        } catch (e) {
            console.error("Error in renderDiff:", e);
            const container = document.getElementById('boca-code-content');
            container.textContent = "Error rendering diff: " + e.message;
        }
    }

    createModalIfNotExists() {
        if (document.getElementById('boca-code-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'boca-code-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0,0,0,0.6)';
        modal.style.zIndex = '10000';
        modal.style.display = 'none';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';

        const content = document.createElement('div');
        content.style.backgroundColor = '#282c34'; // Atom One Dark bg
        content.style.color = '#abb2bf';
        content.style.width = '80%';
        content.style.maxWidth = '1000px';
        content.style.height = '80%';
        content.style.borderRadius = '8px';
        content.style.display = 'flex';
        content.style.flexDirection = 'column';
        content.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
        content.style.overflow = 'hidden';

        // Header
        const header = document.createElement('div');
        header.style.padding = '15px';
        header.style.borderBottom = '1px solid #3e4451';
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';

        const title = document.createElement('h3');
        title.id = 'boca-modal-title';
        title.style.margin = '0';
        title.style.fontSize = '16px';
        title.style.fontWeight = 'normal';
        title.style.color = '#e06c75'; // Reddish for emphasis

        const actions = document.createElement('div');
        actions.className = 'modal-actions';
        
        const rbxModalBtn = document.createElement('button');
        rbxModalBtn.id = 'boca-modal-rbx-btn';
        rbxModalBtn.style.marginRight = '10px';
        rbxModalBtn.style.padding = '5px 10px';
        rbxModalBtn.style.cursor = 'pointer';
        rbxModalBtn.style.backgroundColor = '#98c379';
        rbxModalBtn.style.border = 'none';
        rbxModalBtn.style.color = 'white';
        rbxModalBtn.style.borderRadius = '4px';
        rbxModalBtn.innerHTML = '💻 Copy RBX';

        const downloadBtn = document.createElement('button');
        downloadBtn.id = 'boca-modal-download-btn';
        downloadBtn.style.marginRight = '15px';
        downloadBtn.style.padding = '5px 10px';
        downloadBtn.style.cursor = 'pointer';
        downloadBtn.style.backgroundColor = '#61afef';
        downloadBtn.style.border = 'none';
        downloadBtn.style.color = 'white';
        downloadBtn.style.borderRadius = '4px';

        const closeBtn = document.createElement('span');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.fontSize = '24px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.lineHeight = '1';
        closeBtn.onclick = () => this.closeModal();

        actions.appendChild(rbxModalBtn);
        actions.appendChild(downloadBtn);
        actions.appendChild(closeBtn);
        header.appendChild(title);
        header.appendChild(actions);

        // Body
        const body = document.createElement('div');
        body.style.flex = '1';
        body.style.padding = '0';
        body.style.overflow = 'auto';
        body.style.position = 'relative';

        const status = document.createElement('div');
        status.id = 'boca-code-status';
        status.style.padding = '20px';
        status.style.textAlign = 'center';

        const pre = document.createElement('pre');
        pre.style.margin = '0';
        pre.style.minHeight = '100%';
        
        const code = document.createElement('code');
        code.id = 'boca-code-content';
        code.style.fontFamily = 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace';
        code.style.fontSize = '13px';
        code.style.display = 'block';
        code.style.padding = '15px';
        
        pre.appendChild(code);
        body.appendChild(status);
        body.appendChild(pre);

        content.appendChild(header);
        content.appendChild(body);
        modal.appendChild(content);

        // Click outside to close
        modal.onclick = (e) => {
            if (e.target === modal) this.closeModal();
        };

        document.body.appendChild(modal);
    }

    showModal() {
        const modal = document.getElementById('boca-code-modal');
        if (modal) modal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Prevent highlighting background
    }

    closeModal() {
        const modal = document.getElementById('boca-code-modal');
        if (modal) modal.style.display = 'none';
        document.body.style.overflow = '';
    }

    copyRbxCommand(metadata) {
        // Extract problem letter
        // Assuming format "A - Problem Name" or just "A"
        let problemLetter = metadata.problem.split('-')[0].trim();
        // If problem letter is empty or strange (e.g. maybe just the name), fallback to whole string but likely just the first char or word
        if (!problemLetter) problemLetter = metadata.problem.charAt(0);

        const command = `rbx on ${problemLetter} run @boca/${metadata.runId}-${metadata.site}`;

        const fallbackCopy = () => {
            const textArea = document.createElement("textarea");
            textArea.value = command;
            
            // Ensure it's not visible but part of DOM
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    this.showToast(`Copied: ${command}`, 'success');
                } else {
                    this.showToast('Copy command failed', 'error');
                }
            } catch (err) {
                this.showToast('Unable to copy', 'error');
            }
            
            document.body.removeChild(textArea);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(command).then(() => {
                this.showToast(`Copied: ${command}`, 'success');
            }).catch(err => {
                console.error('Async: Could not copy text: ', err);
                fallbackCopy();
            });
        } else {
            // Fallback for non-secure contexts (HTTP)
            fallbackCopy();
        }
    }

    showToast(message, type) {
        if (typeof Toastify !== 'undefined') {
            const bg = type === 'success' ? "linear-gradient(to right, #00b09b, #96c93d)" : "linear-gradient(to right, #ff5f6d, #ffc371)";
            Toastify({
                text: message,
                duration: 3000,
                close: true,
                gravity: "top", // `top` or `bottom`
                position: "right", // `left`, `center` or `right`
                style: {
                    background: bg,
                }
            }).showToast();
        } else {
            console.log(type, message);
        }
    }

    updateModalTitle(metadata) {
        const title = document.getElementById('boca-modal-title');
        if (title) {
            title.innerHTML = `
                <span style="color:#61afef; font-weight:bold;">Run ${metadata.runId}</span> 
                <span style="color:#abb2bf;"> | </span>
                <span style="color:#98c379;">${metadata.team}</span>
                <span style="color:#abb2bf;"> | </span>
                <span style="color:#e5c07b;">Problem ${metadata.problem} (${metadata.language})</span>
                <span style="color:#abb2bf;"> | </span>
                <span style="color:#c678dd; font-weight:bold;">${metadata.answer}</span>
                <span style="color:#abb2bf;"> | </span>
                <span style="color:#56b6c2;">${metadata.time}</span>
            `;

            const rbxBtn = document.getElementById('boca-modal-rbx-btn');
            if (rbxBtn) {
                rbxBtn.onclick = () => this.copyRbxCommand(metadata);
            }
        }
    }

    setupRunHighlighting() {
        this.injectHighlightStyles();

        // Load stored state
        const storedJudged = localStorage.getItem(this.storageKeyMaxJudged);
        const storedNonJudged = localStorage.getItem(this.storageKeyMaxNonJudged);

        this.storedMaxJudged = storedJudged ? parseInt(storedJudged, 10) : 0;
        this.storedMaxNonJudged = storedNonJudged ? parseInt(storedNonJudged, 10) : 0;

        // Process rows to find max and highlight
        this.highlightNewRuns();

        // Setup update on focus
        const updateState = () => {
            // Only update if we have found newer runs
            let updated = false;
            
            if (this.currentMaxJudged > this.storedMaxJudged) {
                localStorage.setItem(this.storageKeyMaxJudged, this.currentMaxJudged);
                // Update stored value to reflect that we've "seen" it now?
                // The prompt says: "notice highlighted rows should be kept highlighted, the state refresh should only affect the highlighted rows on the next page refresh after the change."
                // So we update LocalStorage, but we DO NOT update `this.storedMaxJudged` because that would stop highlighting if we re-ran highlightNewRuns (which we don't, but still).
                updated = true;
            }

            if (this.currentMaxNonJudged > this.storedMaxNonJudged) {
                localStorage.setItem(this.storageKeyMaxNonJudged, this.currentMaxNonJudged);
                updated = true;
            }

            if (updated) {
                console.log("Updated max run IDs in storage:", {
                    judged: this.currentMaxJudged, 
                    nonJudged: this.currentMaxNonJudged
                });
            }
        };

        if (document.hasFocus()) {
            updateState();
        }
        window.addEventListener('focus', updateState);
    }

    highlightNewRuns() {
        const runColIndex = this.getColumnIndex('Run #');
        const userColIndex = this.getUserColumnIndex();

        if (runColIndex === -1 || userColIndex === -1) return;

        const rows = Array.from(this.table.rows);
        
        // Initialize current max with stored values, so we at least keep the baseline
        this.currentMaxJudged = this.storedMaxJudged;
        this.currentMaxNonJudged = this.storedMaxNonJudged;

        // Skip header
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const runCell = row.cells[runColIndex];
            const userCell = row.cells[userColIndex];

            if (!runCell || !userCell) continue;

            const runId = parseInt(runCell.innerText.trim(), 10);
            if (isNaN(runId)) continue;

            const userText = userCell.innerText.trim().toLowerCase();
            const isJudge = userText.includes('judge');

            if (isJudge) {
                this.currentMaxJudged = Math.max(this.currentMaxJudged, runId);
                // Highlight if newer than stored
                if (runId > this.storedMaxJudged) {
                    row.classList.add('boca-new-run');
                    row.title = "New Run Since Last Visit";
                }
            } else {
                this.currentMaxNonJudged = Math.max(this.currentMaxNonJudged, runId);
                // Highlight if newer than stored
                if (runId > this.storedMaxNonJudged) {
                    row.classList.add('boca-new-run');
                    row.title = "New Run Since Last Visit";
                }
            }
        }
    }

    injectHighlightStyles() {
        if (document.getElementById('boca-plusplus-highlight-styles')) return;
        const style = document.createElement('style');
        style.id = 'boca-plusplus-highlight-styles';
        style.textContent = `
            .boca-new-run {
                position: relative;
                background-color: rgba(33, 150, 243, 0.15) !important; /* Light Blue tint */
            }
            .boca-new-run td:first-child {
                box-shadow: inset 4px 0 0 0 #2196f3; /* Blue left border indicator */
            }
            .boca-new-run:hover {
                background-color: rgba(33, 150, 243, 0.25) !important;
            }
        `;
        document.head.appendChild(style);
    }

    injectControls(container) {
        // --- Problem Select ---
        const problemSelect = document.createElement('select');
        problemSelect.id = 'boca-problem-select';
        problemSelect.style.padding = '5px';
        problemSelect.style.borderRadius = '4px';
        problemSelect.style.border = '1px solid #ccc';
        
        // Populate options
        const problems = this.getUniqueProblems();
        
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
        problemSelect.value = this.problemFilter;

        // Bind events
        problemSelect.onchange = (e) => {
            this.setProblemFilter(e.target.value);
        };

        // Register callback for sync
        this.onProblemFilterChange = (val) => {
            problemSelect.value = val;
        };

        container.appendChild(problemSelect);

        // --- Team Select (with Tom Select) ---
        const teamWrap = document.createElement('div');
        teamWrap.style.width = '200px'; 
        // Prevent TomSelect from messing up layout if it tries to be too smart
        teamWrap.style.display = 'inline-block';

        const teamSelect = document.createElement('select');
        teamSelect.id = 'boca-team-select';
        teamSelect.setAttribute('placeholder', 'Filter by Team...');
        
        // Populate options
        const teams = this.getUniqueTeams();
        
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
        teamSelect.value = this.teamFilter;

        teamWrap.appendChild(teamSelect);
        container.appendChild(teamWrap);

        // Initialize Tom Select
        if (typeof TomSelect !== 'undefined') {
            const tsControl = new TomSelect(teamSelect, {
                create: false,
                sortField: {
                    field: "text",
                    direction: "asc"
                },
                maxOptions: null, // show all matches
                onChange: (value) => {
                    this.setTeamFilter(value);
                }
            });

            // Sync from Controller -> UI
            this.onTeamFilterChange = (val) => {
                tsControl.setValue(val, true);
            };
        } else {
            console.warn("TomSelect library not found. Falling back to standard select.");
            // Fallback standard select events
            teamSelect.onchange = (e) => {
                this.setTeamFilter(e.target.value);
            };
            this.onTeamFilterChange = (val) => {
                teamSelect.value = val;
            };
        }

        // Checkbox: Hide Jury Runs
        const juryLabel = document.createElement('label');
        juryLabel.className = 'boca-checkbox-label';
        
        const juryCheckbox = document.createElement('input');
        juryCheckbox.type = 'checkbox';
        juryCheckbox.checked = this.juryHidden;
        juryCheckbox.onchange = (e) => this.toggleJury(e.target.checked);
        
        juryLabel.appendChild(juryCheckbox);
        juryLabel.appendChild(document.createTextNode('Hide jury runs'));
        container.appendChild(juryLabel);

        // Checkbox: Hide Deleted Runs
        const deletedLabel = document.createElement('label');
        deletedLabel.className = 'boca-checkbox-label';
        
        const deletedCheckbox = document.createElement('input');
        deletedCheckbox.type = 'checkbox';
        deletedCheckbox.checked = this.deletedHidden;
        deletedCheckbox.onchange = (e) => this.toggleDeleted(e.target.checked);
        
        deletedLabel.appendChild(deletedCheckbox);
        deletedLabel.appendChild(document.createTextNode('Hide deleted runs'));
        container.appendChild(deletedLabel);

        // Checkbox: HH:MM Format
        const timeLabel = document.createElement('label');
        timeLabel.className = 'boca-checkbox-label';
        
        const timeCheckbox = document.createElement('input');
        timeCheckbox.type = 'checkbox';
        timeCheckbox.checked = this.timeFormatHHMM;
        timeCheckbox.onchange = (e) => this.toggleTimeFormat(e.target.checked);
        
        timeLabel.appendChild(timeCheckbox);
        timeLabel.appendChild(document.createTextNode('Show time as HH:MM'));
        container.appendChild(timeLabel);

        // Notifications Button
        const notifyBtn = document.createElement('button');
        notifyBtn.innerHTML = '🎨 Highlighting';
        notifyBtn.style.padding = '5px 10px';
        notifyBtn.style.cursor = 'pointer';
        notifyBtn.style.marginLeft = '10px';
        notifyBtn.onclick = () => this.showNotificationModal();
        container.appendChild(notifyBtn);
    }

    // --- Problem Notification Feature ---

    showNotificationModal() {
        this.createNotificationModalIfNotExists();
        this.renderNotificationList();
        const modal = document.getElementById('boca-notification-modal');
        if (modal) modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    closeNotificationModal() {
        const modal = document.getElementById('boca-notification-modal');
        if (modal) modal.style.display = 'none';
        document.body.style.overflow = '';
    }

    createNotificationModalIfNotExists() {
        if (document.getElementById('boca-notification-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'boca-notification-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0,0,0,0.6)';
        modal.style.zIndex = '10001'; // Above code modal
        modal.style.display = 'none';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';

        const content = document.createElement('div');
        content.style.backgroundColor = '#fff';
        content.style.width = '500px';
        content.style.maxWidth = '90%';
        content.style.borderRadius = '8px';
        content.style.padding = '20px';
        content.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
        content.style.display = 'flex';
        content.style.flexDirection = 'column';

        // Header
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '20px';
        
        
        const title = document.createElement('h3');
        title.innerText = 'Problem Highlighting';
        title.style.margin = '0';

        const closeBtn = document.createElement('span');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.fontSize = '24px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.onclick = () => this.closeNotificationModal();

        header.appendChild(title);
        
        // Import Button (if applicable)
        const problemLink = document.querySelector('a[href*="problem.php"]');
        if (problemLink) {
             // Import Button
             const importBtn = document.createElement('button');
             importBtn.innerHTML = '📥 Import from BOCA';
             importBtn.style.marginLeft = 'auto'; // Push to right
             importBtn.style.marginRight = '15px';
             importBtn.style.padding = '5px 10px';
             importBtn.style.cursor = 'pointer';
             importBtn.style.backgroundColor = '#61afef';
             importBtn.style.color = 'white';
             importBtn.style.border = 'none';
             importBtn.style.borderRadius = '4px';
             
             importBtn.onclick = (e) => {
                 e.stopPropagation();
                 ModalHelper.confirm(
                     "This will overwrite existing highlighting rules for matching problems. Continue?",
                     () => this.importColorsFromProblemsPage(problemLink.href),
                     null,
                     {
                         title: "Import from BOCA",
                         confirmText: "Import",
                         confirmType: "primary"
                     }
                 );
             };
             header.appendChild(importBtn);
        }


        // Clear All Button
        const clearBtn = document.createElement('button');
        clearBtn.innerHTML = '🗑️ Clear All';
        clearBtn.style.marginLeft = '10px';
        clearBtn.style.padding = '5px 10px';
        clearBtn.style.cursor = 'pointer';
        clearBtn.style.backgroundColor = '#e06c75'; // Red
        clearBtn.style.color = 'white';
        clearBtn.style.border = 'none';
        clearBtn.style.borderRadius = '4px';
        
        clearBtn.onclick = (e) => {
            e.stopPropagation();
            ModalHelper.confirm(
                "Are you sure you want to remove all highlighting rules? This action cannot be undone.",
                () => this.clearAllNotifications(),
                null,
                {
                    title: "Clear All Highlights",
                    confirmText: "Clear All",
                    confirmType: "danger" // Default is usually red anyway
                }
            );
        };
        header.appendChild(clearBtn);

        header.appendChild(closeBtn);

        // Body - Add New
        const addForm = document.createElement('div');
        addForm.style.display = 'flex';
        addForm.style.gap = '10px';
        addForm.style.marginBottom = '20px';
        addForm.style.paddingBottom = '20px';
        addForm.style.borderBottom = '1px solid #eee';

        const problemInput = document.createElement('input');
        problemInput.id = 'boca-notify-problem-input';
        problemInput.type = 'text';
        problemInput.placeholder = 'Letter (e.g. A)';
        problemInput.style.padding = '8px';
        problemInput.style.width = '120px'; // Fixed width
        
        const aliasInput = document.createElement('input');
        aliasInput.id = 'boca-notify-alias-input';
        aliasInput.type = 'text';
        aliasInput.placeholder = 'Alias (Optional)';
        aliasInput.style.padding = '8px';
        aliasInput.style.flex = '1';

        const colorInput = document.createElement('input');
        colorInput.id = 'boca-notify-color-input';
        colorInput.type = 'color';
        colorInput.value = '#ff0000';
        colorInput.style.height = '35px';
        colorInput.style.width = '40px';
        colorInput.style.padding = '0';
        colorInput.style.border = 'none';
        colorInput.style.cursor = 'pointer';

        const addBtn = document.createElement('button');
        addBtn.innerText = 'Add';
        addBtn.style.padding = '8px 15px';
        addBtn.style.cursor = 'pointer';
        addBtn.style.backgroundColor = '#2196f3'; // Blue
        addBtn.style.color = 'white';
        addBtn.style.border = 'none';
        addBtn.style.borderRadius = '4px';
        addBtn.onclick = () => this.addNotificationFromInput();

        addForm.appendChild(problemInput);
        addForm.appendChild(aliasInput);
        addForm.appendChild(colorInput);
        addForm.appendChild(addBtn);

        // Body - List
        const listContainer = document.createElement('div');
        listContainer.id = 'boca-notify-list';
        listContainer.style.maxHeight = '300px';
        listContainer.style.overflowY = 'auto';

        content.appendChild(header);
        content.appendChild(addForm);
        content.appendChild(listContainer);
        modal.appendChild(content);

        modal.onclick = (e) => {
            if (e.target === modal) this.closeNotificationModal();
        };

        document.body.appendChild(modal);
    }

    renderNotificationList() {
        const container = document.getElementById('boca-notify-list');
        if (!container) return;

        container.innerHTML = '';

        if (this.notifications.length === 0) {
            container.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">No notifications configured.</div>';
            return;
        }

        this.notifications.forEach((item, index) => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.padding = '10px';
            row.style.borderBottom = '1px solid #eee';
            
            // Editable Color Preview
            const colorContainer = document.createElement('div');
            colorContainer.style.position = 'relative';
            colorContainer.style.marginRight = '10px';
            colorContainer.style.width = '24px';
            colorContainer.style.height = '24px';
            
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = item.color;
            colorInput.style.position = 'absolute';
            colorInput.style.top = '0';
            colorInput.style.left = '0';
            colorInput.style.width = '100%';
            colorInput.style.height = '100%';
            colorInput.style.opacity = '0'; // Hide standard input UI
            colorInput.style.cursor = 'pointer';
            colorInput.onchange = (e) => this.updateNotificationColor(index, e.target.value);

            const colorPreview = document.createElement('div');
            colorPreview.style.width = '100%';
            colorPreview.style.height = '100%';
            colorPreview.style.borderRadius = '50%';
            colorPreview.style.backgroundColor = item.color;
            colorPreview.style.border = '1px solid #ddd';
            colorPreview.style.pointerEvents = 'none'; // Let clicks pass to input

            colorContainer.appendChild(colorInput);
            colorContainer.appendChild(colorPreview);

            const text = document.createElement('div');
            text.innerHTML = `<strong>${item.problem}</strong>`;
            text.style.marginRight = '10px';
            text.style.minWidth = '20px';

            const aliasEdit = document.createElement('input');
            aliasEdit.type = 'text';
            aliasEdit.value = item.alias || '';
            aliasEdit.placeholder = 'Alias';
            aliasEdit.style.flex = '1';
            aliasEdit.style.marginRight = '10px';
            aliasEdit.style.padding = '4px';
            aliasEdit.style.border = '1px solid #ddd';
            aliasEdit.style.borderRadius = '3px';
            aliasEdit.onchange = (e) => this.updateNotificationAlias(index, e.target.value);
            
            // Show fullname as hint if not same as alias? 
            // Maybe just show it below or as title?
            if (item.fullname) {
                aliasEdit.title = `Full Name: ${item.fullname}`;
            }

            const delBtn = document.createElement('button');
            delBtn.innerHTML = '✕'; // Simple X
            delBtn.title = 'Remove';
            delBtn.style.background = 'none';
            delBtn.style.border = 'none';
            delBtn.style.color = '#999';
            delBtn.style.cursor = 'pointer';
            delBtn.style.fontSize = '16px';
            delBtn.onclick = () => this.removeNotification(index);

            row.appendChild(colorContainer);
            row.appendChild(colorContainer);
            row.appendChild(text);
            row.appendChild(aliasEdit);
            row.appendChild(delBtn);
            container.appendChild(row);
        });
    }

    updateNotificationColor(index, newColor) {
        if (this.notifications[index]) {
            this.notifications[index].color = newColor;
            this.notifications[index].textColor = this.getContrastColor(newColor);
            this.saveNotifications();
            this.renderNotificationList(); // Re-render to update preview
            this.applyProblemHighlights();
        }
    }

    updateNotificationAlias(index, newAlias) {
        if (this.notifications[index]) {
            this.notifications[index].alias = newAlias;
            this.saveNotifications();
            // No need to re-render list as input is already updated
            this.applyProblemHighlights(); 
        }
    }

    clearAllNotifications() {
        this.notifications = [];
        this.saveNotifications();
        this.renderNotificationList();
        this.applyProblemHighlights();
    }

    addNotificationFromInput() {
        const problemInput = document.getElementById('boca-notify-problem-input');
        const aliasInput = document.getElementById('boca-notify-alias-input');
        const colorInput = document.getElementById('boca-notify-color-input');
        
        const problem = problemInput.value.trim().toUpperCase(); // Normalize
        const alias = aliasInput.value.trim();
        const color = colorInput.value;

        if (!problem) {
            alert("Please enter a problem letter.");
            return;
        }

        // Calculate contrast text color
        const textColor = this.getContrastColor(color);

        // Check if exists, update if so
        const existingIndex = this.notifications.findIndex(n => n.problem === problem);
        const newObj = { problem, color, textColor, alias, fullname: '', basename: '' };
        
        if (existingIndex !== -1) {
            // Preserve other fields? 
            // If user explicitly adds, we overwrite key fields.
            // Maybe keep fullname if user didn't provide alias? No, logic is simple overwrite.
            this.notifications[existingIndex] = { ...this.notifications[existingIndex], ...newObj };
        } else {
            this.notifications.push(newObj);
        }

        this.saveNotifications();
        this.renderNotificationList();
        this.applyProblemHighlights(); // Apply immediately
        
        // Clear input
        problemInput.value = '';
        aliasInput.value = '';
    }

    removeNotification(index) {
        this.notifications.splice(index, 1);
        this.saveNotifications();
        this.renderNotificationList();
        this.applyProblemHighlights();
    }

    saveNotifications() {
        localStorage.setItem(this.storageKeyNotifications, JSON.stringify(this.notifications));
    }

    getContrastColor(hexColor) {
        // Convert hex to RGB
        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);
        
        // Calculate luminance
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#000000' : '#ffffff';
    }

    applyProblemHighlights() {
        const problemColIndex = this.getColumnIndex('Problem');
        if (problemColIndex === -1) return;

        const rows = Array.from(this.table.rows);
        
        // Create a map for faster lookup
        const problemMap = {};
        this.notifications.forEach(n => {
            // We store normalized (trimmed, uppercase usually implied) problem letters
            problemMap[n.problem] = n;
        });

        // Skip header
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const cell = row.cells[problemColIndex];
            if (!cell) continue;

            const cellText = cell.textContent.trim();
            // Try to match. Sometimes cells are "A - Problem Name".
            // We check if the cell starts with the configured problem + space or dash, or matches exactly.
            let match = null;

            // Check exact match first
            if (problemMap[cellText]) {
                match = problemMap[cellText];
            } else {
                // Check if starts with any configured problem
                for (const key in problemMap) {
                    if (cellText === key || 
                        cellText.startsWith(key + ' ') || 
                        cellText.startsWith(key + '-') ||
                        // Also check if fullname starts with it if we have it? No, key usually is short name "A"
                        // What if we match by fullname? The table usually shows "A - Full Name" or just "A"
                        // If we have fullname in metadata, we could try to match that too?
                        (problemMap[key].fullname && cellText.includes(problemMap[key].fullname))
                        ) {
                        match = problemMap[key];
                        break;
                    }
                }
            }

            if (match) {
                cell.style.backgroundColor = match.color;
                cell.style.color = match.textColor;
                // Add title with metadata or alias
                let title = '';
                if (match.alias) {
                    title = match.alias;
                    // Append detail if useful?
                    // title += ` (${match.fullname || match.problem})`;
                } else if (match.fullname) {
                    title = `${match.fullname} (${match.basename || '?'})`;
                }
                cell.title = title;
                
                // Since links inherit color, we might need to force link color too if setup
                const link = cell.querySelector('a');
                if (link) {
                    link.style.color = match.textColor;
                }
            } else {
                // Reset if not matched (important when removing notifications)
                cell.style.backgroundColor = '';
                cell.style.color = '';
                cell.title = '';
                const link = cell.querySelector('a');
                if (link) {
                    link.style.color = 'inherit';
                }
            }
        }
    }

    async importColorsFromProblemsPage(url) {
        // Confirmation is handled by UI now
        try {
            this.showToast("Fetching problems page...", "info");
            const response = await fetch(url);
            const text = await response.text();
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            
            // Find the correct table
            // Strategy: Look for headers "Short Name" and "Color"
            const tables = Array.from(doc.querySelectorAll('table'));
            const targetTable = tables.find(t => t.innerText.includes('Short Name') && t.innerText.includes('Color'));
            
            if (!targetTable) {
                throw new Error("Could not find Problems table in the fetched page.");
            }

            const rows = Array.from(targetTable.rows);
            let importedCount = 0;

            // Skipping header (row 0)
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const cells = row.cells;
                
                if (cells.length < 7) continue;

                // Column indices based on browser inspection:
                // 0: Problem #
                // 1: Short Name (Letter)
                // 2: Fullname
                // 3: Basename
                // 6: Color (contains inputs)

                const shortName = cells[1].textContent.trim();
                // Skip invalid or "General" problem (which is not a real problem)
                if (!shortName || shortName === 'Short Name' || shortName === 'General') continue;

                const fullname = cells[2].textContent.trim();
                const basename = cells[3].textContent.trim();

                // Extract Color
                // Try to find input with name starting with 'color' inside cell 6
                // Be careful to exclude 'colorname' inputs if possible, or just parse hex
                const colorCell = cells[6];
                const inputs = Array.from(colorCell.querySelectorAll('input[type="text"]'));
                
                // Usually BOCA has "colornameN" then "colorN" (hex)
                // Or sometimes just "colorN"
                // Let's look for the one that looks like a hex code or is the second input
                
                let hexColor = '#000000';
                
                // Strategy: Find input where name matches /^color\d+$/
                const hexInput = inputs.find(inp => /^color\d+$/.test(inp.name));
                
                if (hexInput) {
                    hexColor = hexInput.value;
                } else {
                     // Fallback: Try to find any input with hex value
                     const potentialHex = inputs.find(inp => /^#[0-9A-Fa-f]{6}$/.test(inp.value));
                     if (potentialHex) hexColor = potentialHex.value;
                }

                // If still fail, maybe it's just named 'color'
                if (!hexColor || hexColor === '#000000') {
                    // Check if there is a color name we can use? 
                    // No, we need hex for our picker usually, but we can store it.
                    // If verified extraction failure, defaults to black is safe.
                }

                // Add or Update
                const textColor = this.getContrastColor(hexColor);
                
                const existingIndex = this.notifications.findIndex(n => n.problem === shortName);
                const notificationObj = { 
                    problem: shortName, 
                    color: hexColor, 
                    textColor,
                    fullname, // Save original fullname
                    basename,
                    alias: fullname || shortName // Default alias to fullname
                };

                if (existingIndex !== -1) {
                    // Start with existing object to preserve user custom alias if they customized it?
                    // User request: "when importing from BOCA, by default, this alias should be the full name"
                    // This implies overwrite. Or should we respect existing alias?
                    // "by default" suggests initialization. If user edited it, maybe keep it?
                    // BUT re-import often means "reset/sync". 
                    // Let's overwrite alias with fullname to match "sync" behavior unless we want complexity.
                    // Given the request "this alias should be the full name", I'll overwrite.
                    this.notifications[existingIndex] = notificationObj;
                } else {
                    this.notifications.push(notificationObj);
                }
                importedCount++;
            }

            this.saveNotifications();
            this.renderNotificationList();
            this.applyProblemHighlights();
            this.showToast(`Successfully imported ${importedCount} problems from BOCA.`, "success");

        } catch (e) {
            console.error("Import failed:", e);
            this.showToast("Failed to import problems: " + e.message, "error");
        }
    }
}

