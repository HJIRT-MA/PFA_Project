import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from '../../lib/prisma';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || 'dummy_client_id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy_client_secret',
      callbackURL: '/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email found in Google profile'));
        }

        let user = await prisma.user.findUnique({ where: { googleId: profile.id } });
        if (!user) {
          // Check if user exists by email but not linked to Google
          user = await prisma.user.findUnique({ where: { email } });
          if (user) {
            user = await prisma.user.update({
              where: { email },
              data: { googleId: profile.id, avatarUrl: profile.photos?.[0]?.value },
            });
          } else {
            // New user via Google - role defaults to STUDENT, they can change or we prompt them
            user = await prisma.user.create({
              data: {
                email,
                googleId: profile.id,
                avatarUrl: profile.photos?.[0]?.value,
                // We'll leave role as default (STUDENT) initially.
                // The prompt mentions "role selection needed" for new users, so we can track this.
              },
            });
            // Mark it dynamically so the callback knows it's a new user
            (user as any).isNewUser = true;
          }
        }

        return done(null, user);
      } catch (error) {
        return done(error as Error, undefined);
      }
    }
  )
);

export default passport;
