import { useState } from "react";
import { loginUser } from "../../utils/auth";
import { useAuth } from "../../context/AuthContext";
import "./LoginForm.css";
const LoginForm = () => {
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    const result = await loginUser(email, password);

    if (!result.success) {
      setError(result.message);
    } else {
      setUser(result.user);
      console.log("Login successful", result.user);
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleLogin}>
        <h2 className="form-title">Welcome Back</h2>
        <p className="form-subtitle">Please login to continue</p>

        <div className="input-group">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="form-input"
          />
          <label className="form-label">Email</label>
          <i className="fas fa-envelope input-icon"></i>
        </div>

        <div className="input-group">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="form-input"
          />
          <label className="form-label">Password</label>
          <i className="fas fa-lock input-icon"></i>
        </div>

        <button type="submit" className="login-button">
          Login
          <span className="button-overlay"></span>
        </button>

        {error && (
          <div className="error-message">
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </div>
        )}

        <div className="form-links">
          <a href="#forgot" className="link">Forgot password?</a>
          <a href="#signup" className="link">Create account</a>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;
