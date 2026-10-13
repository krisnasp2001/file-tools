"use client";

import * as React from "react";
import { ToolPageLayout } from "@/components/tools/ToolPageLayout";
import { FileDropzone } from "@/components/file-upload/FileDropzone";
import { Button } from "@/components/ui/Button";
import { SelectedFileItem } from "@/lib/file/types";
import { downloadBlob } from "@/lib/download/download";
import { formatFileSize } from "@/lib/file/validation";
import { trimAudio } from "@/lib/media/ffmpeg";
import {
  Loader2,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Scissors,
  ArrowRight
} from "lucide-react";
import { AudioWaveformEditor } from "@/components/media/AudioWaveformEditor";
export function AudioTrimmerPage({ hideHeader }: { hideHeader?: boolean }) {
  const [files, setFiles] = React.useState<SelectedFileItem[]>([]);
  const [startTime, setStartTime] = React.useState<number>(0);
  const [endTime, setEndTime] = React.useState<number>(0);
  const [audioDuration, setAudioDuration] = React.useState<number>(0);
  
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
    if (startTime < 0 || endTime > audioDuration || startTime >= endTime) {
      setError("Invalid time range selected.");
      return;
    }
    
    setIsConverting(true);
    setError(null);
    setProgress(0);
    
    try {
      const blob = await trimAudio(currentFile, startTime, endTime, (p) => {
        setProgress(Math.round(p));
      });
      
      const ext = currentFile.name.split(".").pop()?.toLowerCase();
      const targetExt = ["mp3", "wav", "aac", "ogg", "flac"].includes(ext || "") ? ext : "mp3";
      const outputFileName = currentFile.name.replace(/\.[^/.]+$/, "") + "_trimmed." + targetExt;
      
      setResult({
        data: blob,
        outputFileName
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Media processing failed.";
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
    setStartTime(0);
    setEndTime(0);
    setAudioDuration(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Audio & Video", href: "/categories/audio-video" },
    { label: "Audio Trimmer", href: "/tools/audio-trimmer" },
  ];

  return (
    <ToolPageLayout hideHeader={hideHeader}
      breadcrumbs={breadcrumbs}
      title="Audio Trimmer"
      description="Cut and trim your audio files locally. Set start and end times to extract the exact portion you need."
      badge="Client-Side WASM"
      workspace={
        <div className="max-w-4xl mx-auto space-y-6">
          {!result && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur">
              <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <Scissors className="w-5 h-5 text-indigo-400" />
                Upload Audio File
              </h2>
              
              {!currentFile ? (
                <FileDropzone
                  value={files}
                  onChange={setFiles}
                  accept={["audio/*", ".mp3", ".wav", ".aac", ".ogg", ".flac", ".m4a"]}
                  multiple={false}
                  maxSize={200 * 1024 * 1024}
                />
              ) : (
                <div className="space-y-6">
                  <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-200 truncate pr-4">{currentFile.name}</span>
                      <Button variant="outline" size="sm" onClick={handleReset} className="text-xs h-7 shrink-0">Change File</Button>
                    </div>
                    
                    <AudioWaveformEditor
                      file={currentFile}
                      startTime={startTime}
                      endTime={endTime}
                      onStartTimeChange={setStartTime}
                      onEndTimeChange={setEndTime}
                      onDurationChange={setAudioDuration}
                      disabled={isConverting}
                    />
                  </div>

                  {audioDuration > 0 && (
                    <div className="space-y-4 pt-4 border-t border-slate-800">
                      <h3 className="text-sm font-medium text-slate-300">Precise Trim Settings</h3>
                      
                      <div className="flex flex-col sm:flex-row gap-6">
                        <div className="flex-1 space-y-2">
                          <label className="text-xs text-slate-400">Start Time (seconds)</label>
                          <input 
                            type="number" 
                            min={0}
                            max={endTime - 0.1}
                            step={0.1}
                            value={Number(startTime.toFixed(2))}
                            onChange={(e) => {
                               const val = Number(e.target.value);
                               if (val >= 0 && val < endTime) setStartTime(val);
                            }}
                            disabled={isConverting}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <label className="text-xs text-slate-400">End Time (seconds)</label>
                          <input 
                            type="number" 
                            min={startTime + 0.1}
                            max={audioDuration}
                            step={0.1}
                            value={Number(endTime.toFixed(2))}
                            onChange={(e) => {
                               const val = Number(e.target.value);
                               if (val > startTime && val <= audioDuration) setEndTime(val);
                            }}
                            disabled={isConverting}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-between text-xs text-slate-400 pt-1">
                        <span>Total Duration: {formatTime(audioDuration)}</span>
                        <span>Selection: {formatTime(Math.max(0, endTime - startTime))}</span>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-start gap-2.5 text-xs text-indigo-300">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Processing happens locally in your browser using FFmpeg WebAssembly. 
                      Large files may take some time depending on your device&apos;s performance.
                    </span>
                  </div>

                  <div className="mt-6 flex flex-col md:flex-row items-end md:items-center justify-between gap-4 pt-6 border-t border-slate-800">
                    <div className="w-full md:w-auto" />
                    <div className="w-full md:w-1/2 flex flex-col items-end gap-3 mt-4 md:mt-0">
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
                        disabled={isConverting || audioDuration === 0}
                        className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white gap-2 font-medium px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/25"
                      >
                        {isConverting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            Trim Audio
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
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
                    Trim Another
                  </Button>
                  <Button
                    onClick={handleDownload}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-medium px-5 shadow-lg shadow-emerald-600/25"
                  >
                    <Download className="w-4 h-4" />
                    Download File
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
