import React, { useState, useEffect, useRef } from 'react';
import { Maximize, Minimize, HelpCircle, ArrowLeft, ArrowRight, X, Eye } from 'lucide-react';

const PATTERNS = [
  { name: 'Pure Red (Merah Murni)', type: 'color', value: '#FF0000', textDark: false },
  { name: 'Pure Green (Hijau Murni)', type: 'color', value: '#00FF00', textDark: true },
  { name: 'Pure Blue (Biru Murni)', type: 'color', value: '#0000FF', textDark: false },
  { name: 'Pure White (Putih Murni)', type: 'color', value: '#FFFFFF', textDark: true },
  { name: 'Pure Black (Hitam Murni - Backlight Bleed)', type: 'color', value: '#000000', textDark: false },
  { name: 'Grayscale Ramp (Banding & Gamma)', type: 'gradient-gray', textDark: false },
  { name: 'RGB Gradient spectrum (Warna Spektrum)', type: 'gradient-rgb', textDark: false },
  { name: 'Geometry Grid (Distorsi Geometri Layar)', type: 'grid', textDark: false },
  { name: 'Checkerboard (Kontras Tinggi & Ketajaman)', type: 'checkerboard', textDark: false }
];

const GRID_LOCATIONS = [
  'Kiri Atas', 'Tengah Atas', 'Kanan Atas',
  'Kiri Tengah', 'Tengah', 'Kanan Tengah',
  'Kiri Bawah', 'Tengah Bawah', 'Kanan Bawah'
];

