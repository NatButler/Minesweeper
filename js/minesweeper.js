(function() {

var grid, started, mineArr, flags, table, flagSpan, face, newGameButton, levelSelect, tds,
	mode = "Intermediate";

window.onload = function() {
	table = document.getElementById('table-grid');
	flagSpan = document.getElementById('flag-count');
	face = document.getElementById('face');
	newGameButton = document.getElementById('new-game');
	bestTime = document.getElementById('best-time');
	levelSelect = document.body.getElementsByTagName('input');

	newGameButton.addEventListener('click', reset);
	init();
};

function init() {
	started = false;
	var minesweeper = new Minesweeper(modes.lookup(mode));

	flags = modes.lookup(mode)['mines'];
	flagSpan.innerHTML = flags;

	if (storage.check(mode)) { bestTime.innerHTML = "Best: " + storage.get(mode); } 
	else { bestTime.innerHTML = ""; }
}

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


function Point(x, y) {
	this.x = x;
	this.y = y;
}
Point.prototype.add = function(other) {
	return new Point(this.x + other.x, this.y + other.y);
}


function Grid(width, height, flags) {
	this.width = width;
	this.height = height;
	this.cells = new Array(width * height);
}
Grid.prototype.valueAt = function(point) {
	return this.cells[point.y * this.width + point.x];
};
Grid.prototype.setValueAt = function(point, value) {
	this.cells[point.y * this.width + point.x] = value;
};
Grid.prototype.setStatusAt = function(point, status) {
	this.cells[point.y * this.width + point.x]["Status"] = status;
}
Grid.prototype.isInside = function(point) {
	return point.x >= 0 && point.y >= 0 &&
		   point.x < this.width && point.y < this.height;
};
Grid.prototype.each = function(action) {
	for (var y = 0; y < this.height; y++) {
		for (var x = 0; x < this.width; x++) {
			var point = new Point(x, y);
			action(point, this.valueAt(point));
		}
	}
};


function Cell(value, status) {
	this.Value = value;
	this.Status = status;
}


function Dictionary(startValues) {
	this.values = startValues || {};
}
Dictionary.prototype.store = function(name, value) {
	this.values[name] = value;
};
Dictionary.prototype.lookup = function(name) {
	return this.values[name];
};
Dictionary.prototype.contains = function(name) {
	return Object.prototype.propertyIsEnumerable.call(this.values, name);
};
Dictionary.prototype.each = function(action) {
	forEachIn(this.values, action);
};

var directions = new Dictionary(
	{
		"n":  new Point(0, -1),
	 	"ne": new Point(1, -1),
	 	"e":  new Point(1, 0),
		"se": new Point(1, 1),
		"s":  new Point(0, 1),
		"sw": new Point(-1, 1),
		"w":  new Point(-1, 0),
		"nw": new Point(-1, -1)
	}
);

var modes = new Dictionary(
	{
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
	}
);

function startGame(point) {
	started = true;
	setMines(point);
	timer();
}

function gameOver() {
	stopTimer();
	unregisterEventHandlers(tds, "click", handleCellClick);
	face.innerHTML = '<img src="img/fail-face.png" alt="fail-face" />';
}

function gameFinished() {
	stopTimer();
	unregisterEventHandlers(tds, "click", handleCellClick);
	face.innerHTML = '<img src="img/cool-face.png" alt="cool-face" />';

	// Save time to local storage; display best time
	if (storage.check(mode)) {
		if (storage.get(mode) < time.textContent) {
			storage.set(mode, time.textContent);
		}
	} 
	else { storage.set(mode, time.textContent); }
}

function reset() {
	stopTimer();
	resetTimer();
	face.innerHTML = '';

	forEach(levelSelect, function(select) {
		if (select.checked) {
			mode = select.getAttribute('data-mode');
		}
	});

	init();
}

function Minesweeper(mode) {
	var tableHtml = [];
	grid = new Grid(mode.width, mode.height, mode.mines);

	for (var y = 0; y < mode.height; y++) {
		var x = 0;
		tableHtml.push('<tr>');

		for (x; x < mode.width; x++) {
			var cellId = x + "_" + y,
				val = new Cell("blank");

			grid.setValueAt( new Point(x, y), val );
			tableHtml.push('<td id="'+cellId+'" class="blank"></td>')
		}

		tableHtml.push('</tr>');
	}

	table.innerHTML = tableHtml.join("");
	tds = document.body.getElementsByTagName('td');
	registerEventHandlers(tds, "click", handleCellClick);
}

function setMines(point) {
	var mines = createRandomPoints(modes.lookup(mode), point),
		len = mines.length;

	forEach(mines, function(mine) {
		grid.setValueAt( mine, new Cell("mine") );
	});

	mineArr = mines;
}

function createRandomPoints(mode, point) {
	var avoidArr = getSurroundingCells(point),
		randPoints = [];

	avoidArr.push(point);

	for (var i = 0; i < mode.mines; i++) {
		randPoints[i] = new Point( randomInt(0, mode.width - 1), randomInt(0, mode.height - 1) );

		for (var k = 0; k <= i-1; k++) {
			if ( compareObj(randPoints[k], randPoints[i]) ) {
				i--;  // duplicate found so decrement i
			}
		}

		for (var j = 0, len = avoidArr.length; j < len; j++) {
			if ( compareObj(avoidArr[j], randPoints[i]) ) {
				i--;
			}
		}
	}
	return randPoints;
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
			var cell = surroundingCells[i],
				hasMines = checkForMines(getSurroundingCells(cell));

			if (!hasMines) {
				if (grid.valueAt(cell).Status === undefined) { blankCells.push(cell); }

				grid.setStatusAt(cell, "open");
			} 
			else {
				if (grid.valueAt(cell).Status === undefined) {
					grid.setValueAt( cell, new Cell("bordering", "open_"+hasMines) );
					viewArr.push(cell);
				}
			}
		}
	}

	if (blankCells.length > 0) { checkSurroundingCells(blankCells, viewArr); } 
	else { updateView(viewArr); } // Should return viewArr to click handler, but doesn't hence updateView call
}

