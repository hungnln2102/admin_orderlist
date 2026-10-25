/**
 * autoBackupDatabaseTask.js
 * Task sao lưu định kỳ cơ sở dữ liệu PostgreSQL và tải lên Google Drive (hoặc lưu trữ cục bộ an toàn).
 */
const fs = require("fs");
const path = require("path");
const { execFile, execFileSync } = require("child_process");
const { DATABASE_URL } = require("@/config/env");
const systemConfigService = require("@/domains/system/services/systemConfigService");
const { withAdvisoryLock } = require("../withAdvisoryLock");

/**
 * Tìm binary pg_dump trên hệ thống (Linux / Docker / Windows)
 */
function resolvePgDumpExecutable() {
  const explicit = (process.env.PG_DUMP_PATH || "").trim();
  if (explicit) {
    if (fs.existsSync(explicit)) return explicit;
    throw new Error(`PG_DUMP_PATH trỏ tới file không tồn tại: ${explicit}`);
  }

  // 1. Thử các đường dẫn cố định phổ biến trên Linux / Docker
  const linuxPaths = ["/usr/bin/pg_dump", "/usr/local/bin/pg_dump"];
  for (const p of linuxPaths) {
    if (fs.existsSync(p)) return p;
  }

  // 2. Thử tìm qua PATH bằng which / where.exe
  const tryNames = process.platform === "win32" ? ["pg_dump.exe", "pg_dump"] : ["pg_dump"];
  for (const name of tryNames) {
    try {
      const whichBin = process.platform === "win32" ? "where.exe" : "which";
      const out = execFileSync(whichBin, [name], { encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "ignore"] });
      const line = out
        .split(/\r?\n/)
        .map((s) => s.trim())
        .find((s) => s && !/^INFO:/i.test(s));
      if (line && fs.existsSync(line)) return line;
    } catch {
      /* continue */
    }
  }

  // 3. Quét các phiên bản PostgreSQL phổ biến trên Windows
  if (process.platform === "win32") {
    const versions = ["17", "16", "15", "14", "13", "12"];
    for (const v of versions) {
      const p1 = path.join("C:\\Program Files\\PostgreSQL", v, "bin", "pg_dump.exe");
      if (fs.existsSync(p1)) return p1;
      const p2 = path.join("C:\\Program Files (x86)\\PostgreSQL", v, "bin", "pg_dump.exe");
      if (fs.existsSync(p2)) return p2;
    }
  }

  return null;
}

/**
 * Thực thi lệnh pg_dump kết xuất database ra file custom format
 */
function execPgDump(pgDumpBin, dbUrl, outPath) {
  return new Promise((resolve, reject) => {
    const args = [`--dbname=${dbUrl}`, "--format=custom", `--file=${outPath}`];
    execFile(
      pgDumpBin,
      args,
      { windowsHide: process.platform === "win32", maxBuffer: 10 * 1024 * 1024 },
      (error, _stdout, stderr) => {
        if (error) {
          return reject(new Error(`pg_dump failed: ${stderr || error.message}`));
        }
        resolve();
      }
    );
  });
}

/**
 * Lấy Access Token từ Google OAuth Refresh Token
 */
async function getGoogleDriveAccessToken(clientId, clientSecret, refreshToken) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Google OAuth error: ${data.error_description || data.error || res.statusText}`);
  }
  return data.access_token;
}

/**
 * Upload file dump lên Google Drive qua REST API v3 Multipart
 */
async function uploadToGoogleDrive(filePath, fileName, folderId, accessToken) {
  const boundary = "-------314159265358979323846";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const metadata = {
    name: fileName,
    ...(folderId ? { parents: [folderId] } : {}),
  };
  const fileBuffer = fs.readFileSync(filePath);

  const multipartBody = Buffer.concat([
    Buffer.from(
      `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}` +
      `${delimiter}Content-Type: application/octet-stream\r\n\r\n`
    ),
    fileBuffer,
    Buffer.from(closeDelim),
  ]);

  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,createdTime", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  const data = await res.json();
  if (!res.ok || !data.id) {
    throw new Error(`Google Drive upload failed: ${data.error?.message || res.statusText}`);
  }
  return data;
}

/**
 * Xóa các bản sao lưu cũ trên Google Drive vượt quá số ngày retention
 */
async function cleanupGoogleDriveOldBackups(folderId, retentionDays, accessToken) {
  if (!folderId || retentionDays <= 0) return;
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  try {
    const q = `'${folderId}' in parents and trashed = false`;
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent("files(id, name, createdTime)")}&pageSize=1000`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return;
    const data = await res.json();
    const oldFiles = (data.files || []).filter((f) => {
      const created = f.createdTime ? Date.parse(f.createdTime) : null;
      return created && created < cutoff;
    });

    for (const file of oldFiles) {
      await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      }).catch((e) => console.warn(`[Backup] Không thể xóa file cũ ${file.id} trên Drive:`, e.message));
    }
    if (oldFiles.length > 0) {
      console.log(`[Backup] Đã dọn dẹp ${oldFiles.length} file sao lưu cũ (> ${retentionDays} ngày) trên Google Drive.`);
    }
  } catch (err) {
    console.warn(`[Backup] Lỗi khi dọn dẹp Google Drive cũ:`, err.message);
  }
}

/**
 * Xóa các file sao lưu cục bộ vượt quá số ngày retention
 */
