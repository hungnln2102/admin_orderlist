const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  console.log('Running knip...');
  const output = execSync('npx knip --reporter json', { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 });
} catch (e) {
  const output = e.stdout;
  const data = JSON.parse(output);
  
  // 1. Delete unused files
  if (data.files && data.files.length > 0) {
    console.log(`Found ${data.files.length} unused files.`);
    let deletedCount = 0;
    for (const file of data.files) {
      try {
        fs.unlinkSync(file);
        deletedCount++;
        console.log(`Deleted: ${file}`);
      } catch (err) {
        console.error(`Failed to delete ${file}:`, err.message);
      }
    }
    console.log(`Deleted ${deletedCount} unused files.`);
  }

  // 2. Identify unused exports
  let unusedExportCount = 0;
  if (data.issues && data.issues.length > 0) {
    console.log(`Found issues in ${data.issues.length} files.`);
    for (const issue of data.issues) {
      const exportsList = Object.keys(issue.exports || {});
      const typesList = Object.keys(issue.types || {});
      if (exportsList.length > 0) {
        console.log(`Unused exports in ${issue.file}: ${exportsList.join(', ')}`);
        unusedExportCount += exportsList.length;
      }
      if (typesList.length > 0) {
        console.log(`Unused types in ${issue.file}: ${typesList.join(', ')}`);
        unusedExportCount += typesList.length;
      }
    }
    console.log(`Total unused exports/types: ${unusedExportCount}`);
  }
}
