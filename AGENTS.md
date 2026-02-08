# Boca++ Extension Agent Guide

This file documents key learnings about the Boca++ extension, its target environment, and development workflows.

## Target Environment

-   **Target URL**: `http://137.184.1.39/boca/admin/run.php` (Admin Runs Page)
    -   *Note*: The extension logic is primarily injected here (checked via `window.location.pathname.includes('run.php')`).
-   **Credentials**:
    -   **Username**: `admin`
    -   **Password**: `boca`

## Extension Structure & Injection

-   **Manifest**: `manifest.json` handles the configuration.
-   **Content Script**: `content.js` is the main entry point.
-   **Injection Logic**:
    -   The script injects a container `div` with ID `#boca-plusplus-container`.
    -   **Positioning**: The container is injected **AFTER** the navigation menu.
    -   **Navigation Menu Selector**: The navigation menu is a `<table>` element containing links with the class `.menu`. The most robust way to find it is:
        ```javascript
        const menuLinks = document.querySelectorAll('.menu');
        const menuTable = menuLinks[0].closest('table');
        ```
    -   **Fallback**: If the `.menu` table isn't found, it falls back to looking for tables containing specific text like "run.php" or simply the first table.
    -   **URL Parameters**: Every URL param injected by the extension should start with
    a common prefix `bpp` and follow camelCase (e.g., `bppHideJury`).

## Development & Verification Workflow

1.  **Modify Code**: Edit `content.js`, `utils.js`, etc.
2.  **RELOAD THE EXTENSION**:
    -   **CRITICAL**: NEVER try to simulate the extension by injecting `content.js` or other scripts via the browser agent. It is unreliable and does not test the actual extension loading.
    -   **ACTION**: Explicitly ask the user to reload the unpacked extension in their browser (`chrome://extensions`) and refresh the target page.
    -   **VERIFICATION**: Only after the user confirms they have reloaded, use the browser agent to *observe* the effects (e.g., check for UI elements), but do not inject code.
3.  **Verify**:
    -   **Browser Agent**: Use the browser agent to visit the target URL.
    -   **Visual Check**: Look for the "Boca++ Controls" box.
    -   **DOM Check**: Verify the container's position relative to the navigation menu using `compareDocumentPosition` or by inspecting the DOM tree.

## DOM Insights

-   **Browser**: Always use the browser agent to get insights about the HTML layout.
-   **BOCA Layout**: BOCA uses a legacy table-based layout.
-   **Navigation**: The main navigation bar is a table with multiple `.menu` links.
-   **Header**: There is often a header table above the navigation menu (yellow background, user info).
-   **Content**: The main content (runs list) usually follows the navigation menu.

## Future Tips

-   When modifying injection points, always verify against the specific structure of the BOCA `run.php` page, as it is old-school HTML (tables nested in tables).
-   Use `closest('table')` when starting from a known child element (like a `.menu` link) to safely find containers.
-   **CRITICAL**: Never assume anything about the DOM. Always open the browser and actually go through the page. Look at the DOM and make decisions based on that.

## Code Quality & Modularity

-   **Separation of Concerns**: Keep the code modular.
    -   Avoid monolithic files. If `content.js` or others grow too large, **split them**.
    -   Use **additional files** and **classes** to encapsulate logic (e.g., separate classes for UI injection, data parsing, event handling).
    -   Don't hesitate to create new files (e.g., `modules/UiController.js`, `modules/Parser.js`) to keep responsibilities clear.
    -   Ensure each class or module has a single, well-defined responsibility.
