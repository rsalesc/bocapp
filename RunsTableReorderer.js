class RunsTableReorderer {
    constructor(table) {
        this.table = table;
        this.storageKeyOrder = 'boca_plusplus_runs_table_order';
        this.storageKeyHidden = 'boca_plusplus_runs_table_hidden';
        this.dragSrcEl = null;
        this.hiddenColumns = new Set();
    }

    injectStyles() {
        if (document.getElementById('boca-plusplus-styles')) return;
        const style = document.createElement('style');
        style.id = 'boca-plusplus-styles';
        style.textContent = `
            .boca-dragging {
                opacity: 0.4;
                background-color: #e0e0e0;
            }
            .boca-drag-over {
                border-left: 2px solid #007bff;
                background-color: #f0f8ff;
            }
            [draggable="true"] {
                cursor: grab;
                user-select: none;
                position: relative;
            }
            [draggable="true"]:active {
                cursor: grabbing;
            }
            .boca-hide-btn {
                position: absolute;
                right: 2px;
                top: 50%;
                transform: translateY(-50%);
                cursor: pointer;
                font-size: 12px;
                color: #888;
                padding: 0 4px;
                line-height: 1;
                display: none;
                background: rgba(255,255,255,0.7);
                border-radius: 3px;
            }
            [draggable="true"]:hover .boca-hide-btn {
                display: block;
            }
            .boca-hide-btn:hover {
                color: red;
                font-weight: bold;
            }
            #boca-hidden-columns {
                margin-top: 10px;
                display: flex;
                flex-wrap: wrap;
                gap: 5px;
            }
            .boca-column-chip {
                background-color: #e0e0e0;
                border-radius: 12px;
                padding: 2px 8px;
                font-size: 12px;
                display: flex;
                align-items: center;
                gap: 5px;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            .boca-column-chip:hover {
                background-color: #d0d0d0;
            }
            .boca-chip-close {
                font-weight: bold;
                color: #555;
            }
            .boca-checkbox-label {
                display: flex;
                align-items: center;
                gap: 5px;
                font-size: 14px;
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
    }

    init() {
        this.loadState();
        this.enableDragAndDrop();
        this.injectHideButtons();
        this.renderHiddenChips();
        this.applyHiddenState();
    }

    getHeaders() {
        // Return existing header cells as an array
        // We assume the first row is the header row
        return Array.from(this.table.rows[0].cells);
    }

    getHeaderText(cell) {
        // Ignore the hide button text if present
        const clone = cell.cloneNode(true);
        const btn = clone.querySelector('.boca-hide-btn');
        if (btn) btn.remove();
        return clone.innerText.trim();
    }

    loadState() {
        // Load Order
        const currentHeaders = this.getHeaders().map(cell => this.getHeaderText(cell));
        const savedOrder = JSON.parse(localStorage.getItem(this.storageKeyOrder) || '[]');
        
        let finalOrder = savedOrder;

        // If no saved order, use current
        if (savedOrder.length === 0) {
            finalOrder = currentHeaders;
        } else {
            // Merge logic
            const validSavedOrder = savedOrder.filter(header => currentHeaders.includes(header));
            const newHeaders = currentHeaders.filter(header => !validSavedOrder.includes(header));
            finalOrder = [...validSavedOrder, ...newHeaders];
        }

        // Apply Order
        if (JSON.stringify(finalOrder) !== JSON.stringify(currentHeaders)) {
            this.reorderTable(finalOrder);
        }

        // Load Hidden Columns
        const savedHidden = JSON.parse(localStorage.getItem(this.storageKeyHidden) || '[]');
        this.hiddenColumns = new Set(savedHidden.filter(h => currentHeaders.includes(h)));
    }

    saveState() {
        const currentOrder = this.getHeaders().map(cell => this.getHeaderText(cell));
        localStorage.setItem(this.storageKeyOrder, JSON.stringify(currentOrder));
        localStorage.setItem(this.storageKeyHidden, JSON.stringify(Array.from(this.hiddenColumns)));
        console.log("Saved state.", { order: currentOrder, hidden: this.hiddenColumns });
    }

    injectHideButtons() {
        const headers = this.getHeaders();
        headers.forEach(header => {
            if (this.getHeaderText(header) === '++') return; // Do not allow hiding ++ column

            if (!header.querySelector('.boca-hide-btn')) {
                const btn = document.createElement('span');
                btn.className = 'boca-hide-btn';
                btn.innerText = '✕';
                btn.title = 'Hide column';
                btn.onclick = (e) => {
                    e.stopPropagation();
                    this.hideColumn(this.getHeaderText(header));
                };
                header.appendChild(btn);
            }
        });
    }

    hideColumn(headerName) {
        this.hiddenColumns.add(headerName);
        this.applyHiddenState();
        this.renderHiddenChips();
        this.saveState();
    }

    showColumn(headerName) {
        this.hiddenColumns.delete(headerName);
        this.applyHiddenState();
        this.renderHiddenChips();
        this.saveState();
    }

    applyHiddenState() {
        const headers = this.getHeaders();
        const headerTexts = headers.map(h => this.getHeaderText(h));
        
        // Find indices of hidden columns
        const hiddenIndices = headerTexts
            .map((text, index) => this.hiddenColumns.has(text) ? index : -1)
            .filter(index => index !== -1);

        const rows = Array.from(this.table.rows);
        rows.forEach(row => {
            const cells = Array.from(row.cells);
            cells.forEach((cell, index) => {
                 if (hiddenIndices.includes(index)) {
                     cell.style.display = 'none';
                 } else {
                     cell.style.display = ''; // Restore default
                 }
            });
        });
    }

    renderHiddenChips() {
        let chipsContainer = document.getElementById('boca-hidden-columns');
        if (!chipsContainer) {
            // Find our main container
            const mainContainer = document.getElementById('boca-plusplus-container');
            if (mainContainer) {
                chipsContainer = document.createElement('div');
                chipsContainer.id = 'boca-hidden-columns';
                mainContainer.appendChild(chipsContainer);
            } else {
                return; // Container not ready
            }
        }

        chipsContainer.innerHTML = '';
        if (this.hiddenColumns.size === 0) return;

        const label = document.createElement('span');
        label.innerText = 'Hidden: ';
        label.style.fontSize = '12px';
        label.style.color = '#666';
        label.style.alignSelf = 'center';
        chipsContainer.appendChild(label);

        this.hiddenColumns.forEach(colName => {
            const chip = document.createElement('div');
            chip.className = 'boca-column-chip';
            chip.innerHTML = `<span>${colName}</span> <span class="boca-chip-close">+</span>`;
            chip.onclick = () => this.showColumn(colName);
            chipsContainer.appendChild(chip);
        });
    }

    reorderTable(order) {
        // order is an array of header texts
        
        const headerRow = this.table.rows[0];
        const currentCells = Array.from(headerRow.cells);
        
        // Build a map of header text -> info
        const permutation = [];
        
        // Let's create a list of current objects { text, originalIndex }
        let tempCurrent = currentCells.map((cell, index) => ({ text: this.getHeaderText(cell), index, cell }));
        
        // For each item in `order`, find it in tempCurrent and move it
        order.forEach(targetText => {
            const foundIdx = tempCurrent.findIndex(item => item.text === targetText);
            if (foundIdx !== -1) {
                permutation.push(tempCurrent[foundIdx]);
                // Remove to handle potential duplicates correctly (first match consumes)
                tempCurrent.splice(foundIdx, 1); 
            }
        });
        
        // If there are leftovers (new columns not in saved order), append them
        permutation.push(...tempCurrent);

        // Reorder every row
        const rows = Array.from(this.table.rows);
        rows.forEach(row => {
            const cells = Array.from(row.cells);
            if (cells.length === currentCells.length) {
                 // We can't just appendChild because we might be messing up the order if we don't do it carefully
                 // Better to just append them in the new order.
                 // Since checking correctness, let's just append strictly in the order of permutation
                 
                 // Clear row? No, that causes flash.
                 // We can overwrite or move. appending moves existing nodes.
                 permutation.forEach(item => {
                     row.appendChild(cells[item.index]); 
                 });
            }
        });
        
        // After reordering, we might need to re-inject buttons if they were lost? 
        // No, elements are moved, so event listeners and children persist.
    }

    enableDragAndDrop() {
        const headers = this.getHeaders();
        headers.forEach(header => {
            header.setAttribute('draggable', 'true');
            // header.style.cursor = 'move'; // Handled by CSS now
            this.addDnDEvents(header);
        });
    }

    addDnDEvents(element) {
        // Remove old listeners to avoid duplicates if called multiple times?
        // For now, assume init calls once. 
        element.addEventListener('dragstart', this.handleDragStart.bind(this));
        element.addEventListener('dragenter', this.handleDragEnter.bind(this));
        element.addEventListener('dragover', this.handleDragOver.bind(this));
        element.addEventListener('dragleave', this.handleDragLeave.bind(this));
        element.addEventListener('drop', this.handleDrop.bind(this));
        element.addEventListener('dragend', this.handleDragEnd.bind(this));
    }

    handleDragStart(e) {
        this.dragSrcEl = e.target.closest('td');
        if (!this.dragSrcEl) return;
        
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.dragSrcEl.innerHTML);
        this.dragSrcEl.classList.add('boca-dragging');
    }

    handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        e.dataTransfer.dropEffect = 'move';
        return false;
    }

    handleDragEnter(e) {
        const target = e.target.closest('td');
        if (target && target !== this.dragSrcEl) {
            target.classList.add('boca-drag-over');
        }
    }

    handleDragLeave(e) {
        const target = e.target.closest('td');
        if (target) {
            target.classList.remove('boca-drag-over');
        }
    }

    handleDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }
        
        const target = e.target.closest('td');
        
        if (this.dragSrcEl && target && this.dragSrcEl !== target) {
            const headers = this.getHeaders();
            const sourceIndex = headers.indexOf(this.dragSrcEl);
            const targetIndex = headers.indexOf(target);
            
            if (sourceIndex !== -1 && targetIndex !== -1) {
                this.moveColumn(sourceIndex, targetIndex);
                this.saveState();
            }
        }
        return false;
    }

    handleDragEnd(e) {
        const headers = this.getHeaders();
        headers.forEach(header => {
            header.classList.remove('boca-drag-over');
            header.classList.remove('boca-dragging');
        });
    }

    moveColumn(fromIndex, toIndex) {
        const rows = Array.from(this.table.rows);
        rows.forEach(row => {
            const cells = row.cells;
            if (cells.length > Math.max(fromIndex, toIndex)) {
                const sourceCell = cells[fromIndex];
                const targetCell = cells[toIndex];
                
                if (fromIndex < toIndex) {
                     row.insertBefore(sourceCell, targetCell.nextSibling);
                } else {
                    row.insertBefore(sourceCell, targetCell);
                }
            }
        });
    }
}
