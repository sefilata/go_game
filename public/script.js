let size = 19;
let flip = false;

// Define Board
class Board {
    constructor(size) {
        this.mode = 'Go (Game)';
        this.size = size;
        this.grid = Array.from({length: size}, () => Array.from({length: size}, () => null));
        this.labeledGrid = Array.from({length: size}, () => Array.from({length: size}, () => null));
        this.takenBlack = 0;
        this.takenWhite = 0;
        this.currentPlayer = 'black';
    }

    applyChanges(adds, dels, btaken, wtaken, cplayer) {
        adds.forEach(({x, y, color}) => {
            this.grid[x][y] = color;
        });
        dels.forEach(({x, y, _}) => {
            this.grid[x][y] = null;
        });
        this.takenBlack += btaken;
        this.takenWhite += wtaken;
        this.currentPlayer = cplayer;
    }

    applyLabel(x, y, color) {
        this.labeledGrid[x][y] = color;
    }

    removeLabels(labelList) {
        labelList.forEach(({x, y, _}) => {
            this.labeledGrid[x][y] = null;
        })
    }

    clearLabel() {
        this.labeledGrid.forEach((row, _) => {
            row.forEach((cell, _) => {
                cell = null;
            })
        })
    }

    initialize() {
        this.mode = 'Go (Game)'
        this.size = size;
        this.grid = Array.from({length: size}, () => Array.from({length: size}, () => null));
        this.labeledGrid = Array.from({length: size}, () => Array.from({length: size}, () => null));
        this.takenBlack = 0;
        this.takenWhite = 0;
        this.currentPlayer = 'black';
    }
}
let currentBoard = new Board(size);

const socket = io.connect();

// Socket Actions during Game
socket.on('update board', ({adds, dels, btaken, wtaken, cplayer}) => {
    resetAlert();
    console.log('socket.on(update board)');
    currentBoard.applyChanges(adds, dels, btaken, wtaken, cplayer);
    updateDisplay(adds, dels);
    updateCurrentPlayerDisplay();
    updateStonesTakenDisplay();
});
socket.on('initialize board', (newSize) => {
    console.log('socket.on(initialize board), newSize=', newSize);
    size = newSize;
    console.log(`Initialized board with size ${size}`);
    currentBoard.initialize();
    setupBoard(size);
    setupDisplay(currentBoard.grid);
    updateCurrentPlayerDisplay();
    updateStonesTakenDisplay();

    document.getElementById('endGameButton').style.display = ''
    document.getElementById('countButton').style.display = 'none';
    document.getElementById('recountButton').style.display = 'none';
    document.getElementById('undoButton').style.display = '';
    setTimeout(function() {
        resetAlert();
        document.getElementById('gameMode').textContent = currentBoard.mode;
        document.getElementById('blackArea').textContent = '-';
        document.getElementById('whiteArea').textContent = '-';
    }, 300)
});
socket.on('setup board', (serverBoard) => {
    console.log('socket.on(setup board), mode=', serverBoard.mode);
    size = serverBoard.size;
    currentBoard.mode = serverBoard.mode;
    currentBoard.grid = serverBoard.grid;
    currentBoard.labeledGrid = serverBoard.labeledGrid;
    currentBoard.takenBlack = serverBoard.takenBlack;
    currentBoard.takenWhite = serverBoard.takenWhite;
    currentBoard.currentPlayer = serverBoard.currentPlayer;
    setupBoard(serverBoard.size);
    setupDisplay(serverBoard.grid);
    updateCurrentPlayerDisplay();
    updateStonesTakenDisplay();
    setTimeout(function() {
        resetAlert();
        document.getElementById('gameMode').textContent = currentBoard.mode;
        document.getElementById('blackArea').textContent = '-';
        document.getElementById('whiteArea').textContent = '-';
    }, 300)

    switch (serverBoard.mode) {
        case 'Go (Finished)':
            currentBoard.labeledGrid.forEach((row, x) => {
                row.forEach((cell, y) => {
                    if(cell) {
                        placeRedCross(x, y);
                    }
                })
            })
            document.getElementById('endGameButton').style.display = 'none'
            document.getElementById('countButton').style.display = '';
            document.getElementById('recountButton').style.display = 'none';
            document.getElementById('undoButton').style.display = '';
            break;
        case 'Go (Count)':
            document.getElementById('endGameButton').style.display = 'none'
            document.getElementById('countButton').style.display = 'none';
            document.getElementById('recountButton').style.display = '';
            document.getElementById('undoButton').style.display = 'disabled';
            makeCount();
            break;
        default:
            document.getElementById('endGameButton').style.display = ''
            document.getElementById('countButton').style.display = 'none';
            document.getElementById('recountButton').style.display = 'none';
            document.getElementById('undoButton').style.display = '';
    }
});
socket.on('back board', (ifSuccess) => {
    console.log('socket.on(back board), ifSuccess=', ifSuccess);
    if(ifSuccess){
        backAlert();
    } else {
        alert('Cannot undo!');
    }
});
socket.on('pass', (nextPlayer) => {
    const alertElement = document.getElementById('alert');
    alertElement.textContent = `${currentBoard.currentPlayer} passed!`;
    alertElement.style.color = 'red';
    currentBoard.currentPlayer = nextPlayer;
    updateCurrentPlayerDisplay();
})

