import { z } from 'zod';

// Roles
export const RoleEnum = z.enum(['STUDENT', 'TUTOR', 'ADMIN']);
export type Role = z.infer<typeof RoleEnum>;

export const StatusEnum = z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']);
export type Status = z.infer<typeof StatusEnum>;

// User Types
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: RoleEnum,
  googleId: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  createdAt: z.date(),
});
export type User = z.infer<typeof UserSchema>;

// Tutor Profile Types
export const TutorProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  bio: z.string(),
  subjects: z.array(z.string()),
  hourlyRate: z.number(),
  isVerified: z.boolean(),
});
export type TutorProfile = z.infer<typeof TutorProfileSchema>;

// Session Types
export const SessionSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  tutorId: z.string(),
  datetime: z.date(),
  durationMin: z.number(),
  status: StatusEnum,
  amountCents: z.number(),
});
export type Session = z.infer<typeof SessionSchema>;

// Message Types
export const MessageSchema = z.object({
  id: z.string(),
  senderId: z.string(),
  receiverId: z.string(),
  sessionId: z.string().nullable().optional(),
  content: z.string(),
  readAt: z.date().nullable().optional(),
});
export type Message = z.infer<typeof MessageSchema>;

// Review Types
export const ReviewSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  studentId: z.string(),
  tutorId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string(),
  createdAt: z.date(),
});
export type Review = z.infer<typeof ReviewSchema>;
