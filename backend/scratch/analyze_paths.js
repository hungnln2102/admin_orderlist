const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');

function getAllJSFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getAllJSFiles(filePath));
        } else if (filePath.endsWith('.js')) {
            results.push(filePath);
        }
    });
    return results;
}

const jsFiles = getAllJSFiles(srcDir);
let requiresWithDotDotCount = 0;
let requireCount = 0;
let errors = [];

jsFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const regex = /require\(['"]([^'"]+)['"]\)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        requireCount++;
        const importPath = match[1];
        if (importPath.startsWith('../')) {
            requiresWithDotDotCount++;
            // Check if path exists
            let resolvedPath = path.resolve(path.dirname(file), importPath);
            // Try .js, /index.js, .json
            if (!fs.existsSync(resolvedPath) && !fs.existsSync(resolvedPath + '.js') && !fs.existsSync(path.join(resolvedPath, 'index.js')) && !fs.existsSync(resolvedPath + '.json')) {
                errors.push({ file: file.replace(srcDir, ''), importPath, resolvedPath });
            }
        }
    }
});

console.log(`Total JS Files in src: ${jsFiles.length}`);
console.log(`Total requires: ${requireCount}`);
console.log(`Total relative requires (../): ${requiresWithDotDotCount}`);
console.log(`Errors found: ${errors.length}`);
errors.forEach(e => console.log(e));