// Socket Actions after Game
socket.on('end game', () => {
    console.log('socket.on(end game)');
    alert('Please select dead stones. To return to the game, click Undo button.');
    currentBoard.mode = 'Go (Finished)'
    document.getElementById('endGameButton').style.display = 'none';
    document.getElementById('countButton').style.display = '';
    document.getElementById('gameMode').textContent = currentBoard.mode;
    resetAlert();
    document.getElementById('gameMode').textContent = currentBoard.mode;
});
socket.on('count', () => {
    console.log('socket.on(count)');
    currentBoard.mode = 'Go (Count)'
    makeCount();
    document.getElementById('countButton').style.display = 'none';
    document.getElementById('recountButton').style.display = '';
    document.getElementById('undoButton').style.display = 'disabled';
    document.getElementById('gameMode').textContent = currentBoard.mode;
});
socket.on('labeled stones', (captured) => {
    console.log('socket.on(labeled stones), captured.length=', captured.length);
    captured.forEach(({x, y, color}) => {
        placeRedCross(x, y);
        currentBoard.applyLabel(x, y, color);
    })
})
socket.on('back to game', () => {
    console.log('socket.on(back to game)');
    currentBoard.mode = 'Go (Game)';
    alert('Backed to the game.');
    document.getElementById('endGameButton').style.display = '';
    document.getElementById('countButton').style.display = 'none';
    document.getElementById('gameMode').textContent = currentBoard.mode;
})
socket.on('back labels', (captured) => {
    console.log('socket.on(back labels), captured.length=', captured.length);
    currentBoard.removeLabels(captured);
    removeLabels(captured);
})

// Button Actions
document.getElementById('resetButton').addEventListener('click', function() {
    const input = prompt('Which board size do you like to use? (9, 13, or 19 recommended)');
    const newSize = parseInt(input, 10);

    if(newSize >= 4 && Number.isInteger(newSize)) {
        console.log('socket.emit(initialize board)');
        socket.emit('initialize board', newSize);
    } else if(input != null) {
        alert('Your input is ivalid!');
    }
});
document.getElementById('undoButton').addEventListener('click', function() {
    if (currentBoard.mode == 'Go (Game)') {
        console.log('socket.emit(back move)');
        socket.emit('back move');
    } else if (currentBoard.mode == 'Go (Finished)') {
        console.log('socket.emit(back move finished)');
        socket.emit('back label');
    } else {
        console.log('unexpected mode in undoButton');
    }
});
document.getElementById('flipButton').addEventListener('click', function() {
    const board = document.getElementById('board');
    board.classList.toggle('flipped')
    flip = board.classList.contains('flipped');
    resetAlert();
});
document.getElementById('endGameButton').addEventListener('click', function() {
    console.log('socket.emit(end game)');
    socket.emit('end game');
});
document.getElementById('countButton').addEventListener('click', function() {
    console.log('socket.emit(count)');
    socket.emit('count');
});
document.getElementById('recountButton').addEventListener('click', function() {
    console.log('socket.emit(recount)');
    socket.emit('recount');
});
document.getElementById('saveButton').addEventListener('click', function() {
    alert('This button is currently not supported.');
});
document.getElementById('reviewButton').addEventListener('click', function() {
    alert('This button is currently not supported.');
});
document.getElementById('passButton').addEventListener('click', function() {
    const nextPlayer =  (currentBoard.currentPlayer === 'black') ? 'white' : 'black';
    socket.emit('pass', nextPlayer);
});

