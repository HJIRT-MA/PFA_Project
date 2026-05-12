"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocketIO = exports.io = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("./lib/prisma");
const setupSocketIO = (httpServer) => {
    exports.io = new socket_io_1.Server(httpServer, {
        cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173' }
    });
    exports.io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token)
            return next(new Error('Authentication error'));
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'supersecret');
            socket.user = decoded;
            next();
        }
        catch (err) {
            next(new Error('Authentication error'));
        }
    });
    exports.io.on('connection', (socket) => {
        const userId = socket.user.id;
        socket.join(`user:${userId}`);
        socket.on('send_message', async (data) => {
            try {
                const msg = await prisma_1.prisma.message.create({
                    data: {
                        senderId: userId,
                        receiverId: data.receiverId,
                        content: data.content,
                        sessionId: data.sessionId
                    }
                });
                exports.io.to(`user:${data.receiverId}`).emit('new_message', msg);
                socket.emit('message_saved', msg);
            }
            catch (err) {
                console.error(err);
            }
        });
        socket.on('mark_read', async (data) => {
            try {
                const msg = await prisma_1.prisma.message.findUnique({ where: { id: data.messageId } });
                if (!msg || msg.receiverId !== userId)
                    return;
                const updated = await prisma_1.prisma.message.update({
                    where: { id: data.messageId },
                    data: { readAt: new Date() }
                });
                exports.io.to(`user:${updated.senderId}`).emit('message_read', updated);
            }
            catch (err) {
                console.error(err);
            }
        });
    });
};
exports.setupSocketIO = setupSocketIO;
