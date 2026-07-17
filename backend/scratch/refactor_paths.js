const fs = require('fs');
const path = require('path');

const backendDir = path.join(__dirname, '..');
const srcDir = path.join(backendDir, 'src');

function getAllJSFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            // exclude node_modules or scratch
            if (file !== 'node_modules' && file !== 'scratch' && file !== '.git') {
                results = results.concat(getAllJSFiles(filePath));
            }
        } else if (filePath.endsWith('.js')) {
            results.push(filePath);
        }
    });
    return results;
}

const jsFiles = getAllJSFiles(backendDir);
let changedFilesCount = 0;

jsFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    let hasChanges = false;

    // Use a regex to match require paths that start with ../ or ./ (but maybe we only want to change ones that resolve into src directory?)
    // The user said "Thay vì dùng ../../ thì hãy dùng @/". Let's convert all ../ and ./ that resolve to something inside src.
    
    // Regex matches require("../path") or require('./path')
    const regex = /require\(['"](\.\.?\/[^'"]+)['"]\)/g;
    
    const newContent = content.replace(regex, (match, importPath) => {
        // Only process if it starts with '.'
        if (!importPath.startsWith('.')) return match;
        
        // Resolve the import path
        const resolvedPath = path.resolve(path.dirname(file), importPath);
        
        // Check if the resolved path is inside src directory
        if (resolvedPath.startsWith(srcDir)) {
            // Convert to alias
            // e.g. if resolvedPath is /app/backend/src/utils/logger
            // and srcDir is /app/backend/src
            // relative from srcDir: utils/logger
            const relativeToSrc = path.relative(srcDir, resolvedPath);
            
            // Format to POSIX path (forward slashes)
            const posixPath = relativeToSrc.split(path.sep).join('/');
            
            // Create alias path
            const aliasPath = `@/${posixPath}`;
            hasChanges = true;
            return `require("${aliasPath}")`;
        }
        
        // If it resolves outside of src (e.g., if we are in tests and importing something in tests),
        // we might leave it relative, or we might need another alias.
        // Let's only convert paths that point INTO src.
        return match;
    });

    if (hasChanges) {
        fs.writeFileSync(file, newContent, 'utf-8');
        changedFilesCount++;
        console.log(`Updated ${file}`);
    }
});

console.log(`Refactoring complete. Changed ${changedFilesCount} files.`);