// create board on display
function setupBoard(size) {
    // set CSS variables
    document.documentElement.style.setProperty('--size', size);

    const board = document.getElementById('board');
    board.innerHTML = ''; // clear board

    // Game Grid
    const gameGrid = document.createElement('div');
    gameGrid.id = 'gameGrid';
    gameGrid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    gameGrid.style.gridTemplateRows = `repeat(${size}, 1fr)`;

    // Overlay Grid
    const overlayGrid = document.createElement('div');
    overlayGrid.id = 'overlayGrid';
    overlayGrid.style.gridTemplateColumns = `repeat(${size - 1}, 1fr)`;
    overlayGrid.style.gridTemplateRows = `repeat(${size - 1}, 1fr)`;

    // Game Grid Cells
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.setAttribute('data-x', i);
            cell.setAttribute('data-y', j);
            cell.addEventListener('click', clickAction);
            gameGrid.appendChild(cell);
        }
    }   

    // Overlay Grid Cells
    for (let i = 0; i < (size-1) * (size-1); i++) {
        const grid_cell = document.createElement('div');
        grid_cell.className = 'grid-cell';

        // draw grid
        grid_cell.style.borderRight = '0.5px solid #000';
        grid_cell.style.borderBottom = '0.5px solid #000';
        grid_cell.style.borderLeft = '0.5px solid #000';
        grid_cell.style.borderTop = '0.5px solid #000';
        if (i % (size-1) === 0) {
            grid_cell.style.borderLeft = '1px solid #000';
        }
        if (i < (size-1)) {
            grid_cell.style.borderTop = '1px solid #000';
        }
        if (i % (size-1) === size-2) {
            grid_cell.style.borderRight = '1px solid #000';
        }
        if (i >= (size - 1)*(size -2)) {
            grid_cell.style.borderBottom = '1px solid #000';
        }
        overlayGrid.appendChild(grid_cell);
    }

    board.appendChild(gameGrid);
    board.appendChild(overlayGrid);
    
    if (size === 9) {
        const specialPoints = [{ x: 4, y: 4 }];
        specialPoints.forEach(point => {
            const index = point.x * (size-1) + point.y;
            const cell = overlayGrid.children[index];
            const marker = document.createElement('div');
            marker.className = 'star-marker13';
            cell.appendChild(marker);
        });
    }
    if (size === 13) {
        const specialPoints = [
            { x: 3, y: 3 }, { x: 3, y: 9 }, { x: 6, y: 6 },
            { x: 9, y: 3 }, { x: 9, y: 9 }
        ];
        specialPoints.forEach(point => {
            const index = point.x * (size-1) + point.y;
            const cell = overlayGrid.children[index];
            const marker = document.createElement('div');
            marker.className = 'star-marker13';
            cell.appendChild(marker);
        });
    }
    if (size === 19) {
        const specialPoints = [
            { x: 3, y: 3 }, { x: 3, y: 9 }, { x: 3, y: 15 },
            { x: 9, y: 3 }, { x: 9, y: 9 }, { x: 9, y: 15 },
            { x: 15, y: 3 }, { x: 15, y: 9 }, { x: 15, y: 15 }
        ];
        specialPoints.forEach(point => {
            const index = point.x * (size-1) + point.y;
            const cell = overlayGrid.children[index];
            const marker = document.createElement('div');
            marker.className = 'star-marker';
            cell.appendChild(marker);
        });
    } 
}

// setup stones on displayed board
function setupDisplay(grid) {
    const board = document.getElementById('gameGrid');
    grid.forEach((row, x) => {
        row.forEach((cell, y) => {
            if(cell) {
                const cellDiv = board.children[x * size + y];
                const stone = document.createElement('div');
                stone.className = `stone ${cell}`;
                cellDiv.appendChild(stone);
            }
        })
    })
}

function updateDisplay(adds, dels) {
    const board = document.getElementById('gameGrid');
    const size = parseInt(document.documentElement.style.getPropertyValue('--size'), 10);

    adds.forEach(({ x, y, color }) => {
        const cellIndex = x * size + y;
        const cell = board.children[cellIndex];
        if (!cell.firstChild) {
            const stone = document.createElement('div');
            stone.className = `stone ${color}`;
            cell.appendChild(stone);
        }
    });

    dels.forEach(({ x, y, _ }) => {
        const cellIndex = x * size + y;
        const cell = board.children[cellIndex];
        if (cell.firstChild) {
            cell.removeChild(cell.firstChild);
        }
    });
}

