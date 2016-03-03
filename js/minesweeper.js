(function() {

var minesweeper, grid, started, mineArr, table, flagSpan, face, newGameButton, levelSelect, tds,
	mode = "Intermediate";

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
	table = document.getElementById('table-grid');
	flagSpan = document.getElementById('flag-count');
	face = document.getElementById('face');
	newGameButton = document.getElementById('new-game');
	bestTime = document.getElementById('best-time');
	levelSelect = document.body.getElementsByTagName('input');

	newGameButton.addEventListener('click', reset);
	init();
}

function init() {
	started = false;
	minesweeper = new Minesweeper(mode);

	tds = document.body.getElementsByTagName('td');
	registerEventHandlers(tds, "click", handleCellClick);
	
	flagSpan.innerHTML = minesweeper.flags;
	if (storage.check(mode)) { bestTime.innerHTML = "Best: " + storage.get(mode); } 
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
	this.Value = value;
	this.Status = status;
}


// GRID CONSTRUCTOR
function Grid(width, height, flags) {
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
	this.cells[point.y * this.width + point.x]["Status"] = status;
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
	this.mode = modes.lookup(mode);
	this.flags = this.mode.mines;	

	grid = new Grid(this.mode.width, this.mode.height, this.mode.mines);

	table.innerHTML = this.buildTable();
}
Minesweeper.prototype.buildTable = function() {
	var tableHtml = [];
	for (var y = 0; y < this.mode.height; y++) { // Use grid.each to achieve this?
		var x = 0;
		tableHtml.push('<tr>');

		for (x; x < this.mode.width; x++) {
			var id = x + "_" + y,
				val = new Cell("blank");

			grid.setValueAt( new Point(x, y), val );
			tableHtml.push('<td id="'+id+'" class="blank"></td>');
		}
		tableHtml.push('</tr>');
	}
	return tableHtml.join('');
}
Minesweeper.prototype.setMines = function(point) {
	mineArr = this.createRandomPoints(point);

	forEach(mineArr, function(mine) {
		grid.setValueAt( mine, new Cell("mine") );
	});
}
Minesweeper.prototype.createRandomPoints = function(point) {
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
Dictionary.prototype.contains = function(name) {
	return Object.prototype.propertyIsEnumerable.call(this.values, name);
}
Dictionary.prototype.each = function(action) {
	forEachIn(this.values, action);
}


function gameStart(point) {
	started = true;
	minesweeper.setMines(point);
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

function reset() {
	stopTimer();
	resetTimer();
	time.className = '';
	face.innerHTML = '';
	bestTime.innerHTML = '';

	forEach(levelSelect, function(select) {
		if (select.checked) { mode = select.getAttribute('data-mode'); }
	});

	init();
}

function checkSurroundingCells(cellArr, viewArr) {
	var arrLen = cellArr.length,
		blankCells = [],
		viewArr = viewArr ? viewArr : [];

	for (var j = 0; j < arrLen; j++) {
		var currentCell = cellArr[j],
			surroundingCells = getSurroundingCells(currentCell),
			surrCellsLen = surroundingCells.length;

		viewArr.push(currentCell);

		for (var i = 0; i < surrCellsLen; i++) {
			var point = surroundingCells[i],
				mines = checkForMines(getSurroundingCells(point));

			if (!mines) {
				if (grid.valueAt(point).Status === undefined) { blankCells.push(point); }
				grid.setStatusAt(point, "open");
			} 
			else {
				if (grid.valueAt(point).Status === undefined) {
					grid.setValueAt( point, new Cell("bordering", "open_"+mines) );
					viewArr.push(point);
				}
			}
		}
	}

	if (blankCells.length > 0) { checkSurroundingCells(blankCells, viewArr); } 
	else { updateView(viewArr); }
}

function getSurroundingCells(point) {
	var arr = [];

	directions.each(function(name, direction) {
		var outerCell = point.add(direction);
		if (grid.isInside(outerCell)) { arr.push(outerCell); }
	});
	return arr;
}

function checkForMines(cellArr) {
	var mines = 0;

	forEach(cellArr, function(point) {
		if (grid.valueAt(point).Value === "mine") { mines++; }
	});
	return mines;
}

function checkForUnflaggedMines() {
	var remainingMines = 0;
	for (var i = 0; i < mineArr.length; i++) {
		if (grid.valueAt(mineArr[i]).Status !== "flagged") {
			remainingMines++;
			break;
		}
	}
	return remainingMines;
}

function revealMines(point) {
	var viewArr = mineArr;

	forEach(mineArr, function(mine) {
		if (grid.valueAt(mine).Status !== "flagged") { grid.setStatusAt(mine, "revealed"); }
	});

	grid.each(function(point, value) {
		if (value.Value !== 'mine' && value.Status === 'flagged') {
			grid.setStatusAt(point, 'mis-flagged');
			viewArr.push(point);
		}
	});

	grid.setStatusAt(point, "exploaded");
	return viewArr;
}

function updateView(viewArr) {
	forEach(viewArr, function(point) {
		var cell = grid.valueAt(point),
			td = tds[point.y * grid.width + point.x];

		td.className = (cell.Status) ? cell.Status : "blank";

		if (cell.Value === "bordering") { td.innerHTML = cell.Status.split('_')[1]; }
	});
}

function handleCellClick() {
	var coords = this.id.split('_'),
		point = new Point(+coords[0], +coords[1]),
		cell = grid.valueAt(point),
		viewArr = [point];

	if (event.altKey) { 							// Handle flags
		if (!cell.Status && minesweeper.flags) {
			grid.setStatusAt(point, "flagged");
			minesweeper.flags--;

			if (!minesweeper.flags) { 
				if (!checkForUnflaggedMines()) { gameComplete(); }
			}
		} 
		else if (cell.Status === "flagged") {
			grid.setStatusAt(point);
			minesweeper.flags++;
		}

		flagSpan.innerHTML = minesweeper.flags;
	} 
	else { 											// Handle click
		if (!started) { gameStart(point); }									
		if (!cell.Status) {
			if (cell.Value === "mine") { 		// Mine detonated - reveal all mines and incorrect flags: game over
				viewArr = revealMines(point);
				gameOver();
			} 
			else if (cell.Value === "blank") { // Blank cell - if no mines bordering, reveal all surrounding space
				var hasMinesBordering = checkForMines(getSurroundingCells(point));

				if (!hasMinesBordering) {
					grid.setStatusAt(point, "open");
					checkSurroundingCells(viewArr);
					return;
				} 
				else {
					grid.setValueAt( point, new Cell( "bordering", "open_"+hasMinesBordering) );
				}
			}
		}
	}
	updateView(viewArr);
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