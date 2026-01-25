const bcrypt = require("bcryptjs");
const { db } = require("../../db");
const {
  ADMIN_SCHEMA,
  getDefinition,
  tableName,
  SCHEMA_ADMIN,
} = require("../../config/dbSchema");
const { session: sessionConfig } = require("../../config/appConfig");
const logger = require("../../utils/logger");

const USERS_DEF = getDefinition("USERS", ADMIN_SCHEMA);
const USERS_TABLE = tableName(USERS_DEF.tableName, SCHEMA_ADMIN);

const login = async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({
      error: "Tên đăng nhập và mật khẩu là bắt buộc",
    });
  }
  const normalizedUsername = String(username).trim().toLowerCase();

  // Env-based fallback login
  const fallbackUser = (process.env.DEFAULT_ADMIN_USER || "")
    .trim()
    .toLowerCase();
  const fallbackPass = (process.env.DEFAULT_ADMIN_PASS || "").trim();
  if (
    fallbackUser &&
    fallbackPass &&
    normalizedUsername === fallbackUser &&
    password === fallbackPass
  ) {
    req.session.user = { id: -1, username, role: "admin" };
    return res.json({ user: req.session.user, fallback: true });
  }

  try {
    const userCols = USERS_DEF.columns;
    const user = await db(USERS_TABLE)
      .select({
        userid: userCols.id,
        username: userCols.username,
        passwordhash: userCols.password,
        role: userCols.role,
      })
      .whereRaw(`LOWER("${userCols.username}") = ?`, [normalizedUsername])
      .first();

    if (!user) {
      return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });
    }

    const storedHash = user.passwordhash;
    const hashString =
      storedHash instanceof Buffer
        ? storedHash.toString()
        : String(storedHash || "");
    let isMatch = false;
    if (hashString.startsWith("$2")) {
      isMatch = await bcrypt.compare(password, hashString);
    } else {
      isMatch = password === hashString || password === hashString.trim();
    }
    if (!isMatch) {
      return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });
    }

    req.session.user = {
      id: user.userid,
      username: user.username,
      role: user.role || "user",
    };
    return res.json({ user: req.session.user });
  } catch (error) {
    logger.error("[auth] Đăng nhập thất bại", { error: error.message, stack: error.stack, username: normalizedUsername });
    return res
      .status(500)
      .json({ error: "Không thể đăng nhập, vui lòng thử lại sau" });
  }
};

const logout = (req, res) => {
  if (req.session) {
    req.session.destroy(() => {
      res.clearCookie(sessionConfig?.name);
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

  const { currentPassword, newPassword, confirmPassword } = req.body || {};
  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ error: "Vui lòng nhập mật khẩu hiện tại và mật khẩu mới" });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: "Mật khẩu mới không khớp" });
  }

  try {
    const userCols = USERS_DEF.columns;
    const sessionUser = req.session.user || {};
    let userQuery = db(USERS_TABLE).select({
      userid: userCols.id,
      username: userCols.username,
      passwordhash: userCols.password,
    });

    if (sessionUser.id && sessionUser.id !== -1) {
      userQuery = userQuery.where(userCols.id, sessionUser.id);
    } else if (sessionUser.username) {
      userQuery = userQuery.whereRaw(`LOWER("${userCols.username}") = ?`, [
        String(sessionUser.username || "").trim().toLowerCase(),
      ]);
    } else {
      return res.status(401).json({ error: "Không có quyền truy cập" });
    }

    const user = await userQuery.first();
    if (!user) {
      return res.status(404).json({ error: "Không tìm thấy tài khoản" });
    }

    const storedHash = user.passwordhash;
    const hashString =
      storedHash instanceof Buffer
        ? storedHash.toString()
        : String(storedHash || "");
    let isMatch = false;
    if (hashString.startsWith("$2")) {
      isMatch = await bcrypt.compare(currentPassword, hashString);
    } else {
      isMatch =
        currentPassword === hashString || currentPassword === hashString.trim();
    }

    if (!isMatch) {
      return res.status(401).json({ error: "Mật khẩu hiện tại không đúng" });
    }

    const newHash = await bcrypt.hash(String(newPassword), 10);
    await db(USERS_TABLE)
      .where(userCols.id, user.userid)
      .update({ [userCols.password]: newHash });

    return res.json({ success: true });
  } catch (error) {
    logger.error("[auth] Thay đổi mật khẩu thất bại", { error: error.message, stack: error.stack, userId: sessionUser.id });
    return res
      .status(500)
      .json({ error: "Không thể thay đổi mật khẩu, vui lòng thử lại sau" });
  }
};

const ensureDefaultAdmin = async () => {
  const usernameEnv = (process.env.DEFAULT_ADMIN_USER || "").trim();
  const passwordEnv = (process.env.DEFAULT_ADMIN_PASS || "").trim();
  if (!usernameEnv || !passwordEnv) return;

  const userCols = USERS_DEF.columns;
  const normalizedUsername = usernameEnv.toLowerCase();
  try {
    const existing = await db(USERS_TABLE)
      .whereRaw(`LOWER("${userCols.username}") = ?`, [normalizedUsername])
      .first();
    if (existing) return;

    await db(USERS_TABLE).insert({
      [userCols.username]: usernameEnv,
      [userCols.password]: await bcrypt.hash(passwordEnv, 10),
      [userCols.role]: "admin",
    });
    logger.info(`[AUTH] Đã tạo người dùng quản trị`, { username: usernameEnv });
  } catch (err) {
    logger.error("[AUTH] Lỗi khi tạo Admin", { error: err.message, stack: err.stack, username: usernameEnv });
  }
};

module.exports = {
  login,
  logout,
  me,
  changePassword,
  ensureDefaultAdmin,
};
