const canvas = document.getElementById('starfield');
const ctx = canvas.getContext('2d');

let stars = [];
let namedStars = [];
let view = {
    offsetX: 0,
    offsetY: 0,
    zoom: 1,
    isDragging: false,
    lastX: 0,
    lastY: 0
};

let quizState = {
    answered: 0,
    correct: 0,
    currentStar: null,
    correctAnswer: null,
    quizActive: false
};

let showGrid = false;

const MAX_MAGNITUDE = 8;
const MIN_MAGNITUDE = -1.5;
const BASE_STAR_SIZE = 2;
const STAR_SIZE_RANGE = 8;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    render();
}

async function loadStarData() {
    try {
        const response = await fetch('stars.json');
        const data = await response.json();
        
        stars = data.stars;
        namedStars = data.namedStars;
        
        console.log(`Loaded ${stars.length} stars, ${namedStars.length} named stars`);
        
        resetView();
        render();
    } catch (error) {
        console.error('Error loading star data:', error);
        alert('Error loading star data. Please check the console for details.');
    }
}

function starSize(magnitude) {
    const normalizedMag = (magnitude - MAX_MAGNITUDE) / (MIN_MAGNITUDE - MAX_MAGNITUDE);
    return BASE_STAR_SIZE + normalizedMag * STAR_SIZE_RANGE;
}

function worldToScreen(ra, dec) {
    const screenX = canvas.width / 2 + view.offsetX + (ra - 12) * (Math.min(canvas.width, canvas.height) / 24) * view.zoom;
    const screenY = canvas.height / 2 + view.offsetY - dec * (Math.min(canvas.width, canvas.height) / 180) * view.zoom;
    return { x: screenX, y: screenY };
}

function screenToWorld(x, y) {
    const ra = 12 + (x - canvas.width / 2 - view.offsetX) / (Math.min(canvas.width, canvas.height) / 24) / view.zoom;
    const dec = -(y - canvas.height / 2 - view.offsetY) / (Math.min(canvas.width, canvas.height) / 180) / view.zoom;
    return { ra, dec };
}

function render() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (showGrid) {
        renderGrid();
    }
    
    renderStars();
}

function renderGrid() {
    ctx.strokeStyle = 'rgba(74, 144, 217, 0.3)';
    ctx.lineWidth = 1;
    
    for (let ra = 0; ra <= 24; ra += 2) {
        const pos = worldToScreen(ra, 0);
        ctx.beginPath();
        ctx.moveTo(pos.x, 0);
        ctx.lineTo(pos.x, canvas.height);
        ctx.stroke();
    }
    
    for (let dec = -90; dec <= 90; dec += 30) {
        const pos = worldToScreen(0, dec);
        ctx.beginPath();
        ctx.moveTo(0, pos.y);
        ctx.lineTo(canvas.width, pos.y);
        ctx.stroke();
    }
}

function renderStars() {
    const { minRa, maxRa, minDec, maxDec } = getViewBounds();
    
    stars.forEach(star => {
        if (star.ra < minRa || star.ra > maxRa || star.dec < minDec || star.dec > maxDec) {
            return;
        }
        
        const pos = worldToScreen(star.ra, star.dec);
        
        if (pos.x < 0 || pos.x > canvas.width || pos.y < 0 || pos.y > canvas.height) {
            return;
        }
        
        const size = starSize(star.mag);
        const alpha = Math.max(0.1, 1 - (star.mag - MIN_MAGNITUDE) / (MAX_MAGNITUDE - MIN_MAGNITUDE));
        
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, size * view.zoom, 0, Math.PI * 2);
        ctx.fill();
    });
}

function getViewBounds() {
    const topLeft = screenToWorld(0, 0);
    const bottomRight = screenToWorld(canvas.width, canvas.height);
    
    return {
        minRa: Math.min(topLeft.ra, bottomRight.ra),
        maxRa: Math.max(topLeft.ra, bottomRight.ra),
        minDec: Math.min(topLeft.dec, bottomRight.dec),
        maxDec: Math.max(topLeft.dec, bottomRight.dec)
    };
}

function resetView() {
    view.offsetX = 0;
    view.offsetY = 0;
    view.zoom = 1;
}

function updateStats() {
    document.getElementById('answered').textContent = quizState.answered;
    document.getElementById('correct').textContent = quizState.correct;
    
    const rate = quizState.answered > 0 ? 
        Math.round((quizState.correct / quizState.answered) * 100) : 0;
    document.getElementById('success-rate').textContent = rate + '%';
}

