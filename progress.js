/**
 * Create a progress bar with optional percentage display
 * @param {string} elementId - ID of the container element
 * @param {number|array} progress - Either a number (0-100) or array of segment endpoints
 * @param {number} decimals - Number of decimal places to show (-1 to hide percentage)
 */
function createProgressBar(elementId, progress, decimals = -1) {
    const container = document.getElementById(elementId);
    if (!container) {
        console.error(`Element with id "${elementId}" not found`);
        return;
    }

    let segments = [];
    let displayValue = null;

    if (typeof progress === 'number') {
        // Single value: green from 0 to progress, gray from progress to 100
        segments = [
            { start: 0, end: progress, color: '#4caf50' },
            { start: progress, end: 100, color: '#e0e0e0' }
        ];
        displayValue = progress;
    } else if (Array.isArray(progress)) {
        // Array of endpoints: pair them up to create segments
        // [0, 18, 32, 46, 75, 100] → 0-18 (green), 18-32 (gray), 32-46 (green), etc.
        segments = [];
        for (let i = 0; i < progress.length - 1; i++) {
            const isGreen = i % 2 === 0;
            segments.push({
                start: progress[i],
                end: progress[i + 1],
                color: isGreen ? '#4caf50' : '#e0e0e0'
            });
        }
        // For arrays, don't show a percentage
        displayValue = null;
    }

    // Clear container
    container.innerHTML = '';

    // Create bar wrapper
    const barWrapper = document.createElement('div');
    barWrapper.style.display = 'flex';
    barWrapper.style.gap = '8px';
    barWrapper.style.alignItems = 'center';
    barWrapper.style.width = '100%';

    // Create progress bar
    const bar = document.createElement('div');
    bar.style.flex = '1';
    bar.style.height = '24px';
    bar.style.backgroundColor = '#e0e0e0';
    bar.style.borderRadius = '12px';
    bar.style.overflow = 'hidden';
    bar.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.1)';

    // Create segment elements
    segments.forEach(segment => {
        const width = segment.end - segment.start;
        const fill = document.createElement('div');
        fill.style.width = width + '%';
        fill.style.backgroundColor = segment.color;
        fill.style.height = '100%';
        fill.style.float = 'left';
        bar.appendChild(fill);
    });

    barWrapper.appendChild(bar);

    // Add percentage label if decimals >= 0
    if (decimals >= 0 && displayValue !== null) {
        const label = document.createElement('span');
        label.textContent = displayValue.toFixed(decimals) + '%';
        label.style.minWidth = '50px';
        label.style.textAlign = 'right';
        label.style.fontSize = '14px';
        label.style.fontWeight = 'bold';
        label.style.color = '#333';
        label.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        barWrapper.appendChild(label);
    }

    container.appendChild(barWrapper);
}
