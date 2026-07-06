import { pgTable, serial, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. Users Table (Linked with Firebase Auth UID)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(), // Firebase Auth UID
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// 2. Escalated Cases Table (Storing RSK Farmer diagnostic cases)
export const escalatedCases = pgTable("escalated_cases", {
  id: text("id").primaryKey(), // Using the generated UUID string from frontend/backend
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }), // Can be null if guest, or linked to user
  districtId: text("district_id").notNull(),
  farmerName: text("farmer_name").notNull(),
  village: text("village").notNull(),
  cropName: text("crop_name").notNull(),
  photoThumbnail: text("photo_thumbnail").notNull(), // Stores the base64 data URL or URL
  diagnosis: jsonb("diagnosis").notNull(), // Stores the structured DiagnosisResult object
  symptomDescription: text("symptom_description").notNull(),
  voiceTranscript: text("voice_transcript"),
  submissionTime: text("submission_time").notNull(),
  status: text("status").notNull().default("Open"), // Open, In Review, Responded, Closed
  advisoryResponse: text("advisory_response").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relationships
export const usersRelations = relations(users, ({ many }) => ({
  cases: many(escalatedCases),
}));

export const escalatedCasesRelations = relations(escalatedCases, ({ one }) => ({
  user: one(users, {
    fields: [escalatedCases.userId],
    references: [users.id],
  }),
}));
