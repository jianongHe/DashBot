const WebSocket = require('ws');

const PORT = 8080;
const TICK_RATE = 1000 / 30;

const wss = new WebSocket.Server({ port: PORT });
console.log(`Server running on ws://localhost:${PORT}`);

const rooms = new Map(); // roomId -> Room

class Room {
    constructor(id) {
        this.id = id;
        this.players = new Map(); // playerId -> PlayerConnection
        this.states = {}; // playerId -> {x, y, angle, ...}
        this.readyStatus = {}; // playerId -> true/false
        this.hp = {
            1: 300,
            2: 300
        };
    }

    addPlayer(ws) {
        const playerId = this.players.size + 1;
        const conn = new PlayerConnection(ws, this, playerId);
        this.players.set(playerId, conn);
        this.states[playerId] = {};
        this.readyStatus[playerId] = false;

        conn.send('joined', { roomId: this.id, playerId });
        return conn;
    }

    removePlayer(playerId) {
        this.players.delete(playerId);
        delete this.states[playerId];
        delete this.readyStatus[playerId];
        if (this.players.size === 0) {
            rooms.delete(this.id);
        }
    }

    updateState(playerId, state) {
        this.states[playerId] = state;
    }

    setReady(playerId, isReady) {
        this.readyStatus[playerId] = isReady;
        this.broadcast('ready_update', { readyStatus: this.readyStatus });

        const allReady = Object.values(this.readyStatus).length === 2 &&
            Object.values(this.readyStatus).every(v => v);
        if (allReady) {
            this.broadcast('game_start', {});
        }
    }

    broadcast(type, data) {
        for (const conn of this.players.values()) {
            conn.send(type, data);
        }
    }

    broadcastState() {
        this.broadcast('sync', this.states);
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
            case 'charge_release':
                room.broadcast('charge_release', { playerId: this.playerId, ...data });
                break;
            case 'damage': {
                const { targetId, amount, fromX, fromY, knockbackMult } = data;
                const target = room.states[targetId];
                if (!target) return;

                // 需要先检查 hp 是否已初始化（第一次同步可能还没就绪）
                if (typeof target.hp !== 'number') target.hp = 300;

                target.hp = Math.max(0, target.hp - amount);

                // 广播给所有人：这个玩家的 hp 变化了
                room.broadcast('hp_update', {
                    targetId,
                    hp: target.hp,
                    fromX,
                    fromY,
                    amount,
                    knockbackMult // 新增参数
                });

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

wss.on('connection', ws => {
    const room = findAvailableRoom();
    room.addPlayer(ws);
});

setInterval(() => {
    for (const room of rooms.values()) {
        room.broadcastState();
    }
}, TICK_RATE);
