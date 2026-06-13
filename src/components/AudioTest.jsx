import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Info, AlertTriangle, Play, ChevronRight, Activity } from 'lucide-react';

export default function AudioTest({ onBack, onNext, isSequential }) {
  const [isTesting, setIsTesting] = useState(false);
  const [feedbackVolume, setFeedbackVolume] = useState(0.8); // Default 80% volume
  const [micVolume, setMicVolume] = useState(0);
  const [micPermission, setMicPermission] = useState('prompt'); // 'prompt' | 'granted' | 'denied'
  const [noiseSuppression, setNoiseSuppression] = useState(true); // static hiss cancellation
  const [autoGain, setAutoGain] = useState(true); // automatic amplification
  const [activeStereoTest, setActiveStereoTest] = useState(null); // 'left' | 'right' | 'stereo' | null

  // Web Audio refs
  const audioCtxRef = useRef(null);
  const micStreamRef = useRef(null);
  const gainNodeRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const canvasRef = useRef(null);

  // Play synthesized stereo balance test tones (panned L / R / C)
  const playStereoTestTone = (panValue, label) => {
    setActiveStereoTest(label);
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtxClass();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      let panner;
      if (ctx.createStereoPanner) {
        panner = ctx.createStereoPanner();
        panner.pan.setValueAtTime(panValue, ctx.currentTime);
      } else {
        // Fallback for Safari
        panner = ctx.createPanner();
        panner.panningModel = 'equalpower';
        panner.setPosition(panValue, 0, 1 - Math.abs(panValue));
      }

      osc.type = 'sine';
      // Play a pleasant chime tone (e.g. 523Hz which is C5)
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(329.63, ctx.currentTime + 0.5); // decay to E4
      
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
      
      osc.connect(panner);
      panner.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
      
      setTimeout(() => {
        setActiveStereoTest(null);
      }, 1200);
    } catch (err) {
      console.warn("Failed to play stereo test tone:", err);
      setActiveStereoTest(null);
    }
  };

  // Start Voice Loopback Diagnostic
  const startLoopback = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false, // Must be false to prevent direct feedback cancellation
          noiseSuppression: noiseSuppression,
          autoGainControl: autoGain,
          latency: 0
        },
        video: false
      });
      micStreamRef.current = stream;
      setMicPermission('granted');

      // Setup Web Audio Graph
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtxClass();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyserRef.current = analyser;

      const gain = ctx.createGain();
      const volumeMultiplier = autoGain ? 1.0 : 2.5; 
      gain.gain.setValueAtTime(feedbackVolume * volumeMultiplier, ctx.currentTime);
      gainNodeRef.current = gain;

      // Connect nodes
      source.connect(analyser); // visualizer feed
      source.connect(gain);
      gain.connect(ctx.destination); // Speaker loopback

      setIsTesting(true);
      visualizeMic();
    } catch (err) {
      console.warn("Microphone feedback access denied:", err);
      setMicPermission('denied');
      setIsTesting(false);
    }
  };

  // Stop Voice Loopback
  const stopLoopback = () => {
    setIsTesting(false);
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    
    gainNodeRef.current = null;
    analyserRef.current = null;
    setMicVolume(0);
    clearCanvas();
  };

  // Live filter hot-reloading
  useEffect(() => {
    if (isTesting) {
      stopLoopback();
      const t = setTimeout(() => {
        startLoopback();
      }, 150);
      return () => clearTimeout(t);
    }
  }, [noiseSuppression, autoGain]);

  // Handle dynamic volume adjust
  useEffect(() => {
    if (isTesting && gainNodeRef.current && audioCtxRef.current) {
      const volumeMultiplier = autoGain ? 1.0 : 2.5;
      gainNodeRef.current.gain.setValueAtTime(feedbackVolume * volumeMultiplier, audioCtxRef.current.currentTime);
    }
  }, [feedbackVolume, isTesting, autoGain]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopLoopback();
    };
  }, []);

  // Visualize audio frequencies
  const visualizeMic = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!analyserRef.current) return;
      animationFrameRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      // Render glowing slate canvas background
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Compute average volume for telemetry
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      setMicVolume(Math.round((average / 255) * 100));

      // Draw frequency spectrum bars
      const barWidth = (canvas.width / bufferLength) * 1.4;
      let barHeight;
      let x = 0;

      ctx.shadowBlur = 8;
      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height * 0.85;
        
        // Dynamic cyber gradient color scheme (teal -> emerald -> blue)
        const purpleIntensity = Math.min(255, barHeight * 1.5);
        ctx.fillStyle = `rgb(16, ${190 - barHeight / 2}, ${130 + purpleIntensity})`;
        ctx.shadowColor = `rgba(16, 185, 129, 0.4)`;
        
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 3, barHeight);
        x += barWidth;
      }
      ctx.shadowBlur = 0; // reset
    };

    draw();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="w-full flex-1 flex flex-col bg-zinc-950 p-4 md:p-6 relative overflow-hidden font-sans">

      {/* Top Navbar */}
      <div className="glass-panel px-6 py-4.5 rounded-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 z-10">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2.5 font-display">
            <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
            Audio & Mikrofon
          </h2>
          <p className="text-[11px] text-zinc-400 mt-0.5">Tes loopback suara mikrofon real-time dan keseimbangan kanal stereo speaker</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              onBack({
                loopbackTested: isTesting || micPermission === 'granted',
                noiseSuppressionEnabled: noiseSuppression,
                autoGainEnabled: autoGain
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
                  loopbackTested: isTesting || micPermission === 'granted',
                  noiseSuppressionEnabled: noiseSuppression,
                  autoGainEnabled: autoGain
                });
              }}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-500 text-xs transition-all shadow-md"
            >
              Lanjut: Uji Layar
            </button>
          )}
        </div>
      </div>

      {/* Main Diagnostic Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 select-none max-w-5xl mx-auto w-full items-stretch z-10">
        
        {/* Left Control Card */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between shadow-md">
          <div className="space-y-5">
            <h3 className="text-xs font-bold font-mono tracking-widest text-zinc-200 uppercase flex items-center gap-2 pb-2 border-b border-zinc-800/50">
              <Mic className="text-indigo-400" size={14} />
              Loopback Test Controller
            </h3>
            
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Merekam suara dari mikrofon lokal secara instan dan mengembalikannya ke speaker/headphone secara real-time. Bagus digunakan untuk mengidentifikasi static hiss, mikrofon mati, atau kualitas tangkapan suara.
            </p>

            {/* Permission status badge */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-zinc-500">Izin Akses Mic:</span>
              {micPermission === 'granted' ? (
                <span className="text-[10px] font-bold text-emerald-400 uppercase bg-emerald-950/40 px-2.5 py-0.5 rounded border border-emerald-800/30">
                  GRANTED / AKTIF
                </span>
              ) : micPermission === 'denied' ? (
                <span className="text-[10px] font-bold text-red-400 uppercase bg-red-950/30 px-2.5 py-0.5 rounded border border-red-900/30">
                  DENIED / DITOLAK
                </span>
              ) : (
                <span className="text-[10px] font-bold text-zinc-500 uppercase bg-zinc-950 px-2.5 py-0.5 rounded border border-zinc-800">
                  WAIT / BELUM DITANYA
                </span>
              )}
            </div>

            {/* Volume Adjustment Slider */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <label className="text-zinc-350 font-bold flex items-center gap-1.5">
                  <Volume2 size={13} className="text-zinc-500" />
                  Monitor Volume Balik
                </label>
                <span className="font-mono font-bold text-indigo-400">{Math.round(feedbackVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.05"
                value={feedbackVolume}
                onChange={(e) => setFeedbackVolume(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-indigo-600 border border-zinc-800"
              />
            </div>

            {/* Live Filter Toggles */}
            <div className="pt-3 border-t border-zinc-800/50 flex flex-col gap-2.5 text-xs">
              <label className="flex items-center gap-2.5 cursor-pointer text-zinc-350 select-none hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={noiseSuppression}
                  onChange={(e) => setNoiseSuppression(e.target.checked)}
                  className="w-4 h-4 rounded bg-zinc-950 border-zinc-800 text-indigo-600 focus:ring-indigo-550/20 cursor-pointer"
                />
                Peredam Bising (Noise Suppression) — <span className="text-[10px] text-zinc-500">Meredam dengung/static hiss</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-zinc-350 select-none hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={autoGain}
                  onChange={(e) => setAutoGain(e.target.checked)}
                  className="w-4 h-4 rounded bg-zinc-950 border-zinc-800 text-indigo-600 focus:ring-indigo-550/20 cursor-pointer"
                />
                Penguat Input Otomatis (Auto Gain Control) — <span className="text-[10px] text-zinc-500">Menstabilkan gain</span>
              </label>
            </div>
          </div>

          {/* Trigger Button */}
          <div className="pt-4 border-t border-zinc-800/50 mt-5">
            {!isTesting ? (
              <button
                onClick={startLoopback}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] border border-indigo-500/20 text-xs shadow-md"
              >
                <Mic size={15} />
                Mulai Tes Feedback Suara
              </button>
            ) : (
              <button
                onClick={stopLoopback}
                className="w-full py-3 bg-red-650 hover:bg-red-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] border border-red-500/20 text-xs shadow-md"
              >
                <MicOff size={15} />
                Hentikan Tes Feedback
              </button>
            )}
          </div>
        </div>

        {/* Right Studio / Stereo Balance & Visualizer Card */}
        <div className="flex flex-col gap-5 justify-between">
          
          {/* Stereo Speaker Imbalance Tester */}
          <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between shadow-md">
            <div>
              <h3 className="text-xs font-bold font-mono tracking-widest text-zinc-200 uppercase mb-2 flex items-center gap-1.5 pb-2 border-b border-zinc-800/50">
                <Activity size={14} className="text-indigo-400" />
                Stereo Balance & Speaker Checker
              </h3>
              <p className="text-[10px] text-zinc-400 leading-relaxed mb-4">
                Uji apakah driver headphone atau speaker sebelah Kiri (L) dan Kanan (R) seimbang dan berfungsi dengan memainkan nada sinusoidal panned khusus.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <button
                onClick={() => playStereoTestTone(-1.0, 'left')}
                className={`py-3.5 px-2.5 rounded-xl border text-[11px] font-bold transition-all duration-300 flex flex-col items-center justify-center gap-1.5 active:scale-95 ${
                  activeStereoTest === 'left'
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-850 hover:border-zinc-700'
                }`}
              >
                <ChevronRight size={14} className="rotate-180 text-indigo-400" />
                <span>Kanal Kiri (L)</span>
              </button>

              <button
                onClick={() => playStereoTestTone(0.0, 'stereo')}
                className={`py-3.5 px-2.5 rounded-xl border text-[11px] font-bold transition-all duration-300 flex flex-col items-center justify-center gap-1.5 active:scale-95 ${
                  activeStereoTest === 'stereo'
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-850 hover:border-zinc-700'
                }`}
              >
                <ChevronRight size={14} className="rotate-90 text-indigo-400" />
                <span>Tengah (Stereo)</span>
              </button>

              <button
                onClick={() => playStereoTestTone(1.0, 'right')}
                className={`py-3.5 px-2.5 rounded-xl border text-[11px] font-bold transition-all duration-300 flex flex-col items-center justify-center gap-1.5 active:scale-95 ${
                  activeStereoTest === 'right'
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-850 hover:border-zinc-700'
                }`}
              >
                <ChevronRight size={14} className="text-indigo-400" />
                <span>Kanal Kanan (R)</span>
              </button>
            </div>
          </div>

          {/* Level Visualizer Card */}
          <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between shadow-md flex-1">
            <div>
              <h3 className="text-xs font-bold font-mono tracking-widest text-zinc-200 uppercase mb-3.5">
                Visualisasi Frekuensi Spectrum
              </h3>

              {/* Volume Indicator db Bar */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1.5 text-[11px] font-mono">
                  <span className="text-zinc-500">Intensitas Kebisingan</span>
                  <span className="font-bold text-indigo-400">{micVolume}%</span>
                </div>
                <div className="w-full h-3 bg-zinc-950 rounded p-0.5 border border-zinc-800 flex items-center">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 via-blue-450 to-indigo-400 rounded transition-all duration-75"
                    style={{ width: `${micVolume}%` }}
                  />
                </div>
              </div>

              {/* Waveform Canvas */}
              <div className="h-[130px] bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden relative">
                <canvas 
                  ref={canvasRef} 
                  className="w-full h-full"
                  width={380}
                  height={130}
                />
                {!isTesting && (
                  <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-[0.5px] flex items-center justify-center text-xs text-zinc-500 font-medium italic">
                    Menunggu tes feedback diaktifkan...
                  </div>
                )}
              </div>
            </div>

            <div className="text-[9px] text-zinc-500 italic font-mono text-center mt-3 uppercase tracking-wider">
              Zero Latency Audio Buffer Routing
            </div>
          </div>

        </div>

      </div>

      {/* Safety Notice */}
      <div className="max-w-5xl mx-auto w-full mt-6 bg-amber-950/10 border border-amber-900/20 p-4 rounded-xl flex items-start gap-3.5 z-10">
        <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
        <div className="text-[11px] text-zinc-450 leading-relaxed font-sans">
          <span className="text-amber-500 font-bold uppercase tracking-wider block mb-0.5">PERINGATAN FEEDBACK AKUSTIK:</span> 
          Harap selalu gunakan **Headphone / Headset** saat mengaktifkan feedback suara. Jika menggunakan speaker laptop/PC biasa secara langsung, suara keluaran dari speaker akan masuk kembali ke mic dan dapat menimbulkan bunyi dengung kencang (*howling/feedback loop*).
        </div>
      </div>
    </div>
  );
}
