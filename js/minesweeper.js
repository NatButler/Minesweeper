(function() {

var game, started, table, flagSpan, face, newGameButton, levelSelect, tds;
var modes = new Dictionary({
	"Easy": {
		"width": 9,
		"height": 9,
		"mines": 10
	},
	"Intermediate": {
		"width": 16,
		"height": 16,
		"mines": 40
	},
	"Hard": {
		"width": 30,
		"height": 16,
		"mines": 99
	}
});

var directions = new Dictionary({
	"n":  new Point(0, -1),
 	"ne": new Point(1, -1),
 	"e":  new Point(1, 0),
	"se": new Point(1, 1),
	"s":  new Point(0, 1),
	"sw": new Point(-1, 1),
	"w":  new Point(-1, 0),
	"nw": new Point(-1, -1)
});

window.onload = function() {
	cache();
	init("Intermediate");
}

function cache() {
	table = document.getElementById('grid');
	flagSpan = document.getElementById('flag-count');
	face = document.getElementById('face');
	newGameButton = document.getElementById('new-game');
	bestTime = document.getElementById('best-time');
	levelSelect = document.getElementsByTagName('input');
}

function init(mode) {
	started = false;
	game = new Minesweeper(modes.lookup(mode));
	tds = document.body.getElementsByTagName('td');

	registerEventHandlers(tds, "click", handleCellClick);
	newGameButton.addEventListener('click', gameReset);
	
	flagSpan.innerHTML = game.flags;
	if (storage.check(mode)) { bestTime.innerHTML = "Best: " + storage.get(mode); } 
}


// POINT CONSTRUCTOR
function Point(x, y) {
	this.x = x;
	this.y = y;
}
Point.prototype.add = function(other) {
	return new Point(this.x + other.x, this.y + other.y);
}


// CELL CONSTRUCTOR
function Cell(value, status) {
	this.value = value;
	this.status = status;
}


// GRID CONSTRUCTOR
function Grid(width, height) {
	this.width = width;
	this.height = height;
	this.cells = new Array(width * height);
}
Grid.prototype.valueAt = function(point) {
	return this.cells[point.y * this.width + point.x];
}
Grid.prototype.setValueAt = function(point, value) {
	this.cells[point.y * this.width + point.x] = value;
}
Grid.prototype.setStatusAt = function(point, status) {
	this.cells[point.y * this.width + point.x]["status"] = status;
}
Grid.prototype.isInside = function(point) {
	return point.x >= 0 && point.y >= 0 &&
		   point.x < this.width && point.y < this.height;
}
Grid.prototype.each = function(action) {
	for (var y = 0; y < this.height; y++) {
		for (var x = 0; x < this.width; x++) {
			var point = new Point(x, y);
			action(point, this.valueAt(point));
		}
	}
}


// MINESWEEPER CONSTRUCTOR
function Minesweeper(mode) {
	this.mode = mode;
	this.flags = mode.mines;
	this.grid = new Grid(mode.width, mode.height);
	this.mines;
	
	table.innerHTML = this.buildTable();
}
Minesweeper.prototype.buildTable = function() {
	var table = [];
	for (var y = 0; y < this.mode.height; y++) {
		var x = 0;
		table.push('<tr>');

		for (x; x < this.mode.width; x++) {
			this.grid.setValueAt( new Point(x, y), new Cell("blank") ); // Perhaps remove to setMines()?
			table.push('<td id="'+x+'_'+y+'" class="blank"></td>');
		}
		table.push('</tr>');
	}
	return table.join('');
}
Minesweeper.prototype.setMines = function(point) {
	this.mines = this.generateMines(point);

	for (var i = 0, len = this.mines.length; i < len; i++ ) {
		this.grid.setValueAt( this.mines[i], new Cell("mine") );
	}
}
Minesweeper.prototype.generateMines = function(point) {
	var avoidArr = getSurroundingCells(point),
			randPoints = [];

	avoidArr.push(point);

	for (var i = 0; i < this.mode.mines; i++) {
		randPoints[i] = new Point( randomInt(0, this.mode.width - 1), randomInt(0, this.mode.height - 1) );

		for (var j = 0; j <= i-1; j++) {
			if ( compareObj(randPoints[j], randPoints[i]) ) { i--; } // duplicate found so decrement i
		}
		for (var k = 0, len = avoidArr.length; k < len; k++) {
			if ( compareObj(avoidArr[k], randPoints[i]) ) { i--; } 
		}
	}
	return randPoints;
}
Minesweeper.prototype.setFlag = function(inc) {
	(inc) ? this.flags++ : this.flags--;
}


// DICTIONARY CONSTRUCTOR
function Dictionary(startValues) {
	this.values = startValues || {};
}
Dictionary.prototype.store = function(name, value) {
	this.values[name] = value;
}
Dictionary.prototype.lookup = function(name) {
	return this.values[name];
}
Dictionary.prototype.contains = function(name) { // Not used
	return Object.prototype.propertyIsEnumerable.call(this.values, name);
}
Dictionary.prototype.each = function(action) {
	forEachIn(this.values, action);
}


function gameStart(point) {
	started = true;
	game.setMines(point);
	timer();
}

function gameOver() {
	stopTimer();
	unregisterEventHandlers(tds, "click", handleCellClick);
	face.innerHTML = '<img src="img/fail-face.png" alt="fail-face" />';
}

function gameComplete() {
	stopTimer();
	unregisterEventHandlers(tds, "click", handleCellClick);
	face.innerHTML = '<img src="img/cool-face.png" alt="cool-face" />';

	if (storage.check(mode)) { // Save time to local storage; display best time
		if (storage.get(mode) > time.textContent) {
			storage.set(mode, time.textContent);
			time.className += " new-best-time";
		}
	} 
	else { storage.set(mode, time.textContent); }
}

function gameReset() {
	stopTimer();
	resetTimer();
	time.className = '';
	face.innerHTML = '';
	bestTime.innerHTML = '';

	forEach(levelSelect, function(select) {
		if (select.checked) { init( select.getAttribute('data-mode') ); }
	});
}

function handleCellClick(e) {
	var coords = this.id.split('_'),
			point = new Point(+coords[0], +coords[1]),
			cell = game.grid.valueAt(point),
			view = [point];

	if (e.altKey) { 							// Handle flagged
		if (!cell.status && game.flags) {
			game.grid.setStatusAt(point, "flagged");
			game.setFlag();

			if (!game.flags) { 
				if (!checkForUnflaggedMines(game.mines)) { gameComplete(); }
			}
		} 

		else if (cell.status === "flagged") {
			game.grid.setStatusAt(point);
			game.setFlag(true);
		}

		flagSpan.innerHTML = game.flags;
	} 
	else { 												// Handle click
		if (!started) { gameStart(point); }									
		if (!cell.status) {

			if (cell.value === "mine") {
				view = revealMines(point);
				gameOver();
			} 

			else if (cell.value === "blank") {
				if ( !hasMinesBordering(point) ) {
					game.grid.setStatusAt(point, "open");
					findSurroundingBlankCells(view);
					return;
				} 
				else {
					game.grid.setValueAt( point, new Cell( "bordering", "open_"+hasMinesBordering(point) ) );
				}
			}

		}
	}
	updateView(view);
}

function updateView(view) {
	view.forEach(point => {
		var cell = game.grid.valueAt(point),
				td = tds[point.y * game.grid.width + point.x];

		td.className = (cell.status) ? cell.status : "blank";
		if (cell.value === "bordering") { td.innerHTML = cell.status.split('_')[1]; }
	});
}

function findSurroundingBlankCells(cells, view) {
	var blankCells = [];
	view = (view) ? view : [];

	for (var j = 0, len = cells.length; j < len; j++) {
		var currentCell = cells[j],
				surroundingCells = getSurroundingCells(currentCell);

		view.push(currentCell);

		for (var i = 0, leng = surroundingCells.length; i < leng; i++) {
			var point = surroundingCells[i],
					mines = hasMinesBordering(point);

			if ( !mines ) {
				if (!game.grid.valueAt(point).status) { blankCells.push(point); }
				game.grid.setStatusAt(point, "open");
			}
			else {
				if (!game.grid.valueAt(point).status) {
					game.grid.setValueAt( point, new Cell("bordering", "open_" + mines) );
					view.push(point);
				}
			}
		}
	}

	if (blankCells.length) { findSurroundingBlankCells(blankCells, view); }
	else { updateView(view); }
}

var hasMinesBordering = compose(checkForMines, getSurroundingCells);

function getSurroundingCells(point) {
	var cells = [];
	directions.each(function(name, direction) {
		var outerCell = point.add(direction);
		if (game.grid.isInside(outerCell)) { cells.push(outerCell); }
	});
	return cells;
}

function checkForMines(cells) {
	return cells.reduce((mines, point) => {
		if (game.grid.valueAt(point).value === "mine") { mines++; }
		return mines;
	}, 0);
}

function checkForUnflaggedMines(mines) {
	var remainingMines = 0;
	for (var i = 0, len = mines.length; i < len; i++) {
		if (game.grid.valueAt(mines[i]).status !== "flagged") {
			remainingMines++;
			break;
		}
	}
	return remainingMines;
}

function revealMines(point) {
	var view = game.mines;
	game.grid.each(function(point, cell) {
		if (cell.value !== "mine" && cell.status === "flagged") {
			game.grid.setStatusAt(point, "mis-flagged");
			view.push(point);
		}
		else if (cell.value === "mine" && cell.status !== "flagged") {
			game.grid.setStatusAt(point, "revealed");
		}
	});

	game.grid.setStatusAt(point, "exploaded");
	return view;
}


// UTILITY FUNCTIONS
function forEach(array, action) {
	for (var i = 0, len = array.length; i < len; i++) {
		action(array[i]);
	}
}

function forEachIn(object, action) {
	for (var property in object) {
		if (Object.prototype.hasOwnProperty.call(object, property)) {
			action(property, object[property]);
		}
	}
}

function compareObj(a, b) {
	return (JSON.stringify(a) == JSON.stringify(b));
}

function randomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

function registerEventHandlers(nodes, event, handler) {
	forEach(nodes, function(node) {
		node.addEventListener(event, handler);
	});
}

function unregisterEventHandlers(nodes, event, handler) {
	forEach(nodes, function(node) {
		node.removeEventListener(event, handler);
	});
}

function compose(f, g) {
	return function(x) {
		return f(g(x));
	}
}

var storage = {
	check: function(mode) {
		if ( this.get(mode) ) { return true; }
	},
	set: function(key, val) {
		if (!key || !val) { return null; }
		localStorage.setItem(key, val);
		return val;
	},
	get: function(key) {
		var val = localStorage.getItem(key);
	    if (!val) { return null; }
	    return val;
	},
	remove: function(key) {
		var key, val = localStorage.removeItem(key);
		if (!val) { return null; }
		return val;
	},
	clear: function() {
		Storage.clear();
	}
}

})();