function dfs(x, y, color, visited, grid) {
    const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    const stack = [[x, y]];
    const captured = [];
    let hasLiberty = false;

    while (stack.length > 0 && !hasLiberty) {
        const [cx, cy] = stack.pop();
        if (visited[cx][cy]) continue;
        visited[cx][cy] = true;
        captured.push({ x: cx, y: cy, color: color});

        directions.forEach(([dx, dy]) => {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
                if (grid[nx][ny] === null) {
                    hasLiberty = true;
                } else if (grid[nx][ny] === color && !visited[nx][ny]) {
                    stack.push([nx, ny]);
                }
            }
        });
    }

    return hasLiberty ? [] : captured;
}
function dfs_dead_stones(x, y, color, visited, grid) {
    const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    const stack = [[x, y]];
    const captured = [];

    while (stack.length > 0) {
        const [cx, cy] = stack.pop();
        if (visited[cx][cy]) continue;
        visited[cx][cy] = true;
        captured.push({ x: cx, y: cy, color: color});

        directions.forEach(([dx, dy]) => {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
                if (grid[nx][ny] === color && !visited[nx][ny]) {
                    stack.push([nx, ny]);
                }
            }
        });
    }

    return captured;
}
function dfs_count_nulls(x, y, visited, grid) {
    const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    const stack = [[x, y]];
    const selected = [];
    let neighbors = new Set();

    while (stack.length > 0) {
        const [cx, cy] = stack.pop();
        if (visited[cx][cy]) continue;
        visited[cx][cy] = true;
        selected.push({ x: cx, y: cy});

        directions.forEach(([dx, dy]) => {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
                if (grid[nx][ny] != null) {
                    neighbors.add(grid[nx][ny]);
                } else if (!visited[nx][ny]) {
                    stack.push([nx, ny]);
                }
            }
        });
    }

    return (neighbors.size === 1) ? [selected, [...neighbors][0]] : [[], null];
}

function takeStones(x, y, grid, cplayer) {
    const opponentColor = cplayer === 'black' ? 'white' : 'black';
    const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    let dels = [];
    let btaken = 0;
    let wtaken = 0;

    directions.forEach(([dx, dy]) => {
        const visited = grid.map(row => row.map(() => false));
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < size && ny >= 0 && ny < size && grid[nx][ny] === opponentColor) {
            const captured = dfs(nx, ny, opponentColor, visited, grid);
            if (captured.length > 0) {
                dels = dels.concat(captured);
                if (opponentColor === 'black') {
                    btaken += captured.length;
                } else {
                    wtaken += captured.length;
                }
                // captured.forEach(({cx, cy, _}) => {
                //     grid[cx][cy] = null;
                // });
            }
        }
    })

    return { dels, btaken, wtaken };
}

function clickAction() {
    const x = parseInt(this.getAttribute('data-x'), 10);
    const y = parseInt(this.getAttribute('data-y'), 10);

    switch(currentBoard.mode) {
        case 'Go (Game)':
            if (!this.firstChild) {
                const stone_color = currentBoard.currentPlayer;
                currentBoard.grid[x][y] = stone_color;

                // check deletion
                const { dels, btaken, wtaken } = takeStones(x, y, currentBoard.grid, stone_color);

                // check validity
                const visited_outer = currentBoard.grid.map(row => row.map(() => false));
                if(dels.length == 0) {
                    const stones = dfs(x, y, stone_color, visited_outer, currentBoard.grid);
                    if(stones.length != 0) {
                        currentBoard.grid[x][y] = null;
                        alert('This move is not allowed.');
                        return;
                    }
                }

                placeStone.call(this);
                switchPlayer();
                console.log('socket.emit(make move)');
                socket.emit('make move', {
                    adds: [{ x, y, color: stone_color }],
                    dels: dels,
                    btaken: btaken,
                    wtaken: wtaken,
                    cplayer: currentBoard.currentPlayer
                });
            }
            break;
        case 'Go (Finished)':
            if (this.firstChild) {
                const visited_f = currentBoard.grid.map(row => row.map(() => false));
                const captured = dfs_dead_stones(x, y, currentBoard.grid[x][y], visited_f, currentBoard.grid);
                console.log('socket.emit(labeled stones)');
                socket.emit('labeled stones', captured);    
            }
            break;
        case 'Go (Count)':
            break;
        default:
            if (!this.firstChild) {
                const stone_color = currentBoard.currentPlayer;

                placeStone.call(this);
                switchPlayer();
                console.log('socket.emit(make move)');
                socket.emit('make move', {
                    adds: [{ x, y, color: stone_color }],
                    dels: [],
                    btaken: 0,
                    wtaken: 0,
                    cplayer: currentBoard.currentPlayer
                });
            }
    }
}

