"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const prisma_1 = require("../../lib/prisma");
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'dummy_client_id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy_client_secret',
    callbackURL: '/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
            return done(new Error('No email found in Google profile'));
        }
        let user = await prisma_1.prisma.user.findUnique({ where: { googleId: profile.id } });
        if (!user) {
            // Check if user exists by email but not linked to Google
            user = await prisma_1.prisma.user.findUnique({ where: { email } });
            if (user) {
                user = await prisma_1.prisma.user.update({
                    where: { email },
                    data: { googleId: profile.id, avatarUrl: profile.photos?.[0]?.value },
                });
            }
            else {
                // New user via Google - role defaults to STUDENT, they can change or we prompt them
                user = await prisma_1.prisma.user.create({
                    data: {
                        email,
                        googleId: profile.id,
                        avatarUrl: profile.photos?.[0]?.value,
                        // We'll leave role as default (STUDENT) initially.
                        // The prompt mentions "role selection needed" for new users, so we can track this.
                    },
                });
                // Mark it dynamically so the callback knows it's a new user
                user.isNewUser = true;
            }
        }
        return done(null, user);
    }
    catch (error) {
        return done(error, undefined);
    }
}));
exports.default = passport_1.default;
