import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Upload, FileIcon, X, AlertTriangle, CheckCircle, Loader2, Maximize, Download, Smartphone, Package, Monitor, Archive, Play, HardDrive, Music, Image, Film, FileText, Code, Table, Presentation, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import JSZip from "jszip";

const MAX_SIZE_BYTES = 1_000_000_000; // 1GB = 1000MB
const MAX_APK_SIZE_BYTES = 1_000_000_000; // 1GB (1000MB) for APK files

type FileStatus = "idle" | "checking" | "approved" | "rejected" | "previewing" | "converting";

const formatSize = (bytes: number) => {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  return `${bytes} B`;
};

const PlayFiles = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<FileStatus>("idle");
  const [checkProgress, setCheckProgress] = useState(0);
  const [aiMessage, setAiMessage] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zipEntries, setZipEntries] = useState<{ name: string; size: number; dir: boolean }[]>([]);
  const [convertProgress, setConvertProgress] = useState(0);
  const [convertMessage, setConvertMessage] = useState("");
  const [showApkConfirm, setShowApkConfirm] = useState(false);

  const handleFileSelect = useCallback((selectedFile: File) => {
    // Clean up previous URL
    if (fileUrl) URL.revokeObjectURL(fileUrl);

    setFile(selectedFile);
    setStatus("checking");
    setCheckProgress(0);
    setAiMessage("AI is analyzing your file...");

    // Simulate AI checking file size with progress
    const totalDuration = 2000;
    const steps = 20;
    const stepDuration = totalDuration / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const progress = Math.min((currentStep / steps) * 100, 100);
      setCheckProgress(progress);

      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
      const isApk = fileExt === 'apk';
      const sizeLimit = isApk ? MAX_APK_SIZE_BYTES : MAX_SIZE_BYTES;
      const sizeLimitLabel = isApk ? '1GB (1000MB)' : '1GB (1000MB)';

      if (currentStep <= 5) {
        setAiMessage("AI is scanning your file...");
      } else if (currentStep <= 10) {
        setAiMessage(`Checking file size: ${formatSize(selectedFile.size)}...`);
      } else if (currentStep <= 15) {
        setAiMessage(isApk
          ? "Verifying APK is within 1GB (1000MB) limit..."
          : "Verifying file is within 1GB limit...");
      }

      if (currentStep >= steps) {
        clearInterval(interval);

        if (selectedFile.size > sizeLimit) {
          setStatus("rejected");
          setAiMessage(
            `❌ File too large! Your file is ${formatSize(selectedFile.size)} which exceeds the ${sizeLimitLabel} limit${isApk ? ' for APK files' : ''}. Please upload a smaller file.`
          );
          toast.error(`File exceeds ${sizeLimitLabel} limit`);
        } else {
          setStatus("approved");
          setAiMessage(
            `✅ File approved! Size: ${formatSize(selectedFile.size)} — within the ${sizeLimitLabel} limit. Ready to download and preview.`
          );
          toast.success("File approved by AI");
        }
      }
    }, stepDuration);
  }, [fileUrl]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFileSelect(droppedFile);
    },
    [handleFileSelect]
  );

  const handleRunPreview = async () => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    setStatus("previewing");
    setIsFullscreen(true);

    const ext = file.name.split('.').pop()?.toLowerCase();
    const zipBasedExts = ['zip', 'apk', 'docx', 'xlsx', 'pptx', 'epub', 'jar'];
    if (ext && zipBasedExts.includes(ext)) {
      try {
        const zip = await JSZip.loadAsync(file);
        const entries: { name: string; size: number; dir: boolean }[] = [];
        zip.forEach((relativePath, zipEntry) => {
          entries.push({ name: relativePath, size: (zipEntry as any)._data?.uncompressedSize || 0, dir: zipEntry.dir });
        });
        entries.sort((a, b) => {
          if (a.dir !== b.dir) return a.dir ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
        setZipEntries(entries);
      } catch {
        setZipEntries([]);
      }
    }
  };

  const handleDownloadFile = () => {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'apk') {
      setShowApkConfirm(true);
      return;
    }
    doDownload();
  };

  const doDownload = () => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Download started!");
  };

  const handleConvertToHtml = async () => {
    if (!file) return;
    setStatus("converting");
    setConvertProgress(0);
    setConvertMessage("AI is reading your file...");

    const totalSteps = 60; // ~1 minute (1 step per second)
    let step = 0;

    const messages = [
      { at: 0, msg: "AI is reading your file..." },
      { at: 5, msg: "Analyzing file structure..." },
      { at: 12, msg: "Identifying file type and content..." },
      { at: 20, msg: "Building HTML template..." },
      { at: 30, msg: "Embedding file content into HTML..." },
      { at: 40, msg: "Styling the HTML preview page..." },
      { at: 50, msg: "Adding download functionality..." },
      { at: 55, msg: "Finalizing HTML file..." },
    ];

    const interval = setInterval(async () => {
      step++;
      const progress = Math.min((step / totalSteps) * 100, 100);
      setConvertProgress(progress);

      const currentMsg = [...messages].reverse().find(m => step >= m.at);
      if (currentMsg) setConvertMessage(currentMsg.msg);

      if (step >= totalSteps) {
        clearInterval(interval);

        try {
          const base64 = await fileToBase64(file);
          const ext = file.name.split('.').pop()?.toLowerCase() || '';
          const htmlContent = generateHtmlFile(file.name, file.type, ext, file.size, base64);

          const blob = new Blob([htmlContent], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.name.replace(/\.[^.]+$/, '') + '.html';
          a.click();
          URL.revokeObjectURL(url);

          setConvertMessage("✅ HTML file generated and downloaded!");
          toast.success("HTML file downloaded!");
          setTimeout(() => setStatus("approved"), 2000);
        } catch {
          setConvertMessage("❌ Failed to convert file to HTML.");
          toast.error("Conversion failed");
          setTimeout(() => setStatus("approved"), 2000);
        }
      }
    }, 1000);
  };

  const fileToBase64 = (f: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
  };

  const generateHtmlFile = (name: string, mimeType: string, ext: string, size: number, dataUrl: string): string => {
    const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"];
    const videoExts = ["mp4", "webm", "ogg", "mov"];
    const audioExts = ["mp3", "wav", "ogg", "flac", "aac", "m4a"];

    let contentHtml = '';
    if (mimeType.startsWith("image/") || imageExts.includes(ext)) {
      contentHtml = `<img src="${dataUrl}" alt="${name}" style="max-width:100%;max-height:80vh;border-radius:8px;" />`;
    } else if (mimeType.startsWith("video/") || videoExts.includes(ext)) {
      contentHtml = `<video src="${dataUrl}" controls autoplay style="max-width:100%;max-height:80vh;border-radius:8px;"></video>`;
    } else if (mimeType.startsWith("audio/") || audioExts.includes(ext)) {
      contentHtml = `<div style="text-align:center;"><p style="font-size:48px;">🎵</p><p>${name}</p><audio src="${dataUrl}" controls autoplay style="width:100%;max-width:500px;"></audio></div>`;
    } else if (ext === "pdf") {
      contentHtml = `<iframe src="${dataUrl}" style="width:100%;height:80vh;border:none;border-radius:8px;"></iframe>`;
    } else {
      contentHtml = `<div style="text-align:center;padding:40px;"><p style="font-size:48px;">📄</p><p style="font-size:20px;font-weight:bold;">${name}</p><p>${formatSize(size)}</p><a href="${dataUrl}" download="${name}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#3b82f6;color:white;border-radius:8px;text-decoration:none;font-weight:bold;">Download File</a></div>`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${name} - Preview</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:system-ui,-apple-system,sans-serif;background:#0a0a0a;color:#fafafa;min-height:100vh;display:flex;flex-direction:column;}
header{padding:16px 24px;border-bottom:1px solid #222;display:flex;justify-content:space-between;align-items:center;background:#111;}
header h1{font-size:14px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
header span{font-size:12px;color:#888;}
main{flex:1;display:flex;align-items:center;justify-content:center;padding:24px;overflow:auto;}
.download-btn{display:inline-block;margin-top:16px;padding:10px 20px;background:#3b82f6;color:white;border-radius:6px;text-decoration:none;font-size:14px;}
.download-btn:hover{background:#2563eb;}
</style>
</head>
<body>
<header>
<h1>${name}</h1>
<span>${formatSize(size)}</span>
</header>
<main>
${contentHtml}
</main>
</body>
</html>`;
  };

  const handleReset = () => {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFile(null);
    setFileUrl(null);
    setStatus("idle");
    setCheckProgress(0);
    setAiMessage("");
    setIsFullscreen(false);
    setZipEntries([]);
    setConvertProgress(0);
    setConvertMessage("");
  };

  const getPreviewContent = () => {
    if (!file || !fileUrl) return null;
    const type = file.type;
    const ext = file.name.split('.').pop()?.toLowerCase();

    // Image preview
    const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"];
    if (type.startsWith("image/") || (ext && imageExts.includes(ext))) {
      return <img src={fileUrl} alt={file.name} className="max-w-full max-h-full object-contain" />;
    }
    // Video preview
    const videoExts = ["mp4", "webm", "ogg", "mov", "avi", "mkv"];
    if (type.startsWith("video/") || (ext && videoExts.includes(ext))) {
      return <video src={fileUrl} controls autoPlay className="max-w-full max-h-full" />;
    }
    // Audio preview
    const audioExts = ["mp3", "wav", "ogg", "flac", "aac", "m4a"];
    if (type.startsWith("audio/") || (ext && audioExts.includes(ext))) {
      return (
        <div className="flex flex-col items-center gap-4">
          <Music className="w-20 h-20 text-primary" />
          <p className="text-foreground font-medium">{file.name}</p>
          <audio src={fileUrl} controls autoPlay className="w-full max-w-md" />
        </div>
      );
    }
    // PDF preview
    if (type === "application/pdf" || ext === "pdf") {
      return <iframe src={fileUrl} className="w-full h-full border-0" title={file.name} />;
    }
    // HTML files - full preview with scripts allowed
    const htmlExts = ["html", "htm"];
    if (type === "text/html" || (ext && htmlExts.includes(ext))) {
      return <iframe src={fileUrl} className="w-full h-full border-0" title={file.name} sandbox="allow-scripts allow-same-origin" />;
    }
    // Text/code files
    const textExts = ["txt", "md", "json", "xml", "csv", "js", "ts", "tsx", "jsx", "css", "py", "java", "c", "cpp", "h", "yaml", "yml", "toml", "ini", "cfg", "log", "sh", "bat"];
    if (type.startsWith("text/") || type === "application/json" || type === "application/javascript" || (ext && textExts.includes(ext))) {
      return <iframe src={fileUrl} className="w-full h-full border-0 bg-background" title={file.name} />;
    }

    // ZIP-based archive preview (zip, apk, docx, xlsx, pptx, epub, jar)
    const zipBasedExts = ['zip', 'apk', 'docx', 'xlsx', 'pptx', 'epub', 'jar'];
    const zipLabels: Record<string, { icon: React.ReactNode; label: string; buttonText: string }> = {
      zip: { icon: <Archive className="w-16 h-16 text-primary" />, label: "ZIP Archive", buttonText: "Download ZIP" },
      apk: { icon: <Smartphone className="w-16 h-16 text-primary" />, label: "Android App Package", buttonText: "Download APK" },
      docx: { icon: <FileText className="w-16 h-16 text-primary" />, label: "Word Document", buttonText: "Download DOCX" },
      xlsx: { icon: <Table className="w-16 h-16 text-primary" />, label: "Excel Spreadsheet", buttonText: "Download XLSX" },
      pptx: { icon: <Presentation className="w-16 h-16 text-primary" />, label: "PowerPoint Presentation", buttonText: "Download PPTX" },
      epub: { icon: <BookOpen className="w-16 h-16 text-primary" />, label: "eBook", buttonText: "Download EPUB" },
      jar: { icon: <Package className="w-16 h-16 text-primary" />, label: "Java Archive", buttonText: "Download JAR" },
    };
    if (ext && zipBasedExts.includes(ext)) {
      const info = zipLabels[ext] || { icon: <Archive className="w-16 h-16 text-primary" />, label: ext.toUpperCase(), buttonText: `Download ${ext.toUpperCase()}` };
      return (
        <div className="flex flex-col items-center gap-4 w-full max-w-2xl p-6">
          {info.icon}
          <div className="text-center">
            <p className="text-foreground font-bold text-xl">{file.name}</p>
            <p className="text-muted-foreground mt-1">{formatSize(file.size)} — {info.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{zipEntries.filter(e => !e.dir).length} files, {zipEntries.filter(e => e.dir).length} folders inside</p>
          </div>
          <div className="w-full border border-border rounded-lg overflow-hidden bg-card max-h-[50vh] overflow-y-auto">
            <div className="grid grid-cols-[1fr_auto] gap-x-4 text-xs font-medium text-muted-foreground px-4 py-2 border-b border-border bg-muted">
              <span>Name</span>
              <span>Size</span>
            </div>
            {zipEntries.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Reading contents...
              </div>
            ) : (
              zipEntries.map((entry, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto] gap-x-4 px-4 py-1.5 text-sm border-b border-border/50 last:border-0 hover:bg-muted/50">
                  <span className="truncate text-foreground">
                    {entry.dir ? "📁 " : "📄 "}{entry.name}
                  </span>
                  <span className="text-muted-foreground text-xs whitespace-nowrap">
                    {entry.dir ? "—" : formatSize(entry.size)}
                  </span>
                </div>
              ))
            )}
          </div>
          <a href={fileUrl} download={file.name}>
            <Button className="gap-2" size="lg">
              <Download className="w-5 h-5" />
              {info.buttonText}
            </Button>
          </a>
        </div>
      );
    }

    // Executable / runnable file types with dedicated previews
    const fileTypeInfo: Record<string, { icon: React.ReactNode; label: string; description: string; buttonText: string }> = {
      // Executables & installers
      apk: { icon: <Smartphone className="w-20 h-20 text-primary" />, label: "Android App Package (.apk)", description: "Android application. Download and install on your Android device.", buttonText: "Download APK" },
      exe: { icon: <Monitor className="w-20 h-20 text-primary" />, label: "Windows Executable (.exe)", description: "Windows program. Download and run on your Windows PC.", buttonText: "Download EXE" },
      msi: { icon: <Monitor className="w-20 h-20 text-primary" />, label: "Windows Installer (.msi)", description: "Windows installer package. Download and run on your Windows PC.", buttonText: "Download MSI" },
      run: { icon: <Play className="w-20 h-20 text-primary" />, label: "Linux Executable (.run)", description: "Linux executable. Download and run with chmod +x on Linux.", buttonText: "Download RUN" },
      deb: { icon: <Package className="w-20 h-20 text-primary" />, label: "Debian Package (.deb)", description: "Linux Debian/Ubuntu package. Install with dpkg -i.", buttonText: "Download DEB" },
      rpm: { icon: <Package className="w-20 h-20 text-primary" />, label: "RPM Package (.rpm)", description: "Linux RPM package. Install with rpm -i or dnf.", buttonText: "Download RPM" },
      dmg: { icon: <Monitor className="w-20 h-20 text-primary" />, label: "macOS Disk Image (.dmg)", description: "macOS application image. Download and open on your Mac.", buttonText: "Download DMG" },
      app: { icon: <Monitor className="w-20 h-20 text-primary" />, label: "macOS Application (.app)", description: "macOS application. Download and run on your Mac.", buttonText: "Download APP" },
      rar: { icon: <Archive className="w-20 h-20 text-primary" />, label: "RAR Archive (.rar)", description: "Compressed archive. Download and extract with WinRAR or 7-Zip.", buttonText: "Download RAR" },
      "7z": { icon: <Archive className="w-20 h-20 text-primary" />, label: "7-Zip Archive (.7z)", description: "Compressed archive. Download and extract with 7-Zip.", buttonText: "Download 7Z" },
      tar: { icon: <Archive className="w-20 h-20 text-primary" />, label: "TAR Archive (.tar)", description: "Tape archive. Download and extract on your device.", buttonText: "Download TAR" },
      gz: { icon: <Archive className="w-20 h-20 text-primary" />, label: "GZip Archive (.gz)", description: "GZip compressed file. Download and extract on your device.", buttonText: "Download GZ" },
      iso: { icon: <HardDrive className="w-20 h-20 text-primary" />, label: "Disc Image (.iso)", description: "Disc image file. Mount or burn to a disc.", buttonText: "Download ISO" },
      doc: { icon: <FileText className="w-20 h-20 text-primary" />, label: "Word Document (.doc)", description: "Microsoft Word document. Download and open with Word.", buttonText: "Download DOC" },
      xls: { icon: <Table className="w-20 h-20 text-primary" />, label: "Excel Spreadsheet (.xls)", description: "Microsoft Excel spreadsheet. Download and open with Excel.", buttonText: "Download XLS" },
      ppt: { icon: <Presentation className="w-20 h-20 text-primary" />, label: "PowerPoint (.ppt)", description: "Microsoft PowerPoint presentation. Download and open.", buttonText: "Download PPT" },
    };

    const info = ext ? fileTypeInfo[ext] : null;

    if (info) {
      return (
        <div className="flex flex-col items-center gap-6 text-center p-8">
          {info.icon}
          <div>
            <p className="text-foreground font-bold text-xl">{file.name}</p>
            <p className="text-muted-foreground mt-1">{formatSize(file.size)}</p>
            <p className="text-sm text-muted-foreground mt-2">{info.label}</p>
          </div>
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 max-w-md">
            <p className="text-sm text-foreground">{info.description}</p>
          </div>
          <a href={fileUrl} download={file.name}>
            <Button className="gap-2" size="lg">
              <Download className="w-5 h-5" />
              {info.buttonText}
            </Button>
          </a>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-6 text-center p-8">
        <HardDrive className="w-20 h-20 text-muted-foreground" />
        <div>
          <p className="text-foreground font-bold text-xl">{file.name}</p>
          <p className="text-muted-foreground mt-1">{formatSize(file.size)}</p>
          {ext && <p className="text-sm text-muted-foreground mt-2">.{ext} file</p>}
        </div>
        <a href={fileUrl} download={file.name}>
          <Button className="gap-2" size="lg">
            <Download className="w-5 h-5" />
            Download File
          </Button>
        </a>
      </div>
    );
  };

  // Fullscreen preview
  if (isFullscreen && status === "previewing") {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
          <span className="text-sm font-medium text-foreground truncate">{file?.name}</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(false)}>
              Exit Fullscreen
            </Button>
            <Button variant="ghost" size="icon" onClick={handleReset}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center overflow-auto p-4">
          {getPreviewContent()}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Play Files</h1>
          <Button variant="outline" size="sm" onClick={() => navigate("/")}>
            ← Back
          </Button>
        </div>

        <p className="text-muted-foreground">
          Upload a file (max 1GB / 1000MB). The AI will verify the file size before running.
        </p>

        {/* Upload area */}
        {status === "idle" && (
          <Card
            className="border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer p-12"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <Upload className="w-12 h-12" />
              <div className="text-center">
                <p className="text-foreground font-medium text-lg">Drop your file here or click to browse</p>
                <p className="text-sm mt-1">Maximum file size: 1GB (1000MB)</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
              }}
            />
          </Card>
        )}

        {/* AI Checking */}
        {status !== "idle" && file && (
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <FileIcon className="w-8 h-8 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground truncate">{file.name}</p>
                <p className="text-sm text-muted-foreground">{formatSize(file.size)}</p>
              </div>
              {status !== "previewing" && (
                <Button variant="ghost" size="icon" onClick={handleReset}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Progress */}
            {status === "checking" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">AI analyzing...</span>
                </div>
                <Progress value={checkProgress} className="h-2" />
              </div>
            )}

            {/* AI Message */}
            {aiMessage && (
              <div
                className={`p-4 rounded-lg text-sm ${
                  status === "rejected"
                    ? "bg-destructive/10 text-destructive border border-destructive/20"
                    : status === "approved"
                    ? "bg-primary/10 text-foreground border border-primary/20"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <div className="flex items-start gap-2">
                  {status === "rejected" && <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
                  {status === "approved" && <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                  {status === "checking" && <Loader2 className="w-4 h-4 mt-0.5 shrink-0 animate-spin" />}
                  <p>{aiMessage}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            {status === "approved" && (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Button className="flex-1 gap-2" onClick={handleRunPreview}>
                    <Maximize className="w-4 h-4" />
                    Preview
                  </Button>
                  <Button variant="outline" className="flex-1 gap-2" onClick={handleDownloadFile}>
                    <Download className="w-4 h-4" />
                    Download File
                  </Button>
                </div>
                {file.name.split('.').pop()?.toLowerCase() === 'apk' && (
                  <Button variant="default" className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white" onClick={() => setShowApkConfirm(true)}>
                    <Smartphone className="w-4 h-4" />
                    Download APK
                  </Button>
                )}
                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1 gap-2" onClick={handleConvertToHtml}>
                    <Code className="w-4 h-4" />
                    Download as HTML
                  </Button>
                  <Button variant="ghost" onClick={handleReset}>
                    Upload Another
                  </Button>
                </div>
              </div>
            )}

            {/* Converting to HTML */}
            {status === "converting" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Converting to HTML...</span>
                </div>
                <Progress value={convertProgress} className="h-2" />
                <div className="p-4 rounded-lg text-sm bg-muted text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <Loader2 className="w-4 h-4 mt-0.5 shrink-0 animate-spin" />
                    <p>{convertMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {status === "rejected" && (
              <Button variant="outline" onClick={handleReset} className="w-full">
                Try Another File
              </Button>
            )}

            {/* Inline preview (non-fullscreen) */}
            {status === "previewing" && !isFullscreen && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button size="sm" className="gap-2" onClick={() => setIsFullscreen(true)}>
                    <Maximize className="w-4 h-4" />
                    Fullscreen
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleReset}>
                    Close
                  </Button>
                </div>
                <div className="border border-border rounded-lg overflow-hidden h-[400px] flex items-center justify-center bg-muted">
                  {getPreviewContent()}
                </div>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* APK Download Confirmation Dialog */}
      <AlertDialog open={showApkConfirm} onOpenChange={setShowApkConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Download APK
            </AlertDialogTitle>
            <AlertDialogDescription>
              Do you really want to download this app?
              <br />
              <span className="font-semibold text-foreground mt-2 block">{file?.name}</span>
              <span className="text-xs text-muted-foreground">{file ? formatSize(file.size) : ''}</span>
              <br />
              <span className="text-xs mt-2 block">
                APK files are Android applications. Only install apps from sources you trust.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowApkConfirm(false); doDownload(); }}>
              Confirm Download
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PlayFiles;