function makeCount() {
    let blackArea = -currentBoard.takenBlack;
    let whiteArea = -currentBoard.takenWhite;

    // make new grid without labeled stones
    const newGrid = [];
    for (let i = 0; i < size; i++) {
        newGrid[i] = [];
        for (let j = 0; j < size; j++) {
            if (currentBoard.labeledGrid[i][j] !== null) {
                newGrid[i][j] = null;
                if (currentBoard.labeledGrid[i][j] === 'black') {
                    blackArea -= 1;
                } else {
                    whiteArea -= 1;
                }
            } else {
                newGrid[i][j] = currentBoard.grid[i][j];
            }
        }
    }

    const visited_c = currentBoard.grid.map(row => row.map(() => false));
    newGrid.forEach((row, x) => {
        row.forEach((cell, y) => {
            if(cell == null && !visited_c[x][y]){
                const [selected, color] = dfs_count_nulls(x, y, visited_c, newGrid);
                selected.forEach(({x, y}) => {
                    placeMarker(x, y, color);
                })
                if (color === 'black'){
                    blackArea += selected.length;
                } else {
                    whiteArea += selected.length;
                }
            }
        })
    })

    removeStonesAndLabels();
    
    document.getElementById('blackArea').textContent = blackArea;
    document.getElementById('whiteArea').textContent = whiteArea;
}

function removeStonesAndLabels() {
    const board = document.getElementById('gameGrid');

    currentBoard.labeledGrid.forEach((row, i) => {
        row.forEach((cell, j) => {
            if (cell !== null) {
                const index = i * size + j;
                const gridCell = board.children[index];

                if (gridCell) {
                    // remove stone
                    const stone = gridCell.querySelector('.stone');
                    if (stone) {
                        gridCell.removeChild(stone);
                    }

                    // remove label
                    const redCross = gridCell.querySelector('.red-cross');
                    if (redCross) {
                        gridCell.removeChild(redCross);
                    }
                }
            }
        });
    });
}

// remove labels from display
function removeLabels(captured) {
    const board = document.getElementById('gameGrid');
    captured.forEach(({x, y, _}) => {
        const cellIndex = x * size + y;
        const cell = board.children[cellIndex];
        if (cell) {
            const redCross = cell.querySelector('.red-cross');
            if (redCross) {
                cell.removeChild(redCross);
            }
        }
    })
}

function placeRedCross(x, y) {
    const board = document.getElementById('gameGrid');

    const index = x * size + y;
    const cell = board.children[index];

    if (!cell) console.log('invalid index in placeRedCross()');
    const marker = document.createElement('div');
    marker.className = 'red-cross';
    cell.appendChild(marker);
}

function placeStone() {
    const stone = document.createElement('div');
    stone.className = `stone ${currentBoard.currentPlayer}`;
    this.appendChild(stone);
}

function placeMarker(x, y, color) {
    const board = document.getElementById('gameGrid');

    const index = x * size + y;
    const cell = board.children[index];
    if (!cell) {
        console.error(`No cell found at index ${index} for point (${x}, ${y})`);
        return;
    }

    const marker = document.createElement('div');
    marker.className = 'square-marker';
    marker.style.backgroundColor = color;
    cell.appendChild(marker);
}

function updateCurrentPlayerDisplay() {
    const playerName = document.getElementById('playerName');
    const playerIcon = document.getElementById('playerIcon');

    playerName.textContent = currentBoard.currentPlayer.charAt(0).toUpperCase() + currentBoard.currentPlayer.slice(1);
    playerIcon.className = 'circle ' + currentBoard.currentPlayer;
}
function updateStonesTakenDisplay() {
    const blackStonesTaken = document.getElementById('blackStonesTaken');
    const whiteStonesTaken = document.getElementById('whiteStonesTaken');

    blackStonesTaken.textContent = currentBoard.takenBlack;
    whiteStonesTaken.textContent = currentBoard.takenWhite;
}

function switchPlayer() {
    currentBoard.currentPlayer = (currentBoard.currentPlayer === 'black') ? 'white' : 'black';  // Change Turns
    updateCurrentPlayerDisplay();
}

function backAlert() {
    const alertElement = document.getElementById('alert');
    alertElement.textContent = 'One move backed!';
    alertElement.style.color = 'red';
}

function resetAlert() {
    const alertElement = document.getElementById('alert');
    alertElement.style.color = 'black';
    if (flip) {
        alertElement.textContent = '(flipped)';
    } else {
        alertElement.textContent = '';
    }
}
