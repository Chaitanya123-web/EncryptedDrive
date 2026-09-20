import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-white/5 pt-12 pb-8 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-600 p-1.5 rounded-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.413V13H5.5z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-white tracking-tight">CloudLock</span>
            </div>
            <p className="text-slate-400 max-w-xs text-sm leading-relaxed">
              Military-grade encrypted cloud storage platform built with the MERN stack and AWS S3. Your privacy is our priority.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-widest">Platform</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/dashboard" className="hover:text-blue-400 transition-colors">My Drive</Link></li>
              <li><Link to="/profile" className="hover:text-blue-400 transition-colors">User Profile</Link></li>
              <li><Link to="/login" className="hover:text-blue-400 transition-colors">Security Login</Link></li>
            </ul>
          </div>

          {/* Tech Stack Section */}
          <div>
            <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-widest">Tech Stack</h4>
            <div className="flex flex-wrap gap-2">
              {['MongoDB', 'Express', 'React', 'Node.js', 'AWS S3', 'Tailwind'].map((tech) => (
                <span key={tech} className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-slate-300">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-xs">
            © 2026 CloudLock. Developed by Chaitanya Bishnoi.
          </p>
          <div className="flex gap-6 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              S3 ap-south-1 Connected
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              AES-256 Enabled
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}