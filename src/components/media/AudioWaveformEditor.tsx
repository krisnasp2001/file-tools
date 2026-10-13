"use client";

import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, AlertTriangle } from "lucide-react";

interface AudioWaveformEditorProps {
  file: File;
  startTime: number;
  endTime: number;
  onStartTimeChange: (time: number) => void;
  onEndTimeChange: (time: number) => void;
  onDurationChange: (duration: number) => void;
  disabled?: boolean;
}

export function AudioWaveformEditor({
  file,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  onDurationChange,
  disabled
}: AudioWaveformEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  
  const [peaks, setPeaks] = useState<number[]>([]);
  const [duration, setDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isDecoding, setIsDecoding] = useState(false);
  const [decodeError, setDecodeError] = useState<string | null>(null);

  // Load audio data and generate peaks
  useEffect(() => {
    let active = true;
    const url = URL.createObjectURL(file);

    const loadAudio = async () => {
      setAudioUrl(url);
      setIsDecoding(true);
      setDecodeError(null);
      try {
        const arrayBuffer = await file.arrayBuffer();
        if (!active) return;
        
        // @ts-expect-error - webkitAudioContext is not in standard window type
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        if (!active) return;
        
        const channelData = audioBuffer.getChannelData(0);
        const length = channelData.length;
        const totalDuration = audioBuffer.duration;
        
        // Generate peaks for visualizer
        const numPeaks = 500;
        const blockSize = Math.floor(length / numPeaks);
        const newPeaks = [];
        
        for (let i = 0; i < numPeaks; i++) {
          const start = i * blockSize;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channelData[start + j] || 0);
          }
          newPeaks.push(sum / blockSize);
        }
        
        // Normalize peaks
        const maxPeak = Math.max(...newPeaks);
        const normalizedPeaks = newPeaks.map(p => (maxPeak > 0 ? p / maxPeak : 0));
        
        setPeaks(normalizedPeaks);
        setDuration(totalDuration);
        onDurationChange(totalDuration);
        if (endTime === 0 || endTime > totalDuration) {
          onEndTimeChange(totalDuration);
        }
      } catch (err) {
        console.error("Audio decoding error:", err);
        setDecodeError("Failed to decode audio for waveform display.");
      } finally {
        setIsDecoding(false);
      }
    };

    loadAudio();

    return () => {
      active = false;
      URL.revokeObjectURL(url);
    };
  }, [file, endTime, onDurationChange, onEndTimeChange]);

  // Handle Playback sync
  useEffect(() => {
    let animationFrameId: number;
    const updatePlayhead = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
        // loop logic
        if (audioRef.current.currentTime >= endTime) {
          audioRef.current.pause();
          audioRef.current.currentTime = startTime;
          setCurrentTime(startTime);
          setIsPlaying(false);
        }
      }
      if (isPlaying) {
        animationFrameId = requestAnimationFrame(updatePlayhead);
      }
    };

    if (isPlaying) {
      animationFrameId = requestAnimationFrame(updatePlayhead);
    }
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, startTime, endTime]);

  const togglePlay = () => {
    if (disabled) return;
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        if (audioRef.current.currentTime < startTime || audioRef.current.currentTime >= endTime) {
           audioRef.current.currentTime = startTime;
        }
        audioRef.current.play();
      }
    }
  };

  // Draw Waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || peaks.length === 0 || duration === 0) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Support high DPI displays
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const barWidth = width / peaks.length;
    
    // Time to x-coord mapping
    const timeToX = (t: number) => (t / duration) * width;
    const startX = timeToX(startTime);
    const endX = timeToX(endTime);
    
    peaks.forEach((peak, i) => {
      const x = i * barWidth;
      const barHeight = peak * height * 0.9;
      const y = (height - barHeight) / 2;
      
      const inSelection = x >= startX && x <= endX;
      
      ctx.fillStyle = inSelection ? "rgb(99, 102, 241)" : "rgba(99, 102, 241, 0.2)";
      ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight);
    });
    
  }, [peaks, startTime, endTime, duration]);

  // Handle Dragging
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || duration === 0 || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickedTime = (x / rect.width) * duration;
    
    if (audioRef.current) {
       audioRef.current.currentTime = clickedTime;
       setCurrentTime(clickedTime);
    }
  };

  const handleDragStart = (type: "start" | "end") => (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || duration === 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const initialTime = type === "start" ? startTime : endTime;
    
    const onPointerMove = (moveEvent: PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = moveEvent.clientX - startX;
      const deltaTime = (deltaX / rect.width) * duration;
      
      let newTime = initialTime + deltaTime;
      newTime = Math.max(0, Math.min(newTime, duration));
      
      if (type === "start") {
        newTime = Math.min(newTime, endTime - 0.1); // Keep at least 0.1s gap
        onStartTimeChange(newTime);
      } else {
        newTime = Math.max(newTime, startTime + 0.1);
        onEndTimeChange(newTime);
      }
    };
    
    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
    
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}

      {/* Editor Main Area */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-inner flex flex-col relative">
        {isDecoding && (
          <div className="absolute inset-0 z-20 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
             <span className="text-sm font-medium text-slate-300 animate-pulse">Analyzing audio waveform...</span>
          </div>
        )}
        
        {decodeError && (
          <div className="absolute inset-0 z-20 bg-slate-900/90 backdrop-blur flex items-center justify-center p-4">
             <div className="text-sm text-red-400 flex items-center gap-2">
               <AlertTriangle className="w-5 h-5" />
               {decodeError}
             </div>
          </div>
        )}
        
        {/* Toolbar */}
        <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-900/50">
          <button
            type="button"
            onClick={togglePlay}
            disabled={disabled || isDecoding || duration === 0}
            className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
          </button>
          <div className="font-mono text-sm text-slate-300 tabular-nums">
             {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
        
        {/* Waveform Container */}
        <div 
          className="relative w-full h-32 select-none group cursor-pointer"
          ref={containerRef}
          onPointerDown={handleTimelineClick}
        >
          <canvas 
            ref={canvasRef} 
            className="absolute inset-0 w-full h-full pointer-events-none" 
          />
          
          {/* Dimmed areas */}
          {duration > 0 && (
             <>
               <div 
                 className="absolute inset-y-0 left-0 bg-slate-950/60 pointer-events-none"
                 style={{ width: `${(startTime / duration) * 100}%` }}
               />
               <div 
                 className="absolute inset-y-0 right-0 bg-slate-950/60 pointer-events-none"
                 style={{ left: `${(endTime / duration) * 100}%` }}
               />
             </>
          )}
          
          {/* Playhead */}
          {duration > 0 && (
            <div 
              className="absolute inset-y-0 w-px bg-rose-500 shadow-[0_0_8px_rgba(225,29,72,0.8)] pointer-events-none z-10"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            >
               <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 border-[5px] border-transparent border-t-rose-500" />
            </div>
          )}
          
          {/* Selection Handles */}
          {duration > 0 && (
            <>
              {/* Start Handle */}
              <div 
                className="absolute inset-y-0 w-0 z-10"
                style={{ left: `${(startTime / duration) * 100}%` }}
              >
                <div 
                  className="absolute inset-y-0 -left-2 w-4 cursor-ew-resize flex items-center justify-center group-hover:bg-indigo-500/10 transition-colors"
                  onPointerDown={handleDragStart("start")}
                >
                   <div className="w-1 h-8 bg-white rounded-full shadow" />
                </div>
              </div>
              
              {/* End Handle */}
              <div 
                className="absolute inset-y-0 w-0 z-10"
                style={{ left: `${(endTime / duration) * 100}%` }}
              >
                <div 
                  className="absolute inset-y-0 -left-2 w-4 cursor-ew-resize flex items-center justify-center group-hover:bg-indigo-500/10 transition-colors"
                  onPointerDown={handleDragStart("end")}
                >
                   <div className="w-1 h-8 bg-white rounded-full shadow" />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
