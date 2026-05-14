module.exports = [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "*.log",
      ".git/**",
    ],
  },
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "commonjs",
    },
    rules: {
      "no-console": "off",
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
      "no-var": "warn",
      "prefer-const": "warn",
      "prefer-arrow-callback": "off",
      "no-async-promise-executor": "warn",
      // Cảnh báo file >400 dòng (không block, chỉ là tín hiệu nên tách module).
      // Xem .cursor/rules/split-into-components.mdc + task.md "Nợ kỹ thuật".
      "max-lines": [
        "warn",
        { max: 400, skipBlankLines: true, skipComments: true },
      ],
    },
  },
];
