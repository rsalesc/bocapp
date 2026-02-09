class ModalHelper {
    /**
     * Shows a confirmation modal.
     * @param {string} message - The message to display.
     * @param {Function} onConfirm - Callback when confirmed.
     * @param {Function} onCancel - Callback when cancelled.
     * @param {Object} options - Custom options (title, confirmText, cancelText, confirmType).
     */
    static confirm(message, onConfirm, onCancel, options = {}) {
        // Create overlay
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: '20002', // Higher than notification modal (which is 10001)
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
        });

        // Create dialog
        const dialog = document.createElement('div');
        Object.assign(dialog.style, {
            backgroundColor: '#fff',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            fontFamily: 'Arial, sans-serif' // Maintain consistent font
        });

        // Title
        if (options.title) {
            const titleEl = document.createElement('h3');
            titleEl.innerText = options.title;
            titleEl.style.marginTop = '0';
            titleEl.style.marginBottom = '15px';
            titleEl.style.color = '#333';
            dialog.appendChild(titleEl);
        }

        // Message
        const msgEl = document.createElement('p');
        msgEl.innerText = message;
        msgEl.style.marginBottom = '20px';
        msgEl.style.fontSize = '14px';
        msgEl.style.lineHeight = '1.4';
        msgEl.style.color = '#555';
        dialog.appendChild(msgEl);

        // Buttons
        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.justifyContent = 'flex-end'; // Align right usually, or center? Center is fine for simple confirm.
        btnContainer.style.justifyContent = 'center';
        btnContainer.style.gap = '10px';

        // Cancel Button
        const cancelBtn = document.createElement('button');
        cancelBtn.innerText = options.cancelText || 'Cancel';
        Object.assign(cancelBtn.style, {
             padding: '8px 16px',
             backgroundColor: '#f5f5f5',
             color: '#333',
             border: '1px solid #ddd',
             borderRadius: '4px',
             cursor: 'pointer',
             fontSize: '14px'
        });
        cancelBtn.onmouseover = () => cancelBtn.style.backgroundColor = '#e0e0e0';
        cancelBtn.onmouseout = () => cancelBtn.style.backgroundColor = '#f5f5f5';

        // Confirm Button
        const confirmBtn = document.createElement('button');
        confirmBtn.innerText = options.confirmText || 'Confirm';
        
        let confirmBg = '#e06c75'; // Default red/danger
        let confirmHover = '#c05b65';
        
        if (options.confirmType === 'safe') {
             confirmBg = '#98c379'; // Green
             confirmHover = '#85ab6a';
        } else if (options.confirmType === 'primary') {
             confirmBg = '#61afef'; // Blue
             confirmHover = '#5294cc';
        }
        
        Object.assign(confirmBtn.style, {
            padding: '8px 16px',
            backgroundColor: confirmBg,
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
        });

        confirmBtn.onmouseover = () => confirmBtn.style.backgroundColor = confirmHover;
        confirmBtn.onmouseout = () => confirmBtn.style.backgroundColor = confirmBg;

        const close = () => {
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
        };

        confirmBtn.onclick = (e) => {
            e.stopPropagation();
            if (onConfirm) onConfirm();
            close();
        };

        cancelBtn.onclick = (e) => {
            e.stopPropagation();
            if (onCancel) onCancel();
            close();
        };

        btnContainer.appendChild(cancelBtn);
        btnContainer.appendChild(confirmBtn);

        dialog.appendChild(btnContainer);
        overlay.appendChild(dialog);

        // Click outside to cancel
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                if (onCancel) onCancel();
                close();
            }
        };

        document.body.appendChild(overlay);
    }
}
