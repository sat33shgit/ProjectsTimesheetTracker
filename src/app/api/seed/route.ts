import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, timesheetEntries, figmaVersions, figmaUrls, settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const SAMPLE_PROJECTS = [
  "Sketch Book", "YBH Ministries New", "YBH Ministries3", "Church Template",
  "AI Prompts Manager", "Job Applications Tracker", "Personal Portfolio website",
  "Prompt Vault", "Sateesh Sketches Mobile", "YBH Ministries1", "YBH Ministries2",
  "Resume Builder", "Budget Tracker", "Meal Planner", "Fitness Log", "Reading List"
];

const SAMPLE_TIMESHEET: { project: string; date: string; hours: number; details: string }[] = [
  { project: "Sketch Book", date: "2025-08-13", hours: 5, details: "deployed to github pages" },
  { project: "Sketch Book", date: "2025-08-14", hours: 3, details: "deployed to vercel" },
  { project: "Sketch Book", date: "2025-08-15", hours: 4, details: "fixed responsive layout" },
  { project: "Sketch Book", date: "2025-08-16", hours: 6, details: "added dark mode support" },
  { project: "Sketch Book", date: "2025-08-17", hours: 2, details: "updated dependencies" },
  { project: "Sketch Book", date: "2025-08-20", hours: 8, details: "migration to Next.js 15" },
  { project: "Sketch Book", date: "2025-08-21", hours: 5, details: "implemented canvas drawing" },
  { project: "Sketch Book", date: "2025-08-22", hours: 3, details: "brush customization options" },
  { project: "Sketch Book", date: "2025-08-25", hours: 7, details: "layers panel implementation" },
  { project: "Sketch Book", date: "2025-08-26", hours: 4, details: "export to PNG/SVG" },
  { project: "Sketch Book", date: "2025-08-27", hours: 6, details: "undo/redo functionality" },
  { project: "Sketch Book", date: "2025-08-28", hours: 3, details: "color picker improvements" },
  { project: "Sketch Book", date: "2025-09-01", hours: 5, details: "touch support for mobile" },
  { project: "Sketch Book", date: "2025-09-02", hours: 4, details: "performance optimizations" },
  { project: "Sketch Book", date: "2025-09-03", hours: 6, details: "save/load sketches" },
  { project: "Sketch Book", date: "2025-09-04", hours: 3, details: "gallery view" },
  { project: "Sketch Book", date: "2025-09-05", hours: 8, details: "collaborative features" },
  { project: "Sketch Book", date: "2025-09-08", hours: 4, details: "template system" },
  { project: "Sketch Book", date: "2025-09-09", hours: 5, details: "shape tools" },
  { project: "Sketch Book", date: "2025-09-10", hours: 3, details: "text tool integration" },
  { project: "YBH Ministries New", date: "2025-07-01", hours: 8, details: "initial project setup" },
  { project: "YBH Ministries New", date: "2025-07-02", hours: 6, details: "homepage design implementation" },
  { project: "YBH Ministries New", date: "2025-07-03", hours: 7, details: "navigation and routing" },
  { project: "YBH Ministries New", date: "2025-07-07", hours: 5, details: "about page layout" },
  { project: "YBH Ministries New", date: "2025-07-08", hours: 6, details: "contact form with validation" },
  { project: "YBH Ministries New", date: "2025-07-09", hours: 8, details: "events calendar integration" },
  { project: "YBH Ministries New", date: "2025-07-10", hours: 4, details: "sermon archive page" },
  { project: "YBH Ministries New", date: "2025-07-14", hours: 7, details: "media gallery section" },
  { project: "YBH Ministries New", date: "2025-07-15", hours: 5, details: "prayer request form" },
  { project: "YBH Ministries New", date: "2025-07-16", hours: 6, details: "donation integration" },
  { project: "YBH Ministries New", date: "2025-07-17", hours: 8, details: "blog/news section" },
  { project: "YBH Ministries New", date: "2025-07-21", hours: 4, details: "footer and social links" },
  { project: "YBH Ministries New", date: "2025-07-22", hours: 5, details: "SEO optimization" },
  { project: "YBH Ministries New", date: "2025-07-23", hours: 6, details: "mobile responsive fixes" },
  { project: "YBH Ministries New", date: "2025-07-24", hours: 7, details: "admin panel basics" },
  { project: "YBH Ministries New", date: "2025-07-28", hours: 8, details: "content management system" },
  { project: "YBH Ministries New", date: "2025-07-29", hours: 5, details: "user authentication" },
  { project: "YBH Ministries New", date: "2025-07-30", hours: 6, details: "role-based access control" },
  { project: "YBH Ministries New", date: "2025-07-31", hours: 4, details: "deployment to production" },
  { project: "YBH Ministries New", date: "2025-08-04", hours: 7, details: "Supabase storage integration" },
  { project: "YBH Ministries New", date: "2025-08-05", hours: 5, details: "image optimization pipeline" },
  { project: "YBH Ministries New", date: "2025-08-06", hours: 3, details: "analytics dashboard" },
  { project: "YBH Ministries New", date: "2025-08-07", hours: 6, details: "email notifications" },
  { project: "YBH Ministries New", date: "2025-08-11", hours: 8, details: "migration to Vercel Blob" },
  { project: "YBH Ministries New", date: "2025-08-12", hours: 5, details: "testing and bug fixes" },
  { project: "YBH Ministries3", date: "2025-05-01", hours: 7, details: "migration to Vercel Blob storage" },
  { project: "YBH Ministries3", date: "2025-05-02", hours: 5, details: "Supabase storage changes" },
  { project: "YBH Ministries3", date: "2025-05-05", hours: 6, details: "new header design" },
  { project: "YBH Ministries3", date: "2025-05-06", hours: 4, details: "footer redesign" },
  { project: "YBH Ministries3", date: "2025-05-07", hours: 8, details: "updated event management" },
  { project: "YBH Ministries3", date: "2025-05-08", hours: 5, details: "sermon video embeds" },
  { project: "YBH Ministries3", date: "2025-05-12", hours: 6, details: "volunteer sign-up flow" },
  { project: "YBH Ministries3", date: "2025-05-13", hours: 3, details: "small group finder" },
  { project: "YBH Ministries3", date: "2025-05-14", hours: 7, details: "church directory" },
  { project: "YBH Ministries3", date: "2025-05-15", hours: 5, details: "giving history dashboard" },
  { project: "YBH Ministries3", date: "2025-05-19", hours: 4, details: "push notifications setup" },
  { project: "YBH Ministries3", date: "2025-05-20", hours: 6, details: "accessibility improvements" },
  { project: "YBH Ministries3", date: "2025-05-21", hours: 8, details: "performance audit fixes" },
  { project: "Church Template", date: "2025-06-01", hours: 6, details: "initial template structure" },
  { project: "Church Template", date: "2025-06-02", hours: 5, details: "customizable color scheme" },
  { project: "Church Template", date: "2025-06-03", hours: 7, details: "content block system" },
  { project: "Church Template", date: "2025-06-04", hours: 4, details: "responsive grid layout" },
  { project: "Church Template", date: "2025-06-09", hours: 8, details: "Figma component library" },
  { project: "Church Template", date: "2025-06-10", hours: 5, details: "documentation site" },
  { project: "Church Template", date: "2025-06-11", hours: 6, details: "example church sites" },
  { project: "Church Template", date: "2025-06-12", hours: 3, details: "deployment guide" },
  { project: "Church Template", date: "2025-06-16", hours: 7, details: "plugin architecture" },
  { project: "Church Template", date: "2025-06-17", hours: 5, details: "multi-language support" },
  { project: "AI Prompts Manager", date: "2025-04-01", hours: 6, details: "project setup and schema design" },
  { project: "AI Prompts Manager", date: "2025-04-02", hours: 5, details: "CRUD for prompts" },
  { project: "AI Prompts Manager", date: "2025-04-03", hours: 7, details: "categories and tags" },
  { project: "AI Prompts Manager", date: "2025-04-07", hours: 4, details: "search functionality" },
  { project: "AI Prompts Manager", date: "2025-04-08", hours: 6, details: "favorites and collections" },
  { project: "AI Prompts Manager", date: "2025-04-09", hours: 8, details: "import/export prompts" },
  { project: "AI Prompts Manager", date: "2025-04-10", hours: 3, details: "variable template system" },
  { project: "AI Prompts Manager", date: "2025-04-14", hours: 5, details: "prompt versioning" },
  { project: "AI Prompts Manager", date: "2025-04-15", hours: 6, details: "API playground" },
  { project: "AI Prompts Manager", date: "2025-04-16", hours: 4, details: "usage analytics" },
  { project: "Job Applications Tracker", date: "2025-03-01", hours: 5, details: "kanban board UI" },
  { project: "Job Applications Tracker", date: "2025-03-03", hours: 7, details: "application form" },
  { project: "Job Applications Tracker", date: "2025-03-04", hours: 4, details: "status pipeline view" },
  { project: "Job Applications Tracker", date: "2025-03-05", hours: 6, details: "company research notes" },
  { project: "Job Applications Tracker", date: "2025-03-10", hours: 8, details: "interview scheduling" },
  { project: "Job Applications Tracker", date: "2025-03-11", hours: 5, details: "document attachments" },
  { project: "Job Applications Tracker", date: "2025-03-12", hours: 3, details: "email templates" },
  { project: "Job Applications Tracker", date: "2025-03-13", hours: 6, details: "analytics dashboard" },
  { project: "Job Applications Tracker", date: "2025-03-17", hours: 4, details: "salary comparison tool" },
  { project: "Personal Portfolio website", date: "2025-02-01", hours: 6, details: "hero section design" },
  { project: "Personal Portfolio website", date: "2025-02-03", hours: 5, details: "projects showcase" },
  { project: "Personal Portfolio website", date: "2025-02-04", hours: 7, details: "blog integration" },
  { project: "Personal Portfolio website", date: "2025-02-05", hours: 4, details: "contact section" },
  { project: "Personal Portfolio website", date: "2025-02-10", hours: 8, details: "animations and transitions" },
  { project: "Personal Portfolio website", date: "2025-02-11", hours: 5, details: "dark mode toggle" },
  { project: "Personal Portfolio website", date: "2025-02-12", hours: 3, details: "SEO and meta tags" },
  { project: "Personal Portfolio website", date: "2025-02-13", hours: 6, details: "performance optimization" },
  { project: "Prompt Vault", date: "2025-01-06", hours: 5, details: "secure storage backend" },
  { project: "Prompt Vault", date: "2025-01-07", hours: 6, details: "encryption at rest" },
  { project: "Prompt Vault", date: "2025-01-08", hours: 4, details: "sharing with permissions" },
  { project: "Prompt Vault", date: "2025-01-13", hours: 7, details: "team workspaces" },
  { project: "Prompt Vault", date: "2025-01-14", hours: 5, details: "API key management" },
  { project: "Prompt Vault", date: "2025-01-15", hours: 8, details: "usage quotas and billing" },
  { project: "Prompt Vault", date: "2025-01-20", hours: 3, details: "webhook integrations" },
  { project: "Sateesh Sketches Mobile", date: "2025-01-02", hours: 6, details: "React Native setup" },
  { project: "Sateesh Sketches Mobile", date: "2025-01-03", hours: 5, details: "canvas component" },
  { project: "Sateesh Sketches Mobile", date: "2025-01-06", hours: 7, details: "gesture handling" },
  { project: "Sateesh Sketches Mobile", date: "2025-01-07", hours: 4, details: "brush engine" },
  { project: "Sateesh Sketches Mobile", date: "2025-01-08", hours: 8, details: "layer management" },
  { project: "Sateesh Sketches Mobile", date: "2025-01-09", hours: 5, details: "export and sharing" },
  { project: "Sateesh Sketches Mobile", date: "2025-01-13", hours: 6, details: "cloud sync" },
  { project: "YBH Ministries1", date: "2025-09-15", hours: 4, details: "legacy maintenance" },
  { project: "YBH Ministries1", date: "2025-09-16", hours: 3, details: "security patches" },
  { project: "YBH Ministries1", date: "2025-09-17", hours: 5, details: "dependency updates" },
  { project: "YBH Ministries1", date: "2025-09-22", hours: 6, details: "backup system" },
  { project: "YBH Ministries1", date: "2025-09-23", hours: 4, details: "migration planning" },
  { project: "YBH Ministries2", date: "2025-10-01", hours: 5, details: "design refresh" },
  { project: "YBH Ministries2", date: "2025-10-02", hours: 6, details: "new features rollout" },
  { project: "YBH Ministries2", date: "2025-10-06", hours: 7, details: "mobile app wireframes" },
  { project: "YBH Ministries2", date: "2025-10-07", hours: 4, details: "API v2 endpoints" },
  { project: "YBH Ministries2", date: "2025-10-08", hours: 8, details: "database optimization" },
  { project: "Resume Builder", date: "2025-10-13", hours: 6, details: "template engine" },
  { project: "Resume Builder", date: "2025-10-14", hours: 5, details: "PDF generation" },
  { project: "Resume Builder", date: "2025-10-15", hours: 7, details: "drag-and-drop sections" },
  { project: "Resume Builder", date: "2025-10-20", hours: 4, details: "ATS optimization tips" },
  { project: "Resume Builder", date: "2025-10-21", hours: 6, details: "custom fonts and colors" },
  { project: "Budget Tracker", date: "2025-11-03", hours: 5, details: "transaction categories" },
  { project: "Budget Tracker", date: "2025-11-04", hours: 7, details: "recurring expenses" },
  { project: "Budget Tracker", date: "2025-11-05", hours: 4, details: "monthly budgets" },
  { project: "Budget Tracker", date: "2025-11-10", hours: 6, details: "charts and reports" },
  { project: "Budget Tracker", date: "2025-11-11", hours: 8, details: "CSV import from bank" },
  { project: "Meal Planner", date: "2025-11-17", hours: 5, details: "recipe database" },
  { project: "Meal Planner", date: "2025-11-18", hours: 6, details: "weekly meal calendar" },
  { project: "Meal Planner", date: "2025-11-19", hours: 4, details: "shopping list generator" },
  { project: "Meal Planner", date: "2025-11-24", hours: 7, details: "nutritional info" },
  { project: "Fitness Log", date: "2025-12-01", hours: 5, details: "workout library" },
  { project: "Fitness Log", date: "2025-12-02", hours: 6, details: "progress tracking" },
  { project: "Fitness Log", date: "2025-12-03", hours: 4, details: "goal setting" },
  { project: "Fitness Log", date: "2025-12-08", hours: 7, details: "body measurements" },
  { project: "Fitness Log", date: "2025-12-09", hours: 3, details: "rest day reminders" },
  { project: "Reading List", date: "2025-12-15", hours: 4, details: "ISBN lookup API" },
  { project: "Reading List", date: "2025-12-16", hours: 5, details: "reading progress bar" },
  { project: "Reading List", date: "2025-12-17", hours: 6, details: "book reviews and ratings" },
  { project: "Reading List", date: "2025-12-22", hours: 3, details: "reading goals tracker" },
  { project: "Reading List", date: "2025-12-23", hours: 5, details: "recommendation engine" },
];

