const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { google } = require("googleapis");

const pgDumpPath = process.env.PG_DUMP_PATH || "pg_dump";
const databaseUrl = process.env.BACKUP_DATABASE_URL || process.env.DATABASE_URL;
const driveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || undefined;
const retentionDays = Number.parseInt(process.env.BACKUP_RETENTION_DAYS, 10) || 7;

if (!databaseUrl) {
  console.warn("[Backup] DATABASE_URL / BACKUP_DATABASE_URL not set. Backup will be skipped.");
}

const createDriveClient = () => {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("Missing Google Drive service account credentials (email/private key).");
  }

  const scopes = ["https://www.googleapis.com/auth/drive.file"];
  const auth = new google.auth.JWT(clientEmail, null, privateKey, scopes);
  return google.drive({ version: "v3", auth });
};

const execPgDump = (outPath) =>
  new Promise((resolve, reject) => {
    const args = [`--dbname=${databaseUrl}`, "--format=custom", `--file=${outPath}`];
    execFile(pgDumpPath, args, (error, _stdout, stderr) => {
      if (error) {
        reject(new Error(`pg_dump failed: ${stderr || error.message}`));
        return;
      }
      resolve();
    });
  });

const uploadToDrive = async (filePath, fileName) => {
  const drive = createDriveClient();
  const metadata = {
    name: fileName,
    ...(driveFolderId ? { parents: [driveFolderId] } : {}),
  };
  const media = {
    mimeType: "application/octet-stream",
    body: fs.createReadStream(filePath),
  };

  const { data } = await drive.files.create({
    resource: metadata,
    media,
    fields: "id, name, createdTime",
  });
  return data;
};

const cleanupOldBackups = async () => {
  if (!driveFolderId || retentionDays <= 0) return;
  const drive = createDriveClient();
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  const q = `'${driveFolderId}' in parents`;
  const { data } = await drive.files.list({
    q,
    fields: "files(id, name, createdTime)",
    pageSize: 1000,
  });

  const oldFiles =
    data.files?.filter((f) => {
      const created = f.createdTime ? Date.parse(f.createdTime) : null;
      return created && created < cutoff;
    }) || [];

  if (!oldFiles.length) return;

  await Promise.all(
    oldFiles.map((file) =>
      drive.files
        .delete({ fileId: file.id })
        .catch((err) => console.warn(`[Backup] Failed to delete old backup ${file.id}:`, err.message))
    )
  );
  console.log(`[Backup] Deleted ${oldFiles.length} old backup file(s) from Drive (retention ${retentionDays}d).`);
};

const backupDatabaseToDrive = async () => {
  if (!databaseUrl) return;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `db-backup-${timestamp}.dump`;
  const outPath = path.join(os.tmpdir(), fileName);

  console.log("[Backup] Starting database backup...");
  await execPgDump(outPath);
  console.log(`[Backup] Dump created at ${outPath}`);

  const uploaded = await uploadToDrive(outPath, fileName);
  console.log(`[Backup] Uploaded to Google Drive: ${uploaded.id} (${uploaded.name})`);

  try {
    fs.unlinkSync(outPath);
  } catch (err) {
    console.warn("[Backup] Failed to remove local dump:", err.message);
  }

  await cleanupOldBackups();
  console.log("[Backup] Backup finished.");
};

module.exports = {
  backupDatabaseToDrive,
};
