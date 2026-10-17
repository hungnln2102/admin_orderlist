const fs = require('fs');
const drives = ['C:', 'D:', 'E:', 'F:'];
drives.forEach(d => {
  try {
    const stats = fs.statfsSync(d + '\\');
    const freeGB = (stats.bavail * stats.bsize) / (1024*1024*1024);
    const totalGB = (stats.blocks * stats.bsize) / (1024*1024*1024);
    console.log('Drive ' + d + ': Total=' + totalGB.toFixed(2) + ' GB, Free=' + freeGB.toFixed(2) + ' GB');
  } catch(e) {
    console.log('Drive ' + d + ': Not available or error');
  }
});