function findNearestStars(centerStar, count = 3) {
    const distances = namedStars
        .filter(star => star.id !== centerStar.id)
        .map(star => ({
            star,
            distance: calculateStarDistance(centerStar, star)
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, count);
    
    return distances.map(d => d.star);
}

function calculateStarDistance(star1, star2) {
    const dx = star1.x - star2.x;
    const dy = star1.y - star2.y;
    const dz = star1.z - star2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function showQuizPopup(star) {
    const distractors = findNearestStars(star);
    const options = [star, ...distractors];
    
    shuffleArray(options);
    
    quizState.currentStar = star;
    quizState.correctAnswer = star;
    quizState.quizActive = true;
    
    const optionsContainer = document.getElementById('quiz-options');
    optionsContainer.innerHTML = '';
    
    options.forEach(option => {
        const label = document.createElement('label');
        label.innerHTML = `
            <input type="radio" name="star-name" value="${option.id}">
            ${option.proper}
        `;
        optionsContainer.appendChild(label);
    });
    
    document.getElementById('quiz-popup').classList.remove('hidden');
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function handleQuizSubmit(event) {
    event.preventDefault();
    
    const selected = document.querySelector('input[name="star-name"]:checked');
    if (!selected) {
        alert('Please select an answer');
        return;
    }
    
    const selectedId = parseInt(selected.value);
    const isCorrect = selectedId === quizState.correctAnswer.id;
    
    quizState.answered++;
    if (isCorrect) {
        quizState.correct++;
    }
    
    updateStats();
    
    document.getElementById('quiz-popup').classList.add('hidden');
    showFeedback(isCorrect, quizState.correctAnswer.proper);
    
    quizState.quizActive = false;
}

function showFeedback(isCorrect, correctName) {
    const icon = document.getElementById('feedback-icon');
    const text = document.getElementById('feedback-text');
    
    if (isCorrect) {
        icon.textContent = '✓';
        icon.className = 'correct';
        text.textContent = 'Correct!';
        text.className = 'correct';
    } else {
        icon.textContent = '✗';
        icon.className = 'incorrect';
        text.textContent = `Incorrect. The correct answer was ${correctName}`;
        text.className = 'incorrect';
    }
    
    document.getElementById('feedback-popup').classList.remove('hidden');
}

function skipQuestion() {
    document.getElementById('quiz-popup').classList.add('hidden');
    quizState.quizActive = false;
}

function showResults() {
    document.getElementById('final-answered').textContent = quizState.answered;
    document.getElementById('final-correct').textContent = quizState.correct;
    
    const rate = quizState.answered > 0 ? 
        Math.round((quizState.correct / quizState.answered) * 100) : 0;
    document.getElementById('final-success-rate').textContent = rate + '%';
    
    document.getElementById('results-popup').classList.remove('hidden');
}

function resetQuiz() {
    quizState = {
        answered: 0,
        correct: 0,
        currentStar: null,
        correctAnswer: null,
        quizActive: false
    };
    
    updateStats();
    document.getElementById('results-popup').classList.add('hidden');
}

function handleCanvasClick(event) {
    if (quizState.quizActive) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const worldPos = screenToWorld(x, y);
    
    const { minRa, maxRa, minDec, maxDec } = getViewBounds();
    
    let nearestStar = null;
    let nearestDist = Infinity;
    
    stars.forEach(star => {
        if (star.ra < minRa || star.ra > maxRa || star.dec < minDec || star.dec > maxDec) {
            return;
        }
        
        const pos = worldToScreen(star.ra, star.dec);
        const dx = x - pos.x;
        const dy = y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < nearestDist) {
            nearestDist = dist;
            nearestStar = star;
        }
    });
    
    const clickThreshold = 10 * view.zoom;
    
    if (nearestStar && nearestDist < clickThreshold && nearestStar.proper && nearestStar.proper !== 'Sol') {
        showQuizPopup(nearestStar);
    }
}

function setupEventListeners() {
    canvas.addEventListener('mousedown', (e) => {
        view.isDragging = true;
        view.lastX = e.clientX;
        view.lastY = e.clientY;
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (!view.isDragging) return;
        
        const dx = e.clientX - view.lastX;
        const dy = e.clientY - view.lastY;
        
        view.offsetX += dx;
        view.offsetY += dy;
        
        view.lastX = e.clientX;
        view.lastY = e.clientY;
        
        render();
    });
    
    canvas.addEventListener('mouseup', () => {
        view.isDragging = false;
    });
    
    canvas.addEventListener('mouseleave', () => {
        view.isDragging = false;
    });
    
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const worldBefore = screenToWorld(mouseX, mouseY);
        
        view.zoom *= zoomFactor;
        view.zoom = Math.max(0.5, Math.min(5, view.zoom));
        
        const worldAfter = screenToWorld(mouseX, mouseY);
        
        view.offsetX += (worldAfter.ra - worldBefore.ra) * (Math.min(canvas.width, canvas.height) / 24) * view.zoom;
        view.offsetY -= (worldAfter.dec - worldBefore.dec) * (Math.min(canvas.width, canvas.height) / 180) * view.zoom;
        
        render();
    });
    
    canvas.addEventListener('click', handleCanvasClick);
    
    document.getElementById('grid-toggle').addEventListener('change', (e) => {
        showGrid = e.target.checked;
        render();
    });
    
    document.getElementById('done-btn').addEventListener('click', showResults);
    
    document.getElementById('quiz-form').addEventListener('submit', handleQuizSubmit);
    
    document.getElementById('skip-btn').addEventListener('click', skipQuestion);
    
    document.getElementById('close-feedback').addEventListener('click', () => {
        document.getElementById('feedback-popup').classList.add('hidden');
    });
    
    document.getElementById('reset-btn').addEventListener('click', resetQuiz);
    
    window.addEventListener('resize', resizeCanvas);
}

async function init() {
    resizeCanvas();
    setupEventListeners();
    await loadStarData();
}

init();
