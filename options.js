// Saves options to chrome.storage
function saveOptions() {
  const domain = document.getElementById('domain').value;
  chrome.storage.sync.set({
    targetDomain: domain
  }, function() {
    // Update status to let user know options were saved.
    const status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 1500);
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restoreOptions() {
  chrome.storage.sync.get({
    targetDomain: '' // Default value
  }, function(items) {
    document.getElementById('domain').value = items.targetDomain;
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
