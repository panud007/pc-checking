import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, Activity, MousePointer, Info, Zap } from 'lucide-react';

export default function MouseTest({ onBack, onNext, isSequential }) {
  const [mouseButtons, setMouseButtons] = useState({
    left: false,
    right: false,
    middle: false,
    side1: false, // Back
    side2: false  // Forward
  });
  const [clickedHistory, setClickedHistory] = useState({
    left: false,
    right: false,
    middle: false,
    side1: false,
    side2: false
  });
  
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [scrollDelta, setScrollDelta] = useState(0);
  const [scrollDirection, setScrollDirection] = useState(null); // 'up' | 'down' | null
  const [lastClicks, setLastClicks] = useState([]); // Double-click chatter speeds
  const [pollingRate, setPollingRate] = useState(0); // Mouse polling frequency in Hz
  
  const canvasRef = useRef(null);
  const [drawingButton, setDrawingButton] = useState(null); // 'left' | 'right' | null
  const scrollTimeoutRef = useRef(null);
  const eventTimesRef = useRef([]); // To calculate polling rate

  // Drawing Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      clearCanvas();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const startDrawing = (e) => {
    if (e.button !== 0 && e.button !== 2) return;
    const buttonType = e.button === 0 ? 'left' : 'right';
    setDrawingButton(buttonType);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    // Custom neon brush properties
    ctx.lineWidth = 4;
    ctx.shadowBlur = 12;
    if (buttonType === 'left') {
      ctx.strokeStyle = '#10b981'; // emerald-500
      ctx.shadowColor = 'rgba(16, 185, 129, 0.6)';
    } else {
      ctx.strokeStyle = '#3b82f6'; // blue-500
      ctx.shadowColor = 'rgba(59, 130, 246, 0.6)';
    }
    
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e) => {
    if (!drawingButton) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    const isLeftPressed = (e.buttons & 1) === 1;
    const isRightPressed = (e.buttons & 2) === 2;
    
    if ((drawingButton === 'left' && !isLeftPressed) || (drawingButton === 'right' && !isRightPressed)) {
      stopDrawing();
      return;
    }

    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setDrawingButton(null);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw subtle tech radar grid lines
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.12)';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0; // Disable shadows for grid lines
    const gridSize = 40;
    
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Add visual crosshairs in center
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.15)';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 80, 0, Math.PI * 2);
    ctx.stroke();
  };

  // Mouse move and button handlers
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({
      x: Math.round(e.clientX - rect.left),
      y: Math.round(e.clientY - rect.top)
    });

    // Estimate Mouse Polling Rate (Hz)
    const now = performance.now();
    eventTimesRef.current.push(now);
    
    // Keep events from the last 1000ms
    const oneSecAgo = now - 1000;
    eventTimesRef.current = eventTimesRef.current.filter(t => t > oneSecAgo);
    setPollingRate(eventTimesRef.current.length);
  };

  // Global listeners
  useEffect(() => {
    const handleGlobalMouseDown = (e) => {
      // e.button: 0=Left, 1=Middle, 2=Right, 3=Back, 4=Forward
      const updated = {};
      
      if (e.button === 0) {
        updated.left = true;
        setClickedHistory(p => ({ ...p, left: true }));
        
        // Chatter check
        const now = performance.now();
        setLastClicks((prev) => {
          const clicks = [...prev];
          if (clicks.length > 0) {
            const delay = now - clicks[clicks.length - 1].time;
            clicks.push({
              time: now,
              delay: Math.round(delay),
              isChatter: delay < 80 // Potential chatter under 80ms
            });
          } else {
            clicks.push({ time: now, delay: null, isChatter: false });
          }
          return clicks.slice(-8); // Keep last 8 clicks
        });
      } else if (e.button === 1) {
        updated.middle = true;
        setClickedHistory(p => ({ ...p, middle: true }));
      } else if (e.button === 2) {
        updated.right = true;
        setClickedHistory(p => ({ ...p, right: true }));
      } else if (e.button === 3) {
        e.preventDefault(); // Stop back navigation
        updated.side1 = true;
        setClickedHistory(p => ({ ...p, side1: true }));
      } else if (e.button === 4) {
        e.preventDefault(); // Stop forward navigation
        updated.side2 = true;
        setClickedHistory(p => ({ ...p, side2: true }));
      }
      
      setMouseButtons((prev) => ({ ...prev, ...updated }));
    };

    const handleGlobalMouseUp = (e) => {
      const updated = {};
      if (e.button === 0) updated.left = false;
      if (e.button === 1) updated.middle = false;
      if (e.button === 2) updated.right = false;
      if (e.button === 3) updated.side1 = false;
      if (e.button === 4) updated.side2 = false;
      
      setMouseButtons((prev) => ({ ...prev, ...updated }));
    };

    const handleGlobalWheel = (e) => {
      setScrollDelta((prev) => prev + Math.round(e.deltaY));
      setScrollDirection(e.deltaY < 0 ? 'up' : 'down');
      
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setScrollDirection(null);
      }, 150);
    };

    const preventContextMenu = (e) => e.preventDefault();

    window.addEventListener('mousedown', handleGlobalMouseDown);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('wheel', handleGlobalWheel);
    window.addEventListener('contextmenu', preventContextMenu);

    return () => {
      window.removeEventListener('mousedown', handleGlobalMouseDown);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('wheel', handleGlobalWheel);
      window.removeEventListener('contextmenu', preventContextMenu);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  const resetAll = () => {
    setScrollDelta(0);
    setLastClicks([]);
    setMouseButtons({ left: false, right: false, middle: false, side1: false, side2: false });
    setClickedHistory({ left: false, right: false, middle: false, side1: false, side2: false });
    clearCanvas();
  };

  return (
    <div className="w-full flex-1 flex flex-col bg-zinc-950 p-4 md:p-6 relative overflow-hidden font-sans">

      {/* Top Navbar */}
      <div className="glass-panel px-6 py-4.5 rounded-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 z-10">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2.5 font-display">
            <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
            Sensor & Tombol Mouse
          </h2>
          <p className="text-[11px] text-zinc-400 mt-0.5">Uji switch tombol, polling rate Hz, dan presisi sensor optik</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={resetAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/10 text-red-400 border border-red-900/20 hover:bg-red-950/30 text-xs font-semibold transition-all"
          >
            <RotateCcw size={13} />
            Reset Data
          </button>

          <button 
            onClick={() => {
              onBack({
                leftClicked: clickedHistory.left,
                rightClicked: clickedHistory.right,
                middleClicked: clickedHistory.middle,
                scrollTested: scrollDelta !== 0,
                chatterAlert: lastClicks.some(c => c.isChatter)
              });
            }}
            className="px-3.5 py-1.5 rounded-lg bg-zinc-900 text-zinc-200 border border-zinc-800 hover:bg-zinc-800 text-xs font-semibold transition-all"
          >
            Dashboard
          </button>

          {isSequential && (
            <button 
              onClick={() => {
                onNext({
                  leftClicked: clickedHistory.left,
                  rightClicked: clickedHistory.right,
                  middleClicked: clickedHistory.middle,
                  scrollTested: scrollDelta !== 0,
                  chatterAlert: lastClicks.some(c => c.isChatter)
                });
              }}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-500 text-xs transition-all shadow-md"
            >
              Lanjut: Audio Test
            </button>
          )}
        </div>
      </div>

      {/* Main Grid Workspace */}
      <div className="flex-1 grid grid-cols-12 gap-6 select-none z-10 items-stretch">
        
        {/* Left Diagnostics Console (4 columns) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-5 justify-between">
          
          {/* Interactive Mouse Graphic */}
          <div className="glass-panel rounded-2xl p-5 flex flex-col items-center justify-center relative overflow-hidden h-[340px]">
            <span className="absolute top-3.5 left-4 text-[9px] font-mono text-zinc-500 uppercase tracking-widest font-bold">Gaming Wireframe Schematic</span>
            
            {/* The SVG Mouse Schematic */}
            <svg width="150" height="230" viewBox="0 0 100 150" className="drop-shadow-lg">
              {/* Outer mouse frame */}
              <rect x="2" y="2" width="96" height="146" rx="30" fill="#09090b" stroke="#27272a" strokeWidth="2.5" />
              
              {/* Palm Glow LED Area */}
              <circle cx="50" cy="120" r="12" fill={mouseButtons.left || mouseButtons.right || mouseButtons.middle ? "#6366f1" : "#1e293b"} className="transition-colors duration-200" opacity="0.35" filter="blur(4px)" />
              <path d="M 40 120 Q 50 115 60 120 Q 50 125 40 120" fill="none" stroke={mouseButtons.left || mouseButtons.right || mouseButtons.middle ? "#6366f1" : "#27272a"} strokeWidth="1.5" className="transition-colors duration-200" />

              {/* Left Mouse Button (LMB) */}
              <path 
                d="M 50 45 L 8 45 C 8 20, 25 8, 50 8 Z" 
                fill={mouseButtons.left ? "rgba(16,185,129,0.2)" : "transparent"} 
                stroke={mouseButtons.left ? "#10b981" : "#27272a"} 
                strokeWidth="2"
                className="transition-all duration-75 cursor-pointer"
              />
              
              {/* Right Mouse Button (RMB) */}
              <path 
                d="M 50 45 L 92 45 C 92 20, 75 8, 50 8 Z" 
                fill={mouseButtons.right ? "rgba(59,130,246,0.2)" : "transparent"} 
                stroke={mouseButtons.right ? "#3b82f6" : "#27272a"} 
                strokeWidth="2"
                className="transition-all duration-75 cursor-pointer"
              />
              
              {/* Scroll Wheel (MMB) */}
              <rect 
                x="46" 
                y="18" 
                width="8" 
                height="18" 
                rx="4" 
                fill={mouseButtons.middle ? "#f59e0b" : "#1e293b"} 
                stroke={scrollDirection ? "#10b981" : mouseButtons.middle ? "#fbbf24" : "#27272a"} 
                strokeWidth="1.5" 
                className="transition-all duration-75"
              />

              {/* Side button 1 (Back / Lower) */}
              <path 
                d="M 2 60 L 2 74 C 2 76, 4 76, 4 74 L 4 60 C 4 58, 2 58, 2 60 Z" 
                fill={mouseButtons.side1 ? "#6366f1" : "#27272a"} 
                stroke={mouseButtons.side1 ? "#818cf8" : "#3f3f46"}
                strokeWidth="1"
              />

              {/* Side button 2 (Forward / Upper) */}
              <path 
                d="M 2 82 L 2 96 C 2 98, 4 98, 4 96 L 4 82 C 4 80, 2 80, 2 82 Z" 
                fill={mouseButtons.side2 ? "#6366f1" : "#27272a"} 
                stroke={mouseButtons.side2 ? "#818cf8" : "#3f3f46"}
                strokeWidth="1"
              />

              {/* Central Divider seam */}
              <line x1="50" y1="45" x2="50" y2="90" stroke="#27272a" strokeWidth="1.5" />
            </svg>

            {/* Scroll Indicator Badge */}
            <div className="mt-4 flex gap-4 text-[11px] font-mono bg-zinc-950 border border-zinc-800 px-3.5 py-1.5 rounded-lg">
              <span className="text-zinc-400">Scroll: <span className="text-indigo-400 font-bold">{scrollDelta}</span></span>
              <span className="text-zinc-400">Arah: 
                <span className={`ml-1 font-bold ${scrollDirection ? 'text-emerald-400' : 'text-zinc-650'}`}>
                  {scrollDirection === 'up' ? 'SCROLL UP' : scrollDirection === 'down' ? 'SCROLL DOWN' : 'DIAM'}
                </span>
              </span>
            </div>
          </div>

          {/* Double Click Delay / Chatter Monitor */}
          <div className="glass-panel rounded-2xl p-5 flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold font-mono tracking-widest text-zinc-200 uppercase mb-2 flex items-center gap-1.5">
                <Activity size={14} className="text-rose-500" />
                Bounce / Chatter Speed Monitor
              </h3>
              
              <p className="text-[10px] text-zinc-400 leading-relaxed mb-3">
                Switch klik mouse normal memiliki jeda kontak fisik &gt;80ms. Cacat kontak pegas (chatter) biasanya memicu klik ganda cepat di bawah 80ms.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-[11px] font-mono space-y-1 h-[120px]">
              {lastClicks.length === 0 ? (
                <div className="h-full flex items-center justify-center text-zinc-600 italic">
                  Lakukan klik LMB untuk mengukur delay...
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {[...lastClicks].reverse().map((click, idx) => (
                    <div key={idx} className="flex justify-between items-center py-0.5 border-b border-zinc-900 last:border-b-0">
                      <span className="text-zinc-550">Klik #{lastClicks.length - idx}</span>
                      {click.delay === null ? (
                        <span className="text-zinc-600 italic">Klik Awal</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${click.isChatter ? 'text-rose-500' : 'text-emerald-400'}`}>
                            {click.delay} ms
                          </span>
                          {click.isChatter && (
                            <span className="bg-rose-500/10 text-rose-400 text-[8px] font-bold px-1.5 py-0.5 rounded border border-rose-500/20">
                              CHATTER ALERT
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Tracking Canvas & Coord Viewer (8 columns) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
          
          {/* Tracking Coordinates & Polling Rate Bar */}
          <div className="glass-panel rounded-2xl p-4.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 text-xs font-mono">
            <div className="flex items-center gap-2 text-zinc-400">
              <MousePointer size={14} className="text-indigo-400" />
              <span>Koordinat Kursor:</span>
              <span className="text-indigo-400 font-bold">X: {coords.x}px, Y: {coords.y}px</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-zinc-950 px-3 py-1 rounded-lg border border-zinc-800">
                <Zap size={12} className="text-amber-500" />
                <span className="text-zinc-450 font-semibold text-[10px]">POLLING RATE:</span>
                <span className="text-amber-500 font-extrabold">{pollingRate} Hz</span>
              </div>
              
              <div className="flex gap-3 text-zinc-550 font-bold text-[10px]">
                <span>LMB: <span className={mouseButtons.left ? 'text-emerald-400 font-bold' : 'text-zinc-600'}>{mouseButtons.left ? 'DOWN' : 'UP'}</span></span>
                <span>RMB: <span className={mouseButtons.right ? 'text-blue-400 font-bold' : 'text-zinc-600'}>{mouseButtons.right ? 'DOWN' : 'UP'}</span></span>
              </div>
            </div>
          </div>

          {/* Interactive Drawing Canvas */}
          <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl relative overflow-hidden flex flex-col min-h-[400px]">
            
            {/* Overlay Help Banner */}
            <div className="absolute top-3.5 left-4 bg-zinc-950 border border-zinc-800 backdrop-blur px-3 py-1.5 rounded-lg flex items-center gap-2 pointer-events-none z-10">
              <Info size={13} className="text-indigo-400" />
              <span className="text-[10px] text-zinc-300 font-medium font-sans">
                Drag <span className="text-emerald-400 font-bold">Klik Kiri</span> (Garis Hijau) / <span className="text-blue-400 font-bold">Klik Kanan</span> (Garis Biru) untuk menguji konsistensi piksel optik.
              </span>
            </div>

            <button
              onClick={clearCanvas}
              className="absolute top-3.5 right-4 flex items-center gap-1 px-3 py-1 rounded-lg bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-[10px] font-bold text-zinc-300 transition-all z-10"
            >
              <RotateCcw size={11} />
              Bersihkan Canvas
            </button>

            {/* Drawing Canvas */}
            <canvas 
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={(e) => {
                draw(e);
                handleMouseMove(e);
              }}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="flex-1 w-full h-full cursor-crosshair bg-zinc-950/30"
            />
          </div>

        </div>

      </div>
    </div>
  );
}
