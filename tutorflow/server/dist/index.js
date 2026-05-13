"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
const auth_routes_1 = require("./modules/auth/auth.routes");
const tutors_routes_1 = require("./modules/tutors/tutors.routes");
const sessions_routes_1 = require("./modules/sessions/sessions.routes");
const messages_routes_1 = require("./modules/messages/messages.routes");
const reviews_routes_1 = require("./modules/reviews/reviews.routes");
const admin_routes_1 = require("./modules/admin/admin.routes");
const notifications_routes_1 = require("./modules/notifications/notifications.routes");
const users_routes_1 = require("./modules/users/users.routes");
const disputes_routes_1 = require("./modules/disputes/disputes.routes");
const passport_1 = __importDefault(require("passport"));
const http_1 = require("http");
const socket_1 = require("./socket");
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use((0, morgan_1.default)('dev'));
// Stripe webhook needs raw body
app.use('/api/sessions/webhook', express_1.default.raw({ type: 'application/json' }));
app.use(express_1.default.json());
app.use(passport_1.default.initialize());
// API Routes
app.use('/api/auth', auth_routes_1.authRouter);
app.use('/api/tutors', tutors_routes_1.tutorsRouter);
app.use('/api/sessions', sessions_routes_1.sessionsRouter);
app.use('/api/messages', messages_routes_1.messagesRouter);
app.use('/api/reviews', reviews_routes_1.reviewsRouter);
app.use('/api/admin', admin_routes_1.adminRouter);
app.use('/api/notifications', notifications_routes_1.notificationsRouter);
app.use('/api/users', users_routes_1.usersRouter);
app.use('/api/disputes', disputes_routes_1.disputesRouter);
// Routes
app.get('/', (req, res) => {
    res.json({ message: 'TutorFlow API is running', health: '/health' });
});
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
const zod_1 = require("zod");
// Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    if (err instanceof zod_1.ZodError) {
        res.status(400).json({
            error: 'Validation Error',
            details: err.errors
        });
        return;
    }
    res.status(500).json({
        error: err.message || 'Internal Server Error',
        code: err.code || 'INTERNAL_ERROR'
    });
});
const server = (0, http_1.createServer)(app);
(0, socket_1.setupSocketIO)(server);
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
