const { execSync } = require('child_process');
try {
  const output = execSync('powershell \"Get-PhysicalDisk | Select-Object DeviceId, FriendlyName, MediaType, OperationalStatus\"', { encoding: 'utf8' });
  console.log(output);
} catch(e) {
  console.log('Error:', e.message);
}