const SAMPLE_FIGMA_VERSIONS: { application: string; version: number; details: string }[] = [];

// Generate 96 Figma version records
function generateFigmaVersions() {
  const apps = ["Church Template", "YBH Ministries3", "YBH Ministries New", "AI Prompts Manager", "Personal Portfolio website", "Prompt Vault"];
  const detailSets: Record<string, string[]> = {
    "Church Template": [
      "Initial layout structure", "Color palette system", "Typography scale", "Button component variants",
      "Card component", "Navigation bar", "Hero section", "Footer design", "Form elements", "Modal dialogs",
      "Mobile responsive layouts", "Dark mode variants", "Icon set integration", "Image placeholders",
      "Loading states", "Error states"
    ],
    "YBH Ministries3": [
      "Migration to Vercel Blob storage", "Supabase storage changes", "New header design",
      "Updated event cards", "Sermon page redesign", "Contact form update", "Gallery grid layout",
      "Donation page flow", "Newsletter signup", "Social media integration", "Prayer wall design",
      "Admin dashboard layout", "Member directory", "Calendar integration", "Push notification UI",
      "Accessibility audit fixes", "Performance indicators", "Search results page", "Blog post template",
      "Archive page design"
    ],
    "YBH Ministries New": [
      "Brand new design system", "Homepage hero", "About page", "Events listing",
      "Sermon archive", "Media gallery", "Contact us", "Prayer requests", "Giving page",
      "Blog layout", "Team page", "Footer redesign", "Mobile navigation", "Animation specs",
      "Onboarding flow", "Dashboard wireframes", "Email templates", "Social sharing cards"
    ],
    "AI Prompts Manager": [
      "Prompt editor layout", "Category tree view", "Search results grid", "Tag management",
      "Favorites panel", "Collection view", "Import wizard", "Variable template UI",
      "Version history timeline", "API playground", "Usage charts", "Settings page",
      "Sharing dialog", "Keyboard shortcuts overlay"
    ],
    "Personal Portfolio website": [
      "Hero section animation specs", "Project card hover states", "Blog post layout",
      "Contact form design", "Skills section", "Timeline component", "Testimonials carousel",
      "Footer with social links", "Dark mode toggle animation", "Mobile menu",
      "Resume download section", "404 page design"
    ],
    "Prompt Vault": [
      "Vault dashboard", "Encryption indicator UI", "Permission matrix", "Team workspace layout",
      "API key management page", "Billing page design", "Webhook configuration",
      "Audit log table", "Search and filter bar", "Prompt detail view",
      "Share dialog flow", "Onboarding wizard"
    ]
  };

  let totalGenerated = 0;
  for (const app of apps) {
    const details = detailSets[app] || [];
    const count = app === "YBH Ministries3" ? 20 : app === "YBH Ministries New" ? 18 : details.length;
    for (let i = 0; i < count && totalGenerated < 96; i++) {
      SAMPLE_FIGMA_VERSIONS.push({
        application: app,
        version: 100 + count - i,
        details: details[i] || `Version update ${100 + count - i}`,
      });
      totalGenerated++;
    }
  }
}
generateFigmaVersions();

