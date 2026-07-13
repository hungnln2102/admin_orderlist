const fs = require('fs');
const path = require('path');

function getRelativePathToSrc(fromPath) {
  const parts = fromPath.split(path.sep);
  const srcIndex = parts.indexOf('src');
  if (srcIndex === -1) {
    // If not in src, maybe webhook. webhook to src is '../src'
    const webhookIndex = parts.indexOf('webhook');
    if (webhookIndex !== -1) {
      const depth = parts.length - webhookIndex - 1;
      return '../'.repeat(depth) + 'src/';
    }
    return '';
  }
  const depth = parts.length - srcIndex - 2; // -1 for filename, -1 for src itself
  return depth <= 0 ? './' : '../'.repeat(depth);
}

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceInDir(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      const relToSrc = getRelativePathToSrc(fullPath);

      // Replace telegramErrorNotifier
      if (content.includes('telegramErrorNotifier')) {
        content = content.replace(/require\(['"].*?telegramErrorNotifier['"]\)/g, 
          `require("${relToSrc}domains/notifications/telegram").systemNotifier`);
        changed = true;
      }

      // Replace telegramOrderNotificationLib or telegramOrderNotification
      if (content.includes('telegramOrderNotification')) {
         content = content.replace(/require\(['"].*?telegramOrderNotification(Lib)?['"]\)/g, 
          `require("${relToSrc}domains/notifications/telegram").orderNotifier`);
         changed = true;
      }

      // Replace telegramFinanceDeltaNotifier
      if (content.includes('telegramFinanceDeltaNotifier')) {
         content = content.replace(/require\(['"].*?telegramFinanceDeltaNotifier['"]\)/g, 
          `require("${relToSrc}domains/notifications/telegram").financeNotifier`);
         changed = true;
      }

      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Rewired:', fullPath);
      }
    }
  }
}

replaceInDir(path.join(__dirname, 'src'));
replaceInDir(path.join(__dirname, 'webhook'));
