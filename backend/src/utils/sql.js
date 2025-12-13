const createDateNormalization = (column) => `
  CASE
    WHEN ${column} IS NULL THEN NULL
    WHEN TRIM(${column}::text) = '' THEN NULL
    WHEN TRIM(${column}::text) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
      THEN SUBSTRING(TRIM(${column}::text) FROM 1 FOR 10)::date
    WHEN TRIM(${column}::text) ~ '^[0-9]{4}/[0-9]{2}/[0-9]{2}'
      THEN TO_DATE(SUBSTRING(TRIM(${column}::text) FROM 1 FOR 10), 'YYYY/MM/DD')
    WHEN TRIM(${column}::text) ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}'
      THEN TO_DATE(SUBSTRING(TRIM(${column}::text) FROM 1 FOR 10), 'DD/MM/YYYY')
    WHEN TRIM(${column}::text) ~ '^[0-9]{2}-[0-9]{2}-[0-9]{4}'
      THEN TO_DATE(SUBSTRING(TRIM(${column}::text) FROM 1 FOR 10), 'DD-MM-YYYY')
    WHEN TRIM(${column}::text) ~ '^[0-9]{8}$'
      THEN TO_DATE(TRIM(${column}::text), 'YYYYMMDD')
    ELSE NULL
  END
`;

const createYearExtraction = (column) => `
  CASE
    WHEN ${column} IS NULL THEN NULL
    WHEN TRIM(${column}::text) = '' THEN NULL
    WHEN TRIM(${column}::text) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
      THEN SUBSTRING(TRIM(${column}::text) FROM 1 FOR 4)::int
    WHEN TRIM(${column}::text) ~ '^[0-9]{4}/[0-9]{2}/[0-9]{2}'
      THEN SUBSTRING(TRIM(${column}::text) FROM 1 FOR 4)::int
    WHEN TRIM(${column}::text) ~ '^[0-9]{4}\\b'
      THEN SUBSTRING(TRIM(${column}::text) FROM 1 FOR 4)::int
    WHEN TRIM(${column}::text) ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}'
      THEN SUBSTRING(TRIM(${column}::text) FROM 7 FOR 4)::int
    WHEN TRIM(${column}::text) ~ '^[0-9]{2}-[0-9]{2}-[0-9]{4}'
      THEN SUBSTRING(TRIM(${column}::text) FROM 7 FOR 4)::int
    WHEN TRIM(${column}::text) ~ '^[0-9]{8}$'
      THEN SUBSTRING(TRIM(${column}::text) FROM 1 FOR 4)::int
    ELSE NULL
  END
`;

const createSourceKey = (column) => `
  LOWER(
    REGEXP_REPLACE(
      TRIM(${column}::text),
      '\\s+',
      ' ',
      'g'
    )
  )
`;

const createNumericExtraction = (column) => `
  COALESCE(
    NULLIF(
      REGEXP_REPLACE(TRIM(${column}::text), '[^0-9\\-\\.]+', '', 'g'),
      ''
    )::numeric,
    0
  )
`;

