import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api";

export default function Signup() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post("/auth/signup", form);
      alert("Vault created successfully! You can now log in.");
      navigate("/login");
    } catch (err) {
      alert("Signup failed. Please check your connection.");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-signup">
        <div className="auth-brand-wrap">
          <h2 className="auth-title">Join CloudLock</h2>
          <p className="auth-subtitle">Military-grade encryption for your files</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="auth-label">Full Name</label>
            <input
              type="text"
              placeholder="John Doe"
              className="auth-input"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Email</label>
            <input
              type="email"
              placeholder="name@company.com"
              className="auth-input"
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Vault Password</label>
            <input
              type="password"
              placeholder="Minimum 8 characters"
              className="auth-input"
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <button className="auth-button auth-button-signup">
            Initialize Vault
          </button>
        </form>

        <p className="auth-meta">
          Already a member? <Link to="/login" className="auth-link">Sign In</Link>
        </p>
      </div>
    </div>
  );
}