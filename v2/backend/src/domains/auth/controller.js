const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { db, TABLES, COLS } = require("@/db");
const { recordFailedLogin, resetFailedLogins } = require("./middleware/loginRateLimiter");

const BCRYPT_ROUNDS = 10;
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString("hex"), BCRYPT_ROUNDS);

const isBcryptHash = (value) => /^\$2[aby]\$/.test(value);

const timingSafeEqualString = (left, right) => {
  const leftHash = crypto.createHash("sha256").update(String(left)).digest();
  const rightHash = crypto.createHash("sha256").update(String(right)).digest();
  return crypto.timingSafeEqual(leftHash, rightHash);
};

const verifyPassword = async (inputPassword, storedValue) => {
  const hashString = storedValue instanceof Buffer ? storedValue.toString() : String(storedValue || "");

  if (isBcryptHash(hashString)) {
    return { isMatch: await bcrypt.compare(inputPassword, hashString), needsUpgrade: false };
  }

  if (!hashString) return { isMatch: false, needsUpgrade: false };
  const isMatch = timingSafeEqualString(inputPassword, hashString);
  return { isMatch, needsUpgrade: isMatch };
};

const regenerateSession = (req) =>
  new Promise((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });

const saveSession = (req) =>
  new Promise((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });

const login = async (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== "string" || typeof password !== "string" || !username.trim() || !password) {
    return res.status(400).json({ error: "Tên đăng nhập và mật khẩu là bắt buộc" });
  }

  const normalizedUsername = username.trim().toLowerCase();

  try {
    const userCols = COLS.USERS;
    const user = await db(TABLES.USERS)
      .select({
        id: userCols.ID,
        username: userCols.USERNAME,
        passwordhash: userCols.PASSWORD_HASH,
        role: userCols.ROLE,
      })
      .whereRaw(`LOWER("${userCols.USERNAME}") = ?`, [normalizedUsername])
      .first();

    if (!user) {
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
      recordFailedLogin(req);
      return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });
    }

    const { isMatch, needsUpgrade } = await verifyPassword(password, user.passwordhash);
    if (!isMatch) {
      recordFailedLogin(req);
      return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });
    }

    resetFailedLogins(req);

    if (needsUpgrade) {
      await db(TABLES.USERS)
        .where(userCols.ID, user.id)
        .update({ [userCols.PASSWORD_HASH]: await bcrypt.hash(password, BCRYPT_ROUNDS) });
    }

    const sessionUser = {
      id: user.id,
      username: user.username,
      role: user.role || "admin",
    };

    await regenerateSession(req);
    req.session.user = sessionUser;
    await saveSession(req);

    return res.json({ user: sessionUser });
  } catch (error) {
    console.error("[AUTH V2] Login error:", error);
    return res.status(500).json({ error: "Không thể đăng nhập, vui lòng thử lại sau" });
  }
};

const logout = (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      res.clearCookie("admin_orderlist_v2.sid");
      res.json({ success: true });
    });
  } else {
    res.json({ success: true });
  }
};

const me = (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Không có quyền truy cập" });
  }
  return res.json({ user: req.session.user });
};

const changePassword = async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Không có quyền truy cập" });
  }

  const { currentPassword, newPassword } = req.body || {};
  if (typeof currentPassword !== "string" || typeof newPassword !== "string" || !currentPassword || !newPassword) {
    return res.status(400).json({ error: "Mật khẩu hiện tại và mật khẩu mới là bắt buộc" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Mật khẩu mới phải có ít nhất 6 ký tự" });
  }

  try {
    const userId = req.session.user.id;
    const userCols = COLS.USERS;
    const user = await db(TABLES.USERS)
      .select({
        id: userCols.ID,
        passwordhash: userCols.PASSWORD_HASH,
      })
      .where(userCols.ID, userId)
      .first();

    if (!user) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }

    const { isMatch } = await verifyPassword(currentPassword, user.passwordhash);
    if (!isMatch) {
      return res.status(400).json({ error: "Mật khẩu hiện tại không chính xác" });
    }

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    const sessionCols = COLS.USER_SESSIONS;

    await db.transaction(async (trx) => {
      await trx(TABLES.USERS)
        .where(userCols.ID, userId)
        .update({
          [userCols.PASSWORD_HASH]: newHash,
        });

      await trx(TABLES.USER_SESSIONS)
        .whereRaw(`"${sessionCols.SESS}"->'user'->>'id' = ?`, [String(userId)])
        .whereNot(sessionCols.SID, req.sessionID)
        .del();
    });

    const sessionUser = req.session.user;
    await regenerateSession(req);
    req.session.user = sessionUser;
    await saveSession(req);

    return res.json({ success: true, message: "Đổi mật khẩu thành công. Các phiên đăng nhập khác đã bị đăng xuất." });
  } catch (error) {
    console.error("[AUTH V2] Change password error:", error);
    return res.status(500).json({ error: "Không thể đổi mật khẩu, vui lòng thử lại sau" });
  }
};

module.exports = {
  login,
  logout,
  me,
  changePassword,
};

