document.addEventListener('DOMContentLoaded', async () => {
    const honeycomb = document.getElementById('honeycomb');
    const container = document.querySelector('.honeycomb-container');
    const MAX_CELLS_PER_ROW = 7;
    let lastClickTime = 0;

    // Initialize pan and zoom variables
    let scale = 1;
    let isDragging = false;
    let startX = undefined;
    let startY = undefined;
    let translateX = 0;
    let translateY = 0;
    let lastTranslateX = 0;
    let lastTranslateY = 0;
    let hasMoved = false;
    const DRAG_THRESHOLD = 5; // pixels

    // Function to load and parse YAML file
    async function loadSkills() {
        try {
            const response = await fetch('skilltree.yaml');
            const yamlText = await response.text();
            return jsyaml.load(yamlText);
        } catch (error) {
            console.error('Error loading skills:', error);
            return [];
        }
    }

    // Create honeycomb cells
    async function createHoneycomb() {
        const skills = await loadSkills();
        honeycomb.innerHTML = '';
        
        // Create a container for each row
        let currentRow = [];
        let rows = [currentRow];
        
        skills.forEach((skill, index) => {
            // Start a new row if current row is at max capacity
            if (currentRow.length >= MAX_CELLS_PER_ROW) {
                currentRow = [];
                rows.push(currentRow);
            }
            
            const cell = document.createElement('div');
            cell.className = 'honeycomb-cell';
            cell.setAttribute('data-type', skill.type);
            
            // Add link if present
            if (skill.link) {
                cell.setAttribute('data-link', skill.link);
            }
            
            const inner = document.createElement('div');
            inner.className = 'honeycomb-cell-inner';
            
            const content = document.createElement('div');
            content.className = 'honeycomb-cell__content';
            
            const title = document.createElement('div');
            title.className = 'honeycomb-cell__title';
            title.textContent = skill.task;
            
            content.appendChild(title);
            inner.appendChild(content);
            cell.appendChild(inner);
            
            // Add click handler for links
            if (skill.link) {
                cell.addEventListener('click', (e) => {
                    // Prevent click if we're dragging
                    const currentTime = new Date().getTime();
                    const timeSinceLastClick = currentTime - lastClickTime;
                    if (hasMoved || timeSinceLastClick < 300) return;
                    lastClickTime = currentTime;
                    
                    window.open(skill.link, '_blank');
                });
            }
            
            currentRow.push(cell);
            honeycomb.appendChild(cell);
        });

        // Add empty cells to make rows alternate between even and odd lengths
        rows.forEach((row, rowIndex) => {
            const isEvenRow = rowIndex % 2 === 0;
            const targetLength = isEvenRow ? 
                Math.min(MAX_CELLS_PER_ROW, Math.ceil(row.length / 2) * 2) : 
                Math.min(MAX_CELLS_PER_ROW, Math.floor(row.length / 2) * 2 + 1);
            
            while (row.length < targetLength) {
                const emptyCell = document.createElement('div');
                emptyCell.className = 'honeycomb-cell';
                emptyCell.style.visibility = 'hidden';
                
                const inner = document.createElement('div');
                inner.className = 'honeycomb-cell-inner';
                
                const content = document.createElement('div');
                content.className = 'honeycomb-cell__content';
                
                inner.appendChild(content);
                emptyCell.appendChild(inner);
                row.push(emptyCell);
                honeycomb.appendChild(emptyCell);
            }
        });

        alignHexagons();
    }

    // Function to align hexagons and mark odd rows
    function alignHexagons() {
        const cells = document.querySelectorAll('.honeycomb-cell');
        let lastLeft = -500;
        let isOdd = false;
        let rows = [[]];
        let j = 0;

        for (let i = 0; i < cells.length; i++) {
            const pos = cells[i].getBoundingClientRect();
            if (pos.left < lastLeft) {
                isOdd = !isOdd;
                j++;
                rows[j] = [];
            }
            rows[j].push(cells[i]);
            lastLeft = pos.left;
            
            if (isOdd) {
                cells[i].classList.add('odd-row');
            } else {
                cells[i].classList.remove('odd-row');
            }
        }

        // Fix alignment between rows
        for (let i = 0; i < rows.length - 1; i++) {
            if ((rows[i].length % 2) !== (rows[i + 1].length % 2)) {
                for (let j = 0; j < rows[i + 1].length; j++) {
                    rows[i + 1][j].classList.toggle('odd-row');
                }
            }
        }
    }

    // Handle mouse/touch events for panning
    function handleStart(e) {
        if (e.touches && e.touches.length > 1) return;
        isDragging = true;
        hasMoved = false;
        startX = (e.touches ? e.touches[0].clientX : e.clientX);
        startY = (e.touches ? e.touches[0].clientY : e.clientY);
        container.style.cursor = 'grabbing';
    }

    function handleMove(e) {
        if (!isDragging) return;
        e.preventDefault();
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        const deltaX = clientX - startX;
        const deltaY = clientY - startY;
        
        // Check if movement exceeds threshold
        if (!hasMoved && (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD)) {
            hasMoved = true;
        }
        
        translateX = lastTranslateX + deltaX;
        translateY = lastTranslateY + deltaY;
        updateTransform();
    }

    function handleEnd() {
        isDragging = false;
        startX = undefined;
        startY = undefined;
        lastTranslateX = translateX;
        lastTranslateY = translateY;
        container.style.cursor = 'grab';
    }

    // Mouse events
    container.addEventListener('mousedown', handleStart);
    container.addEventListener('mousemove', handleMove);
    container.addEventListener('mouseup', handleEnd);
    container.addEventListener('mouseleave', handleEnd);

    // Touch events
    container.addEventListener('touchstart', handleStart, { passive: true });
    container.addEventListener('touchmove', handleMove, { passive: false });
    container.addEventListener('touchend', handleEnd);
    container.addEventListener('touchcancel', handleEnd);

    // Zoom controls
    document.getElementById('zoom-in').addEventListener('click', () => {
        scale = Math.min(scale * 1.2, 3);
        updateTransform();
    });

    document.getElementById('zoom-out').addEventListener('click', () => {
        scale = Math.max(scale * 0.8, 0.5);
        updateTransform();
    });

    function updateTransform() {
        honeycomb.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    }

    // Initialize the honeycomb
    createHoneycomb();
    container.style.cursor = 'grab';

    // Set initial zoom level
    scale = scale * 1.728;
    updateTransform();

    // Re-align hexagons on window resize
    window.addEventListener('resize', alignHexagons);
});
