import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const requireFromFrontend = createRequire(path.join(rootDir, "frontend", "package.json"));
const XLSX = requireFromFrontend("xlsx");

const LANG_XLSX = path.join(rootDir, "lang.xlsx");
const GENERATED_TS = path.join(rootDir, "frontend", "src", "i18n", "lang.generated.ts");
const MANUAL_LANG_JSON = path.join(rootDir, "scripts", "i18n", "manual-lang.json");
const SCAN_ROOTS = [
  path.join(rootDir, "frontend", "src"),
];
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".git", "i18n"]);
const VIETNAMESE_CHAR_RE = /[ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯàáâãèéêìíòóôõùúăđĩũơưẠ-ỹ]/;
const INTERPOLATION_RE = /\$\{|<\w|<\/|=>|\b(className|style|href|src|to|key|id)\b/;
const MONEY_ONLY_RE = /^[\d.,\s+%-]+(?:đ|vnd)$/i;
const CODE_LIKE_RE = /[_{}[\]<>]|\b(text-|bg-|border-|px-|py-|grid|flex|hover:)\b/;

const normalizeText = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .replace(/^[+?？.。]\s*/, "")
    .trim();

const canonicalText = (value) =>
  normalizeText(value)
    .normalize("NFC")
    .toLocaleLowerCase("vi-VN")
    .replace(/[.。]+$/g, "");

const canonicalMeaningText = (value) =>
  canonicalText(value)
    .replace(/[?!。.,:;…]+$/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[+?？.。]\s*/, "")
    .trim();

const SOFT_VARIANT_TOKENS = new Set([
  "cái",
  "các",
  "cho",
  "của",
  "danh",
  "dòng",
  "dữ",
  "đơn",
  "hiện",
  "khỏi",
  "liệu",
  "mã",
  "mục",
  "này",
  "ra",
  "sang",
  "tới",
  "vào",
  "về",
]);

const meaningTokens = (value) =>
  canonicalMeaningText(value)
    .split(/\s+/)
    .filter(Boolean);

const tokenCompareKey = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

const meaningCompareTokens = (value) =>
  meaningTokens(value).map(tokenCompareKey);

const SOFT_VARIANT_COMPARE_TOKENS = new Set(
  [...SOFT_VARIANT_TOKENS].map(tokenCompareKey)
);

const compactMeaningText = (value) =>
  meaningCompareTokens(value)
    .filter((token) => !SOFT_VARIANT_COMPARE_TOKENS.has(token))
    .join(" ");

const textQualityScore = (value) => {
  const text = normalizeText(value);
  let score = 0;
  if (/[a-zà-ỹ]/.test(text.slice(1))) score += 3;
  if (/^[A-ZÀ-Ỹ][a-zà-ỹ]/.test(text)) score += 2;
  if (/^[A-ZÀ-Ỹ\s]+$/.test(text) && /[A-ZÀ-Ỹ]/.test(text)) score -= 2;
  if (/[.!?。]$/.test(text)) score += 1;
  return score;
};

const isExpandableVariant = (shortText, longText) => {
  const shortCanonical = canonicalMeaningText(shortText);
  const longCanonical = canonicalMeaningText(longText);
  if (!shortCanonical || !longCanonical || shortCanonical === longCanonical) return false;
  if (shortCanonical.length < 8) return false;
  if (!longCanonical.startsWith(shortCanonical)) return false;
  const nextChar = longCanonical[shortCanonical.length] || "";
  return nextChar === "" || /[\s.,:;!?()-–—/]/.test(nextChar);
};

const isSameMeaningVariant = (leftText, rightText) => {
  const leftCanonical = canonicalMeaningText(leftText);
  const rightCanonical = canonicalMeaningText(rightText);
  if (!leftCanonical || !rightCanonical) return false;
  if (leftCanonical === rightCanonical) return true;

  const leftTokens = meaningCompareTokens(leftText);
  const rightTokens = meaningCompareTokens(rightText);
  if (!leftTokens.length || !rightTokens.length || leftTokens[0] !== rightTokens[0]) return false;

  const leftCompact = compactMeaningText(leftText);
  const rightCompact = compactMeaningText(rightText);
  if (leftCompact && rightCompact && leftCompact === rightCompact) return true;

  const shorter = leftCanonical.length <= rightCanonical.length ? leftCanonical : rightCanonical;
  const longer = leftCanonical.length > rightCanonical.length ? leftCanonical : rightCanonical;
  if (shorter.length >= 4 && longer.includes(shorter)) return true;

  const leftSet = new Set(leftTokens.filter((token) => !SOFT_VARIANT_COMPARE_TOKENS.has(token)));
  const rightSet = new Set(rightTokens.filter((token) => !SOFT_VARIANT_COMPARE_TOKENS.has(token)));
  if (!leftSet.size || !rightSet.size) return false;
  const overlap = [...leftSet].filter((token) => rightSet.has(token)).length;
  const ratio = overlap / Math.min(leftSet.size, rightSet.size);
  return ratio >= 0.8 && Math.abs(leftTokens.length - rightTokens.length) <= 2;
};

const mergeRows = (primary, secondary) => {
  const sourceFiles = [primary.source_files, secondary.source_files]
    .flatMap((value) => String(value || "").split(";"))
    .map((value) => value.trim())
    .filter(Boolean);
  return {
    ...primary,
    lang_en: primary.lang_en || secondary.lang_en || primary.lang_vn,
    lang_cn: primary.lang_cn || secondary.lang_cn || primary.lang_vn,
    source_files: [...new Set(sourceFiles)].sort().join("; "),
  };
};

const isTranslatable = (value) => {
  const text = normalizeText(value);
  if (!text || text.length < 2) return false;
  if (!VIETNAMESE_CHAR_RE.test(text)) return false;
  if (/^https?:\/\//i.test(text)) return false;
  if (MONEY_ONLY_RE.test(text)) return false;
  if (CODE_LIKE_RE.test(text)) return false;
  if (INTERPOLATION_RE.test(text)) return false;
  return true;
};

const walk = (dir) => {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(fullPath));
    else if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name))) files.push(fullPath);
  }
  return files;
};

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 44) || "text";

