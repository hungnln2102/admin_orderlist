/**
 * Migration 20261125000002: Add category to business.product & description to business.variant
 * Phục vụ trang Bảng Giá công khai (mavrykpremium.com/price) và quản trị trên Admin.
 */

const schemaProduct = process.env.DB_SCHEMA_PRODUCT || process.env.SCHEMA_PRODUCT || "business";

const CATEGORY_SEED_RULES = [
  {
    category: "AI & Trợ lý",
    names: [
      "Antigravity",
      "Chat GPT",
      "Claude",
      "Copilot",
      "Cursor",
      "Gamma",
      "Gemini",
      "Genspark",
      "Grok",
      "Perlexcity",
      "Perplexity",
      "Quillibot",
      "QuillBot",
      "Transkriptor",
    ],
  },
  {
    category: "Thiết kế & Đồ họa",
    names: [
      "Adobe",
      "Adobe_Paid--6m",
      "Autodesk",
      "Beautiful",
      "Canva",
      "CorelDRAW",
      "Freepik",
      "Hypic",
      "Krea AI",
      "Leonardo AI",
      "Lightroom",
      "Meitu",
      "Midjourney",
      "Photoroom",
      "Picart",
      "Picsart",
    ],
  },
  {
    category: "Video & Âm thanh",
    names: [
      "Camtasia",
      "Capcut",
      "Filmora",
      "Hailou",
      "Heygen",
      "Invideo",
      "Invideo AI",
      "Kiling",
      "Kling",
      "OpusClip",
      "Pixverse",
      "Runway AI",
      "Suno",
      "Veo3",
    ],
  },
  {
    category: "Giải trí & Streaming",
    names: [
      "Apple Music",
      "FPT Play",
      "K+",
      "Netflix",
      "Spotify",
      "Tinder",
      "Vieon",
      "Youtube",
    ],
  },
  {
    category: "Học tập & Văn phòng",
    names: [
      "Coursera",
      "Doulingo",
      "Duolingo",
      "GoogleOne",
      "Icloud",
      "Office 365",
      "Quizizz",
      "Quizlet",
      "Turnitin",
      "Zoom",
    ],
  },
  {
    category: "Bảo mật & Tiện ích",
    names: [
      "Kaspersky",
      "Nord VPN",
      "Parallel",
      "Personal",
      "Surfshark",
      "Vietmap",
    ],
  },
];

exports.up = async function up(knex) {
  await knex.raw(`
    ALTER TABLE ${schemaProduct}.product
      ADD COLUMN IF NOT EXISTS category VARCHAR(100);

    ALTER TABLE ${schemaProduct}.variant
      ADD COLUMN IF NOT EXISTS description TEXT;

    CREATE INDEX IF NOT EXISTS idx_product_category_v2
      ON ${schemaProduct}.product (category);
  `);

  for (const rule of CATEGORY_SEED_RULES) {
    const lowerNames = rule.names.map((n) => n.toLowerCase());
    await knex(`${schemaProduct}.product`)
      .whereNull("category")
      .whereRaw("LOWER(BTRIM(package_name)) = ANY(?)", [lowerNames])
      .update({ category: rule.category });
  }

  await knex(`${schemaProduct}.product`)
    .whereNull("category")
    .update({ category: "Khác" });
};

exports.down = async function down(knex) {
  await knex.raw(`
    DROP INDEX IF EXISTS ${schemaProduct}.idx_product_category_v2;
    ALTER TABLE ${schemaProduct}.variant DROP COLUMN IF EXISTS description;
    ALTER TABLE ${schemaProduct}.product DROP COLUMN IF EXISTS category;
  `);
};
