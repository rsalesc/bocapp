class CodeViewer {
    constructor() {
        this.currentRunSource = null;
    }

    createModalIfNotExists() {
        if (document.getElementById('boca-code-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'boca-code-modal';
        Object.assign(modal.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.6)',
            zIndex: '10000',
            display: 'none',
            justifyContent: 'center',
            alignItems: 'center'
        });

        const content = document.createElement('div');
        Object.assign(content.style, {
            backgroundColor: '#282c34', // Atom One Dark bg
            color: '#abb2bf',
            width: '80%',
            maxWidth: '1000px',
            height: '80%',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            overflow: 'hidden'
        });

        // Header
        const header = document.createElement('div');
        Object.assign(header.style, {
            padding: '15px',
            borderBottom: '1px solid #3e4451',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        });

        const title = document.createElement('h3');
        title.id = 'boca-modal-title';
        title.style.margin = '0';
        title.style.fontSize = '16px';
        title.style.fontWeight = 'normal';
        title.style.color = '#e06c75'; // Reddish for emphasis

        const actions = document.createElement('div');
        actions.className = 'modal-actions';
        
        // Custom actions container
        const customActions = document.createElement('span');
        customActions.id = 'boca-modal-custom-actions';
        actions.appendChild(customActions);

        const downloadBtn = document.createElement('button');
        downloadBtn.id = 'boca-modal-download-btn';
        Object.assign(downloadBtn.style, {
            marginRight: '15px',
            padding: '5px 10px',
            cursor: 'pointer',
            backgroundColor: '#61afef',
            border: 'none',
            color: 'white',
            borderRadius: '4px',
            display: 'none'
        });

        const closeBtn = document.createElement('span');
        closeBtn.innerHTML = '&times;';
        Object.assign(closeBtn.style, {
            fontSize: '24px',
            cursor: 'pointer',
            lineHeight: '1'
        });
        closeBtn.onclick = () => this.close();

        actions.appendChild(downloadBtn);
        actions.appendChild(closeBtn);
        header.appendChild(title);
        header.appendChild(actions);

        // Body
        const body = document.createElement('div');
        Object.assign(body.style, {
            flex: '1',
            padding: '0',
            overflow: 'auto',
            position: 'relative'
        });

        const status = document.createElement('div');
        status.id = 'boca-code-status';
        Object.assign(status.style, {
            padding: '20px',
            textAlign: 'center'
        });

        const pre = document.createElement('pre');
        Object.assign(pre.style, {
            margin: '0',
            minHeight: '100%'
        });

        const code = document.createElement('code');
        code.id = 'boca-code-content';
        Object.assign(code.style, {
            fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
            fontSize: '13px',
            display: 'block',
            padding: '0'
        });

        pre.appendChild(code);
        body.appendChild(status);
        body.appendChild(pre);

        // Line numbers stylesheet
        const style = document.createElement('style');
        style.textContent = `
            .boca-code-table {
                border-collapse: collapse;
                width: 100%;
            }
            .boca-code-table td {
                vertical-align: top;
                padding: 0;
            }
            .boca-code-table .boca-line-numbers {
                width: 1px;
                white-space: nowrap;
                padding: 15px 0;
                text-align: right;
                user-select: none;
                -webkit-user-select: none;
                color: #636d83;
                border-right: 1px solid #3e4451;
                font-family: Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace;
                font-size: 13px;
                line-height: 1.45;
            }
            .boca-code-table .boca-line-numbers span {
                display: block;
                padding: 0 12px 0 15px;
            }
            .boca-code-table .boca-code-lines {
                padding: 15px;
                font-size: 13px;
                line-height: 1.45;
                overflow-x: auto;
            }
            .boca-code-table .boca-code-lines code {
                padding: 0 !important;
            }
        `;
        document.head.appendChild(style);

        content.appendChild(header);
        content.appendChild(body);
        modal.appendChild(content);

        // Click outside to close
        modal.onclick = (e) => {
            if (e.target === modal) this.close();
        };

        document.body.appendChild(modal);
    }

    show(options = {}) {
        this.createModalIfNotExists();
        const modal = document.getElementById('boca-code-modal');
        if (modal) modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        this._onKeyDown = (e) => {
            if (e.key === 'Escape') this.close();
        };
        document.addEventListener('keydown', this._onKeyDown);

        if (options.title) {
            this.setTitle(options.title);
        }
    }
    
    close() {
        const modal = document.getElementById('boca-code-modal');
        if (modal) modal.style.display = 'none';
        document.body.style.overflow = '';
        if (this._onKeyDown) {
            document.removeEventListener('keydown', this._onKeyDown);
            this._onKeyDown = null;
        }
    }

    setTitle(titleContent) {
        const titleEl = document.getElementById('boca-modal-title');
        if (titleEl) {
            titleEl.innerHTML = titleContent;
        }
    }

    setLoading(message = 'Loading source code...') {
        const statusEl = document.getElementById('boca-code-status');
        const codeBlock = document.getElementById('boca-code-content');
        const downloadBtn = document.getElementById('boca-modal-download-btn');
        const customActions = document.getElementById('boca-modal-custom-actions');

        if (statusEl) {
            statusEl.textContent = message;
            statusEl.style.display = 'block';
        }
        if (codeBlock) {
            codeBlock.textContent = '';
            codeBlock.className = '';
        }
        if (downloadBtn) downloadBtn.style.display = 'none';
        if (customActions) customActions.innerHTML = '';
    }

    setError(message) {
        const statusEl = document.getElementById('boca-code-status');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.style.display = 'block';
        }
    }

    setCode(codeText, language, filename, downloadUrl) {
        const statusEl = document.getElementById('boca-code-status');
        let codeBlock = document.getElementById('boca-code-content');
        const downloadBtn = document.getElementById('boca-modal-download-btn');

        if (statusEl) statusEl.style.display = 'none';

        // Reset: if line numbers table was injected, restore clean pre>code structure
        if (codeBlock) {
            const pre = codeBlock.closest('pre');
            if (pre && pre.querySelector('.boca-code-table')) {
                pre.innerHTML = '';
                const freshCode = document.createElement('code');
                freshCode.id = 'boca-code-content';
                Object.assign(freshCode.style, {
                    fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
                    fontSize: '13px',
                    display: 'block',
                    padding: '0'
                });
                pre.appendChild(freshCode);
                codeBlock = freshCode;
            }

            codeBlock.textContent = codeText;
            delete codeBlock.dataset.highlighted;
            
            // Language detection
            let langClass = '';
            const langLower = (language || '').toLowerCase();
            const filenameLower = (filename || '').toLowerCase();

            if (langLower.includes('c++') || langLower.includes('cpp') || filenameLower.endsWith('.cpp') || filenameLower.endsWith('.cc')) langClass = 'language-cpp';
            else if (langLower.includes('java') || filenameLower.endsWith('.java')) langClass = 'language-java';
            else if (langLower.includes('python') || filenameLower.endsWith('.py')) langClass = 'language-python';
            else if (langLower.includes('c') || filenameLower.endsWith('.c')) langClass = 'language-c';
            else if (langLower.includes('kotlin') || filenameLower.endsWith('.kt')) langClass = 'language-kotlin';

            if (langClass) codeBlock.classList.add(langClass);
            if (window.hljs) window.hljs.highlightElement(codeBlock);

            // Wrap in a table with line numbers
            this._addLineNumbers(codeBlock);
        }

        if (downloadBtn && downloadUrl) {
            downloadBtn.onclick = () => window.open(downloadUrl, '_blank');
            downloadBtn.style.display = 'inline-block';
            downloadBtn.innerText = `Download ${filename || ''}`;
        }
    }

    renderDiff(oldText, newText, oldLabel, newLabel) {
        const statusEl = document.getElementById('boca-code-status');
        const container = document.getElementById('boca-code-content');
        
        if (statusEl) statusEl.style.display = 'none';
        
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

            container.innerHTML = '';
            container.className = ''; 

            const diffContainer = document.createElement('div');
            diffContainer.style.fontFamily = 'Consolas, monospace';
            diffContainer.style.whiteSpace = 'pre-wrap';
            diffContainer.style.color = '#abb2bf';

            const header = document.createElement('div');
            Object.assign(header.style, {
                marginBottom: '10px',
                paddingBottom: '10px',
                borderBottom: '1px solid #555',
                fontSize: '14px'
            });
            
            header.innerHTML = `Comparing: <strong>${oldLabel}</strong> <br/> vs <br/> <strong>${newLabel}</strong>`;
            diffContainer.appendChild(header);

            diffs.forEach(diff => {
                const type = diff[0];
                const text = diff[1];
                
                const span = document.createElement('span');
                span.textContent = text;
                
                if (type === 1) { // Insert
                    span.style.backgroundColor = 'rgba(40, 167, 69, 0.2)';
                    span.style.color = '#a6e22e';
                } else if (type === -1) { // Delete
                    span.style.backgroundColor = 'rgba(220, 53, 69, 0.2)';
                    span.style.color = '#f92672';
                    span.style.textDecoration = 'line-through'; 
                }
                diffContainer.appendChild(span);
            });
            
            container.appendChild(diffContainer);

        } catch (e) {
            console.error("Error in renderDiff:", e);
            if (container) container.textContent = "Error rendering diff: " + e.message;
        }
    }

    _addLineNumbers(codeBlock) {
        const pre = codeBlock.parentElement;
        if (!pre) return;

        const lines = codeBlock.innerHTML.split('\n');
        // Remove trailing empty line if present
        if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

        const table = document.createElement('table');
        table.className = 'boca-code-table';

        const lineNumsTd = document.createElement('td');
        lineNumsTd.className = 'boca-line-numbers';

        const codeTd = document.createElement('td');
        codeTd.className = 'boca-code-lines';

        for (let i = 1; i <= lines.length; i++) {
            const span = document.createElement('span');
            span.textContent = i;
            lineNumsTd.appendChild(span);
        }

        const newCode = document.createElement('code');
        newCode.id = 'boca-code-content';
        newCode.className = codeBlock.className;
        Object.assign(newCode.style, {
            fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
            fontSize: '13px',
            display: 'block',
            padding: '0',
            whiteSpace: 'pre'
        });
        newCode.innerHTML = lines.join('\n');

        codeTd.appendChild(newCode);

        const row = document.createElement('tr');
        row.appendChild(lineNumsTd);
        row.appendChild(codeTd);
        table.appendChild(row);

        // Replace the pre content with the table
        pre.innerHTML = '';
        pre.appendChild(table);
    }

    // Helper to add custom buttons to the modal header
    addCustomAction(element) {
        const customActions = document.getElementById('boca-modal-custom-actions');
        if (customActions) {
            customActions.appendChild(element);
        }
    }
}
