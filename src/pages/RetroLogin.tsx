import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../AuthContext";

/**
 * Retro-future login inspired by https://github.com/puikinsh/login-forms/tree/main/forms/retro-future
 * Standalone component: render <RetroLogin /> anywhere in the app.
 */
export default function RetroLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const gradientId = useMemo(
    () => `retro-grid-${Math.random().toString(36).slice(2)}`,
    []
  );
  const { setUser } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="retro-login">
      <svg width="0" height="0" className="sr-only" aria-hidden="true">
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ff6ec7" />
          <stop offset="50%" stopColor="#7c5cff" />
          <stop offset="100%" stopColor="#4de1ec" />
        </linearGradient>
      </svg>

      <div className="retro-shell">
        <div className="retro-bg" aria-hidden="true">
          <div className="retro-grid" />
          <div className="retro-sun" />
          <div className="retro-planet" />
          <div className="retro-glow" />
        </div>

        <div className="retro-card">
          <div className="card-top">
            <div className="title">
              <p className="eyebrow">Chào mừng trở lại</p>
              <h1 className="gradient-title">Mavryk Premium</h1>
              <p className="subtitle">
                Nhập thông tin của bạn để vào trang quản trị.
              </p>
            </div>
          </div>

          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              setLoading(true);
              apiFetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: email, password }),
              })
                .then(async (response) => {
                  if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data.error || "Login failed");
                  }
                  const data = await response.json();
                  setUser(data.user || null);
                  navigate("/dashboard", { replace: true });
                })
                .catch((err) => {
                  setError(err instanceof Error ? err.message : "Login failed");
                })
                .finally(() => setLoading(false));
            }}
          >
            <label className="field">
              <span>Tài khoản</span>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Nhập tên đăng nhập"
              />
            </label>

            <label className="field">
              <span>Mật khẩu</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
              />
            </label>

            <div className="controls">
              <label className="remember">
                <input type="checkbox" defaultChecked />
                <span>Ghi nhớ đăng nhập</span>
              </label>
              <button type="button" className="ghost">
                Quên mật khẩu?
              </button>
            </div>

            <button type="submit" className="cta" disabled={loading}>
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
            {error && <p className="error-msg">{error}</p>}
          </form>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Vast+Shadow&display=swap');

        :root {
          --retro-bg: #0b0b14;
          --retro-card: rgba(13, 14, 26, 0.8);
          --retro-border: rgba(255, 255, 255, 0.08);
          --retro-text: #e5e7ff;
          --retro-muted: #9aa4c2;
          --retro-accent: #ff6ec7;
          --retro-accent-2: #7c5cff;
          --retro-glow: 0 10px 50px rgba(124, 92, 255, 0.5);
          --glass: rgba(255, 255, 255, 0.04);
          color-scheme: dark;
        }

        .retro-login {
          min-height: 100vh;
          background: radial-gradient(circle at 20% 20%, rgba(255, 110, 199, 0.12), transparent 30%),
                      radial-gradient(circle at 80% 0%, rgba(77, 225, 236, 0.12), transparent 32%),
                      var(--retro-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px;
          position: relative;
          overflow: hidden;
          font-family: "Inter", "Space Grotesk", system-ui, -apple-system, sans-serif;
        }

        .retro-shell {
          position: relative;
          width: min(1100px, 100%);
          min-height: 620px;
          border: 1px solid var(--retro-border);
          border-radius: 24px;
          overflow: hidden;
          background: linear-gradient(135deg, rgba(255, 110, 199, 0.06), rgba(77, 225, 236, 0.05));
          box-shadow: 0 30px 120px rgba(0, 0, 0, 0.45);
        }

        .retro-bg {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .retro-grid {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 80px 80px;
          transform: perspective(600px) rotateX(70deg) translateY(-20%);
          transform-origin: center;
          filter: blur(0.3px);
        }

        .retro-sun {
          position: absolute;
          width: 340px;
          height: 340px;
          border-radius: 50%;
          background: conic-gradient(from 120deg, rgba(255, 110, 199, 0.3), rgba(124, 92, 255, 0.35), rgba(77, 225, 236, 0.3));
          top: -80px;
          left: 50%;
          transform: translateX(-50%);
          filter: blur(10px);
          opacity: 0.9;
        }

        .retro-planet {
          position: absolute;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #fff, #7c5cff 45%, #0b0b14 75%);
          top: 60px;
          right: 140px;
          box-shadow: 0 0 40px rgba(124, 92, 255, 0.7);
          opacity: 0.7;
        }

        .retro-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 70%, rgba(255, 110, 199, 0.1), transparent 45%);
          mix-blend-mode: screen;
        }

        .retro-card {
          position: relative;
          z-index: 1;
          margin: 48px;
          padding: 36px;
          border-radius: 18px;
          background: var(--retro-card);
          border: 1px solid var(--retro-border);
          backdrop-filter: blur(16px);
          box-shadow: var(--retro-glow);
          color: var(--retro-text);
          display: grid;
          gap: 24px;
          max-width: 640px;
          overflow: hidden;
        }
        .retro-card::before {
          content: "";
          position: absolute;
          inset: -60px;
          background: conic-gradient(#ff6ec7, #7c5cff, #4de1ec, #ff6ec7);
          filter: blur(40px);
          opacity: 0.45;
          animation: spinGlow 12s linear infinite;
          z-index: 0;
          pointer-events: none;
        }
        .retro-card > * { position: relative; z-index: 1; }

        .card-top {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .badge {
          align-self: flex-start;
          padding: 6px 12px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(255, 110, 199, 0.2), rgba(77, 225, 236, 0.2));
          border: 1px solid rgba(255, 255, 255, 0.12);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-size: 11px;
          color: var(--retro-text);
        }

        .title h1 {
          font-size: 36px;
          line-height: 1.2;
          margin: 6px 0 6px;
          letter-spacing: -0.01em;
        }
        .gradient-title {
          background: linear-gradient(120deg, #ff6ec7, #7c5cff, #4de1ec, #ff6ec7);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradientShift 4s ease-in-out infinite;
          font-family: "Vast Shadow", "Cinzel Decorative", "Inter", system-ui, -apple-system, sans-serif;
          letter-spacing: 0.5px;
        }
        .title .eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 12px;
          color: var(--retro-muted);
          margin: 0;
        }
        .title .subtitle {
          margin: 0;
          color: var(--retro-muted);
          font-size: 14px;
        }

        .form {
          display: grid;
          gap: 16px;
        }
        .field {
          display: grid;
          gap: 6px;
          font-size: 14px;
          color: var(--retro-text);
        }
        .field input {
          width: 100%;
          border-radius: 12px;
          border: 1px solid var(--retro-border);
          background: var(--glass);
          padding: 12px 14px;
          color: var(--retro-text);
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .field input:focus {
          outline: none;
          border-color: rgba(255, 110, 199, 0.6);
          box-shadow: 0 0 0 3px rgba(124, 92, 255, 0.25);
        }

        .controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
          color: var(--retro-muted);
        }
        .remember {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }
        .remember input { accent-color: #7c5cff; }
        .ghost {
          background: transparent;
          border: none;
          color: var(--retro-text);
          font-weight: 600;
          cursor: pointer;
          padding: 4px 8px;
        }

        .cta {
          width: 100%;
          border: none;
          border-radius: 14px;
          padding: 14px;
          font-weight: 700;
          letter-spacing: 0.01em;
          color: #0b0b14;
          background: linear-gradient(90deg, #ff6ec7, #7c5cff, #4de1ec);
          box-shadow: 0 15px 40px rgba(124, 92, 255, 0.45);
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 18px 50px rgba(124, 92, 255, 0.55);
        }
        .cta:active { transform: translateY(0); }

        .divider {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 10px;
          color: var(--retro-muted);
          font-size: 12px;
        }
        .divider span {
          height: 1px;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(255,255,255,0.25), rgba(255,255,255,0));
        }

        .social {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }
        .social button {
          border: 1px solid var(--retro-border);
          background: var(--glass);
          border-radius: 12px;
          padding: 10px 12px;
          color: var(--retro-text);
          font-weight: 600;
          cursor: pointer;
          transition: border-color 0.2s, transform 0.2s;
        }
        .social button:hover {
          border-color: rgba(255, 110, 199, 0.5);
          transform: translateY(-1px);
        }
        .cta:disabled { opacity: 0.6; cursor: not-allowed; }
        .error-msg { margin-top: 8px; color: #ff9b9b; font-size: 13px; }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes spinBorder {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spinGlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .retro-shell { margin: 16px; }
          .retro-card { margin: 32px 20px; padding: 28px; }
        }
      `}</style>
    </div>
  );
}
