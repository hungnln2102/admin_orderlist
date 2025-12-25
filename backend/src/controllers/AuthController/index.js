const bcrypt = require("bcryptjs");
const { db } = require("../../db");
const { DB_SCHEMA, getDefinition, tableName } = require("../../config/dbSchema");

const USERS_DEF = getDefinition("USERS");
const USERS_TABLE = tableName(DB_SCHEMA.USERS.TABLE);

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
    console.error("[auth] Đăng nhập thất bại:", error);
    return res
      .status(500)
      .json({ error: "Không thể đăng nhập, vui lòng thử lại sau" });
  }
};

const logout = (req, res) => {
  if (req.session) {
    req.session.destroy(() => {
      res.clearCookie(process.env.SESSION_NAME || "mavryk.sid");
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
    console.log(`[AUTH] Đã tạo người dùng quản trị '${usernameEnv}'`);
  } catch (err) {
    console.error("[AUTH] Lỗi khi tạo Admin:", err);
  }
};

module.exports = {
  login,
  logout,
  me,
  ensureDefaultAdmin,
};
