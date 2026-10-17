const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const source = 'C:\\Users\\Mavryk\\.gemini';
const dest = 'E:\\Antigravity_Data\\.gemini';

console.log('Starting migration of .gemini to drive E...');

try {
  if (!fs.existsSync('E:\\Antigravity_Data')) {
    fs.mkdirSync('E:\\Antigravity_Data', { recursive: true });
  }

  console.log(`Copying files from ${source} to ${dest}...`);
  const robocopyCmd = `robocopy "${source}" "${dest}" /E /COPY:DAT /R:3 /W:3`;
  try {
    execSync(robocopyCmd, { stdio: 'inherit' });
  } catch (err) {
    if (err.status > 7) {
      throw new Error(`Robocopy failed with exit code ${err.status}`);
    }
    console.log(`Robocopy finished with exit code ${err.status} (acceptable).`);
  }

  console.log('Removing original source directory...');
  fs.rmSync(source, { recursive: true, force: true });

  console.log('Creating NTFS junction link...');
  execSync(`cmd /c mklink /J "${source}" "${dest}"`, { stdio: 'inherit' });

  console.log('Migration completed successfully! .gemini is now on drive E.');
} catch (err) {
  console.error('Migration failed:', err);
  process.exit(1);
}
