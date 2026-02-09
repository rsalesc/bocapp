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
    }

    init() {
        this.loadState(); // This now calls updateRowVisibility to handle jury, problem, and team filtering
        this.setupProblemColumnInteractions();
        this.setupTeamColumnInteractions();
        this.setupRowClickHandlers();
        this.applyAnswerColors();
        this.setupCodeViewerButtons();
        this.setupRunHighlighting();
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
    }
}

