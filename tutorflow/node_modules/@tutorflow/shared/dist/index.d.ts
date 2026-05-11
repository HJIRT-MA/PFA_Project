import { z } from 'zod';
export declare const RoleEnum: z.ZodEnum<["STUDENT", "TUTOR", "ADMIN"]>;
export type Role = z.infer<typeof RoleEnum>;
export declare const StatusEnum: z.ZodEnum<["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]>;
export type Status = z.infer<typeof StatusEnum>;
export declare const UserSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    role: z.ZodEnum<["STUDENT", "TUTOR", "ADMIN"]>;
    googleId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    avatarUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    email: string;
    role: "STUDENT" | "TUTOR" | "ADMIN";
    createdAt: Date;
    googleId?: string | null | undefined;
    avatarUrl?: string | null | undefined;
}, {
    id: string;
    email: string;
    role: "STUDENT" | "TUTOR" | "ADMIN";
    createdAt: Date;
    googleId?: string | null | undefined;
    avatarUrl?: string | null | undefined;
}>;
export type User = z.infer<typeof UserSchema>;
export declare const TutorProfileSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    bio: z.ZodString;
    subjects: z.ZodArray<z.ZodString, "many">;
    hourlyRate: z.ZodNumber;
    isVerified: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    id: string;
    userId: string;
    bio: string;
    subjects: string[];
    hourlyRate: number;
    isVerified: boolean;
}, {
    id: string;
    userId: string;
    bio: string;
    subjects: string[];
    hourlyRate: number;
    isVerified: boolean;
}>;
export type TutorProfile = z.infer<typeof TutorProfileSchema>;
export declare const SessionSchema: z.ZodObject<{
    id: z.ZodString;
    studentId: z.ZodString;
    tutorId: z.ZodString;
    datetime: z.ZodDate;
    durationMin: z.ZodNumber;
    status: z.ZodEnum<["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]>;
    amountCents: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
    id: string;
    studentId: string;
    tutorId: string;
    datetime: Date;
    durationMin: number;
    amountCents: number;
}, {
    status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
    id: string;
    studentId: string;
    tutorId: string;
    datetime: Date;
    durationMin: number;
    amountCents: number;
}>;
export type Session = z.infer<typeof SessionSchema>;
export declare const MessageSchema: z.ZodObject<{
    id: z.ZodString;
    senderId: z.ZodString;
    receiverId: z.ZodString;
    sessionId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    content: z.ZodString;
    readAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    sessionId?: string | null | undefined;
    readAt?: Date | null | undefined;
}, {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    sessionId?: string | null | undefined;
    readAt?: Date | null | undefined;
}>;
export type Message = z.infer<typeof MessageSchema>;
export declare const ReviewSchema: z.ZodObject<{
    id: z.ZodString;
    sessionId: z.ZodString;
    studentId: z.ZodString;
    tutorId: z.ZodString;
    rating: z.ZodNumber;
    comment: z.ZodString;
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: Date;
    studentId: string;
    tutorId: string;
    sessionId: string;
    rating: number;
    comment: string;
}, {
    id: string;
    createdAt: Date;
    studentId: string;
    tutorId: string;
    sessionId: string;
    rating: number;
    comment: string;
}>;
export type Review = z.infer<typeof ReviewSchema>;