const VIETNAMESE_DIACRITIC_PAIRS = [
  ["\u00e1", "a"],
  ["\u00e0", "a"],
  ["\u1ea1", "a"],
  ["\u1ea3", "a"],
  ["\u00e3", "a"],
  ["\u00e2", "a"],
  ["\u1ea5", "a"],
  ["\u1ea7", "a"],
  ["\u1ead", "a"],
  ["\u1ea9", "a"],
  ["\u1eab", "a"],
  ["\u0103", "a"],
  ["\u1eaf", "a"],
  ["\u1eb1", "a"],
  ["\u1eb7", "a"],
  ["\u1eb3", "a"],
  ["\u1eb5", "a"],
  ["\u00e9", "e"],
  ["\u00e8", "e"],
  ["\u1eb9", "e"],
  ["\u1ebb", "e"],
  ["\u1ebd", "e"],
  ["\u00ea", "e"],
  ["\u1ebf", "e"],
  ["\u1ec1", "e"],
  ["\u1ec7", "e"],
  ["\u1ec3", "e"],
  ["\u1ec5", "e"],
  ["\u00ed", "i"],
  ["\u00ec", "i"],
  ["\u1ecb", "i"],
  ["\u1ec9", "i"],
  ["\u0129", "i"],
  ["\u00f3", "o"],
  ["\u00f2", "o"],
  ["\u1ecd", "o"],
  ["\u1ecf", "o"],
  ["\u00f5", "o"],
  ["\u00f4", "o"],
  ["\u1ed1", "o"],
  ["\u1ed3", "o"],
  ["\u1ed9", "o"],
  ["\u1ed5", "o"],
  ["\u1ed7", "o"],
  ["\u01a1", "o"],
  ["\u1edb", "o"],
  ["\u1edd", "o"],
  ["\u1ee3", "o"],
  ["\u1edf", "o"],
  ["\u1ee1", "o"],
  ["\u00fa", "u"],
  ["\u00f9", "u"],
  ["\u1ee5", "u"],
  ["\u1ee7", "u"],
  ["\u0169", "u"],
  ["\u01b0", "u"],
  ["\u1ee9", "u"],
  ["\u1eeb", "u"],
  ["\u1ef1", "u"],
  ["\u1eed", "u"],
  ["\u1eef", "u"],
  ["\u00fd", "y"],
  ["\u1ef3", "y"],
  ["\u1ef5", "y"],
  ["\u1ef7", "y"],
  ["\u1ef9", "y"],
  ["\u0111", "d"],
  ["\u00c1", "A"],
  ["\u00c0", "A"],
  ["\u1ea0", "A"],
  ["\u1ea2", "A"],
  ["\u00c3", "A"],
  ["\u00c2", "A"],
  ["\u1ea4", "A"],
  ["\u1ea6", "A"],
  ["\u1eac", "A"],
  ["\u1ea8", "A"],
  ["\u1eaa", "A"],
  ["\u0102", "A"],
  ["\u1eae", "A"],
  ["\u1eb0", "A"],
  ["\u1eb6", "A"],
  ["\u1eb2", "A"],
  ["\u1eb4", "A"],
  ["\u00c9", "E"],
  ["\u00c8", "E"],
  ["\u1eb8", "E"],
  ["\u1eba", "E"],
  ["\u1ebc", "E"],
  ["\u00ca", "E"],
  ["\u1ebe", "E"],
  ["\u1ec0", "E"],
  ["\u1ec6", "E"],
  ["\u1ec2", "E"],
  ["\u1ec4", "E"],
  ["\u00cd", "I"],
  ["\u00cc", "I"],
  ["\u1eca", "I"],
  ["\u1ec8", "I"],
  ["\u0128", "I"],
  ["\u00d3", "O"],
  ["\u00d2", "O"],
  ["\u1ecc", "O"],
  ["\u1ece", "O"],
  ["\u00d5", "O"],
  ["\u00d4", "O"],
  ["\u1ed0", "O"],
  ["\u1ed2", "O"],
  ["\u1ed8", "O"],
  ["\u1ed4", "O"],
  ["\u1ed6", "O"],
  ["\u01a0", "O"],
  ["\u1eda", "O"],
  ["\u1edc", "O"],
  ["\u1ee2", "O"],
  ["\u1ede", "O"],
  ["\u1ee0", "O"],
  ["\u00da", "U"],
  ["\u00d9", "U"],
  ["\u1ee4", "U"],
  ["\u1ee6", "U"],
  ["\u0168", "U"],
  ["\u01af", "U"],
  ["\u1ee8", "U"],
  ["\u1eea", "U"],
  ["\u1ef0", "U"],
  ["\u1eec", "U"],
  ["\u1eee", "U"],
  ["\u00dd", "Y"],
  ["\u1ef2", "Y"],
  ["\u1ef4", "Y"],
  ["\u1ef6", "Y"],
  ["\u1ef8", "Y"],
  ["\u0110", "D"],
];

const VIETNAMESE_TRANSLITERATE_FROM = VIETNAMESE_DIACRITIC_PAIRS.map(
  ([from]) => from
).join("");
const VIETNAMESE_TRANSLITERATE_TO = VIETNAMESE_DIACRITIC_PAIRS.map(
  ([, to]) => to
).join("");

const createVietnameseStatusKey = (column) => `
  LOWER(
    REGEXP_REPLACE(
      TRANSLATE(
        TRIM(${column}::text),
        '${VIETNAMESE_TRANSLITERATE_FROM}',
        '${VIETNAMESE_TRANSLITERATE_TO}'
      ),
      '\\s+',
      ' ',
      'g'
    )
  )
`;

const quoteIdent = (value) => {
  const str = value === undefined || value === null ? "" : String(value);
  const sanitized = str.replace(/"/g, '""');
  return `"${sanitized}"`;
};

module.exports = {
  createDateNormalization,
  createYearExtraction,
  createSourceKey,
  createNumericExtraction,
  createVietnameseStatusKey,
  quoteIdent,
};
