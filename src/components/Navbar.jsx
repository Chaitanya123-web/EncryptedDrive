import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-slate-950/50 backdrop-blur-lg border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Section */}
          <div className="flex items-center gap-2">
            <Link to="/dashboard" className="flex items-center gap-2 group">
              <div className="p-2 bg-blue-600 rounded-lg group-hover:bg-blue-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.413V13H5.5z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-white tracking-tight">CloudLock</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
              My Drive
            </Link>
            <Link to="/profile" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
              Profile
            </Link>
            
            <button 
              onClick={handleLogout}
              className="px-4 py-2 bg-white/5 hover:bg-red-500/10 hover:text-red-500 border border-white/10 rounded-lg text-sm font-medium transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}