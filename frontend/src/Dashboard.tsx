import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HardDrive, UploadCloud, LogOut, FileText, Share2, Trash2, Search, 
  Folder as FolderIcon, ShieldCheck, Download, ChevronRight, FolderPlus, 
  ArrowLeft, X, PlayCircle, FileType, ChevronLeft, AlertTriangle, 
  CheckCircle, Info, Loader2, Database, Star, RefreshCcw, Camera
} from 'lucide-react';
import { useAuthStore } from './lib/store';
import { api } from './lib/api';

// --- TIPAGENS ---
interface FileData { id: string; name: string; size: number; content_type: string; is_starred: boolean; is_deleted: boolean; }
interface FolderData { id: string; name: string; color: string; is_starred: boolean; is_deleted: boolean; }
interface BreadcrumbItem { id: string | null; name: string; }
interface ContextMenuState { visible: boolean; x: number; y: number; file: FileData | null; }

type ViewMode = 'drive' | 'starred' | 'trash';

export default function Dashboard() {
  const { user, login, logout, addNotification, removeNotification, updateNotificationProgress, notifications } = useAuthStore();
  
  // Estados de Dados & Visualização
  const [viewMode, setViewMode] = useState<ViewMode>('drive');
  const [files, setFiles] = useState<FileData[]>([]);
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ used_bytes: 0, limit_bytes: 0, used_percentage: 0 });
  
  // Navegação
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: null, name: 'ROOT' }]);
  const [searchTerm, setSearchTerm] = useState("");

  // Visualizador & Utils
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>("");
  const [previewType, setPreviewType] = useState<string>("");
  const [previewId, setPreviewId] = useState<string | null>(null); 
  const [isDragging, setIsDragging] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, file: null });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // --- BOOTSTRAP ---
  useEffect(() => { 
    // Se mudar de modo (Drive/Lixeira), reseta a pasta para raiz
    if (viewMode !== 'drive') setCurrentFolderId(null);
    fetchContent(); 
    fetchStats();
    fetchUser(); // Atualiza avatar
  }, [currentFolderId, searchTerm, viewMode]);

  // Atalhos e Cliques Globais
  useEffect(() => {
    const handleClick = () => setContextMenu({ ...contextMenu, visible: false });
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [contextMenu]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!previewId) return; 
      if (e.key === 'Escape') closePreview();
      if (e.key === 'ArrowRight') navigateGallery('next');
      if (e.key === 'ArrowLeft') navigateGallery('prev');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewId, files]);

  // --- API ---
  const fetchUser = async () => {
      try { const res = await api.get('/user/me'); login({ ...user!, ...res.data }); } catch(e) {}
  }

  const fetchContent = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (viewMode === 'trash') params.trash = true;
      if (viewMode === 'starred') params.starred = true;
      if (viewMode === 'drive' && !searchTerm) params.folder_id = currentFolderId;

      const [resFiles, resFolders] = await Promise.all([
        api.get('/drive/files', { params }),
        viewMode === 'drive' && !searchTerm ? api.get('/drive/folders', { params: { parent_id: currentFolderId } }) : { data: [] }
      ]);
      
      setFiles(resFiles.data);
      setFolders(Array.isArray(resFolders.data) ? resFolders.data : []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try { const res = await api.get('/drive/stats'); setStats(res.data); } catch (e) {}
  };

  // --- ACTIONS (Upload, Avatar, etc) ---
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('file', file);
      try {
          await api.post('/user/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
          addNotification({ type: 'success', title: 'IDENTITY UPDATED', message: 'New avatar set.' });
          fetchUser();
      } catch(e) { addNotification({ type: 'error', title: 'UPDATE FAILED', message: 'Could not upload avatar.' }); }
  };

  const processUpload = async (file: File) => {
    if (viewMode !== 'drive') { alert("Upload only available in Main Drive."); return; }
    const notifId = addNotification({ type: 'upload', title: 'UPLOADING DATA...', message: file.name, progress: 0 });
    const formData = new FormData();
    formData.append('file', file);
    if (currentFolderId) formData.append('folder_id', currentFolderId);

    try {
      await api.post('/drive/upload', formData, { 
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total || file.size;
          const percent = Math.round((progressEvent.loaded * 100) / total);
          updateNotificationProgress(notifId, percent);
        }
      });
      removeNotification(notifId);
      addNotification({ type: 'success', title: 'UPLOAD COMPLETE', message: `${file.name} secured.` });
      fetchContent(); fetchStats();
    } catch (err) { 
      removeNotification(notifId);
      addNotification({ type: 'error', title: 'UPLOAD FAILED', message: 'Connection interrupted.' });
    }
  };

  // --- FILE OPERATIONS ---
  const handleToggleStar = async (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      try { await api.post(`/drive/files/${id}/star`); fetchContent(); } catch(e) {}
  };

  // Soft Delete (Drive) ou Hard Delete (Trash)
  const handleDeleteFile = async (id: string) => {
    const isHard = viewMode === 'trash';
    if (!confirm(isHard ? "PERMANENTLY INCINERATE DATA?" : "MOVE TO INCINERATOR?")) return;
    try { 
      await api.delete(`/drive/${id}`, { params: { hard: isHard } }); 
      addNotification({ type: 'success', title: isHard ? 'DATA INCINERATED' : 'MOVED TO TRASH', message: 'Operation successful.' });
      fetchContent(); fetchStats(); 
    } catch(e) { addNotification({ type: 'error', title: 'ERROR', message: 'Access denied.' }); }
  };

  const handleRestoreFile = async (id: string) => {
      try { await api.post(`/drive/files/${id}/restore`); fetchContent(); addNotification({ type: 'success', title: 'DATA RESTORED', message: 'File returned to grid.' }); } catch(e) {}
  }

  // --- UI HELPERS ---
  const formatBytes = (bytes: number) => { if (!+bytes) return '0 B'; const k = 1024; const sizes = ['B', 'KB', 'MB', 'GB', 'TB']; const i = Math.floor(Math.log(bytes) / Math.log(k)); return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`; };
  const handleUploadInput = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { processUpload(file); if (fileInputRef.current) fileInputRef.current.value = ''; } };
  const handleCreateFolder = async () => { const name = prompt("IDENTIFICADOR DO DIRETÓRIO:"); if (!name) return; try { await api.post('/drive/folders', { name, parent_id: currentFolderId }); addNotification({ type: 'success', title: 'DIRECTORY CREATED', message: `Active.` }); fetchContent(); } catch (error) { addNotification({ type: 'error', title: 'CREATION FAILED', message: 'Write error.' }); } };
  const handleDownload = async (id: string) => { try { const res = await api.get(`/drive/download/${id}`); window.open(res.data.download_url, '_blank'); addNotification({ type: 'info', title: 'DOWNLOADING', message: 'Decrypting stream...' }); } catch(e) { addNotification({ type: 'error', title: 'DOWNLOAD ERROR', message: 'File not found.' }); } };
  const handleShare = async (file: FileData) => { try { const res = await api.get(`/drive/share/${file.id}`); await navigator.clipboard.writeText(res.data.share_url); addNotification({ type: 'success', title: 'LINK GENERATED', message: 'Copied to clipboard.' }); } catch (error) { addNotification({ type: 'error', title: 'SHARE FAILED', message: 'Error generating link.' }); } };
  
  // ... (Preview Logic igual ao anterior)
  const handlePreview = async (file: FileData) => {
    const { content_type: type, id, name } = file;
    const isSupported = type.startsWith('image/') || type.startsWith('video/') || type === 'application/pdf';
    if (!isSupported) { addNotification({ type: 'info', title: 'FORMAT UNSUPPORTED', message: 'Downloading raw file.' }); handleDownload(id); return; }
    setPreviewId(id); setPreviewName(name); setPreviewType(type); setPreviewUrl(null); 
    try { const res = await api.get(`/drive/download/${id}`); setPreviewUrl(res.data.download_url); } catch (error) { addNotification({ type: 'error', title: 'PREVIEW ERROR', message: 'Could not load stream.' }); closePreview(); }
  };
  const closePreview = () => { setPreviewUrl(null); setPreviewId(null); setPreviewType(""); };
  const navigateGallery = (direction: 'next' | 'prev') => { if (!previewId || files.length <= 1) return; const currentIndex = files.findIndex(f => f.id === previewId); if (currentIndex === -1) return; let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1; if (newIndex >= files.length) newIndex = 0; if (newIndex < 0) newIndex = files.length - 1; handlePreview(files[newIndex]); };
  
  // ... (Drag & Drop handlers igual ao anterior)
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files; if (f && f.length > 0) processUpload(f[0]); };
  const handleContextMenu = (e: React.MouseEvent, file: FileData) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ visible: true, x: e.pageX, y: e.pageY, file: file }); };
  const handleEnterFolder = (folder: FolderData) => { setBreadcrumbs([...breadcrumbs, { id: folder.id, name: folder.name }]); setCurrentFolderId(folder.id); setSearchTerm(""); };
  const handleNavigateBreadcrumb = (index: number) => { const target = breadcrumbs[index]; setBreadcrumbs(breadcrumbs.slice(0, index + 1)); setCurrentFolderId(target.id); setSearchTerm(""); };
  const handleUpLevel = () => { if (breadcrumbs.length > 1) handleNavigateBreadcrumb(breadcrumbs.length - 2); };

  return (
    <div className="flex h-full w-full bg-arasaka-bg text-arasaka-text font-sans overflow-hidden relative" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      
      {/* DRAG OVERLAY */}
      <AnimatePresence>{isDragging && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center border-4 border-dashed border-arasaka-primary m-4 rounded-lg pointer-events-none"><div className="flex flex-col items-center gap-4 text-arasaka-primary"><UploadCloud size={64} className="animate-bounce" /><h2 className="text-2xl font-display font-bold tracking-widest">UPLINK DETECTED</h2></div></motion.div>)}</AnimatePresence>

      {/* SIDEBAR */}
      <aside className="w-64 border-r border-arasaka-border bg-zinc-900 flex flex-col h-full shrink-0 z-20">
        <div className="p-6 border-b border-arasaka-border">
          <h1 className="text-2xl font-display font-bold text-arasaka-primary tracking-widest">MIKOSHI</h1>
          <p className="text-[10px] text-arasaka-muted font-mono mt-1">SECURE DATA FORTRESS</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <NavItem icon={<HardDrive size={18} />} label="Main Drive" active={viewMode === 'drive'} onClick={() => setViewMode('drive')} />
          <NavItem icon={<Star size={18} />} label="Priority Intel" active={viewMode === 'starred'} onClick={() => setViewMode('starred')} />
          <NavItem icon={<Trash2 size={18} />} label="Incinerator" active={viewMode === 'trash'} onClick={() => setViewMode('trash')} />
        </nav>

        {/* STORAGE WIDGET */}
        <div className="p-4 bg-black/40 border-t border-arasaka-border">
          <div className="flex items-center gap-2 mb-2 text-arasaka-primary"><Database size={14} /><span className="text-[10px] font-bold tracking-widest uppercase">Storage Quota</span></div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-2"><motion.div className="h-full bg-arasaka-primary" initial={{ width: 0 }} animate={{ width: `${stats.used_percentage}%` }} transition={{ duration: 1 }} /></div>
          <div className="flex justify-between text-[10px] font-mono text-arasaka-muted"><span>{formatBytes(stats.used_bytes)}</span><span>{formatBytes(stats.limit_bytes)}</span></div>
        </div>

        {/* PROFILE SECTION */}
        <div className="p-4 border-t border-arasaka-border bg-black/60">
            <div className="flex items-center gap-3 mb-4 cursor-pointer group" onClick={() => avatarInputRef.current?.click()}>
                <input type="file" ref={avatarInputRef} className="hidden" onChange={handleAvatarUpload} accept="image/*" />
                <div className="w-10 h-10 bg-zinc-800 border border-arasaka-primary rounded-full overflow-hidden flex items-center justify-center relative">
                    {user?.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : <span className="text-arasaka-primary font-bold">{user?.username.charAt(0).toUpperCase()}</span>}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera size={14} className="text-white"/></div>
                </div>
                <div className="overflow-hidden">
                    <p className="text-sm font-bold truncate text-white">{user?.username}</p>
                    <p className="text-[10px] text-arasaka-muted font-mono flex items-center gap-1"><ShieldCheck size={10} className="text-green-500"/> LEVEL {user?.clearance_level}</p>
                </div>
            </div>
            <button onClick={() => { if(confirm("Sair?")) logout() }} className="w-full flex items-center justify-center gap-2 p-2 text-xs border border-arasaka-border hover:bg-arasaka-primary hover:text-black transition-colors font-bold uppercase"><LogOut size={14} /> Disconnect</button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col relative bg-gradient-to-br from-arasaka-bg to-black h-full overflow-hidden">
        <header className="h-16 border-b border-arasaka-border flex items-center justify-between px-6 bg-black/20 backdrop-blur-sm shrink-0">
          <div className="flex items-center flex-1 max-w-lg mr-4">
             {viewMode === 'drive' && !searchTerm && (
               <div className="flex items-center gap-2 overflow-hidden mr-4">
                 {breadcrumbs.length > 1 && (<button onClick={handleUpLevel} className="mr-2 hover:text-arasaka-primary transition-colors"><ArrowLeft size={16} /></button>)}
                 {breadcrumbs.map((crumb, index) => (<div key={crumb.name + index} className="flex items-center gap-2">{index > 0 && <ChevronRight size={12} className="text-arasaka-muted" />}<button onClick={() => handleNavigateBreadcrumb(index)} className={`text-xs font-mono tracking-wider hover:text-arasaka-primary transition-colors ${index === breadcrumbs.length - 1 ? 'text-white font-bold' : 'text-arasaka-muted'}`}>{crumb.name}</button></div>))}
               </div>
             )}
             {viewMode !== 'drive' && <div className="mr-4 text-arasaka-primary font-display font-bold tracking-widest uppercase">{viewMode === 'trash' ? 'INCINERATOR' : 'PRIORITY INTEL'}</div>}

             <div className="relative group flex-1">
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="SEARCH DATABASE..." className="bg-arasaka-surface border border-arasaka-border pl-8 pr-4 py-1.5 text-xs w-full focus:outline-none focus:border-arasaka-primary transition-all font-mono text-white placeholder-arasaka-muted"/>
                <Search className="absolute left-2.5 top-1.5 text-arasaka-muted group-focus-within:text-arasaka-primary transition-colors" size={14} />
              </div>
          </div>
          
          <div className="flex items-center gap-3">
            {viewMode === 'drive' && (
                <>
                    <button onClick={handleCreateFolder} className="bg-black border border-arasaka-border text-arasaka-muted px-3 py-1.5 text-xs font-bold uppercase hover:border-arasaka-primary hover:text-white transition-all flex items-center gap-2"><FolderPlus size={14} /> New Folder</button>
                    <input type="file" ref={fileInputRef} onChange={handleUploadInput} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="bg-arasaka-primary text-black px-4 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-white hover:shadow-[0_0_15px_rgba(255,255,255,0.5)] transition-all flex items-center gap-2"><UploadCloud size={14} /> <span>Upload Data</span></button>
                </>
            )}
          </div>
        </header>

        <div className="flex-1 p-8 overflow-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-arasaka-primary animate-pulse"><div className="w-12 h-12 border-4 border-t-transparent border-arasaka-primary rounded-full animate-spin"/><span className="font-mono text-xs">ACCESSING SECTOR...</span></div>
          ) : files.length === 0 && folders.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-arasaka-muted/30">
              {searchTerm ? <Search size={64} strokeWidth={1} /> : viewMode === 'trash' ? <Trash2 size={64} strokeWidth={1}/> : <FolderIcon size={64} strokeWidth={1} />}
              <p className="mt-4 font-mono text-sm tracking-widest">{searchTerm ? "NO DATA FOUND" : "SECTOR EMPTY"}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-10">
              {folders.map(folder => (<FolderCard key={folder.id} folder={folder} onEnter={() => handleEnterFolder(folder)} />))}
              {files.map(file => (
                  <FileCard 
                    key={file.id} 
                    file={file} 
                    isTrash={viewMode === 'trash'}
                    onDelete={() => handleDeleteFile(file.id)} 
                    onRestore={() => handleRestoreFile(file.id)}
                    onDownload={() => handleDownload(file.id)} 
                    onClick={() => handlePreview(file)} 
                    onContextMenu={(e) => handleContextMenu(e, file)} 
                    onToggleStar={(e) => handleToggleStar(file.id, e)}
                  />
              ))}
            </div>
          )}
        </div>
        <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(90deg,var(--color-arasaka-primary)_1px,transparent_1px),linear-gradient(180deg,var(--color-arasaka-primary)_1px,transparent_1px)] bg-[size:40px_40px] z-[-1]" />
      </main>

      {/* CONTEXT MENU */}
      {contextMenu.visible && contextMenu.file && (
        <div className="fixed z-50 bg-black border border-arasaka-primary shadow-[0_0_20px_rgba(220,38,38,0.3)] w-48 flex flex-col py-1" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={(e) => e.stopPropagation()}>
          <div className="px-3 py-2 text-[10px] font-mono text-arasaka-muted border-b border-zinc-800 uppercase mb-1">{contextMenu.file.name.substring(0, 15)}...</div>
          <ContextMenuItem icon={<FileText size={14}/>} label="OPEN PREVIEW" onClick={() => { handlePreview(contextMenu.file!); setContextMenu({ ...contextMenu, visible: false }); }} />
          <ContextMenuItem icon={<Download size={14}/>} label="DOWNLOAD" onClick={() => { handleDownload(contextMenu.file!.id); setContextMenu({ ...contextMenu, visible: false }); }} />
          <ContextMenuItem icon={<Share2 size={14}/>} label="SHARE LINK" onClick={() => { handleShare(contextMenu.file!); setContextMenu({ ...contextMenu, visible: false }); }} />
          <ContextMenuItem icon={<Star size={14}/>} label={contextMenu.file.is_starred ? "UNSTAR" : "ADD STAR"} onClick={() => { handleToggleStar(contextMenu.file!.id); setContextMenu({ ...contextMenu, visible: false }); }} />
          <div className="h-[1px] bg-zinc-800 my-1" />
          <ContextMenuItem icon={<Trash2 size={14}/>} label="DELETE" danger onClick={() => { handleDeleteFile(contextMenu.file!.id); setContextMenu({ ...contextMenu, visible: false }); }} />
        </div>
      )}

      {/* PREVIEW MODAL */}
      <AnimatePresence>
      {previewId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4" onClick={closePreview}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-6xl h-[85vh] border border-arasaka-primary bg-arasaka-surface flex flex-col shadow-[0_0_50px_rgba(220,38,38,0.2)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b border-arasaka-border bg-black z-10"><div className="flex items-center gap-2"><span className="text-arasaka-primary"><ShieldCheck size={16}/></span><span className="font-mono text-xs text-white tracking-widest uppercase truncate max-w-md">{previewName}</span></div><button onClick={closePreview} className="text-arasaka-muted hover:text-arasaka-primary transition-colors"><X size={20} /></button></div>
            <div className="flex-1 overflow-hidden flex items-center justify-center bg-black/50 relative group">
                <button onClick={(e) => { e.stopPropagation(); navigateGallery('prev'); }} className="absolute left-4 z-20 p-2 bg-black/50 text-white rounded-full hover:bg-arasaka-primary hover:scale-110 transition-all opacity-0 group-hover:opacity-100"><ChevronLeft size={32} /></button>
                {!previewUrl ? (<div className="animate-pulse text-arasaka-primary font-mono text-xs">DECRYPTING DATA...</div>) : (
                  <>
                    {previewType.startsWith('image/') && (<img src={previewUrl} alt="Preview" className="max-h-full max-w-full object-contain" />)}
                    {previewType.startsWith('video/') && (<video key={previewUrl} controls autoPlay className="max-h-full max-w-full outline-none bg-black"><source src={previewUrl} type={previewType} /></video>)}
                    {previewType === 'application/pdf' && (<iframe src={previewUrl} className="w-full h-full bg-white" title="PDF Reader" />)}
                  </>
                )}
                <button onClick={(e) => { e.stopPropagation(); navigateGallery('next'); }} className="absolute right-4 z-20 p-2 bg-black/50 text-white rounded-full hover:bg-arasaka-primary hover:scale-110 transition-all opacity-0 group-hover:opacity-100"><ChevronRight size={32} /></button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      {/* NOTIFICATIONS HUD */}
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-3 pointer-events-none w-80">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div key={n.id} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="pointer-events-auto bg-black/90 border-l-4 p-4 shadow-lg backdrop-blur-md flex flex-col gap-2 relative overflow-hidden" style={{ borderColor: n.type === 'success' ? '#10b981' : n.type === 'error' ? '#dc2626' : n.type === 'upload' ? '#eab308' : '#3b82f6', borderTop: '1px solid #27272a', borderRight: '1px solid #27272a', borderBottom: '1px solid #27272a' }}>
              <div className="flex items-start justify-between z-10 relative"><div className="flex items-center gap-2">{n.type === 'success' && <CheckCircle size={16} className="text-emerald-500" />}{n.type === 'error' && <AlertTriangle size={16} className="text-red-600" />}{n.type === 'upload' && <Loader2 size={16} className="text-yellow-500 animate-spin" />}{n.type === 'info' && <Info size={16} className="text-blue-500" />}<h4 className={`text-xs font-bold font-display tracking-widest ${n.type === 'success' ? 'text-emerald-500' : n.type === 'error' ? 'text-red-500' : n.type === 'upload' ? 'text-yellow-500' : 'text-blue-500'}`}>{n.title}</h4></div><button onClick={() => removeNotification(n.id)} className="text-arasaka-muted hover:text-white"><X size={14}/></button></div>
              <div className="flex justify-between items-end z-10 relative"><p className="text-[10px] font-mono text-arasaka-muted uppercase ml-6 truncate max-w-[180px]">{n.type === 'upload' && n.progress === 100 ? "FINALIZING ENCRYPTION..." : n.message}</p>{n.type === 'upload' && typeof n.progress === 'number' && (<span className="text-[10px] font-mono text-yellow-500 font-bold">{n.progress}%</span>)}</div>
              {n.type === 'upload' && typeof n.progress === 'number' && (<div className="absolute bottom-0 left-0 h-1 bg-zinc-800 w-full"><motion.div className="bg-yellow-500 h-full" initial={{ width: 0 }} animate={{ width: `${n.progress}%` }} transition={{ ease: "linear", duration: 0.1 }} /></div>)}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}

// --- SUB-COMPONENTES ---
function NavItem({ icon, label, active = false, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) {
  return ( <div onClick={onClick} className={`flex items-center gap-3 p-3 cursor-pointer transition-all border-l-2 ${active ? 'border-arasaka-primary bg-arasaka-primary/10 text-white shadow-[inset_10px_0_20px_-10px_rgba(220,38,38,0.2)]' : 'border-transparent text-arasaka-muted hover:text-white hover:bg-white/5'}`}>{icon} <span className="text-xs font-display tracking-widest uppercase font-bold">{label}</span></div> );
}
function FolderCard({ folder, onEnter }: { folder: FolderData, onEnter: () => void }) {
  return ( <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onEnter} className="group bg-zinc-900/50 border border-arasaka-border p-4 hover:border-arasaka-text cursor-pointer relative overflow-hidden flex flex-col items-center justify-center gap-2 h-32 select-none"><FolderIcon size={40} className="text-arasaka-muted group-hover:text-white transition-colors fill-current/10" /><span className="text-xs font-bold text-center truncate w-full px-2 font-display tracking-wide">{folder.name}</span></motion.div> )
}
function FileCard({ file, onDelete, onDownload, onClick, onContextMenu, isTrash, onRestore, onToggleStar }: { file: FileData, onDelete: () => void, onDownload: () => void, onClick: () => void, onContextMenu: (e: React.MouseEvent) => void, isTrash?: boolean, onRestore?: () => void, onToggleStar?: (e: React.MouseEvent) => void }) {
  let Icon = FileText; if (file.content_type.startsWith('image/')) Icon = FileText; if (file.content_type.startsWith('video/')) Icon = PlayCircle; if (file.content_type === 'application/pdf') Icon = FileType;
  return ( 
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClick} onContextMenu={onContextMenu} className="group bg-arasaka-surface border border-arasaka-border p-3 hover:border-arasaka-primary transition-all relative overflow-hidden flex flex-col gap-2 hover:shadow-[0_0_15px_rgba(220,38,38,0.15)] h-32 cursor-pointer">
        <div className="flex justify-between items-start z-10">
          <Icon className="text-arasaka-primary/80 group-hover:text-arasaka-primary" size={20} />
          {/* Estrela Visível */}
          {!isTrash && file.is_starred && <Star size={12} className="text-yellow-500 fill-current absolute top-3 right-3" />}
          
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-3 right-3 bg-black/80 p-1 rounded">
            {!isTrash && <button onClick={onToggleStar} className={`p-1 hover:text-yellow-500 rounded ${file.is_starred ? 'text-yellow-500' : 'text-arasaka-muted'}`}><Star size={14}/></button>}
            {isTrash && <button onClick={(e) => { e.stopPropagation(); onRestore?.(); }} className="p-1 hover:text-green-500 rounded text-arasaka-muted" title="Restore"><RefreshCcw size={14}/></button>}
            <button onClick={(e) => { e.stopPropagation(); onDownload(); }} className="p-1 hover:text-white rounded text-arasaka-muted"><Download size={14}/></button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 hover:text-red-500 rounded text-arasaka-muted"><Trash2 size={14}/></button>
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-end z-10 min-w-0"><h3 className="text-xs font-bold truncate text-white group-hover:text-arasaka-primary font-display" title={file.name}>{file.name}</h3><span className="text-[9px] text-arasaka-muted font-mono truncate">{(file.size / 1024).toFixed(0)} KB</span></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-arasaka-primary/5 to-transparent translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-700 pointer-events-none" />
    </motion.div> 
  );
}
function ContextMenuItem({ icon, label, onClick, danger = false }: { icon: any, label: string, onClick: () => void, danger?: boolean }) {
  return ( <div onClick={(e) => { e.stopPropagation(); onClick(); }} className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${danger ? 'hover:bg-red-900/50 text-red-500' : 'hover:bg-arasaka-primary hover:text-black text-white'}`}>{icon} <span className="text-xs font-bold font-mono tracking-wider">{label}</span></div> )
}