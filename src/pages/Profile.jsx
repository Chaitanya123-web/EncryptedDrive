import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [fileStats, setFileStats] = useState({ count: 0, size: 0 });
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      // Fetch user identity
      const userRes = await API.get("/auth/profile");
      setUser(userRes.data);

      // Fetch vault statistics
      const filesRes = await API.get("/files/my-files");
      const totalSize = filesRes.data.reduce((acc, file) => acc + file.fileSize, 0);
      
      setFileStats({
        count: filesRes.data.length,
        size: (totalSize / (1024 * 1024)).toFixed(2) 
      });
    } catch (err) {
      console.error("Failed to fetch profile data", err);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIC: DOWNLOAD DATA REPORT ---
  const generateReport = () => {
    const reportData = {
      vaultOwner: user.name,
      email: user.email,
      totalFilesEncrypted: fileStats.count,
      totalStorageUsed: `${fileStats.size} MB`,
      reportGeneratedAt: new Date().toLocaleString(),
      securityStatus: "AES-256 Verified",
      provider: "CloudLock Cloud"
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `CloudLock_Report_${user.name.replace(/\s+/g, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // --- LOGIC: DELETE ACCOUNT ---
  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "CRITICAL WARNING: This will permanently delete your account and all file metadata. This action CANNOT be undone. Proceed?"
    );

    if (confirmed) {
      try {
        await API.delete("/auth/delete-account");
        localStorage.removeItem("token");
        alert("Account deleted. All local vault access has been revoked.");
        navigate("/signup");
      } catch (err) {
        alert("Error deleting account. Please try again.");
      }
    }
  };

  // --- LOGIC: PHOTO UPLOAD TO S3 ---
  const handlePhotoUpdate = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        return alert("Please select a valid image file.");
    }

    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append("photo", file);

    try {
        const res = await API.post("/auth/update-photo", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });

        // Update local state with the new S3 URL
        setUser({ ...user, profilePic: res.data.url });
        alert("Profile picture updated in your Vault!");
    } catch (err) {
        console.error("Upload error:", err);
        alert("Failed to upload photo. Ensure S3 bucket permissions are correct.");
    } finally {
        setUploadingPhoto(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-blue-500 animate-pulse font-medium text-lg tracking-widest uppercase">
            Unlocking Vault Identity...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-blue-500/30 flex flex-col">
      <Navbar />

      <div className="flex-grow relative">
        {/* Decorative Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>
          <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] bg-cyan-600/10 blur-[120px] rounded-full"></div>
        </div>

        <div className="max-w-4xl mx-auto pt-28 px-6 pb-20">
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 md:p-12 backdrop-blur-2xl shadow-2xl">
            
            {/* Header & Profile Picture Section */}
            <div className="flex flex-col md:flex-row items-center gap-10 mb-12 pb-12 border-b border-white/5">
              <div className="relative group">
                <div className="w-40 h-40 bg-gradient-to-br from-blue-600 to-cyan-400 rounded-[2.5rem] overflow-hidden flex items-center justify-center shadow-2xl shadow-blue-500/20 transform rotate-3 transition-transform group-hover:rotate-0 border-4 border-white/5">
                  {user?.profilePic ? (
                    <img 
                      src={user.profilePic} 
                      alt="Profile" 
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <span className="text-6xl font-black">{user?.name?.[0].toUpperCase()}</span>
                  )}
                  
                  {/* Loading Spinner for Photo Upload */}
                  {uploadingPhoto && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>

                {/* Hover Overlay for Upload */}
                <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <div className="text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto mb-1 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-[10px] font-bold uppercase tracking-tighter">Change Photo</span>
                  </div>
                  <input type="file" className="hidden" onChange={handlePhotoUpdate} accept="image/*" disabled={uploadingPhoto} />
                </label>
              </div>

              <div className="text-center md:text-left flex-1">
                <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                  {user?.name}
                </h1>
                <p className="text-slate-400 mt-2 font-medium flex items-center justify-center md:justify-start gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Vault Account Active
                </p>
                <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-3">
                  <span className="px-4 py-1.5 bg-white/5 rounded-full text-[10px] font-bold text-slate-400 border border-white/10 uppercase tracking-widest">
                    Member Since {user?.createdAt ? new Date(user.createdAt).getFullYear() : '2026'}
                  </span>
                  <span className="px-4 py-1.5 bg-blue-500/10 rounded-full text-[10px] font-bold text-blue-400 border border-blue-500/10 uppercase tracking-widest">
                    Verified Identity
                  </span>
                </div>
              </div>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
              <div className="p-8 bg-blue-600/5 rounded-[2rem] border border-blue-500/10 hover:bg-blue-600/10 transition-all group">
                <span className="text-blue-400 text-xs font-bold uppercase tracking-[0.2em] group-hover:text-blue-300">Total Encrypted Files</span>
                <p className="text-4xl font-bold mt-2">{fileStats.count}</p>
              </div>
              <div className="p-8 bg-cyan-600/5 rounded-[2rem] border border-cyan-500/10 hover:bg-cyan-600/10 transition-all group">
                <span className="text-cyan-400 text-xs font-bold uppercase tracking-[0.2em] group-hover:text-cyan-300">Cloud Storage Used</span>
                <p className="text-4xl font-bold mt-2">{fileStats.size} MB</p>
              </div>
            </div>

            {/* Personal Details List */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-4 ml-2">Personal Information</h3>
              
              <div className="group p-6 bg-slate-900/40 rounded-[1.5rem] border border-white/5 hover:border-white/10 transition-all">
                <label className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em]">Registered Email</label>
                <p className="text-xl mt-1 font-medium group-hover:text-blue-400 transition-colors">{user?.email}</p>
              </div>
              
              <div className="group p-6 bg-slate-900/40 rounded-[1.5rem] border border-white/5 hover:border-white/10 transition-all">
                <label className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em]">Vault Unique ID (UID)</label>
                <p className="text-lg mt-1 font-mono text-slate-400 break-all">{user?._id}</p>
              </div>
            </div>

            {/* Management Actions */}
            <div className="mt-12 flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={generateReport}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold text-sm transition-all active:scale-95 shadow-xl shadow-black/20"
                >
                    Download Data Report
                </button>
                <button 
                  onClick={handleDeleteAccount}
                  className="flex-1 py-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-2xl font-bold text-sm text-red-500 transition-all active:scale-95 shadow-xl shadow-red-900/10"
                >
                    Delete Account
                </button>
            </div>

          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}