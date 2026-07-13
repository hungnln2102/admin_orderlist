const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceInDir(fullPath);
    } else if (fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      // Replace require telegramErrorNotifier -> systemNotifier
      if (content.includes('telegramErrorNotifier')) {
        content = content.replace(/require\(['"]\.\.?\/(?:utils|src\/utils)\/telegramErrorNotifier['"]\)/g, 
          'require("src/domains/notifications/telegram").systemNotifier');
        content = content.replace(/require\(['"]\.\.\/\.\.\/\.\.\/utils\/telegramErrorNotifier['"]\)/g, 
          'require("../../../domains/notifications/telegram").systemNotifier');
        content = content.replace(/require\(['"]\.\.\/\.\.\/utils\/telegramErrorNotifier['"]\)/g, 
          'require("../../domains/notifications/telegram").systemNotifier');
        changed = true;
      }

      // Replace telegramOrderNotificationLib -> orderNotifier
      if (content.includes('telegramOrderNotificationLib')) {
         content = content.replace(/require\(['"]\.\.?\/(?:services|src\/services)\/telegramOrderNotificationLib['"]\)/g, 
          'require("src/domains/notifications/telegram").orderNotifier');
         content = content.replace(/require\(['"]\.\.\/\.\.\/\.\.\/services\/telegramOrderNotificationLib['"]\)/g, 
          'require("../../../domains/notifications/telegram").orderNotifier');
         content = content.replace(/require\(['"]\.\.\/\.\.\/services\/telegramOrderNotificationLib['"]\)/g, 
          'require("../../domains/notifications/telegram").orderNotifier');
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
