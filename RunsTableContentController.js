class RunsTableContentController {
    constructor(table) {
        this.table = table;
        this.storageKeyTimeFormat = 'boca_plusplus_time_format';
        this.juryHidden = false;
        this.timeFormatHHMM = false;
        this.problemFilter = '';
        this.teamFilter = '';
        this.onProblemFilterChange = null;
        this.onTeamFilterChange = null;
    }

    init() {
        this.loadState(); // This now calls updateRowVisibility to handle jury, problem, and team filtering
        this.setupProblemColumnInteractions();
        this.setupTeamColumnInteractions();
        this.setupRowClickHandlers();
        this.applyAnswerColors();
        this.setupCodeViewerButtons();
    }

    loadState() {
        // Load Jury Hidden State from URL
        const hideJuryParam = getUrlState('bppHideJury');
        this.juryHidden = hideJuryParam === 'true';

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
        this.applyTimeFormat();
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

        return {
            runId: runId,
            time: timeColIndex !== -1 ? row.cells[timeColIndex].textContent.trim() : '?',
            problem: problemColIndex !== -1 ? row.cells[problemColIndex].textContent.trim() : '?',
            language: langColIndex !== -1 ? row.cells[langColIndex].textContent.trim() : '?',
            answer: answerColIndex !== -1 ? row.cells[answerColIndex].textContent.trim() : '?',
            team: userColIndex !== -1 ? row.cells[userColIndex].textContent.trim() : '?'
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

            cell.appendChild(viewBtn);
        }
    }

    async openCodeViewer(runPageUrl, metadata) {
        this.createModalIfNotExists();
        this.showModal();
        this.updateModalTitle(metadata);
        
        // Find existing pre and recreate code block to ensure clean state for highlight.js
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

        const codeBlock = document.getElementById('boca-code-content');
        const statusEl = document.getElementById('boca-code-status');
        const downloadLinkBtn = document.getElementById('boca-modal-download-btn');
        
        statusEl.textContent = 'Loading source code...';
        statusEl.style.display = 'block';
        downloadLinkBtn.style.display = 'none';

        try {
            console.log("Fetching run page:", runPageUrl);
            const response = await fetch(runPageUrl);
            const text = await response.text();
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');

            // Find valid download link
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
                // Setup download button
                downloadLinkBtn.onclick = () => window.open(downloadUrl, '_blank');
                downloadLinkBtn.style.display = 'inline-block';
                downloadLinkBtn.innerText = `Download`;

                // Fetch content
                console.log("Fetching source from:", downloadUrl);
                const sourceResponse = await fetch(downloadUrl);
                const sourceText = await sourceResponse.text();

                statusEl.style.display = 'none';
                codeBlock.textContent = sourceText;
                
                // Determine language class for highlight.js
                let langClass = '';
                const langLower = metadata.language.toLowerCase();
                const filenameLower = filename.toLowerCase();

                if (langLower.includes('c++') || langLower.includes('cpp') || filenameLower.endsWith('.cpp') || filenameLower.endsWith('.cc')) langClass = 'language-cpp';
                else if (langLower.includes('java') || filenameLower.endsWith('.java')) langClass = 'language-java';
                else if (langLower.includes('python') || filenameLower.endsWith('.py')) langClass = 'language-python';
                else if (langLower.includes('c') || filenameLower.endsWith('.c')) langClass = 'language-c';
                else if (langLower.includes('kotlin') || filenameLower.endsWith('.kt')) langClass = 'language-kotlin';
                
                if (langClass) codeBlock.classList.add(langClass);

                // Highlight
                if (window.hljs) {
                    window.hljs.highlightElement(codeBlock);
                }
            } else {
                statusEl.textContent = "Could not find source code link.";
            }

        } catch (e) {
            console.error("Error loading code:", e);
            statusEl.textContent = "Error loading source code.";
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
        }
    }
}
