import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api";

export default function Signup() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post("/signup", form);
      alert("Vault created successfully! You can now log in.");
      navigate("/login");
    } catch (err) {
      alert("Signup failed. Please check your connection.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
       {/* Background Glow */}
       <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-cyan-600/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full"></div>
      </div>

      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white tracking-tight">Join SecureVault</h2>
          <p className="text-slate-400 mt-2">Military-grade encryption for your files</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
            <input
              type="text"
              placeholder="John Doe"
              className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
            <input
              type="email"
              placeholder="name@company.com"
              className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Vault Password</label>
            <input
              type="password"
              placeholder="Minimum 8 characters"
              className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <button className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl shadow-lg shadow-cyan-900/20 transition-all active:scale-95">
            Initialize Vault
          </button>
        </form>

        <p className="text-center text-slate-400 mt-8">
          Already a member? <Link to="/login" className="text-cyan-400 hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}