const SAMPLE_FIGMA_URLS: { application: string; url: string; details: string }[] = [
  { application: "Church Template", url: "https://www.figma.com/design/RFCtemplate001", details: "Main church template design" },
  { application: "YBH Ministries1", url: "https://www.figma.com/design/Hu1ybhmin001", details: "First version with basic layouts" },
  { application: "YBH Ministries2", url: "https://www.figma.com/design/Hu2ybhmin002", details: "Redesigned with modern components" },
  { application: "YBH Ministries3", url: "https://www.figma.com/design/Hu3ybhmin003", details: "Complete overhaul with new brand" },
  { application: "YBH Ministries New", url: "https://www.figma.com/design/NewYBHmin004", details: "Latest ministry site design" },
  { application: "AI Prompts Manager", url: "https://www.figma.com/design/AIPr0mpts005", details: "Prompt management dashboard" },
  { application: "Job Applications Tracker", url: "https://www.figma.com/design/J0bTrack006", details: "Kanban board and application forms" },
  { application: "Personal Portfolio website", url: "https://www.figma.com/design/P0rtfolio007", details: "Portfolio with blog integration" },
  { application: "Prompt Vault", url: "https://www.figma.com/design/PrVault008", details: "Secure prompt storage UI" },
  { application: "Sateesh Sketches Mobile", url: "https://www.figma.com/design/SketchM009", details: "Mobile drawing app screens" },
  { application: "Resume Builder", url: "https://www.figma.com/design/ResBuild010", details: "Template-based resume editor" },
  { application: "Budget Tracker", url: "https://www.figma.com/design/BudgTrack011", details: "Personal finance dashboard" },
];

