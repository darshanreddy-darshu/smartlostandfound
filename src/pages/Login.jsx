import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, LogIn, ArrowRight } from "lucide-react";
import { supabase } from "../services/supabase";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error("Login error:", error);
        setError(error.message);
        setLoading(false);
        return;
      }

      if (!data?.session) {
        setError("Login completed but no session was created.");
        setLoading(false);
        return;
      }

      setSuccess("Login successful!");

      setTimeout(() => {
        navigate("/home", { replace: true });
      }, 400);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="signup-light-page">
      <style>{`
        html, body, #root {
          margin: 0 !important;
          padding: 0 !important;
          min-height: 100% !important;
        }

        .signup-light-page,
        .signup-light-page * {
          box-sizing: border-box;
        }

        .signup-light-page {
          position: fixed !important;
          inset: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          overflow-y: auto !important;
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          padding: 30px 20px !important;
          background-color: #f4f0e5 !important;
          color: #171411 !important;
          font-family: Arial, Helvetica, sans-serif !important;
          background-image:
            linear-gradient(rgba(93, 77, 49, 0.075) 1px, transparent 1px),
            linear-gradient(90deg, rgba(93, 77, 49, 0.075) 1px, transparent 1px) !important;
          background-size: 24px 24px !important;
          z-index: 99999 !important;
        }

        /* CARD */
        .signup-light-wrapper {
          position: relative !important;
          width: 465px !important;
          max-width: 100% !important;
        }

        .signup-light-shadow {
          position: absolute !important;
          left: 7px !important;
          top: 8px !important;
          width: 100% !important;
          height: 100% !important;
          background: #d5c9ad !important;
          border-radius: 9px !important;
          z-index: 0 !important;
        }

        .signup-light-card {
          position: relative !important;
          width: 100% !important;
          background: #fffdf8 !important;
          border: 1px solid #28231d !important;
          border-radius: 9px !important;
          padding: 29px 37px 22px !important;
          z-index: 2 !important;
          box-shadow: none !important;
        }

        .signup-light-tape {
          position: absolute !important;
          width: 25px !important;
          height: 14px !important;
          left: 22px !important;
          top: -7px !important;
          background: rgba(207, 174, 108, 0.62) !important;
          border: 1px solid rgba(120, 89, 36, 0.35) !important;
          transform: rotate(-3deg) !important;
          z-index: 5 !important;
        }

        /* ICON */
        .signup-light-icon {
          width: 40px !important;
          height: 40px !important;
          margin: 0 auto !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: #171513 !important;
          color: #ffffff !important;
          border-radius: 5px !important;
          transform: rotate(-3deg) !important;
          box-shadow: 4px 4px 0 #a8741b !important;
        }

        .signup-light-icon svg {
          width: 19px !important;
          height: 19px !important;
          color: #ffffff !important;
        }

        /* HEADER */
        .signup-light-eyebrow {
          margin-top: 12px !important;
          margin-bottom: 4px !important;
          text-align: center !important;
          color: #a06d20 !important;
          font-size: 8px !important;
          font-weight: 700 !important;
          letter-spacing: 1.8px !important;
          text-transform: uppercase !important;
        }

        .signup-light-eyebrow::before { content: "—" !important; margin-right: 5px !important; }
        .signup-light-eyebrow::after { content: "—" !important; margin-left: 5px !important; }

        .signup-light-title {
          margin: 0 !important;
          text-align: center !important;
          color: #171411 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          font-size: 29px !important;
          font-weight: 700 !important;
          line-height: 1.1 !important;
          letter-spacing: -1px !important;
        }

        .signup-light-description {
          width: 310px !important;
          max-width: 100% !important;
          margin: 9px auto 24px !important;
          text-align: center !important;
          color: #777066 !important;
          font-size: 10px !important;
          line-height: 1.45 !important;
        }

        /* FORM */
        .signup-light-form { width: 100% !important; }
        .signup-light-field { margin-bottom: 12px !important; }

        .signup-light-label {
          display: block !important;
          margin-bottom: 5px !important;
          color: #24201b !important;
          font-size: 9px !important;
          font-weight: 700 !important;
        }

        .signup-light-input-wrap { position: relative !important; width: 100% !important; }

        .signup-light-input-icon {
          position: absolute !important;
          left: 9px !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          width: 13px !important;
          height: 13px !important;
          color: #9c9282 !important;
          pointer-events: none !important;
        }

        .signup-light-input {
          width: 100% !important;
          height: 34px !important;
          padding: 0 34px 0 31px !important;
          background: #fffefa !important;
          color: #27231e !important;
          border: 1px solid #c39e5d !important;
          border-radius: 0 !important;
          outline: none !important;
          box-shadow: none !important;
          font-family: Arial, Helvetica, sans-serif !important;
          font-size: 10px !important;
        }

        .signup-light-input::placeholder { color: #aaa194 !important; opacity: 1 !important; }

        .signup-light-input:focus {
          background: #ffffff !important;
          border-color: #99671b !important;
          box-shadow: 0 0 0 2px rgba(153, 103, 27, 0.08) !important;
        }

        .signup-light-eye {
          position: absolute !important;
          right: 7px !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          width: 24px !important;
          height: 24px !important;
          padding: 0 !important;
          border: none !important;
          background: transparent !important;
          color: #928878 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
        }

        .signup-light-eye:hover { color: #5d5549 !important; }
        .signup-light-eye svg { width: 13px !important; height: 13px !important; }

        /* MESSAGES */
        .signup-light-error {
          margin-bottom: 12px !important;
          padding: 8px 10px !important;
          border: 1px solid #d7aaa2 !important;
          background: #fff3f1 !important;
          color: #9a4037 !important;
          font-size: 9px !important;
        }

        .signup-light-success {
          margin-bottom: 12px !important;
          padding: 8px 10px !important;
          border: 1px solid #a9c8a4 !important;
          background: #f2faf0 !important;
          color: #2f6b2a !important;
          font-size: 9px !important;
        }

        /* PRIMARY BUTTON */
        .signup-light-create {
          width: 100% !important;
          height: 35px !important;
          margin-top: 1px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 6px !important;
          border: 1px solid #17130e !important;
          border-radius: 4px !important;
          background: #9b681c !important;
          color: #ffffff !important;
          font-family: Arial, Helvetica, sans-serif !important;
          font-size: 9px !important;
          font-weight: 700 !important;
          cursor: pointer !important;
          box-shadow: 3px 3px 0 #17130e !important;
          transition: 0.15s ease !important;
        }

        .signup-light-create:hover {
          background: #a97520 !important;
          transform: translate(-1px, -1px) !important;
          box-shadow: 4px 4px 0 #17130e !important;
        }

        .signup-light-create:active {
          transform: translate(2px, 2px) !important;
          box-shadow: 1px 1px 0 #17130e !important;
        }

        .signup-light-create:disabled { opacity: 0.65 !important; cursor: not-allowed !important; }
        .signup-light-create svg { width: 12px !important; height: 12px !important; }

        /* DIVIDER */
        .signup-light-divider {
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          margin: 15px 0 10px !important;
          color: #a99c87 !important;
          font-size: 6px !important;
          font-weight: 700 !important;
          letter-spacing: 1px !important;
          text-transform: uppercase !important;
        }

        .signup-light-divider::before,
        .signup-light-divider::after {
          content: "" !important;
          flex: 1 !important;
          height: 1px !important;
          background: #d8c7a7 !important;
        }

        /* SECONDARY BUTTON */
        .signup-light-signin {
          width: 100% !important;
          height: 33px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: #fffdf8 !important;
          color: #171411 !important;
          border: 1px solid #28231d !important;
          border-radius: 3px !important;
          box-shadow: 2px 2px 0 #28231d !important;
          text-decoration: none !important;
          font-family: Arial, Helvetica, sans-serif !important;
          font-size: 9px !important;
          font-weight: 700 !important;
          transition: 0.15s ease !important;
        }

        .signup-light-signin:hover {
          background: #f5eddd !important;
          transform: translate(-1px, -1px) !important;
          box-shadow: 3px 3px 0 #28231d !important;
        }

        /* FOOTER */
        .signup-light-footer {
          margin-top: 13px !important;
          padding-top: 11px !important;
          border-top: 1px dashed #d8c7a7 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          color: #a79b87 !important;
          font-size: 5px !important;
          font-weight: 700 !important;
          letter-spacing: 1px !important;
          text-transform: uppercase !important;
        }

        @media (max-width: 550px) {
          .signup-light-page { padding: 20px 14px !important; }
          .signup-light-card { padding: 27px 25px 20px !important; }
          .signup-light-title { font-size: 26px !important; }
        }
      `}</style>

      <div className="signup-light-wrapper">
        <div className="signup-light-shadow"></div>

        <div className="signup-light-card">
          <div className="signup-light-tape"></div>

          <div className="signup-light-icon">
            <LogIn />
          </div>

          <div className="signup-light-eyebrow">Case Profile Access</div>

          <h1 className="signup-light-title">Welcome back.</h1>

          <p className="signup-light-description">
            Sign in to check your reports, see new matches and continue your
            conversations.
          </p>

          <form className="signup-light-form" onSubmit={handleLogin}>
            {/* EMAIL */}
            <div className="signup-light-field">
              <label className="signup-light-label">Email address</label>
              <div className="signup-light-input-wrap">
                <Mail className="signup-light-input-icon" />
                <input
                  className="signup-light-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div className="signup-light-field">
              <label className="signup-light-label">Password</label>
              <div className="signup-light-input-wrap">
                <Lock className="signup-light-input-icon" />
                <input
                  className="signup-light-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="signup-light-eye"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            {error && <div className="signup-light-error">{error}</div>}
            {success && <div className="signup-light-success">{success}</div>}

            <button
              type="submit"
              className="signup-light-create"
              disabled={loading}
            >
              {loading ? (
                "Signing in..."
              ) : (
                <>
                  Sign in
                  <ArrowRight />
                </>
              )}
            </button>
          </form>

          <div className="signup-light-divider">New here?</div>

          <Link to="/signup" className="signup-light-signin">
            Create account
          </Link>

          <div className="signup-light-footer">
            <span>Smart Lost &amp; Found</span>
            <span>Member Sign In</span>
          </div>
        </div>
      </div>
    </div>
  );
}