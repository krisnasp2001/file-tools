"use client";

import * as React from "react";
import { ToolPageLayout } from "@/components/tools/ToolPageLayout";
import { FileDropzone } from "@/components/file-upload/FileDropzone";
import { Button } from "@/components/ui/Button";
import { SelectedFileItem } from "@/lib/file/types";
import { downloadBlob } from "@/lib/download/download";
import { formatFileSize } from "@/lib/file/validation";
import { extractAudioFromVideo } from "@/lib/media/ffmpeg";
import {
  Loader2,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileAudio,
  ArrowRight
} from "lucide-react";

export function VideoToAudioPage() {
  const [files, setFiles] = React.useState<SelectedFileItem[]>([]);
  const [isConverting, setIsConverting] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{
    data: Blob;
    outputFileName: string;
  } | null>(null);

  const readyFiles = files.filter(f => f.status === "ready");
  const currentFile = readyFiles[0]?.file;

  const handleConvert = async () => {
    if (!currentFile) return;
    setIsConverting(true);
    setError(null);
    setProgress(0);
    
    try {
      const blob = await extractAudioFromVideo(currentFile, (p) => {
        setProgress(Math.round(p));
      });
      
      const outputFileName = currentFile.name.replace(/\.[^/.]+$/, "") + ".mp3";
      
      setResult({
        data: blob,
        outputFileName
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Media conversion failed.";
      setError(msg);
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    downloadBlob(result.data, result.outputFileName);
  };

  const handleReset = () => {
    setFiles([]);
    setResult(null);
    setError(null);
    setProgress(0);
  };

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Audio & Video", href: "/categories/audio-video" },
    { label: "Extract Audio from Video", href: "/tools/video-to-audio" },
  ];

  return (
    <ToolPageLayout
      breadcrumbs={breadcrumbs}
      title="Extract Audio from Video"
      description="Extract clean audio tracks from video files directly in your browser. Supports MP4, WebM, and more."
      badge="Client-Side WASM"
      workspace={
        <div className="max-w-4xl mx-auto space-y-6">
          {!result && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur">
              <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <FileAudio className="w-5 h-5 text-indigo-400" />
                Upload Video File
              </h2>
              <FileDropzone
                value={files}
                onChange={setFiles}
                accept={["video/*", ".mp4", ".webm", ".mov", ".avi", ".mkv"]}
                multiple={false}
                maxSize={500 * 1024 * 1024}
              />

              <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-start gap-2.5 text-xs text-indigo-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Processing happens locally in your browser using FFmpeg WebAssembly. 
                  Large files may take some time depending on your device&apos;s performance.
                  First load might take a moment to download the WebAssembly core.
                </span>
              </div>

              {currentFile && (
                <div className="mt-6 flex flex-col items-end gap-3">
                  {isConverting && progress > 0 && (
                    <div className="w-full flex items-center gap-3 text-sm text-slate-400">
                      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 transition-all duration-300" 
                          style={{ width: `${progress}%` }} 
                        />
                      </div>
                      <span className="w-12 text-right">{progress}%</span>
                    </div>
                  )}
                  
                  <Button
                    onClick={handleConvert}
                    disabled={isConverting}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 font-medium px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/25"
                  >
                    {isConverting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Extract Audio (MP3)
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3 text-sm text-red-300">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
              <div>
                <p className="font-semibold">Processing Error</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {result && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-100">{result.outputFileName}</h3>
                    <p className="text-xs text-slate-400">
                      Ready to download &bull; {formatFileSize(result.data.size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="border-slate-700 hover:bg-slate-800 text-slate-300 gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Process Another
                  </Button>
                  <Button
                    onClick={handleDownload}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-medium px-5 shadow-lg shadow-emerald-600/25"
                  >
                    <Download className="w-4 h-4" />
                    Download MP3
                  </Button>
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-800">
                <audio 
                  controls 
                  src={URL.createObjectURL(result.data)} 
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>
      }
    />
  );
}
