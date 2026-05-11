"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewSchema = exports.MessageSchema = exports.SessionSchema = exports.TutorProfileSchema = exports.UserSchema = exports.StatusEnum = exports.RoleEnum = void 0;
const zod_1 = require("zod");
// Roles
exports.RoleEnum = zod_1.z.enum(['STUDENT', 'TUTOR', 'ADMIN']);
exports.StatusEnum = zod_1.z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']);
// User Types
exports.UserSchema = zod_1.z.object({
    id: zod_1.z.string(),
    email: zod_1.z.string().email(),
    role: exports.RoleEnum,
    googleId: zod_1.z.string().nullable().optional(),
    avatarUrl: zod_1.z.string().nullable().optional(),
    createdAt: zod_1.z.date(),
});
// Tutor Profile Types
exports.TutorProfileSchema = zod_1.z.object({
    id: zod_1.z.string(),
    userId: zod_1.z.string(),
    bio: zod_1.z.string(),
    subjects: zod_1.z.array(zod_1.z.string()),
    hourlyRate: zod_1.z.number(),
    isVerified: zod_1.z.boolean(),
});
// Session Types
exports.SessionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    studentId: zod_1.z.string(),
    tutorId: zod_1.z.string(),
    datetime: zod_1.z.date(),
    durationMin: zod_1.z.number(),
    status: exports.StatusEnum,
    amountCents: zod_1.z.number(),
});
// Message Types
exports.MessageSchema = zod_1.z.object({
    id: zod_1.z.string(),
    senderId: zod_1.z.string(),
    receiverId: zod_1.z.string(),
    sessionId: zod_1.z.string().nullable().optional(),
    content: zod_1.z.string(),
    readAt: zod_1.z.date().nullable().optional(),
});
// Review Types
exports.ReviewSchema = zod_1.z.object({
    id: zod_1.z.string(),
    sessionId: zod_1.z.string(),
    studentId: zod_1.z.string(),
    tutorId: zod_1.z.string(),
    rating: zod_1.z.number().int().min(1).max(5),
    comment: zod_1.z.string(),
    createdAt: zod_1.z.date(),
});
