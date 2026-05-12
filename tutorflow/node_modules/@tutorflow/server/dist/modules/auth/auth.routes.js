"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const prisma_1 = require("../../lib/prisma");
const passport_1 = __importDefault(require("./passport"));
const auth_1 = require("../../middleware/auth");
exports.authRouter = (0, express_1.Router)();
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    role: zod_1.z.enum(['STUDENT', 'TUTOR']).transform(val => val),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
});
exports.authRouter.post('/register', async (req, res, next) => {
    try {
        const { email, password, role } = registerSchema.parse(req.body);
        const existingUser = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(409).json({ error: 'Email already exists', code: 'EMAIL_IN_USE' });
            return;
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.prisma.user.create({
            data: {
                email,
                passwordHash,
                role,
                ...(role === 'TUTOR' && {
                    tutorProfile: {
                        create: {
                            bio: '',
                            subjects: [],
                            hourlyRate: 0,
                        },
                    },
                }),
            },
            include: { tutorProfile: true },
        });
        const token = jsonwebtoken_1.default.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, email: user.email, role: user.role, tutorProfile: user.tutorProfile } });
    }
    catch (error) {
        next(error);
    }
});
exports.authRouter.post('/login', async (req, res, next) => {
    try {
        const { email, password } = loginSchema.parse(req.body);
        const user = await prisma_1.prisma.user.findUnique({ where: { email }, include: { tutorProfile: true } });
        if (!user || !user.passwordHash) {
            res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, email: user.email, role: user.role, tutorProfile: user.tutorProfile } });
    }
    catch (error) {
        next(error);
    }
});
exports.authRouter.get('/google', passport_1.default.authenticate('google', { scope: ['profile', 'email'], session: false }));
exports.authRouter.get('/google/callback', passport_1.default.authenticate('google', { session: false, failureRedirect: '/login' }), (req, res) => {
    const user = req.user;
    if (!user) {
        return res.redirect('/login?error=auth_failed');
    }
    const token = jsonwebtoken_1.default.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    if (user.isNewUser) {
        // Redirect to onboarding/role selection with token
        return res.redirect(`${clientUrl}/onboarding?token=${token}&isNewUser=true`);
    }
    // Redirect to dashboard with token
    return res.redirect(`${clientUrl}/dashboard?token=${token}`);
});
exports.authRouter.get('/me', auth_1.requireAuth, (req, res) => {
    res.json({ user: req.user });
});
const roleSchema = zod_1.z.object({ role: zod_1.z.enum(['STUDENT', 'TUTOR']).transform(val => val) });
exports.authRouter.patch('/me/role', auth_1.requireAuth, async (req, res, next) => {
    try {
        const { role } = roleSchema.parse(req.body);
        const userId = req.user.id;
        const data = { role };
        if (role === 'TUTOR') {
            // Ensure empty profile exists
            const existingProfile = await prisma_1.prisma.tutorProfile.findUnique({ where: { userId } });
            if (!existingProfile) {
                data.tutorProfile = {
                    create: {
                        bio: '',
                        subjects: [],
                        hourlyRate: 0,
                    }
                };
            }
        }
        const updatedUser = await prisma_1.prisma.user.update({
            where: { id: userId },
            data,
            include: { tutorProfile: true }
        });
        res.json({ user: { id: updatedUser.id, email: updatedUser.email, role: updatedUser.role, tutorProfile: updatedUser.tutorProfile } });
    }
    catch (error) {
        next(error);
    }
});
