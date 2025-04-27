const WebSocket = require('ws');

const PORT = 8080;
const TICK_RATE = 1000 / 60;

const wss = new WebSocket.Server({ port: PORT, path: '/ws' });
console.log(`Server running on ws://localhost:${PORT}/ws`);

const rooms = new Map(); // roomId -> Room
const lobby = new Set(); // 存放处于大厅的 ws
const default_HP = 100;

class Room {
    constructor(id) {
        this.id = id;
        this.players = new Map(); // playerId -> PlayerConnection
        this.states = {}; // playerId -> {x, y, angle, ...}
        this.readyStatus = {}; // playerId -> true/false
        this.hp = {
            1: default_HP,
            2: default_HP
        };
        this.score = { 1: 0, 2: 0 };
        this.isPlaying = false;
    }

    addPlayer(ws) {
        const playerId = this.players.size + 1;
        const conn = new PlayerConnection(ws, this, playerId);
        this.players.set(playerId, conn);
        this.states[playerId] = {};
        this.readyStatus[playerId] = false;

        conn.send('joined', { roomId: this.id, playerId });
        this.broadcast('room_update', this.getRoomInfo());
        return conn;
    }

    removePlayer(playerId) {
        this.players.delete(playerId);
        delete this.states[playerId];
        delete this.readyStatus[playerId];
        if (this.players.size === 0) {
            rooms.delete(this.id);
        }
        this.broadcast('room_update', this.getRoomInfo());
    }

    updateState(playerId, state) {
        this.states[playerId] = state;
    }

    setReady(playerId, isReady) {
        this.readyStatus[playerId] = isReady;
        this.broadcast('ready_update', { readyStatus: this.readyStatus });

        const allReady = Object.keys(this.readyStatus).length === 2
            && Object.values(this.readyStatus).every(v => v);
        if (!allReady) return;

        // 1. 重置本局血量
        this.hp[1] = default_HP;
        this.hp[2] = default_HP;

        // 2. 广播初始血量给所有客户端（amount=0 表示初始化，无闪烁效果）
        [1,2].forEach(id => {
            this.broadcast('hp_update', {
                targetId: id,
                hp: this.hp[id],
                fromX: 0, fromY: 0,
                amount: 0,
                knockbackMult: 0
            });
        });

        this.startGame()
    }

    startGame() {
        // 3. 正式开始游戏
        this.broadcast('game_start', {});
        this.isPlaying = true;

        this.timeoutHandle = setTimeout(() => {
            if (this.isPlaying) {
                this.endGame(); // 没有 winner，平局或超时结束
            }
        }, 90000); // 90秒
    }

    broadcast(type, data) {
        for (const conn of this.players.values()) {
            conn.send(type, data);
        }
    }

    broadcastState() {
        this.broadcast('sync', this.states);
    }

    getRoomInfo() {
        return {
            room: {
                id: this.id,
                players: Array.from(this.players.keys()),
                readyStatus: this.readyStatus,
                hp: this.hp,
                score: this.score,
                isPlaying: this.isPlaying
            }
        };
    }

    endGame(winner = null) {
        if (this.timeoutHandle) {
            clearTimeout(this.timeoutHandle);
            this.timeoutHandle = null;
        }
        if (winner) {
            this.score[winner] += 1;
        }
        this.isPlaying = false;
        this.readyStatus[1] = false;
        this.readyStatus[2] = false;
        this.broadcast('room_update', this.getRoomInfo());
        this.broadcast('score_update', { score: this.score });
        this.broadcast('end_game', { winner });
    }
}

class PlayerConnection {
    constructor(ws, room, playerId) {
        this.ws = ws;
        this.room = room;
        this.playerId = playerId;

        ws.on('message', msg => this.onMessage(msg));
        ws.on('close', () => this.onClose());
    }

