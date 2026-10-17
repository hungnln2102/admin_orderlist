const { execSync } = require('child_process');
try {
  const ps = 'Get-WmiObject Win32_LogicalDiskToPartition | ForEach-Object { $_.Dependent } | ForEach-Object { [wmi]$_ } | Select-Object DeviceID, @{Name="DiskIndex";Expression={($_.Dependent -as [string]).Split("=")[1].Split(",")[0]}}, VolumeName';
  // Simpler: just check drive letters and sizes
  const res = execSync('powershell \"Get-PSDrive -PSProvider FileSystem | Select-Object Name, @{Name=\'Size(GB)\';Expression={[math]::Round($_.Used/1GB + $_.Free/1GB, 2)}}, @{Name=\'Free(GB)\';Expression={[math]::Round($_.Free/1GB, 2)}}\"', { encoding: 'utf8' });
  console.log(res);
} catch(e) {
  console.log(e.message);
}
