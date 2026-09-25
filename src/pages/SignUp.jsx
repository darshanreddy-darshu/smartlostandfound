import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  ArrowRight,
} from "lucide-react";
import { supabase } from "../services/supabase";

export default function SignUp() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) throw error;

      if (data?.user) {
        navigate("/home", { replace: true });
      }
    } catch (err) {
      setError(err.message || "Unable to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-light-page">

      <style>{`

        /* =========================================
           FORCE LIGHT THEME
        ========================================= */

        html,
        body,
        #root {
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

          /*
             GRID FROM YOUR SCREENSHOT
          */
          background-image:
            linear-gradient(
              rgba(93, 77, 49, 0.075) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(93, 77, 49, 0.075) 1px,
              transparent 1px
            ) !important;

          background-size: 24px 24px !important;

          z-index: 99999 !important;
        }

        /* =========================================
           CARD
        ========================================= */

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

        /* =========================================
           TAPE
        ========================================= */

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

        /* =========================================
           TOP ICON
        ========================================= */

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

        /* =========================================
           HEADER
        ========================================= */

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

        .signup-light-eyebrow::before {
          content: "—" !important;
          margin-right: 5px !important;
        }

        .signup-light-eyebrow::after {
          content: "—" !important;
          margin-left: 5px !important;
        }

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

        /* =========================================
           FORM
        ========================================= */

        .signup-light-form {
          width: 100% !important;
        }

        .signup-light-field {
          margin-bottom: 12px !important;
        }

        .signup-light-label {
          display: block !important;

          margin-bottom: 5px !important;

          color: #24201b !important;

          font-size: 9px !important;
          font-weight: 700 !important;
        }

        .signup-light-input-wrap {
          position: relative !important;

          width: 100% !important;
        }

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

        .signup-light-input::placeholder {
          color: #aaa194 !important;
          opacity: 1 !important;
        }

        .signup-light-input:focus {
          background: #ffffff !important;

          border-color: #99671b !important;

          box-shadow:
            0 0 0 2px rgba(153, 103, 27, 0.08) !important;
        }

        /* =========================================
           PASSWORD EYE
        ========================================= */

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

        .signup-light-eye:hover {
          color: #5d5549 !important;
        }

        .signup-light-eye svg {
          width: 13px !important;
          height: 13px !important;
        }

        /* =========================================
           ERROR
        ========================================= */

        .signup-light-error {
          margin-bottom: 12px !important;

          padding: 8px 10px !important;

          border: 1px solid #d7aaa2 !important;

          background: #fff3f1 !important;

          color: #9a4037 !important;

          font-size: 9px !important;
        }

        /* =========================================
           CREATE BUTTON
        ========================================= */

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

        .signup-light-create:disabled {
          opacity: 0.65 !important;

          cursor: not-allowed !important;
        }

        .signup-light-create svg {
          width: 12px !important;
          height: 12px !important;
        }

        /* =========================================
           DIVIDER
        ========================================= */

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

        /* =========================================
           SIGN IN BUTTON
        ========================================= */

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

        /* =========================================
           FOOTER
        ========================================= */

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

        /* =========================================
           MOBILE
        ========================================= */

        @media (max-width: 550px) {

          .signup-light-page {
            padding: 20px 14px !important;
            align-items: center !important;
          }

          .signup-light-card {
            padding: 27px 25px 20px !important;
          }

          .signup-light-title {
            font-size: 26px !important;
          }

        }

      `}</style>

      <div className="signup-light-wrapper">

        <div className="signup-light-shadow"></div>

        <div className="signup-light-card">

          <div className="signup-light-tape"></div>

          {/* ICON */}
          <div className="signup-light-icon">
            <UserPlus />
          </div>

          {/* TITLE */}
          <div className="signup-light-eyebrow">
            Create Case Profile
          </div>

          <h1 className="signup-light-title">
            Join the board.
          </h1>

          <p className="signup-light-description">
            Create your account to report items, receive matches and connect
            with their owners.
          </p>

          {/* FORM */}
          <form
            className="signup-light-form"
            onSubmit={handleSignup}
          >

            {/* FULL NAME */}
            <div className="signup-light-field">

              <label className="signup-light-label">
                Full name
              </label>

              <div className="signup-light-input-wrap">

                <User className="signup-light-input-icon" />

                <input
                  className="signup-light-input"
                  type="text"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                />

              </div>

            </div>

            {/* EMAIL */}
            <div className="signup-light-field">

              <label className="signup-light-label">
                Email address
              </label>

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

              <label className="signup-light-label">
                Password
              </label>

              <div className="signup-light-input-wrap">

                <Lock className="signup-light-input-icon" />

                <input
                  className="signup-light-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
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

            {/* CONFIRM PASSWORD */}
            <div className="signup-light-field">

              <label className="signup-light-label">
                Confirm password
              </label>

              <div className="signup-light-input-wrap">

                <Lock className="signup-light-input-icon" />

                <input
                  className="signup-light-input"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Enter password again"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  className="signup-light-eye"
                  onClick={() => setShowConfirm(!showConfirm)}
                >
                  {showConfirm ? <EyeOff /> : <Eye />}
                </button>

              </div>

            </div>

            {/* ERROR */}
            {error && (
              <div className="signup-light-error">
                {error}
              </div>
            )}

            {/* CREATE ACCOUNT */}
            <button
              type="submit"
              className="signup-light-create"
              disabled={loading}
            >
              {loading ? (
                "Creating account..."
              ) : (
                <>
                  Create account
                  <ArrowRight />
                </>
              )}
            </button>

          </form>

          {/* DIVIDER */}
          <div className="signup-light-divider">
            Already registered?
          </div>

          {/* SIGN IN */}
          <Link
            to="/login"
            className="signup-light-signin"
          >
            Sign in
          </Link>

          {/* FOOTER */}
          <div className="signup-light-footer">
            <span>Smart Lost &amp; Found</span>
            <span>New Case Profile</span>
          </div>

        </div>

      </div>
    </div>
  );
}