const makeUniqueTextId = (text, usedIds) => {
  const base = `text.${slugify(text)}`;
  let candidate = base;
  let index = 2;
  while (usedIds.has(candidate)) {
    candidate = `${base}_${index}`;
    index += 1;
  }
  usedIds.add(candidate);
  return candidate;
};

const readManualRows = () => {
  if (!fs.existsSync(MANUAL_LANG_JSON)) return [];
  return JSON.parse(fs.readFileSync(MANUAL_LANG_JSON, "utf8").replace(/^\uFEFF/, "")).map((row) => ({
    id: normalizeText(row.id),
    lang_vn: normalizeText(row.lang_vn),
    lang_en: normalizeText(row.lang_en),
    lang_cn: normalizeText(row.lang_cn),
    source_files: "scripts/i18n/manual-lang.json",
  })).filter((row) => row.id && row.lang_vn);
};

const readExistingRows = () => {
  const byId = new Map();
  const byText = new Map();
  const loadRows = () => {
    if (!fs.existsSync(LANG_XLSX)) return [];
    const workbook = XLSX.readFile(LANG_XLSX);
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
  };
  const rows = loadRows();
  for (const row of rows) {
    const id = normalizeText(row.id);
    const langVn = normalizeText(row.lang_vn);
    if (id) byId.set(id, row);
    if (langVn) byText.set(langVn, row);
  }
  return { byId, byText };
};

