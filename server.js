const express = require('express');
const http = require('http');
const socketIo = require('socket.io')
const moment = require('moment-timezone');

let size = 19;
const port = ;  // Port

// define board
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

    applyLabels(labelList) {
        labelList.forEach(({x, y, color}) => {
            this.labeledGrid[x][y] = color;
        })
    }

    removeLabels(labelList) {
        labelList.forEach(({x, y, _}) => {
            this.labeledGrid[x][y] = null;
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

class BoardHistory {
    constructor() {
        this.items = [];
    }

    appendItem(adds, dels, btaken, wtaken) {
        this.items.push([adds, dels, btaken, wtaken]);
    }

    deleteItem() {
        let item = this.items.pop();
        return item;
    }

    initialize() {
        this.items = [];
    }
}
let boardHistory = new BoardHistory();

class Labelhistory {
    constructor() {
        this.items = [];
    }

    appendItem(captured) {
        this.items.push(captured);
    }

    deleteItem() {
        let item = this.items.pop();
        return item;
    }

    initialize() {
        this.items = [];
    }
}
let labelHistory = new Labelhistory();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
app.use(express.static('public'));

io.on('connection', (socket) => {
    const connectTime = moment().tz("Asia/Tokyo").format('YYYY-MM-DD HH:mm:ss');
    const clientIP = socket.request.connection.remoteAddress.replace(/^::ffff:/, '');
    const clientPort = socket.request.connection.remotePort;

    console.log(`New client connected at ${connectTime}: IP ${clientIP}, Port ${clientPort}`);
    socket.emit('setup board', currentBoard);

    socket.on('make move', ({adds, dels, btaken, wtaken, cplayer}) => {
        // console.log('make move: ', {adds, dels, btaken, wtaken});
        currentBoard.applyChanges(adds, dels, btaken, wtaken, cplayer);
        boardHistory.appendItem(adds, dels, btaken, wtaken);
        // console.log('io.emit(update board)');
        io.emit('update board', {adds, dels, btaken, wtaken, cplayer});
    });
    socket.on('back move', () => {
        if(boardHistory.items.length != 0){
            let [adds, dels, btaken, wtaken] = boardHistory.deleteItem();
            const cplayer = (currentBoard.currentPlayer === 'black') ? 'white' : 'black';
            btaken = -btaken;
            wtaken = -wtaken;
            currentBoard.applyChanges(dels, adds, btaken, wtaken, cplayer);
            // console.log('io.emit(update board)');
            io.emit('update board', {adds: dels, dels: adds, btaken, wtaken, cplayer});
            // console.log('io.emit(back board)');
            io.emit('back board', true);
        } else {
            // console.log('io.emit(back board)');
            socket.emit('back board', false);
        }
    });
    socket.on('initialize board', (newSize) => {
        size = newSize;
        currentBoard.initialize();
        boardHistory.initialize();
        labelHistory.initialize();
        // console.log('io.emit(initialize board)');
        io.emit('initialize board', size);
    });
    socket.on('pass', (nextPlayer) => {
        currentBoard.currentPlayer =  (currentBoard.currentPlayer === 'black') ? 'white' : 'black';
        boardHistory.appendItem([], [], 0, 0);
        io.emit('pass', nextPlayer);
    })

    socket.on('end game', () => {
        currentBoard.mode = 'Go (Finished)';
        // console.log('io.emit(end game)');
        io.emit('end game');
    });
    socket.on('count', () => {
        currentBoard.mode = 'Go (Count)';
        // console.log('io.emit(count)');
        io.emit('count');
    });
    socket.on('recount', () => {
        currentBoard.mode = 'Go (Finished)';
        // console.log('io.emit(setup board)');
        io.emit('setup board', currentBoard);
    });
    socket.on('labeled stones', (captured) => {
        currentBoard.applyLabels(captured);
        labelHistory.appendItem(captured);
        // console.log('io.emit(labeled stones)');
        io.emit('labeled stones', captured);
    })
    socket.on('back label', () => {
        if (labelHistory.items.length != 0) {
            let captured = labelHistory.deleteItem();
            currentBoard.removeLabels(captured);
            // console.log('io.emit(back labels)');
            io.emit('back labels', captured);
        } else {
            currentBoard.mode = 'Go (Game)';
            // console.log('io.emit(back to game)');
            io.emit('back to game');
        }
    })

    socket.on('disconnect', () => {
        const disconnectTime = moment().tz("Asia/Tokyo").format('YYYY-MM-DD HH:mm:ss');
        console.log(`Client disconnected at ${disconnectTime}: IP ${clientIP}, Port ${clientPort}`);
    });
});

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

