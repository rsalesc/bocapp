class RunEditContentController {
    constructor() {
        this.codeViewer = new CodeViewer();
    }

    init() {
        console.log("RunEditContentController: Initializing...");
        this.injectViewHandlers();
    }

    injectViewHandlers() {
        const tables = document.querySelectorAll('table');
        
        tables.forEach(table => {
            const rows = Array.from(table.rows);
            rows.forEach(row => {
                if (row.cells.length < 2) return;

                const labelCell = row.cells[0];
                const labelText = labelCell.textContent.trim().toLowerCase();

                if (labelText.includes("team's code") || labelText.includes("source code")) {
                    // Try to find filedownload link directly first (e.g. if we are on runview.php, it might be there)
                    // Or if runedit.php has it.
                    const links = Array.from(row.querySelectorAll('a'));
                    const fileDownloadLink = links.find(l => l.href.includes('filedownload.php'));
                    
                    // Also find the "view" link which user mentioned is what we should replace
                    const viewLink = links.find(l => l.textContent.trim().toLowerCase() === 'view');
                    
                    // If we have a view link, hijack it
                    if (viewLink && fileDownloadLink && fileDownloadLink.href) {
                        // Create a clean replacement element (span) to ensure no old listeners or href behavior persists
                        const newViewBtn = document.createElement('span');
                        newViewBtn.textContent = viewLink.textContent;
                        newViewBtn.className = viewLink.className;
                        newViewBtn.style.cursor = 'pointer';
                        newViewBtn.style.color = getComputedStyle(viewLink).color; // Try to keep color
                        newViewBtn.style.textDecoration = 'underline'; // Make it look like a link
                        newViewBtn.style.fontWeight = 'bold';
                        
                        newViewBtn.onclick = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            this.handleViewClick(viewLink.href, fileDownloadLink.href);
                        };
                        
                        viewLink.parentNode.replaceChild(newViewBtn, viewLink);
                    }
                    
                    // If we are on runview.php, maybe the row just has "Download" or filename link
                    // The user said "replace the behavior of the view link".
                }
            });
        });
    }

    async handleViewClick(viewUrl, directDownloadUrl) {
        // Prepare title
        // Try to get Run ID from URL
        let runId = '?';
        try {
            const urlObj = new URL(viewUrl);
            runId = urlObj.searchParams.get('runnumber') || urlObj.searchParams.get('runid') || '?';
        } catch (e) {}

        const title = `<span style="color:#61afef; font-weight:bold;">Run ${runId}</span>`;

        this.codeViewer.show({ title });
        this.codeViewer.setLoading();

        try {
            let codeText = '';
            let downloadUrl = directDownloadUrl;
            let filename = `Run ${runId}`;

            // If we have a direct download URL, use it
            if (directDownloadUrl) {
                console.log("Fetching direct download:", directDownloadUrl);
                const resp = await fetch(directDownloadUrl);
                codeText = await resp.text();
            }

            this.codeViewer.setCode(codeText, '', filename, downloadUrl);

        } catch (e) {
            console.error("RunEditContentController error:", e);
            this.codeViewer.setError("Error loading source: " + e.message);
        }
    }
}
