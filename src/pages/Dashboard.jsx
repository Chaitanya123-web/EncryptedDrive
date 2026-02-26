import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

export default function Dashboard() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const res = await API.get("/files/my-files");
      setFiles(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching files", err);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      await API.post("/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("File uploaded and encrypted!");
      fetchFiles(); // Refresh the list
    } catch (err) {
      alert("Upload failed");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans">
      <aside className="w-64 border-r border-slate-800 p-6 flex flex-col gap-8">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">SecureVault</span>
        </div>
        <nav className="flex flex-col gap-2">
          <button className="flex items-center gap-3 px-4 py-3 bg-blue-600/10 text-blue-400 rounded-xl font-medium text-left">🏠 My Drive</button>
        </nav>
      </aside>

      <main className="flex-1 p-10">
        <header className="flex justify-between items-center mb-10">
          <h2 className="text-3xl font-bold text-white">My Files</h2>
          <div className="flex gap-4">
            <label className="cursor-pointer px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20">
              + Upload File
              <input type="file" className="hidden" onChange={handleFileUpload} />
            </label>
            <button onClick={handleLogout} className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-all">🚪</button>
          </div>
        </header>

        {loading ? <p>Loading vault...</p> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {files.length === 0 ? <p className="text-slate-500">Your vault is empty.</p> : files.map((file) => (
              <div key={file._id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl hover:border-blue-500/50 transition-all group">
                <div className="h-32 bg-slate-950 rounded-xl mb-4 flex items-center justify-center text-4xl">
                   {file.mimeType?.includes("image") ? "🖼️" : "📄"}
                </div>
                <h3 className="font-semibold text-white truncate">{file.originalName}</h3>
                <p className="text-sm text-slate-500">{(file.fileSize / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}