export async function POST() {
  try {
    // Create projects
    const projectMap: Record<string, number> = {};
    for (const name of SAMPLE_PROJECTS) {
      const existing = await db.select().from(projects).where(eq(projects.name, name)).limit(1);
      if (existing.length > 0) {
        projectMap[name] = existing[0].id;
      } else {
        const [created] = await db.insert(projects).values({ name }).returning();
        projectMap[name] = created.id;
      }
    }

    // Create timesheet entries
    let tsCount = 0;
    for (const entry of SAMPLE_TIMESHEET) {
      const projectId = projectMap[entry.project];
      if (!projectId) continue;
      await db.insert(timesheetEntries).values({
        projectId,
        date: new Date(entry.date),
        hours: String(entry.hours),
        details: entry.details,
      });
      tsCount++;
    }

    // Create figma versions
    let fvCount = 0;
    for (const v of SAMPLE_FIGMA_VERSIONS) {
      try {
        await db.insert(figmaVersions).values({
          application: v.application,
          version: v.version,
          details: v.details,
        });
        fvCount++;
      } catch {
        // Skip duplicates
      }
    }

    // Create figma urls
    let fuCount = 0;
    for (const u of SAMPLE_FIGMA_URLS) {
      await db.insert(figmaUrls).values({
        application: u.application,
        url: u.url,
        details: u.details,
      });
      fuCount++;
    }

    // Set default settings
    const existingRate = await db.select().from(settings).where(eq(settings.key, "hourly_rate_cad")).limit(1);
    if (existingRate.length === 0) {
      await db.insert(settings).values({ key: "hourly_rate_cad", value: "10" });
    }
    const existingConv = await db.select().from(settings).where(eq(settings.key, "conversion_rate_inr")).limit(1);
    if (existingConv.length === 0) {
      await db.insert(settings).values({ key: "conversion_rate_inr", value: "60" });
    }

    return NextResponse.json({
      success: true,
      seeded: {
        projects: SAMPLE_PROJECTS.length,
        timesheet: tsCount,
        figmaVersions: fvCount,
        figmaUrls: fuCount,
      },
    });
  } catch (error) {
    console.error("Failed to seed data:", error);
    return NextResponse.json({ error: "Failed to seed data" }, { status: 500 });
  }
}
