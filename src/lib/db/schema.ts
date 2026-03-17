import { pgTable, serial, varchar, boolean, timestamp, integer, numeric, text, unique, index } from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const timesheetEntries = pgTable("timesheet_entries", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  date: timestamp("date", { mode: "date" }).notNull(),
  hours: numeric("hours", { precision: 5, scale: 2 }).notNull(),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_timesheet_project").on(table.projectId),
  index("idx_timesheet_date").on(table.date),
]);

export const figmaVersions = pgTable("figma_versions", {
  id: serial("id").primaryKey(),
  application: varchar("application", { length: 255 }).notNull(),
  version: integer("version").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  unique("figma_versions_app_version").on(table.application, table.version),
  index("idx_figma_versions_app").on(table.application),
]);

export const figmaUrls = pgTable("figma_urls", {
  id: serial("id").primaryKey(),
  application: varchar("application", { length: 255 }).notNull(),
  url: text("url").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_figma_urls_app").on(table.application),
]);

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
