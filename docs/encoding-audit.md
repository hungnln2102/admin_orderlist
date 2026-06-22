# Encoding Audit

Date: 2026-06-05

## Scope
- Tracked source/config/docs files in this repository
- Excluded binary/cache artifacts such as images, dumps, browser cache data

## Findings
- No tracked source file was found to contain confirmed mojibake corruption after UTF-8 re-checking.
- Strings that looked like `kh??ng`, `???????ng`, or similar were reproduced as valid Vietnamese when read as UTF-8.
- The previously observed broken Vietnamese text is consistent with terminal/code-page display issues in PowerShell output, not with file contents stored incorrectly in the repository.

## Verified examples
- `backend/src/app.js`
- `backend/src/middleware/errorHandler.js`
- `docker-compose.yml`

## Recommendation
- Keep repository files in UTF-8.
- If mojibake appears again in shell output, verify using a UTF-8 aware reader/editor before changing file contents.
