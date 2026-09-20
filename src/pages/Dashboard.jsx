import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function Dashboard() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [storageStats, setStorageStats] = useState({ usedMB: 0, percentage: 0 });
  const [currentPath, setCurrentPath] = useState(""); 
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenu, setOpenMenu] = useState(null);
  
  // --- SELECTION STATES ---
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const longPressTimer = useRef(null);

  const navigate = useNavigate();
  const STORAGE_LIMIT_MB = 1024; 

  useEffect(() => { fetchFiles(); }, []);

  const fetchFiles = async () => {
    try {
      const res = await API.get("/files/my-files");
      setFiles(res.data);
      const totalBytes = res.data.reduce((acc, file) => acc + (file.fileSize || 0), 0);
      const usedMB = (totalBytes / (1024 * 1024)).toFixed(2);
      const percentage = Math.min((usedMB / STORAGE_LIMIT_MB) * 100, 100);
      setStorageStats({ usedMB, percentage });
      setLoading(false);
    } catch (err) { 
      console.error("Error fetching files", err);
      setLoading(false); 
    }
  };

  // --- UPLOAD LOGIC ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    
    const formData = new FormData();
    formData.append("file", file);
    if (currentPath !== "") formData.append("relativePath", `${currentPath}/${file.name}`);

    try {
      await API.post("/files/upload", formData, { 
        headers: { "Content-Type": "multipart/form-data" } 
      });
      await fetchFiles(); 
    } catch (err) { 
      alert("Upload failed."); 
    } finally { 
      setUploading(false); 
    }
  };

  // --- LONG PRESS & SELECTION LOGIC ---
  const handleButtonPress = (itemId) => {
    longPressTimer.current = setTimeout(() => {
      setIsSelectionMode(true);
      toggleSelection(itemId);
    }, 600);
  };

  const handleButtonRelease = () => clearTimeout(longPressTimer.current);

  const toggleSelection = (itemId) => {
    setSelectedFiles(prev => {
      const newSelection = prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId];
      if (newSelection.length === 0) setIsSelectionMode(false);
      return newSelection;
    });
  };

  // --- SMART FILE ICONS ---
  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'svg'].includes(ext)) return "🖼️";
    if (['mp4', 'mov'].includes(ext)) return "🎬";
    if (['js', 'jsx', 'ts', 'tsx', 'py', 'cpp', 'html'].includes(ext)) return "📝";
    if (ext === 'pdf') return "📕";
    return "📄";
  };

  // --- FOLDER/FILE GROUPING LOGIC ---
  const getItemsInCurrentFolder = () => {
    const foldersMap = {}; 
    const currentFolderFiles = [];
    const filteredFiles = searchQuery 
      ? files.filter(f => f.originalName.toLowerCase().includes(searchQuery.toLowerCase()))
      : files;

    filteredFiles.forEach((file) => {
      const fullPath = file.relativePath || file.originalName;
      if (currentPath === "") {
        if (fullPath.includes("/")) {
          const folderName = fullPath.split("/")[0];
          foldersMap[folderName] = (foldersMap[folderName] || 0) + 1;
        } else {
          currentFolderFiles.push(file);
        }
      } else {
        if (fullPath.startsWith(currentPath + "/")) {
          const remainingPath = fullPath.substring(currentPath.length + 1);
          const parts = remainingPath.split("/");
          if (parts.length > 1) {
            foldersMap[parts[0]] = (foldersMap[parts[0]] || 0) + 1;
          } else {
            currentFolderFiles.push(file);
          }
        }
      }
    });
    return { 
        displayFolders: Object.keys(foldersMap).sort().map(name => ({ name, count: foldersMap[name] })), 
        displayFiles: currentFolderFiles 
    };
  };

  const { displayFolders, displayFiles } = getItemsInCurrentFolder();

  // --- REPO VISIBILITY LOGIC (Public/Private Bulk Toggle) ---
  const updateFolderVisibility = async (folderName, visibility) => {
    const fullPath = currentPath === "" ? folderName : `${currentPath}/${folderName}`;
    try {
      setLoading(true);
      await API.patch("/files/update-folder-visibility", {
        folderPath: fullPath,
        visibility
      });
      await fetchFiles();
      setOpenMenu(null);
    } catch (err) {
      alert("Visibility update failed.");
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = async (folderName) => {
    const fullPath = currentPath === "" ? folderName : `${currentPath}/${folderName}`;
    const folderFiles = files.filter(f => (f.relativePath || "").startsWith(fullPath));
    if (folderFiles.length === 0) return;

    try {
      const response = await API.post("/files/share-links", { fileId: folderFiles[0]._id });
      await navigator.clipboard.writeText(`${window.location.origin}/share/${response.data.token}`);
      alert("New one-time share link copied to clipboard!");
    } catch (err) {
      alert(err?.response?.data?.message || "Could not create share link.");
    }
  };

  const copyFileShareLink = async (file) => {
    if (!file?._id) return;
    try {
      const response = await API.post("/files/share-links", { fileId: file._id });
      await navigator.clipboard.writeText(`${window.location.origin}/share/${response.data.token}`);
      alert("New one-time share link copied to clipboard!");
    } catch (err) {
      alert(err?.response?.data?.message || "Could not create share link.");
    }
  };

  const handleDeleteFile = async (fileId, fileName) => {
    if (!window.confirm(`Delete "${fileName}"?`)) return;

    try {
      setLoading(true);
      await API.delete(`/files/delete/${fileId}`);
      await fetchFiles();
    } catch (err) {
      alert("Delete failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFolder = async (folderName) => {
    const fullPath = currentPath === "" ? folderName : `${currentPath}/${folderName}`;
    const folderFiles = files.filter(f => (f.relativePath || "").startsWith(fullPath));

    if (folderFiles.length === 0) return;
    if (!window.confirm(`Delete folder "${folderName}" and ${folderFiles.length} item(s)?`)) return;

    try {
      setLoading(true);
      await Promise.all(folderFiles.map(file => API.delete(`/files/delete/${file._id}`)));
      await fetchFiles();
    } catch (err) {
      alert("Folder delete failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const updateFileVisibility = async (fileId, visibility) => {
    try {
      setLoading(true);
      await API.patch(`/files/update-visibility/${fileId}`, { visibility });
      await fetchFiles();
      setOpenMenu(null);
    } catch (err) {
      alert("Visibility update failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (fileId, fileName) => {
    try {
      const res = await API.get(`/files/download/${fileId}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Download failed.";
      alert(`Download failed: ${message}`);
    }
  };

  const handleBatchDelete = async () => {
    if (!window.confirm(`Permanently delete ${selectedFiles.length} items?`)) return;
    try {
      setLoading(true);
      const deletePromises = [];
      for (const item of selectedFiles) {
        if (item.startsWith("folder:")) {
          const folderName = item.replace("folder:", "");
          const fullPath = currentPath === "" ? folderName : `${currentPath}/${folderName}`;
          files.filter(f => (f.relativePath || "").startsWith(fullPath))
               .forEach(f => deletePromises.push(API.delete(`/files/delete/${f._id}`)));
        } else { 
          deletePromises.push(API.delete(`/files/delete/${item}`)); 
        }
      }
      await Promise.all(deletePromises);
      setSelectedFiles([]);
      setIsSelectionMode(false);
      await fetchFiles();
    } catch (err) { 
      setLoading(false); 
    }
  };

  return (
    <div className="cloud-dashboard">
      <Navbar />
      <div className="cloud-shell">
        <aside className="storage-sidebar">
          <div className="sidebar-brand">
            <span className="brand-icon">✦</span>
            <span className="brand-label">CloudLock</span>
          </div>
          <nav className="sidebar-nav">
            <p className="sidebar-label">Navigation</p>
            <button onClick={() => { if(!isSelectionMode) { setCurrentPath(""); setSelectedFiles([]); }}}
              className={`nav-button ${currentPath === "" ? 'active' : ''}`}>
              <span className="nav-icon">⌂</span>
              <span>My Drive</span>
            </button>
          </nav>
          <div className="storage-meter">
            <div className="storage-meter-head">
              <span className="storage-label">Storage</span>
              <span className="storage-value">{storageStats.usedMB} MB / 1 GB</span>
            </div>
            <div className="storage-track">
                <div className="storage-bar" style={{ width: `${storageStats.percentage}%` }}></div>
            </div>
          </div>
        </aside>

        <main className="storage-main">
          <header className="dashboard-header">
            <div>
              <div className="section-kicker">Workspace</div>
              <h2 className="page-title">
                {isSelectionMode ? `${selectedFiles.length} Selected` : "My Drive"}
              </h2>
              {isSelectionMode && (
                <div className="selection-actions">
                  <button onClick={handleBatchDelete} className="danger-button">Delete Items</button>
                  <button onClick={() => {setIsSelectionMode(false); setSelectedFiles([]);}} className="secondary-button">Cancel</button>
                </div>
              )}
            </div>

            <div className="dashboard-tools">
              {!isSelectionMode && (
                <input type="text" placeholder="Search files" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input" />
              )}
              {!isSelectionMode && (
                <label className={`upload-button ${uploading ? 'disabled' : ''}`}>
                  <span>{uploading ? "Securing..." : "Upload File"}</span>
                  <input type="file" className="hidden-input" onChange={handleFileUpload} disabled={uploading} />
                </label>
              )}
            </div>
          </header>

          <div className="file-grid">
            {currentPath !== "" && !isSelectionMode && (
              <div onClick={() => setCurrentPath(currentPath.split('/').slice(0,-1).join('/'))} className="back-folders">⤴️ Back</div>
            )}

            {displayFolders.map((folder) => {
              const folderId = `folder:${folder.name}`;
              const isSel = selectedFiles.includes(folderId);
              const fullFolderPath = currentPath === "" ? folder.name : `${currentPath}/${folder.name}`;
              const folderFiles = files.filter(f => (f.relativePath || "").startsWith(fullFolderPath));
              const isPub = folderFiles.some(f => f.visibility === "public");

              return (
                <div key={folder.name} onMouseDown={() => handleButtonPress(folderId)} onMouseUp={handleButtonRelease}
                  onClick={() => isSelectionMode ? toggleSelection(folderId) : setCurrentPath(fullFolderPath)}
                  className={`folder-card ${isSel ? 'selected' : ''}`}> 
                  <div className="folder-top">
                    <div className="folder-icon">📁</div>
                    {!isSelectionMode && (
                      <div className="card-menu-wrap">
                        <button className="three-dot-button" onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === `folder:${folder.name}` ? null : `folder:${folder.name}`); }}>⋮</button>
                        {openMenu === `folder:${folder.name}` && (
                          <div className="card-menu">
                            <button className="menu-item" onClick={(e) => { e.stopPropagation(); updateFolderVisibility(folder.name, isPub ? 'private' : 'public'); }}> {isPub ? 'Make Private' : 'Make Public'} </button>
                            <button className="menu-item" onClick={(e) => { e.stopPropagation(); copyShareLink(folder.name); setOpenMenu(null); }}>Copy Link</button>
                            <button className="menu-item danger-menu-item" onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.name); setOpenMenu(null); }}>Delete</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="folder-name">{folder.name}</h3>
                    <p className="folder-meta">{folder.count} items</p>
                  </div>
                  {isPub && <span className="folder-public-label">Public</span>}
                </div>
              );
            })}

            {displayFiles.map((file) => {
                const isSel = selectedFiles.includes(file._id);
                return (
                    <div key={file._id} onMouseDown={() => handleButtonPress(file._id)} onMouseUp={handleButtonRelease}
                      onClick={() => isSelectionMode ? toggleSelection(file._id) : null}
                      className={`file-card ${isSel ? 'selected' : ''}`}> 
                      {isSelectionMode && <div className="selection-check">✓</div>}
                      <div className="file-top">
                        <div className="file-icon">{getFileIcon(file.originalName)}</div>
                        {!isSelectionMode && (
                          <div className="card-menu-wrap">
                            <button className="three-dot-button" onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === file._id ? null : file._id); }}>⋮</button>
                            {openMenu === file._id && (
                              <div className="card-menu">
                                <button className="menu-item" onClick={(e) => { e.stopPropagation(); updateFileVisibility(file._id, file.visibility === 'public' ? 'private' : 'public'); }}> {file.visibility === 'public' ? 'Make Private' : 'Make Public'} </button>
                                <button className="menu-item" onClick={(e) => { e.stopPropagation(); copyFileShareLink(file); setOpenMenu(null); }}>Copy Link</button>
                                <button className="menu-item" onClick={(e) => { e.stopPropagation(); handleDownload(file._id, file.originalName); setOpenMenu(null); }}>Retrieve</button>
                                <button className="menu-item danger-menu-item" onClick={(e) => { e.stopPropagation(); handleDeleteFile(file._id, file.originalName); setOpenMenu(null); }}>Delete</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="file-name">{file.originalName}</h3>
                        <p className="file-meta">{(file.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                );
            })}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}