    send(type, data) {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, data }));
        }
    }

    onMessage(msg) {
        let parsed;
        try {
            parsed = JSON.parse(msg);
        } catch {
            return;
        }

        const { type, data } = parsed;
        const room = this.room;

        switch (type) {
            case 'state':
                room.updateState(this.playerId, data);
                break;
            case 'charge_start':
                room.broadcast('charge_start', { playerId: this.playerId, ...data });
                break;
            case 'charge_release':
                room.broadcast('charge_release', { playerId: this.playerId, ...data });
                break;
            case 'zone_damage':
                const { targetId, amount } = data;
                console.log('!(targetId in this.room.hp)')
                console.log(!(targetId in this.room.hp))
                console.log('!this.room.isPlaying')
                console.log(!this.room.isPlaying)
                if (!(targetId in this.room.hp)) return;
                if (!this.room.isPlaying) return;

                this.room.hp[targetId] = Math.max(0, this.room.hp[targetId] - amount);
                const newHp = this.room.hp[targetId];

                // 广播新的血量
                this.room.broadcast('hp_update', {
                    targetId,
                    hp: newHp,
                });

                if (newHp <= 0) {
                    const winner = targetId === 1 ? 2 : 1;
                    this.room.endGame(winner)
                }
            case 'damage': {
                const { targetId, amount, fromX, fromY, knockbackMult } = data;
                // 确保目标存在
                if (!(targetId in this.room.hp)) return;
                if (!this.room.isPlaying) return;

                // 从 room.hp 减血，不再用 room.states
                this.room.hp[targetId] = Math.max(0, this.room.hp[targetId] - amount);
                const newHp = this.room.hp[targetId];

                // 广播新的血量
                this.room.broadcast('hp_update', {
                    targetId,
                    hp: newHp,
                });

                if (newHp <= 0) {
                    const winner = targetId === 1 ? 2 : 1;
                    this.room.endGame(winner)
                }

                break;
            }
            case 'ready':
                room.setReady(this.playerId, data.isReady);
                break;
            case 'collision':
                room.broadcast('collision', {});
                break;
        }
    }

    checkHp() {

    }

    onClose() {
        this.room.removePlayer(this.playerId);
    }
}

function findAvailableRoom() {
    for (const room of rooms.values()) {
        if (room.players.size < 2) return room;
    }
    const id = Math.random().toString(36).slice(2, 8);
    const newRoom = new Room(id);
    rooms.set(id, newRoom);
    return newRoom;
}


/**
 * 处理 lobby 中的消息
 * @param {WebSocket} ws
 * @param {string} msg
 */
function handleLobbyMessage(ws, msg) {
    let parsed;
    try {
        parsed = JSON.parse(msg);
    } catch {
        return;
    }

    const { type, data } = parsed;

    switch (type) {
        case 'join_room': {
            // 判断 ws 是否已在房间，避免重复加入
            const existingConn = findPlayerConnection(ws);
            if (existingConn) return; // 已在房间，忽略
            // 玩家请求加入房间
            const room = findAvailableRoom();
            const conn = room.addPlayer(ws);
            ws.on('close', () => {
                lobby.delete(ws); // 确保 lobby 中无残留
                room.removePlayer(conn.playerId);
            });
            break;
        }
        case 'leave_room': {
            // 玩家请求离开房间，重新回到 lobby
            const conn = findPlayerConnection(ws);
            if (conn) {
                conn.room.removePlayer(conn.playerId);
                lobby.add(ws);
            }
            break;
        }
    }
}

/**
 * 查找 ws 对应的玩家连接对象
 * @param {WebSocket} ws
 * @returns {PlayerConnection|null}
 */
function findPlayerConnection(ws) {
    for (const room of rooms.values()) {
        for (const conn of room.players.values()) {
            if (conn.ws === ws) return conn;
        }
    }
    return null;
}


wss.on('connection', ws => {
    // 新连接先加入 lobby
    lobby.add(ws);

    // 监听 lobby 相关消息
    ws.on('message', msg => handleLobbyMessage(ws, msg));

    ws.on('close', () => {
        lobby.delete(ws);
    });
});

// 每 2 秒广播大厅人数和房间数量
setInterval(() => {
    const lobbyCount = lobby.size;
    const roomCount = rooms.size;
    const info = { lobbyCount, roomCount };

    for (const ws of lobby) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'lobby_info', data: info }));
        }
    }
}, 2000);

setInterval(() => {
    for (const room of rooms.values()) {
        if (room.isPlaying) {
            room.broadcastState();
        }
    }
}, TICK_RATE);