export default function DisplayTest({ onBack }) {
  const [patternIndex, setPatternIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const containerRef = useRef(null);

  // States for Screen Defect Reporting
  const [showReportModal, setShowReportModal] = useState(false);
  const [isNormal, setIsNormal] = useState(true);
  const [defects, setDefects] = useState({
    hasDeadPixels: false,
    deadPixelCount: 0,
    hasBacklightBleed: false,
    backlightBleedSeverity: 'none', // 'none' | 'mild' | 'moderate' | 'severe'
    locations: [], // array of strings (e.g. ['Kiri Atas'])
    notes: ''
  });

  // Toggle Fullscreen using HTML5 API
  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(err => console.error(`Error requesting fullscreen: ${err.message}`));
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(err => console.error(`Error exiting fullscreen: ${err.message}`));
    }
  };

  const handleExitRequest = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => console.error(err));
    } else {
      setShowReportModal(true);
    }
  };

  const handleSaveAndExit = () => {
    onBack({
      colorsTested: patternIndex + 1,
      defects: isNormal ? null : defects
    });
  };

  const handleSkipAndExit = () => {
    onBack({
      colorsTested: patternIndex + 1,
      defects: null
    });
  };

  const toggleLocation = (loc) => {
    setDefects(prev => {
      const exists = prev.locations.includes(loc);
      const updatedLocations = exists 
        ? prev.locations.filter(l => l !== loc) 
        : [...prev.locations, loc];
      return { ...prev, locations: updatedLocations };
    });
  };

  // Listen to fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (!isFull) {
        setShowReportModal(true);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore navigation keydowns if defect reporting modal is open
      if (showReportModal) return;

      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        nextPattern();
      } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
        e.preventDefault();
        prevPattern();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleExitRequest();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [patternIndex, showReportModal]);

  // Auto hide instructions
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowInstructions(false);
    }, 4500);
    return () => clearTimeout(timer);
  }, [patternIndex]);

  const nextPattern = () => {
    setShowInstructions(false);
    if (patternIndex === PATTERNS.length - 1) {
      handleExitRequest();
    } else {
      setPatternIndex((prev) => prev + 1);
    }
  };

  const prevPattern = () => {
    setShowInstructions(false);
    setPatternIndex((prev) => (prev - 1 + PATTERNS.length) % PATTERNS.length);
  };

  const currentPattern = PATTERNS[patternIndex];

  // Dynamically compute canvas pattern backgrounds
  const getPatternStyle = () => {
    if (currentPattern.type === 'color') {
      return { backgroundColor: currentPattern.value };
    }
    if (currentPattern.type === 'gradient-gray') {
      return { background: 'linear-gradient(to right, #000000 0%, #ffffff 100%)' };
    }
    if (currentPattern.type === 'gradient-rgb') {
      return { background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)' };
    }
    if (currentPattern.type === 'grid') {
      return {
        backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.2) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        backgroundColor: '#000000'
      };
    }
    if (currentPattern.type === 'checkerboard') {
      return {
        backgroundImage: 'linear-gradient(45deg, #000000 25%, transparent 25%), linear-gradient(-45deg, #000000 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #000000 75%), linear-gradient(-45deg, transparent 75%, #000000 75%)',
        backgroundSize: '60px 60px',
        backgroundPosition: '0 0, 0 30px, 30px -30px, -30px 0',
        backgroundColor: '#ffffff'
      };
    }
    return {};
  };

  return (
    <div 
      ref={containerRef}
      onClick={nextPattern}
      className="w-full flex-1 flex flex-col justify-center items-center relative cursor-pointer select-none transition-all duration-300"
      style={getPatternStyle()}
    >
      {/* Top Floating Control Bar */}
      <div 
        onClick={(e) => e.stopPropagation()} 
        className={`absolute top-4 left-4 right-4 flex justify-between items-center bg-zinc-950/90 border border-zinc-800 backdrop-blur px-5 py-3 rounded-xl z-20 transition-opacity duration-300 shadow-md ${
          showInstructions ? 'opacity-100' : 'opacity-0 hover:opacity-100'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-zinc-100 font-mono flex items-center gap-1.5">
            <Eye size={13} className="text-indigo-400" />
            Display Dead Pixel & Pattern Checker
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-400 font-mono">
            {patternIndex + 1} / {PATTERNS.length} ({currentPattern.name})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-350 transition-all"
            title="Toggle Bantuan"
          >
            <HelpCircle size={15} />
          </button>

          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-[10px] font-bold text-zinc-250 transition-all"
          >
            {isFullscreen ? <Minimize size={13} /> : <Maximize size={13} />}
            {isFullscreen ? 'Keluar Fullscreen' : 'Mulai Fullscreen'}
          </button>

          <button
            onClick={handleExitRequest}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-950/15 text-red-400 border border-red-900/20 hover:bg-red-900/30 text-[10px] font-bold transition-all"
          >
            <X size={13} />
            Keluar Tes
          </button>
        </div>
      </div>

      {/* Center Instruction Banner Overlay */}
      {showInstructions && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="bg-zinc-950 border border-zinc-800 max-w-md p-6 rounded-2xl shadow-lg backdrop-blur text-center flex flex-col items-center z-10 animate-fade-in mx-4"
        >
          <div className="bg-indigo-500/10 p-3.5 rounded-full mb-3 text-indigo-400">
            <Maximize size={22} />
          </div>
          
          <h3 className="text-sm font-bold text-zinc-100 mb-2">Display Calibration & Stuck Pixel Test</h3>
          <p className="text-[11px] text-zinc-400 leading-relaxed mb-4">
            Aplikasi akan bergantian menampilkan warna primer murni (RGB), hitam-putih murni, gradasi linear, grid geometri, serta papan catur kontras tinggi.
          </p>

          <div className="grid grid-cols-2 gap-2.5 w-full text-left font-mono text-[9px] text-zinc-400 mb-4 bg-zinc-900 p-3 rounded-lg border border-zinc-800/50">
            <div className="flex items-center gap-1.5">
              <ArrowRight size={11} className="text-zinc-500" />
              <span>Klik / Space: Lanjut</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ArrowLeft size={11} className="text-zinc-500" />
              <span>Backspace: Kembali</span>
            </div>
            <div className="flex items-center gap-1.5 col-span-2 border-t border-zinc-800/60 pt-2 mt-1.5">
              <span className="text-[9px] font-sans">Ketuk ESC pada keyboard kapan saja untuk keluar.</span>
            </div>
          </div>

          <button
            onClick={toggleFullscreen}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition-all border border-indigo-550/20 shadow-md"
          >
            Mulai Kalibrasi (Go Fullscreen)
          </button>
        </div>
      )}

      {/* Floating Indicators for Manual Navigation on Screen Corners */}
      <div 
        onClick={(e) => {
          e.stopPropagation();
          prevPattern();
        }}
        className={`absolute left-5 top-1/2 -translate-y-1/2 p-3.5 rounded-full bg-zinc-950/45 hover:bg-zinc-950/85 border border-zinc-800 text-zinc-450 hover:text-white transition-all shadow-md ${
          showInstructions ? 'hidden' : 'flex'
        }`}
        title="Pola Sebelumnya"
      >
        <ArrowLeft size={18} />
      </div>

      <div 
        onClick={(e) => {
          e.stopPropagation();
          nextPattern();
        }}
        className={`absolute right-5 top-1/2 -translate-y-1/2 p-3.5 rounded-full bg-zinc-950/45 hover:bg-zinc-950/85 border border-zinc-800 text-zinc-450 hover:text-white transition-all shadow-md ${
          showInstructions ? 'hidden' : 'flex'
        }`}
        title="Pola Selanjutnya"
      >
        <ArrowRight size={18} />
      </div>

      {/* Subtle Color/Pattern Name Overlay */}
      <div className={`pointer-events-none absolute bottom-6 px-4 py-2 rounded-full backdrop-blur-md text-[9px] font-bold font-mono transition-opacity duration-300 ${
        currentPattern.textDark ? 'bg-black/15 text-black/70' : 'bg-white/10 text-white/70 border border-white/5'
      } ${showInstructions ? 'opacity-0' : 'opacity-100'}`}>
        {currentPattern.name}
      </div>

      {/* Defect Report Modal */}
      {showReportModal && (
        <div 
          onClick={(e) => e.stopPropagation()} 
          className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-default"
        >
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 flex flex-col gap-4 text-left text-zinc-100 max-h-[94vh] overflow-y-auto font-sans">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Eye size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">Laporan Temuan Layar</h3>
                  <p className="text-[10px] text-zinc-500">Verifikasi kondisi piksel dan backlight layar</p>
                </div>
              </div>
              <button 
                onClick={handleSkipAndExit}
                className="p-1 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-all border border-zinc-800"
              >
                <X size={14} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-4">
              
              {/* Quick Status Selection */}
              <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 flex gap-4">
                <label className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-semibold cursor-pointer select-none transition-all duration-200 bg-zinc-900 border-zinc-800 hover:border-indigo-500/30 text-zinc-350">
                  <input
                    type="radio"
                    name="isNormal"
                    checked={isNormal}
                    onChange={() => setIsNormal(true)}
                    className="accent-indigo-600 mr-2"
                  />
                  <span>Layar Normal (Passed)</span>
                </label>
                <label className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-semibold cursor-pointer select-none transition-all duration-200 bg-zinc-900 border-zinc-800 hover:border-rose-500/30 text-zinc-350">
                  <input
                    type="radio"
                    name="isNormal"
                    checked={!isNormal}
                    onChange={() => setIsNormal(false)}
                    className="accent-rose-500 mr-2"
                  />
                  <span>Ada Cacat / Kerusakan</span>
                </label>
              </div>

              {/* Defect Form (Only shown if NOT normal) */}
              {!isNormal && (
                <div className="space-y-4 animate-fade-in text-xs">
                  
                  {/* Dead Pixel Form */}
                  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2.5">
                    <label className="flex items-center gap-2.5 font-bold text-zinc-200 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={defects.hasDeadPixels}
                        onChange={(e) => setDefects(prev => ({ ...prev, hasDeadPixels: e.target.checked, deadPixelCount: e.target.checked ? (prev.deadPixelCount || 1) : 0 }))}
                        className="w-4 h-4 rounded bg-zinc-950 border-zinc-800 text-rose-500 focus:ring-rose-500/20 cursor-pointer"
                      />
                      <span>Ada Dead Pixel / Stuck Pixel</span>
                    </label>
                    {defects.hasDeadPixels && (
                      <div className="flex items-center gap-3 pl-6.5 text-[11px] animate-fade-in">
                        <span className="text-zinc-450">Jumlah dead pixel ditemukan:</span>
                        <div className="flex items-center border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950">
                          <button
                            type="button"
                            onClick={() => setDefects(prev => ({ ...prev, deadPixelCount: Math.max(1, prev.deadPixelCount - 1) }))}
                            className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 font-bold transition-all border-r border-zinc-800"
                          >
                            -
                          </button>
                          <span className="px-3.5 py-1 text-zinc-200 font-mono font-bold">{defects.deadPixelCount}</span>
                          <button
                            type="button"
                            onClick={() => setDefects(prev => ({ ...prev, deadPixelCount: prev.deadPixelCount + 1 }))}
                            className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 font-bold transition-all border-l border-zinc-800"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Backlight Bleed Form */}
                  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2.5">
                    <label className="flex items-center gap-2.5 font-bold text-zinc-200 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={defects.hasBacklightBleed}
                        onChange={(e) => setDefects(prev => ({ ...prev, hasBacklightBleed: e.target.checked, backlightBleedSeverity: e.target.checked ? 'mild' : 'none' }))}
                        className="w-4 h-4 rounded bg-zinc-950 border-zinc-800 text-rose-500 focus:ring-rose-500/20 cursor-pointer"
                      />
                      <span>Ada Backlight Bleeding / IPS Glow</span>
                    </label>
                    {defects.hasBacklightBleed && (
                      <div className="flex items-center gap-3 pl-6.5 text-[11px] animate-fade-in">
                        <span className="text-zinc-450">Tingkat Keparahan:</span>
                        <div className="flex bg-zinc-950 border border-zinc-800 rounded-lg p-0.5 gap-1">
                          {['mild', 'moderate', 'severe'].map((sev) => (
                            <button
                              key={sev}
                              type="button"
                              onClick={() => setDefects(prev => ({ ...prev, backlightBleedSeverity: sev }))}
                              className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                                defects.backlightBleedSeverity === sev
                                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20 shadow-sm'
                                  : 'text-zinc-500 hover:text-zinc-350 border border-transparent'
                              }`}
                            >
                              {sev === 'mild' ? 'Ringan' : sev === 'moderate' ? 'Sedang' : 'Parah'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3x3 Grid Location Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-450 font-bold uppercase tracking-wider block">Pilih Lokasi Cacat / Kerusakan Layar</label>
                    <div className="grid grid-cols-3 gap-1.5 bg-zinc-950 p-2 rounded-xl border border-zinc-800 max-w-[320px]">
                      {GRID_LOCATIONS.map((loc) => {
                        const isSelected = defects.locations.includes(loc);
                        return (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => toggleLocation(loc)}
                            className={`aspect-video rounded border flex items-center justify-center text-[9px] text-center p-1 cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-rose-950/40 border-rose-500/60 text-rose-400 font-bold shadow-[0_0_8px_rgba(239,68,68,0.15)] shadow-inner'
                                : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-500 hover:text-zinc-400'
                            }`}
                          >
                            {loc}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notes Form */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-450 font-bold uppercase tracking-wider block">Catatan Tambahan Layar</label>
                    <textarea
                      rows={2}
                      placeholder="Masukkan detail tambahan tentang kerusakan layar..."
                      value={defects.notes}
                      onChange={(e) => setDefects(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-indigo-500 rounded p-2 text-[11px] resize-none leading-normal transition-all text-zinc-250 outline-none hover:border-zinc-700"
                    />
                  </div>

                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center pt-3 border-t border-zinc-800 mt-2">
              <button
                onClick={handleSkipAndExit}
                className="py-2 px-3 bg-zinc-950 hover:bg-zinc-800 text-zinc-450 hover:text-zinc-350 border border-zinc-800 rounded-xl text-xs font-bold transition-all"
              >
                Lewati & Keluar
              </button>
              <button
                onClick={handleSaveAndExit}
                className="py-2 px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all active:scale-[0.98] border border-indigo-500/20 shadow-md"
              >
                Simpan & Keluar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
