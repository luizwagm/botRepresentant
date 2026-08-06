-- CreateTable
CREATE TABLE "about_pages" (
    "id" TEXT NOT NULL,
    "hero_title" TEXT NOT NULL,
    "hero_subtitle" TEXT NOT NULL DEFAULT '',
    "story_html" TEXT NOT NULL,
    "highlights" JSONB NOT NULL,
    "stats" JSONB NOT NULL,
    "image_url" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "about_pages_pkey" PRIMARY KEY ("id")
);
