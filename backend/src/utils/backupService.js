const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { google } = require("googleapis");

const pgDumpPath = process.env.PG_DUMP_PATH || "pg_dump";
const databaseUrl = process.env.BACKUP_DATABASE_URL || process.env.DATABASE_URL;
const driveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || undefined;
const retentionDays = Number.parseInt(process.env.BACKUP_RETENTION_DAYS, 10) || 7;
const logFilePath =
  process.env.BACKUP_LOG_FILE || path.join(__dirname, "../../logs/backup.log");

const appendLog = (level, message) => {
  const line = `[${new Date().toISOString()}] [${level}] ${message}\n`;
  try {
    const dir = path.dirname(logFilePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(logFilePath, line, "utf8");
  } catch (err) {
    // Fallback to console if file logging fails
    console.error("[Backup] Failed to write log file:", err.message);
  }
};

const logInfo = (message) => {
  console.log(`[Backup] ${message}`);
  appendLog("INFO", message);
};

const logWarn = (message) => {
  console.warn(`[Backup] ${message}`);
  appendLog("WARN", message);
};

const logError = (message) => {
  console.error(`[Backup] ${message}`);
  appendLog("ERROR", message);
};

if (!databaseUrl) {
  logWarn("DATABASE_URL / BACKUP_DATABASE_URL not set. Backup will be skipped.");
}

const createDriveClient = () => {
  const scopes = ["https://www.googleapis.com/auth/drive.file"];

  // Prefer GOOGLE_APPLICATION_CREDENTIALS (JSON key file)
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes,
    });
    return google.drive({ version: "v3", auth });
  }

  // Fallback to env pair
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("Missing Google Drive service account credentials (email/private key).");
  }

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
        .catch((err) => logWarn(`Failed to delete old backup ${file.id}: ${err.message}`))
    )
  );
  logInfo(`Deleted ${oldFiles.length} old backup file(s) from Drive (retention ${retentionDays}d).`);
};

const backupDatabaseToDrive = async () => {
  if (!databaseUrl) {
    logWarn("Skipped backup: no DATABASE_URL / BACKUP_DATABASE_URL provided.");
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `db-backup-${timestamp}.dump`;
  const outPath = path.join(os.tmpdir(), fileName);

  try {
    logInfo("Starting database backup...");
    await execPgDump(outPath);
    logInfo(`Dump created at ${outPath}`);

    const uploaded = await uploadToDrive(outPath, fileName);
    logInfo(`Uploaded to Google Drive: ${uploaded.id} (${uploaded.name})`);
  } catch (err) {
    logError(`Backup failed: ${err.message}`);
    throw err;
  } finally {
    try {
      if (fs.existsSync(outPath)) {
        fs.unlinkSync(outPath);
      }
    } catch (err) {
      logWarn(`Failed to remove local dump: ${err.message}`);
    }
  }

  await cleanupOldBackups();
  logInfo("Backup finished.");
};

module.exports = {
  backupDatabaseToDrive,
};
