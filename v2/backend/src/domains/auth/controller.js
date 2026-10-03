const bcrypt = require("bcryptjs");
const { db, TABLES, COLS } = require("@/db");

const verifyPassword = async (inputPassword, storedValue) => {
  const hashString = storedValue instanceof Buffer ? storedValue.toString() : String(storedValue || "");

  if (hashString.startsWith("$2")) {
    return await bcrypt.compare(inputPassword, hashString);
  }

  return inputPassword === hashString;
};

const login = async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Tên đăng nhập và mật khẩu là bắt buộc" });
  }

  const normalizedUsername = String(username).trim().toLowerCase();

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
      return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });
    }

    const isMatch = await verifyPassword(password, user.passwordhash);
    if (!isMatch) {
      return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });
    }

    const sessionUser = {
      id: user.id,
      username: user.username,
      role: user.role || "admin",
    };

    if (req.session) {
      req.session.user = sessionUser;
    }

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

module.exports = {
  login,
  logout,
  me,
};
