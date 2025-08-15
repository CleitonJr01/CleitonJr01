(() => {
	'use strict';

	/**
	 * Configurações do jogo
	 */
	const CELL_SIZE = 24; // px por célula no canvas base 480x480 => 20x20
	const GRID_COLS = 20;
	const GRID_ROWS = 20;
	const INITIAL_SPEED_MS = 160; // menor = mais rápido
	const MIN_SPEED_MS = 80;
	const SPEED_STEP = 8; // acelera a cada comida, até limite

	/** Canvas e contexto */
	const canvas = document.getElementById('board');
	const ctx = canvas.getContext('2d');

	/** UI */
	const overlay = document.getElementById('overlay');
	const btnStart = document.getElementById('btn-start');
	const btnPlay = document.getElementById('btn-play');
	const btnRestart = document.getElementById('btn-restart');
	const scoreEl = document.getElementById('score');
	const bestEl = document.getElementById('best');
	const speedEl = document.getElementById('speed');

	/** Estado */
	let snake = [];
	let direction = { x: 1, y: 0 };
	let nextDirection = { x: 1, y: 0 };
	let food = null;
	let score = 0;
	let best = Number(localStorage.getItem('cobrinha_best') || 0);
	let speedMs = INITIAL_SPEED_MS;
	let isRunning = false;
	let isGameOver = false;
	let loopId = null;

	bestEl.textContent = String(best);
	speedEl.textContent = `${Math.round(INITIAL_SPEED_MS / speedMs)}x`;

	function initGame() {
		// cobra inicial
		snake = [
			{ x: 8, y: 10 },
			{ x: 7, y: 10 },
			{ x: 6, y: 10 },
		];
		direction = { x: 1, y: 0 };
		nextDirection = { x: 1, y: 0 };
		score = 0;
		speedMs = INITIAL_SPEED_MS;
		isRunning = false;
		isGameOver = false;
		food = spawnFood();
		updateHud();
		render();
		showOverlay(true);
	}

	function start() {
		if (isRunning && !isGameOver) { pause(); return; }
		if (isGameOver) { initGame(); }
		isRunning = true;
		showOverlay(false);
		btnPlay.textContent = '⏸';
		loop();
	}

	function pause() {
		isRunning = false;
		btnPlay.textContent = '▶';
		if (loopId) cancelAnimationFrame(loopId);
		showOverlay(true, 'Pausado', 'Pressione para continuar');
	}

	function gameOver() {
		isRunning = false;
		isGameOver = true;
		btnPlay.textContent = '▶';
		if (loopId) cancelAnimationFrame(loopId);
		if (score > best) {
			best = score;
			localStorage.setItem('cobrinha_best', String(best));
			bestEl.textContent = String(best);
		}
		showOverlay(true, 'Fim de jogo', `Score: ${score}`);
	}

	function loop() {
		let lastTime = 0;
		function frame(time) {
			if (!isRunning) return;
			if (!lastTime) lastTime = time;
			const delta = time - lastTime;
			if (delta >= speedMs) {
				update();
				render();
				lastTime = time;
			}
			loopId = requestAnimationFrame(frame);
		}
		loopId = requestAnimationFrame(frame);
	}

	function update() {
		// aplica próxima direção apenas se não for inverso
		if (!isOpposite(nextDirection, direction)) {
			direction = nextDirection;
		}

		const newHead = {
			x: snake[0].x + direction.x,
			y: snake[0].y + direction.y,
		};

		// colisão com paredes
		if (newHead.x < 0 || newHead.x >= GRID_COLS || newHead.y < 0 || newHead.y >= GRID_ROWS) {
			gameOver();
			return;
		}
		// colisão com corpo
		if (snake.some((seg, idx) => idx !== 0 && seg.x === newHead.x && seg.y === newHead.y)) {
			gameOver();
			return;
		}

		snake.unshift(newHead);

		// comeu comida
		if (food && newHead.x === food.x && newHead.y === food.y) {
			score += 10;
			if (speedMs > MIN_SPEED_MS) speedMs = Math.max(MIN_SPEED_MS, speedMs - SPEED_STEP);
			food = spawnFood();
			updateHud();
		} else {
			snake.pop();
		}
	}

	function render() {
		// limpar
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// grade sutil
		drawGrid();

		// desenhar comida
		if (food) drawFood(food);

		// desenhar cobra
		drawSnake();
	}

	function drawGrid() {
		ctx.save();
		ctx.globalAlpha = 0.08;
		ctx.strokeStyle = '#7cf1ff';
		for (let x = 0; x <= GRID_COLS; x++) {
			ctx.beginPath();
			ctx.moveTo(x * CELL_SIZE + 0.5, 0);
			ctx.lineTo(x * CELL_SIZE + 0.5, GRID_ROWS * CELL_SIZE);
			ctx.stroke();
		}
		for (let y = 0; y <= GRID_ROWS; y++) {
			ctx.beginPath();
			ctx.moveTo(0, y * CELL_SIZE + 0.5);
			ctx.lineTo(GRID_COLS * CELL_SIZE, y * CELL_SIZE + 0.5);
			ctx.stroke();
		}
		ctx.restore();
	}

	function drawCell(x, y, color) {
		const px = x * CELL_SIZE;
		const py = y * CELL_SIZE;
		const r = 6;
		ctx.fillStyle = color;
		roundRect(ctx, px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4, r, true, false);
	}

	function drawSnake() {
		// glow camaleão
		const head = snake[0];
		const hue = (score * 2 + head.x * 6 + head.y * 6) % 360;
		ctx.shadowBlur = 16;
		ctx.shadowColor = `hsla(${hue}, 90%, 60%, .35)`;

		snake.forEach((seg, i) => {
			const isHead = i === 0;
			const base = isHead ? `hsl(${hue}, 90%, 62%)` : `hsl(${(hue + i * 4) % 360}, 70%, 50%)`;
			drawCell(seg.x, seg.y, base);
			if (isHead) drawEyes(seg);
		});

		ctx.shadowBlur = 0;
	}

	function drawEyes(head) {
		const cx = head.x * CELL_SIZE + CELL_SIZE / 2;
		const cy = head.y * CELL_SIZE + CELL_SIZE / 2;
		const r = 3;
		ctx.fillStyle = '#0b1220';
		ctx.beginPath(); ctx.arc(cx - 5, cy - 5, r, 0, Math.PI * 2); ctx.fill();
		ctx.beginPath(); ctx.arc(cx + 5, cy - 5, r, 0, Math.PI * 2); ctx.fill();
	}

	function drawFood(f) {
		ctx.save();
		ctx.shadowBlur = 18;
		ctx.shadowColor = 'rgba(255, 180, 60, .6)';
		drawCell(f.x, f.y, '#ffb347');
		ctx.restore();
	}

	function spawnFood() {
		let pos;
		do {
			pos = {
				x: Math.floor(Math.random() * GRID_COLS),
				y: Math.floor(Math.random() * GRID_ROWS),
			};
		} while (snake.some(seg => seg.x === pos.x && seg.y === pos.y));
		return pos;
	}

	function isOpposite(a, b) {
		return a.x === -b.x && a.y === -b.y;
	}

	function roundRect(ctx, x, y, w, h, r, fill, stroke) {
		if (typeof r === 'number') r = { tl: r, tr: r, br: r, bl: r };
		ctx.beginPath();
		ctx.moveTo(x + r.tl, y);
		ctx.lineTo(x + w - r.tr, y);
		ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
		ctx.lineTo(x + w, y + h - r.br);
		ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
		ctx.lineTo(x + r.bl, y + h);
		ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
		ctx.lineTo(x, y + r.tl);
		ctx.quadraticCurveTo(x, y, x + r.tl, y);
		ctx.closePath();
		if (fill) ctx.fill();
		if (stroke) ctx.stroke();
	}

	function updateHud() {
		scoreEl.textContent = String(score);
		bestEl.textContent = String(best);
		const mult = Math.round(INITIAL_SPEED_MS / speedMs);
		speedEl.textContent = `${mult}x`;
	}

	function showOverlay(show, title, message) {
		if (show) {
			overlay.innerHTML = `
				<div class="card">
					<h2>${title || 'Toque para jogar'}</h2>
					<p>${message || 'Use as setas do teclado ou deslize na tela.'}</p>
					<button class="btn primary" id="btn-start">${isGameOver ? 'Recomeçar' : 'Começar'}</button>
				</div>
			`;
			overlay.style.display = 'grid';
			// reatribui referência do botão start
			overlay.querySelector('#btn-start').addEventListener('click', start);
		} else {
			overlay.style.display = 'none';
		}
	}

	/** Inputs teclado */
	document.addEventListener('keydown', (e) => {
		const key = e.key.toLowerCase();
		if (key === 'arrowup' || key === 'w') nextDirection = { x: 0, y: -1 };
		else if (key === 'arrowdown' || key === 's') nextDirection = { x: 0, y: 1 };
		else if (key === 'arrowleft' || key === 'a') nextDirection = { x: -1, y: 0 };
		else if (key === 'arrowright' || key === 'd') nextDirection = { x: 1, y: 0 };
		else if (key === ' ' || key === 'k' || key === 'p') start();
	});

	/** Botões UI */
	btnPlay.addEventListener('click', start);
	btnRestart.addEventListener('click', () => { initGame(); start(); });
	if (btnStart) btnStart.addEventListener('click', start);
	overlay.addEventListener('click', () => { start(); });

	/** Controles por toque e swipe */
	const dpadButtons = document.querySelectorAll('.dpad');
	dpadButtons.forEach(btn => btn.addEventListener('click', () => {
		const dir = btn.getAttribute('data-dir');
		if (dir === 'up') nextDirection = { x: 0, y: -1 };
		if (dir === 'down') nextDirection = { x: 0, y: 1 };
		if (dir === 'left') nextDirection = { x: -1, y: 0 };
		if (dir === 'right') nextDirection = { x: 1, y: 0 };
		if (!isRunning) start();
	}));

	let touchStartX = 0, touchStartY = 0;
	canvas.addEventListener('touchstart', (e) => {
		const t = e.touches[0];
		touchStartX = t.clientX; touchStartY = t.clientY;
	}, { passive: true });
	canvas.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });
	canvas.addEventListener('touchend', (e) => {
		const t = e.changedTouches[0];
		const dx = t.clientX - touchStartX;
		const dy = t.clientY - touchStartY;
		if (Math.abs(dx) > Math.abs(dy)) {
			nextDirection = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
		} else {
			nextDirection = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
		}
		if (!isRunning) start();
	});

	// Ajuste de pixel ratio para manter canvas nítido
	function resizeCanvasForDPR() {
		const size = Math.min(window.innerWidth * 0.88, 520);
		const logicalSize = Math.floor(size / CELL_SIZE) * CELL_SIZE;
		const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
		canvas.style.width = `${logicalSize}px`;
		canvas.style.height = `${logicalSize}px`;
		canvas.width = logicalSize * dpr;
		canvas.height = logicalSize * dpr;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}
	window.addEventListener('resize', resizeCanvasForDPR);

	// Inicialização
	resizeCanvasForDPR();
	initGame();
})();