const isUserFacingStringLine = (line) =>
  /(?:title|message|label|placeholder|aria-label|fallback|error|description|empty|tooltip|text)\s*[:=]|setError\(|throw new Error\(|showAppNotification\(|toast\.|notify/i.test(line);

const extractFromFile = (filePath) => {
  const source = fs.readFileSync(filePath, "utf8");
  const relativePath = path.relative(rootDir, filePath).replace(/\\/g, "/");
  const candidates = [];
  const add = (text, line) => {
    const normalized = normalizeText(text);
    if (isTranslatable(normalized)) candidates.push({ text: normalized, source: `${relativePath}:${line}` });
  };

  const stringRe = /(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  let match;
  while ((match = stringRe.exec(source))) {
    const quote = match[1];
    const raw = match[2];
    if (quote === "`" && raw.includes("${")) continue;
    const before = source.slice(0, match.index);
    const line = before.split(/\r?\n/).length;
    const lineText = source.split(/\r?\n/)[line - 1] || "";
    if (isUserFacingStringLine(lineText)) add(raw.replace(/\\n/g, " "), line);
  }

  if ([".tsx", ".jsx"].includes(path.extname(filePath))) {
    const jsxTextRe = />\s*([^<>{}\n][^<>{}]*)\s*</g;
    while ((match = jsxTextRe.exec(source))) {
      const line = source.slice(0, match.index).split(/\r?\n/).length;
      add(match[1], line);
    }
  }

  return candidates;
};

const buildRows = () => {
  const existing = readExistingRows();
  const manualRows = readManualRows();
  const usedIds = new Set(manualRows.map((row) => row.id));
  const byText = new Map();
  for (const file of SCAN_ROOTS.flatMap(walk)) {
    for (const item of extractFromFile(file)) {
      const current = byText.get(item.text) || { text: item.text, sources: new Set() };
      current.sources.add(item.source);
      byText.set(item.text, current);
    }
  }

  const extractedRows = [...byText.values()]
    .sort((a, b) => a.text.localeCompare(b.text, "vi"))
    .map(({ text, sources }) => {
      const oldByText = existing.byText.get(text) || {};
      const oldId = String(oldByText.id || "").trim();
      const id = oldId && !oldId.startsWith("text.") ? oldId : makeUniqueTextId(text, usedIds);
      const oldRow = existing.byId.get(id) || oldByText || {};
      return {
        id,
        lang_vn: text,
        lang_en: oldRow.lang_en || "",
        lang_cn: oldRow.lang_cn || "",
        source_files: [...sources].sort().join("; "),
      };
    });

  const rowsById = new Map(extractedRows.map((row) => [row.id, row]));
  for (const manualRow of manualRows) {
    const oldRow = existing.byId.get(manualRow.id) || {};
    rowsById.set(manualRow.id, {
      ...manualRow,
      lang_en: oldRow.lang_en || manualRow.lang_en || "",
      lang_cn: oldRow.lang_cn || manualRow.lang_cn || "",
    });
  }

  const byLangVn = new Map();
  for (const row of rowsById.values()) {
    const key = canonicalText(row.lang_vn);
    if (!key) continue;
    const previous = byLangVn.get(key);
    if (!previous) {
      byLangVn.set(key, { ...row });
      continue;
    }

    const preferManual = previous.id.startsWith("text.") && !row.id.startsWith("text.");
    const preferBetterText = previous.id.startsWith("text.") === row.id.startsWith("text.") && textQualityScore(row.lang_vn) > textQualityScore(previous.lang_vn);
    const preferCurrent = preferManual || preferBetterText;
    const primary = preferCurrent ? row : previous;
    const secondary = preferCurrent ? previous : row;
    byLangVn.set(key, mergeRows(primary, secondary));
  }

  const semanticRows = [...byLangVn.values()].sort((a, b) =>
    normalizeText(b.lang_vn).length - normalizeText(a.lang_vn).length
  );
  const mergedRows = [];
  for (const row of semanticRows) {
    const targetIndex = mergedRows.findIndex((candidate) =>
      candidate.id.startsWith("text.") &&
      row.id.startsWith("text.") &&
      (isExpandableVariant(row.lang_vn, candidate.lang_vn) || isSameMeaningVariant(row.lang_vn, candidate.lang_vn))
    );
    if (targetIndex >= 0) {
      mergedRows[targetIndex] = mergeRows(mergedRows[targetIndex], row);
      continue;
    }
    mergedRows.push(row);
  }

  return assignStableAutoIds(mergedRows).sort((a, b) => a.id.localeCompare(b.id));
};


const assignStableAutoIds = (rows) => {
  const usedIds = new Set(rows.filter((row) => !row.id.startsWith("text.")).map((row) => row.id));
  return rows.map((row) => {
    if (!row.id.startsWith("text.")) return row;
    return {
      ...row,
      id: makeUniqueTextId(row.lang_vn, usedIds),
    };
  });
};
const writeWorkbook = (rows) => {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows, {
    header: ["id", "lang_vn", "lang_en", "lang_cn", "source_files"],
  });
  sheet["!cols"] = [
    { wch: 58 },
    { wch: 70 },
    { wch: 70 },
    { wch: 70 },
    { wch: 100 },
  ];
  XLSX.utils.book_append_sheet(workbook, sheet, "lang");
  XLSX.writeFile(workbook, LANG_XLSX);
};

const writeGeneratedTs = (rows) => {
  const payload = rows.reduce((acc, row) => {
    acc[row.id] = {
      lang_vn: row.lang_vn,
      lang_en: row.lang_en || row.lang_vn,
      lang_cn: row.lang_cn || row.lang_vn,
    };
    return acc;
  }, {});
  const content = `/* Auto-generated from ../../../lang.xlsx by scripts/i18n/extract-lang.mjs. */\n` +
    `export type LangCode = "lang_vn" | "lang_en" | "lang_cn";\n\n` +
    `export const translations = ${JSON.stringify(payload, null, 2)} as const;\n\n` +
    `export type LangId = keyof typeof translations;\n`;
  fs.mkdirSync(path.dirname(GENERATED_TS), { recursive: true });
  fs.writeFileSync(GENERATED_TS, content, "utf8");
};

const rows = buildRows();
try {
  writeWorkbook(rows);
} catch (error) {
  if (error?.code === "EBUSY" || error?.code === "EPERM") {
    console.warn(`Skipped ${path.relative(rootDir, LANG_XLSX)} because it is locked. Close it and rerun npm run i18n:extract.`);
  } else {
    throw error;
  }
}
writeGeneratedTs(rows);
console.log(`Generated ${path.relative(rootDir, LANG_XLSX)} with ${rows.length} rows.`);
console.log(`Generated ${path.relative(rootDir, GENERATED_TS)}.`);