function cleanupLocalOldBackups(backupDir, retentionDays) {
  if (!fs.existsSync(backupDir) || retentionDays <= 0) return;
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  try {
    const files = fs.readdirSync(backupDir);
    let deletedCount = 0;
    for (const f of files) {
      if (!f.startsWith("db-backup-") || !f.endsWith(".dump")) continue;
      const fullPath = path.join(backupDir, f);
      const stat = fs.statSync(fullPath);
      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(fullPath);
        deletedCount++;
      }
    }
    if (deletedCount > 0) {
      console.log(`[Backup] Đã dọn dẹp ${deletedCount} file sao lưu cục bộ cũ (> ${retentionDays} ngày).`);
    }
  } catch (err) {
    console.warn(`[Backup] Lỗi khi dọn dẹp file cục bộ cũ:`, err.message);
  }
}

/**
 * Hàm điều phối chính tác vụ tự động sao lưu Database
 */
async function autoBackupDatabaseTask(trigger = "cron_schedule") {
  return withAdvisoryLock("auto_backup_database", async () => {
    console.log(`[Backup] 🕒 Bắt đầu tác vụ sao lưu Database (Trigger: ${trigger})...`);

    // 1. Kiểm tra cấu hình ENABLE_DB_BACKUP
    const isEnabled = systemConfigService.get("ENABLE_DB_BACKUP", true);
    if (isEnabled === false || isEnabled === "false") {
      console.log("[Backup] ℹ️ Tính năng ENABLE_DB_BACKUP đang tắt trong cấu hình hệ thống. Bỏ qua sao lưu.");
      return { skipped: true, reason: "ENABLE_DB_BACKUP is disabled in system configs" };
    }

    // 2. Tìm binary pg_dump
    const pgDumpBin = resolvePgDumpExecutable();
    if (!pgDumpBin) {
      const warningMsg = "Không tìm thấy binary pg_dump trên hệ thống để thực hiện kết xuất database.";
      console.warn(`[Backup] ⚠️ ${warningMsg}`);
      return {
        success: false,
        warning: warningMsg,
        note: "Vui lòng cài đặt postgresql-client hoặc cấu hình PG_DUMP_PATH trong .env.",
        timestamp: new Date().toISOString(),
      };
    }

    // 3. Chuẩn bị đường dẫn lưu file
    const dbUrl = process.env.BACKUP_DATABASE_URL || DATABASE_URL;
    const backupDir = path.resolve(process.cwd(), "backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `db-backup-${timestamp}.dump`;
    const outPath = path.join(backupDir, fileName);

    // 4. Thực thi pg_dump
    console.log(`[Backup] Đang dump dữ liệu từ PostgreSQL vào: ${outPath}...`);
    await execPgDump(pgDumpBin, dbUrl, outPath);

    const stat = fs.statSync(outPath);
    console.log(`[Backup] ✅ Dump thành công! Kích thước file: ${(stat.size / (1024 * 1024)).toFixed(2)} MB`);

    // 5. Kiểm tra thông số Google Drive
    const driveFolderId = systemConfigService.get("GOOGLE_DRIVE_FOLDER_ID") || process.env.GOOGLE_DRIVE_FOLDER_ID;
    const retentionDays = Number(systemConfigService.get("BACKUP_RETENTION_DAYS") || process.env.BACKUP_RETENTION_DAYS || 7);
    const oauthClientId = systemConfigService.get("GOOGLE_DRIVE_OAUTH_CLIENT_ID") || process.env.GOOGLE_DRIVE_OAUTH_CLIENT_ID;
    const oauthClientSecret = systemConfigService.get("GOOGLE_DRIVE_OAUTH_CLIENT_SECRET") || process.env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET;
    const oauthRefreshToken = systemConfigService.get("GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN") || process.env.GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN;

    const hasGoogleDriveAuth = Boolean(oauthClientId && oauthClientSecret && oauthRefreshToken);
    let driveUploadResult = null;

    if (hasGoogleDriveAuth) {
      try {
        console.log("[Backup] Đang xác thực Google Drive OAuth và tải file lên...");
        const accessToken = await getGoogleDriveAccessToken(oauthClientId, oauthClientSecret, oauthRefreshToken);
        driveUploadResult = await uploadToGoogleDrive(outPath, fileName, driveFolderId, accessToken);
        console.log(`[Backup] ✅ Đã tải lên Google Drive thành công! File ID: ${driveUploadResult.id}`);

        // Dọn dẹp bản sao lưu cũ trên Google Drive
        await cleanupGoogleDriveOldBackups(driveFolderId, retentionDays, accessToken);
      } catch (driveErr) {
        console.error("[Backup] ❌ Lỗi khi tải lên Google Drive:", driveErr.message);
        driveUploadResult = { error: driveErr.message };
      }
    } else {
      console.log("[Backup] ℹ️ Chưa cấu hình đầy đủ Google Drive OAuth. Bản sao lưu được lưu trữ an toàn tại thư mục backups/ cục bộ.");
    }

    // 6. Dọn dẹp bản sao lưu cục bộ cũ
    cleanupLocalOldBackups(backupDir, retentionDays);

    return {
      success: true,
      mode: hasGoogleDriveAuth ? "google_drive" : "local_storage",
      fileName,
      sizeBytes: stat.size,
      retentionDays,
      uploadedToDrive: Boolean(driveUploadResult && !driveUploadResult.error),
      driveFileId: driveUploadResult?.id || null,
      driveError: driveUploadResult?.error || null,
      timestamp: new Date().toISOString(),
    };
  });
}

module.exports = {
  autoBackupDatabaseTask,
  resolvePgDumpExecutable,
};
