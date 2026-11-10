import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$default(() => crypto.randomUUID()),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: ["user", "admin"] })
      .notNull()
      .default("user"),
    status: text("status", { enum: ["active", "disabled"] })
      .notNull()
      .default("active"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    lastLoginAt: integer("last_login_at", { mode: "timestamp" }),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
  }),
);

export const notes = sqliteTable(
  "notes",
  {
    id: text("id")
      .primaryKey()
      .$default(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references((): any => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Untitled"),
    content: text("content").notNull().default(""),
    category: text("category"),
    tags: text("tags"), // JSON array string
    isPinned: integer("is_pinned", { mode: "boolean" }).notNull().default(false),
    isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    userIdIdx: index("notes_user_id_idx").on(table.userId),
    categoryIdx: index("notes_category_idx").on(table.category),
    updatedAtIdx: index("notes_updated_at_idx").on(table.updatedAt),
  }),
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id")
      .primaryKey()
      .$default(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references((): any => users.id, { onDelete: "cascade" }),
    sessionTokenHash: text("session_token_hash").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    userIdIdx: index("sessions_user_id_idx").on(table.userId),
    tokenHashIdx: uniqueIndex("sessions_token_hash_idx").on(
      table.sessionTokenHash,
    ),
  }),
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id")
      .primaryKey()
      .$default(() => crypto.randomUUID()),
    adminId: text("admin_id").references((): any => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    details: text("details"), // JSON string
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    adminIdIdx: index("audit_logs_admin_id_idx").on(table.adminId),
    createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
    targetIdx: index("audit_logs_target_idx").on(
      table.targetType,
      table.targetId,
    ),
  }),
);
