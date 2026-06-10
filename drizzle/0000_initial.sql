CREATE TABLE "figma_urls" (
	"id" serial PRIMARY KEY NOT NULL,
	"application" varchar(255) NOT NULL,
	"url" text NOT NULL,
	"details" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "figma_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"application" varchar(255) NOT NULL,
	"version" integer NOT NULL,
	"details" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "figma_versions_app_version" UNIQUE("application","version")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "projects_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "timesheet_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"date" timestamp NOT NULL,
	"hours" numeric(5, 2) NOT NULL,
	"details" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "timesheet_entries" ADD CONSTRAINT "timesheet_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_figma_urls_app" ON "figma_urls" USING btree ("application");--> statement-breakpoint
CREATE INDEX "idx_figma_versions_app" ON "figma_versions" USING btree ("application");--> statement-breakpoint
CREATE INDEX "idx_timesheet_project" ON "timesheet_entries" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_timesheet_date" ON "timesheet_entries" USING btree ("date");