function getSurroundingCells(point) {
	var cellArr = [];

	directions.each(function(name, direction) {
		var outerCell = point.add(direction);

		if (grid.isInside(outerCell)) { cellArr.push(outerCell); }
	});
	return cellArr;
}

function checkForMines(cellArr) {
	var mines = 0;

	forEach(cellArr, function(cell) {
		if (grid.valueAt(cell).Value === "mine") { mines++; }
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

function revealMines(clickedCell) {
	var arr = mineArr;

	forEach(mineArr, function(mine) {
		if (grid.valueAt(mine).Status !== "flagged") { grid.setStatusAt(mine, "revealed"); }
	});

	grid.each(function(point, value) {
		if (value.Value !== 'mine' && value.Status === 'flagged') {
			grid.setStatusAt(point, 'mis-flagged');
			arr.push(point);
		}
	});

	grid.setStatusAt(clickedCell, "exploaded");
	return arr;
}

function updateView(arr) {
	forEach(arr, function(point) {
		var cell = grid.valueAt(point),
			elem = tds[point.y * grid.width + point.x];

		elem.className = (cell.Status) ? cell.Status : "blank";

		if (cell.Value === "bordering") { elem.innerHTML = cell.Status.split('_')[1]; }
	});
}

function handleCellClick() {
	var coords = this.id.split('_'),
		clickedCell = new Point(+coords[0], +coords[1]),
		cellValue = grid.valueAt(clickedCell),
		viewArr = [clickedCell];

	if (event.altKey) { 							// Handle flags
		if (!cellValue.Status && flags) {
			grid.setStatusAt(clickedCell, "flagged");
			flags--;

			if (!flags) { 
				if (!checkForUnflaggedMines()) { gameFinished(); }
			}

		} else if (cellValue.Status === "flagged") {
			grid.setStatusAt(clickedCell);
			flags++;
		}

		flagSpan.innerHTML = flags;

	} else { 										// Handle normal click
		if (!started) { startGame(clickedCell); }									
		
		if (!cellValue.Status) {
			if (cellValue.Value === "mine") { 		// Mine detonated - reveal all mines and incorrect flags: game over
				viewArr = revealMines(clickedCell);
				gameOver();
			} 
			else if (cellValue.Value === "blank") { // Blank cell - if no mines bordering, reveal all surrounding space
				var hasMinesBordering = checkForMines(getSurroundingCells(clickedCell));

				if (!hasMinesBordering) {
					grid.setStatusAt(clickedCell, "open");
					checkSurroundingCells(viewArr);
					return;
				} 
				else {
					grid.setValueAt( clickedCell, new Cell( "bordering", "open_"+hasMinesBordering) );
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
		if (!key || !val) { return; }
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