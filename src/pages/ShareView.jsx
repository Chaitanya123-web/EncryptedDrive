import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import API from "../api";

export default function ShareView() {
  const { shareId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [previewContent, setPreviewContent] = useState(null);
  const [viewingFileName, setViewingFileName] = useState("");
  const [loadingFile, setLoadingFile] = useState(false);
  const [currentPath, setCurrentPath] = useState("");
  const requestedShareId = useRef(null);

  useEffect(() => {
    if (requestedShareId.current === shareId) return;
    requestedShareId.current = shareId;

    const fetchSharedRepo = async () => {
      try {
        const res = await API.get(`/files/public/${shareId}`);
        setData(res.data);
      } catch (err) {
        setError(err?.response?.status === 410
          ? "This one-time link has already been used."
          : "This repository is private or does not exist.");
      }
    };
    fetchSharedRepo();
  }, [shareId]);

  
  const handleOpenFile = async (fileId, fileName) => {
    try {
      setLoadingFile(true);
      // Calls the new preview route you added to the backend
      const res = await API.get(`/files/public/preview/${fileId}`, {
        headers: { "x-share-access-token": data.accessToken }
      });
      setPreviewContent(res.data); 
      setViewingFileName(fileName);
    } catch (err) {
      alert("Error opening file. It might not be a text-based file.");
    } finally {
      setLoadingFile(false);
    }
  };

  const getVisibleItems = () => {
    const folders = new Map();
    const files = [];
    const projectPrefix = `${data.folderName}/`;
    const pathPrefix = currentPath ? `${projectPrefix}${currentPath}` : projectPrefix;

    data.files.forEach((file) => {
      const fullPath = file.relativePath || file.originalName;
      if (fullPath === data.folderName && !currentPath) {
        files.push(file);
        return;
      }
      if (!fullPath.startsWith(pathPrefix)) return;

      const remainingPath = fullPath.slice(pathPrefix.length);
      const pathParts = remainingPath.split("/");
      if (pathParts.length > 1) {
        folders.set(pathParts[0], (folders.get(pathParts[0]) || 0) + 1);
      } else {
        files.push(file);
      }
    });

    return {
      folders: Array.from(folders, ([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name)),
      files
    };
  };

  const { folders, files } = data ? getVisibleItems() : { folders: [], files: [] };

  if (error) return <div className="min-h-screen bg-black flex items-center justify-center text-red-500 font-bold">{error}</div>;
  if (!data) return <div className="min-h-screen bg-black flex items-center justify-center text-slate-500 uppercase text-[10px]">Opening Vault...</div>;

  return (
    <div className="min-h-screen bg-black text-slate-200 p-8 md:p-20 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 border-b border-white/5 pb-8">
            <p className="text-[10px] text-blue-500 font-black uppercase tracking-[0.3em] mb-2">One-Time Read-Only Repository</p>
            <h2 className="text-4xl font-black text-white italic">Project: {data.folderName}</h2>
            <div className="mt-5 flex items-center gap-3 text-xs text-slate-500">
              <button onClick={() => setCurrentPath("")} className="text-blue-400 hover:text-white">
                {data.folderName}
              </button>
              {currentPath.split("/").filter(Boolean).map((part, index, parts) => (
                <span key={`${part}-${index}`} className="flex items-center gap-3">
                  <span>/</span>
                  <button
                    onClick={() => setCurrentPath(parts.slice(0, index + 1).join("/"))}
                    className="text-blue-400 hover:text-white"
                  >
                    {part}
                  </button>
                </span>
              ))}
            </div>
        </header>

        {/* File Explorer View */}
        <div className="grid grid-cols-1 gap-4">
            {currentPath && (
              <button
                onClick={() => setCurrentPath(currentPath.split("/").slice(0, -1).join("/"))}
                className="text-left text-sm text-slate-500 hover:text-white"
              >
                Back
              </button>
            )}
            {folders.map((folder) => (
              <button
                key={folder.name}
                onClick={() => setCurrentPath(currentPath ? `${currentPath}/${folder.name}` : folder.name)}
                className="bg-blue-500/[0.08] border border-blue-400/20 p-6 rounded-2xl flex justify-between items-center text-left hover:bg-blue-500/[0.15] transition-all"
              >
                <span className="flex items-center gap-5">
                  <span className="text-3xl">📁</span>
                  <span>
                    <span className="block font-bold text-white">{folder.name}</span>
                    <span className="block text-[9px] text-slate-500 uppercase tracking-widest mt-1">{folder.count} item(s)</span>
                  </span>
                </span>
                <span className="text-slate-500">Open</span>
              </button>
            ))}
            {files.map((file) => (
                <div 
                    key={file._id} 
                    onClick={() => handleOpenFile(file._id, file.originalName)}
                    className="bg-white/[0.03] border border-white/5 p-6 rounded-2xl flex justify-between items-center group hover:bg-white/[0.05] transition-all cursor-pointer"
                >
                    <div className="flex items-center gap-5">
                        <div className="text-3xl opacity-40 group-hover:opacity-100 transition-opacity">📄</div>
                        <div>
                            <p className="font-bold text-white group-hover:text-blue-400 transition-colors">{file.originalName}</p>
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Click to open & read</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[11px] font-black text-slate-400">{(file.fileSize / 1024).toFixed(2)} KB</p>
                    </div>
                </div>
            ))}
            {!folders.length && !files.length && (
              <p className="text-sm text-slate-500">This folder is empty.</p>
            )}
        </div>

        {/* --- READ-ONLY FILE PREVIEW MODAL --- */}
        {previewContent !== null && (
            <div className="fixed inset-0 bg-black/95 flex flex-col p-6 md:p-12 z-50 animate-in fade-in">
                <div className="flex justify-between items-center mb-6 w-full max-w-6xl mx-auto">
                    <div>
                        <h3 className="text-xl font-bold text-white">{viewingFileName}</h3>
                        <p className="text-[10px] text-blue-500 uppercase font-black tracking-widest">Read-Only Preview</p>
                    </div>
                    <button 
                        onClick={() => setPreviewContent(null)}
                        className="px-6 py-2 bg-red-600/20 text-red-500 border border-red-500/20 rounded-xl font-bold hover:bg-red-600 hover:text-white transition-all"
                    >
                        Close
                    </button>
                </div>
                
                <div className="flex-1 w-full max-w-6xl mx-auto overflow-hidden rounded-3xl border border-white/10 bg-[#0d1117]">
                    <pre className="h-full overflow-auto p-8 font-mono text-sm leading-relaxed text-blue-100/80">
                        {previewContent}
                    </pre>
                </div>
            </div>
        )}

        {loadingFile && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
                <div className="text-[10px] text-white uppercase tracking-[0.5em] animate-pulse">Decrypting Content...</div>
            </div>
        )}

        <footer className="mt-16 text-center border-t border-white/5 pt-8">
            <p className="text-[10px] text-slate-600 uppercase tracking-[0.2em]">End-to-End Encrypted by CloudLock</p>
        </footer>
      </div>
    </div>
  );
}