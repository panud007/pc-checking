import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, Volume2, VolumeX, FileJson, Info, Eye, EyeOff } from 'lucide-react';

export default function KeyboardTest({ onBack, onNext, isSequential }) {
  const [keyStates, setKeyStates] = useState({});
  const [currentlyPressed, setCurrentlyPressed] = useState(new Set());
  const [showCodes, setShowCodes] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [switchType, setSwitchType] = useState('blue'); // 'blue' | 'red' | 'brown' (mechanical switches sound)
  const [eventLog, setEventLog] = useState([]);
  const audioCtxRef = useRef(null);

  // Synthesize realistic mechanical switch sounds using Web Audio API nodes
  const playSwitchSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.connect(ctx.destination);

      if (switchType === 'blue') {
        // Cherry MX Blue: High-pitch click click transient + metallic resonance bounce
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(2400, now);
        osc1.frequency.exponentialRampToValueAtTime(1400, now + 0.006);
        gain1.gain.setValueAtTime(0.04, now);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.008);
        
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(550, now);
        osc2.frequency.exponentialRampToValueAtTime(120, now + 0.022);
        gain2.gain.setValueAtTime(0.02, now);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);

        osc1.start(now);
        osc1.stop(now + 0.01);
        osc2.start(now);
        osc2.stop(now + 0.03);
      } else if (switchType === 'red') {
        // Cherry MX Red: Soft, linear low-pitch bottom-out thump
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.exponentialRampToValueAtTime(75, now + 0.028);
        
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
        
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.035);
      } else {
        // Cherry MX Brown: Soft tactile tactile pop
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(160, now + 0.022);
        
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);
        
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.032);
      }
    } catch (e) {
      console.warn("Audio Context failed to play click sound:", e);
    }
  };

  // ANSI Keyboard Layout Data
  const mainRows = [
    // Function Row
    [
      { code: 'Escape', label: 'ESC', width: 'w-[5%]' },
      { type: 'gap', width: 'w-[2.5%]' },
      { code: 'F1', label: 'F1', width: 'w-[5%]' },
      { code: 'F2', label: 'F2', width: 'w-[5%]' },
      { code: 'F3', label: 'F3', width: 'w-[5%]' },
      { code: 'F4', label: 'F4', width: 'w-[5%]' },
      { type: 'gap', width: 'w-[2.5%]' },
      { code: 'F5', label: 'F5', width: 'w-[5%]' },
      { code: 'F6', label: 'F6', width: 'w-[5%]' },
      { code: 'F7', label: 'F7', width: 'w-[5%]' },
      { code: 'F8', label: 'F8', width: 'w-[5%]' },
      { type: 'gap', width: 'w-[2.5%]' },
      { code: 'F9', label: 'F9', width: 'w-[5%]' },
      { code: 'F10', label: 'F10', width: 'w-[5%]' },
      { code: 'F11', label: 'F11', width: 'w-[5%]' },
      { code: 'F12', label: 'F12', width: 'w-[5%]' }
    ],
    // Alphanumeric Row 1
    [
      { code: 'Backquote', label: '~\n`', width: 'w-[6.25%]' },
      { code: 'Digit1', label: '!\n1', width: 'w-[6.25%]' },
      { code: 'Digit2', label: '@\n2', width: 'w-[6.25%]' },
      { code: 'Digit3', label: '#\n3', width: 'w-[6.25%]' },
      { code: 'Digit4', label: '$\n4', width: 'w-[6.25%]' },
      { code: 'Digit5', label: '%\n5', width: 'w-[6.25%]' },
      { code: 'Digit6', label: '^\n6', width: 'w-[6.25%]' },
      { code: 'Digit7', label: '&\n7', width: 'w-[6.25%]' },
      { code: 'Digit8', label: '*\n8', width: 'w-[6.25%]' },
      { code: 'Digit9', label: '(\n9', width: 'w-[6.25%]' },
      { code: 'Digit0', label: ')\n0', width: 'w-[6.25%]' },
      { code: 'Minus', label: '_\n-', width: 'w-[6.25%]' },
      { code: 'Equal', label: '+\n=', width: 'w-[6.25%]' },
      { code: 'Backspace', label: 'Backspace', width: 'w-[12.5%]' }
    ],
    // Alphanumeric Row 2
    [
      { code: 'Tab', label: 'Tab', width: 'w-[9.375%]' },
      { code: 'KeyQ', label: 'Q', width: 'w-[6.25%]' },
      { code: 'KeyW', label: 'W', width: 'w-[6.25%]' },
      { code: 'KeyE', label: 'E', width: 'w-[6.25%]' },
      { code: 'KeyR', label: 'R', width: 'w-[6.25%]' },
      { code: 'KeyT', label: 'T', width: 'w-[6.25%]' },
      { code: 'KeyY', label: 'Y', width: 'w-[6.25%]' },
      { code: 'KeyU', label: 'U', width: 'w-[6.25%]' },
      { code: 'KeyI', label: 'I', width: 'w-[6.25%]' },
      { code: 'KeyO', label: 'O', width: 'w-[6.25%]' },
      { code: 'KeyP', label: 'P', width: 'w-[6.25%]' },
      { code: 'BracketLeft', label: '{\n[', width: 'w-[6.25%]' },
      { code: 'BracketRight', label: '}\n]', width: 'w-[6.25%]' },
      { code: 'Backslash', label: '|\n\\', width: 'w-[9.375%]' }
    ],
    // Alphanumeric Row 3
    [
      { code: 'CapsLock', label: 'Caps Lock', width: 'w-[10.9375%]' },
      { code: 'KeyA', label: 'A', width: 'w-[6.25%]' },
      { code: 'KeyS', label: 'S', width: 'w-[6.25%]' },
      { code: 'KeyD', label: 'D', width: 'w-[6.25%]' },
      { code: 'KeyF', label: 'F', width: 'w-[6.25%]' },
      { code: 'KeyG', label: 'G', width: 'w-[6.25%]' },
      { code: 'KeyH', label: 'H', width: 'w-[6.25%]' },
      { code: 'KeyJ', label: 'J', width: 'w-[6.25%]' },
      { code: 'KeyK', label: 'K', width: 'w-[6.25%]' },
      { code: 'KeyL', label: 'L', width: 'w-[6.25%]' },
      { code: 'Semicolon', label: ':\n;', width: 'w-[6.25%]' },
      { code: 'Quote', label: '"\n\'', width: 'w-[6.25%]' },
      { code: 'Enter', label: 'Enter', width: 'w-[14.0625%]' }
    ],
    // Alphanumeric Row 4
    [
      { code: 'ShiftLeft', label: 'Shift', width: 'w-[14.0625%]' },
      { code: 'KeyZ', label: 'Z', width: 'w-[6.25%]' },
      { code: 'KeyX', label: 'X', width: 'w-[6.25%]' },
      { code: 'KeyC', label: 'C', width: 'w-[6.25%]' },
      { code: 'KeyV', label: 'V', width: 'w-[6.25%]' },
      { code: 'KeyB', label: 'B', width: 'w-[6.25%]' },
      { code: 'KeyN', label: 'N', width: 'w-[6.25%]' },
      { code: 'KeyM', label: 'M', width: 'w-[6.25%]' },
      { code: 'Comma', label: '<\n,', width: 'w-[6.25%]' },
      { code: 'Period', label: '>\n.', width: 'w-[6.25%]' },
      { code: 'Slash', label: '?\n/', width: 'w-[6.25%]' },
      { code: 'ShiftRight', label: 'Shift', width: 'w-[17.1875%]' }
    ],
    // Alphanumeric Row 5
    [
      { code: 'ControlLeft', label: 'Ctrl', width: 'w-[7.8125%]' },
      { code: 'MetaLeft', label: 'Win', width: 'w-[7.8125%]' },
      { code: 'AltLeft', label: 'Alt', width: 'w-[7.8125%]' },
      { code: 'Space', label: 'Spacebar', width: 'w-[39.0625%]' },
      { code: 'AltRight', label: 'Alt', width: 'w-[7.8125%]' },
      { code: 'MetaRight', label: 'Win', width: 'w-[7.8125%]' },
      { code: 'ContextMenu', label: 'Menu', width: 'w-[7.8125%]' },
      { code: 'ControlRight', label: 'Ctrl', width: 'w-[7.8125%]' }
    ]
  ];

  const navRows = [
    // Row 0
    [
      { code: 'PrintScreen', label: 'PrtSc', width: 'w-1/3' },
      { code: 'ScrollLock', label: 'Scroll', width: 'w-1/3' },
      { code: 'Pause', label: 'Pause', width: 'w-1/3' }
    ],
    // Row 1
    [
      { code: 'Insert', label: 'Ins', width: 'w-1/3' },
      { code: 'Home', label: 'Home', width: 'w-1/3' },
      { code: 'PageUp', label: 'PgUp', width: 'w-1/3' }
    ],
    // Row 2
    [
      { code: 'Delete', label: 'Del', width: 'w-1/3' },
      { code: 'End', label: 'End', width: 'w-1/3' },
      { code: 'PageDown', label: 'PgDn', width: 'w-1/3' }
    ],
    // Row 3 (Gap)
    [],
    // Row 4
    [
      { type: 'gap', width: 'w-1/3' },
      { code: 'ArrowUp', label: '▲', width: 'w-1/3' },
      { type: 'gap', width: 'w-1/3' }
    ],
    // Row 5
    [
      { code: 'ArrowLeft', label: '◀', width: 'w-1/3' },
      { code: 'ArrowDown', label: '▼', width: 'w-1/3' },
      { code: 'ArrowRight', label: '▶', width: 'w-1/3' }
    ]
  ];

  // Flat array of all registered codes for counting
  const allKeyCodes = new Set();
  mainRows.flat().forEach(k => k.code && allKeyCodes.add(k.code));
  navRows.flat().forEach(k => k.code && allKeyCodes.add(k.code));
  
  const numpadKeys = [
    'NumLock', 'NumpadDivide', 'NumpadMultiply', 'NumpadSubtract',
    'Numpad7', 'Numpad8', 'Numpad9', 'NumpadAdd',
    'Numpad4', 'Numpad5', 'Numpad6',
    'Numpad1', 'Numpad2', 'Numpad3', 'NumpadEnter',
    'Numpad0', 'NumpadDecimal'
  ];
  numpadKeys.forEach(code => allKeyCodes.add(code));

  // Capture event handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      const code = e.code;
      
      // Prevent browser shortcuts that disrupt test
      if (
        code === 'Tab' ||
        code === 'Backspace' ||
        code === 'AltLeft' ||
        code === 'AltRight' ||
        code === 'Escape' ||
        code === 'ContextMenu' ||
        (code.startsWith('F') && code.length <= 3) || // F1-F12
        (e.ctrlKey && (code === 'KeyP' || code === 'KeyS' || code === 'KeyO' || code === 'KeyF'))
      ) {
        e.preventDefault();
      }

      setCurrentlyPressed((prev) => {
        const next = new Set(prev);
        next.add(code);
        return next;
      });

      setKeyStates((prev) => ({
        ...prev,
        [code]: 'pressed'
      }));

      playSwitchSound();

      setEventLog((prev) => [
        {
          id: Math.random().toString(36).substr(2, 9),
          time: new Date().toLocaleTimeString(),
          code: e.code,
          key: e.key,
          location: e.location === 0 ? 'Standard' : e.location === 1 ? 'Left' : e.location === 2 ? 'Right' : 'Numpad',
          repeat: e.repeat ? 'Yes' : 'No'
        },
        ...prev.slice(0, 4) // keep last 5
      ]);
    };

    const handleKeyUp = (e) => {
      const code = e.code;
      
      setCurrentlyPressed((prev) => {
        const next = new Set(prev);
        next.delete(code);
        return next;
      });

      setKeyStates((prev) => {
        if (prev[code] === 'pressed') {
          return {
            ...prev,
            [code]: 'tested'
          };
        }
        return prev;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    const preventContextMenu = (e) => e.preventDefault();
    window.addEventListener('contextmenu', preventContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('contextmenu', preventContextMenu);
    };
  }, [soundEnabled, switchType]);

  const handleKeyManualToggle = (code) => {
    setKeyStates((prev) => {
      const current = prev[code];
      let nextState;
      if (current === 'dead') {
        nextState = 'idle';
      } else {
        nextState = 'dead';
      }
      return {
        ...prev,
        [code]: nextState
      };
    });
  };

  const handleReset = () => {
    setKeyStates({});
    setCurrentlyPressed(new Set());
    setEventLog([]);
  };

  const exportReport = () => {
    const pressedKeys = Object.entries(keyStates)
      .filter(([_, state]) => state === 'pressed' || state === 'tested')
      .map(([code]) => code);
      
    const deadKeys = Object.entries(keyStates)
      .filter(([_, state]) => state === 'dead')
      .map(([code]) => code);

    const report = {
      device: "Keyboard Diagnostic Report",
      timestamp: new Date().toISOString(),
      summary: {
        totalKeysSupported: allKeyCodes.size,
        testedKeysCount: pressedKeys.length,
        deadKeysCount: deadKeys.length,
        passedPercent: ((pressedKeys.length / allKeyCodes.size) * 100).toFixed(1) + '%'
      },
      testedKeys: pressedKeys,
      deadKeys: deadKeys
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keyboard-diagnostic-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Compute metrics
  const pressedCount = Object.values(keyStates).filter(s => s === 'pressed' || s === 'tested').length;
  const deadCount = Object.values(keyStates).filter(s => s === 'dead').length;

  const getKeyClasses = (code) => {
    const isHolding = currentlyPressed.has(code);
    const state = keyStates[code] || 'idle';
    
    // Physical 3D keycap look
    let base = "h-11 border flex flex-col justify-center items-center rounded-lg select-none cursor-pointer text-xs font-semibold transition-all duration-75 relative border-b-4 border-r-2 shadow-md ";

    if (isHolding || state === 'pressed') {
      // Active / Depressed (Pressed Down) - neon green
      return base + "bg-emerald-500 text-slate-950 border-emerald-400 border-b border-r translate-y-[3px] shadow-none scale-[0.98]";
    }
    
    if (state === 'tested') {
      // Tested OK & Released (Beveled green outline)
      return base + "bg-emerald-950/70 text-emerald-400 border-emerald-500/50 border-b-4 border-r-[3px] shadow-[0_3px_0_rgba(6,78,59,0.5)]";
    }
    
    if (state === 'dead') {
      // Defective Key (Beveled red outline)
      return base + "bg-red-950/60 text-red-400 border-red-500/60 border-b-4 border-r-[3px] shadow-[0_3px_0_rgba(153,27,27,0.5)] shadow-[0_0_12px_rgba(239,68,68,0.2)]";
    }
    
    // Idle (Default keycap look)
    return base + "bg-slate-800 text-slate-200 border-slate-700 border-b-4 border-r-[3px] shadow-[0_3px_0_rgba(15,23,42,0.8)] hover:bg-slate-750 hover:border-slate-600";
  };

  const renderKeyLabel = (label, code) => {
    if (showCodes) {
      return <span className="text-[8px] font-mono leading-none tracking-tighter text-slate-400 break-all p-0.5">{code}</span>;
    }
    if (label.includes('\n')) {
      const [top, bottom] = label.split('\n');
      return (
        <div className="flex flex-col h-full justify-between py-1 px-1.5 w-full text-[9px] leading-none select-none">
          <span className="text-left font-semibold text-slate-400">{top}</span>
          <span className="text-right font-extrabold text-slate-200">{bottom}</span>
        </div>
      );
    }
    return <span className="text-[10px] font-extrabold uppercase tracking-tight">{label}</span>;
  };

  return (
    <div className="w-full flex-1 flex flex-col bg-zinc-950 p-4 md:p-6 relative overflow-hidden font-sans">

      {/* Top Navbar */}
      <div className="glass-panel px-6 py-4.5 rounded-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 z-10">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2.5 font-display">
            <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
            Keyboard Input Diagnostic
          </h2>
          <p className="text-[11px] text-zinc-400 mt-0.5 font-sans">Zero-latency mapping & mechanical physical layout matrix checker</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Sound Profile Select Dropdown */}
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 shadow-inner text-xs">
            <span className="text-zinc-500 font-medium">Sound:</span>
            <select
              value={switchType}
              onChange={(e) => setSwitchType(e.target.value)}
              className="bg-transparent text-indigo-400 font-bold border-none outline-none focus:ring-0 cursor-pointer text-xs pr-1"
            >
              <option value="blue" className="bg-zinc-900 text-zinc-200">Cherry MX Blue (Clicky)</option>
              <option value="red" className="bg-zinc-900 text-zinc-200">Cherry MX Red (Linear)</option>
              <option value="brown" className="bg-zinc-900 text-zinc-200">Cherry MX Brown (Tactile)</option>
            </select>
          </div>

          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              soundEnabled 
                ? 'bg-zinc-900 text-indigo-400 border-indigo-500/20 hover:bg-zinc-800' 
                : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:bg-zinc-900'
            }`}
          >
            {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
            Suara
          </button>

          <button 
            onClick={() => setShowCodes(!showCodes)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              showCodes 
                ? 'bg-zinc-900 text-amber-500 border-amber-500/20 hover:bg-zinc-800' 
                : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-900'
            }`}
          >
            {showCodes ? <EyeOff size={13} /> : <Eye size={13} />}
            Buka Kode
          </button>

          <button 
            onClick={exportReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 text-zinc-300 border border-zinc-800 hover:bg-zinc-900 text-xs font-semibold transition-all"
          >
            <FileJson size={13} />
            Export JSON
          </button>

          <button 
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/10 text-red-400 border border-red-900/20 hover:bg-red-900/30 text-xs font-semibold transition-all"
          >
            <RotateCcw size={13} />
            Reset
          </button>

          <button 
            onClick={() => {
              const deadKeysList = Object.entries(keyStates)
                .filter(([_, state]) => state === 'dead')
                .map(([code]) => code);
              onBack({
                pressedCount: pressedCount,
                deadKeys: deadKeysList
              });
            }}
            className="px-3.5 py-1.5 rounded-lg bg-zinc-900 text-zinc-200 border border-zinc-800 hover:bg-zinc-800 text-xs font-semibold transition-all"
          >
            Dashboard
          </button>

          {isSequential && (
            <button 
              onClick={() => {
                const deadKeysList = Object.entries(keyStates)
                  .filter(([_, state]) => state === 'dead')
                  .map(([code]) => code);
                onNext({
                  pressedCount: pressedCount,
                  deadKeys: deadKeysList
                });
              }}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-500 text-xs transition-all shadow-md"
            >
              Lanjut: Mouse Test
            </button>
          )}
        </div>
      </div>

      {/* Main Diagnostic Dashboard Area */}
      <div className="flex-1 flex flex-col gap-6 select-none z-10">
        
        {/* KPI Panel */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel border-slate-800/60 p-3.5 rounded-xl flex flex-col justify-center shadow-sm">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-display">TEREGRISTRASI (PASSED)</span>
            <span className="text-xl font-black text-emerald-400 mt-1 font-mono">
              {pressedCount} <span className="text-slate-650 font-normal text-xs">/ {allKeyCodes.size} tombol</span>
            </span>
          </div>
          <div className="glass-panel border-slate-800/60 p-3.5 rounded-xl flex flex-col justify-center shadow-sm">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-display">TIDAK BERFUNGSI (DEAD)</span>
            <span className={`text-xl font-black mt-1 font-mono ${deadCount > 0 ? 'text-red-400' : 'text-slate-600'}`}>
              {deadCount}
            </span>
          </div>
          <div className="glass-panel border-slate-800/60 p-3.5 rounded-xl flex flex-col justify-center shadow-sm">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-display">SEDANG DITEKAN (PRESSED)</span>
            <span className="text-xl font-black text-blue-400 mt-1 font-mono">
              {currentlyPressed.size}
            </span>
          </div>
          <div className="glass-panel border-slate-800/60 p-3.5 rounded-xl flex flex-col justify-center shadow-sm">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-display">ACTIVE ROLLOVER</span>
            <span className="text-xs font-bold text-slate-300 mt-1.5 truncate font-mono">
              {currentlyPressed.size > 0 ? Array.from(currentlyPressed).join(' + ') : 'None'}
            </span>
          </div>
        </div>

        {/* The Keyboard Frame */}
        <div className="bg-slate-900/80 border border-slate-800/80 p-5 rounded-2xl shadow-2xl flex flex-col gap-4 max-w-[1440px] mx-auto w-full relative">
          
          {/* Top Panel (Main rows + Navigation block + Numpad) */}
          <div className="flex gap-4 overflow-x-auto">
            
            {/* Main Block (Function rows + QWERTY) */}
            <div className="flex-1 flex flex-col gap-1.5 min-w-[700px]">
              {mainRows.map((row, rIdx) => (
                <div key={rIdx} className="flex gap-1.5 w-full">
                  {row.map((key, kIdx) => {
                    if (key.type === 'gap') {
                      return <div key={kIdx} className={`${key.width}`} />;
                    }
                    return (
                      <div 
                        key={kIdx}
                        className={`${key.width} ${getKeyClasses(key.code)}`}
                        onClick={() => handleKeyManualToggle(key.code)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          handleKeyManualToggle(key.code);
                        }}
                      >
                        {renderKeyLabel(key.label, key.code)}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Navigation Cluster Block */}
            <div className="w-[14%] flex flex-col gap-1.5 min-w-[110px]">
              {navRows.map((row, rIdx) => {
                if (row.length === 0) {
                  return <div key={rIdx} className="h-11 w-full" />; // Gap row
                }
                return (
                  <div key={rIdx} className="flex gap-1.5 w-full">
                    {row.map((key, kIdx) => {
                      if (key.type === 'gap') {
                        return <div key={kIdx} className={`${key.width}`} />;
                      }
                      return (
                        <div 
                          key={kIdx}
                          className={`${key.width} ${getKeyClasses(key.code)}`}
                          onClick={() => handleKeyManualToggle(key.code)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            handleKeyManualToggle(key.code);
                          }}
                        >
                          {renderKeyLabel(key.label, key.code)}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Numpad Block */}
            <div className="w-[18%] grid grid-cols-4 grid-rows-6 gap-1.5 min-w-[130px]">
              {/* Row 0 spacer to align function row & display Lock LEDs */}
              <div className="col-span-4 h-11 flex items-center justify-between px-2.5 border border-slate-800 rounded-lg bg-slate-950/40 text-slate-500 text-[9px] font-bold font-mono shadow-inner">
                <span className="tracking-wider">NUMPAD</span>
                <div className="flex gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${keyStates['NumLock'] === 'pressed' || keyStates['NumLock'] === 'tested' ? 'bg-emerald-400 shadow-[0_0_5px_#10b981]' : 'bg-slate-800'}`} title="Num Lock LED" />
                  <span className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${keyStates['CapsLock'] === 'pressed' || keyStates['CapsLock'] === 'tested' ? 'bg-blue-400 shadow-[0_0_5px_#3b82f6]' : 'bg-slate-800'}`} title="Caps Lock LED" />
                  <span className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${keyStates['ScrollLock'] === 'pressed' || keyStates['ScrollLock'] === 'tested' ? 'bg-purple-400 shadow-[0_0_5px_#a855f7]' : 'bg-slate-800'}`} title="Scroll Lock LED" />
                </div>
              </div>

              {/* Row 1 */}
              <div 
                className={`col-start-1 row-start-2 ${getKeyClasses('NumLock')}`} 
                onClick={() => handleKeyManualToggle('NumLock')}
                onContextMenu={(e) => { e.preventDefault(); handleKeyManualToggle('NumLock'); }}
              >
                {renderKeyLabel(showCodes ? 'NumLock' : 'Num', 'NumLock')}
              </div>
              <div 
                className={`col-start-2 row-start-2 ${getKeyClasses('NumpadDivide')}`} 
                onClick={() => handleKeyManualToggle('NumpadDivide')}
                onContextMenu={(e) => { e.preventDefault(); handleKeyManualToggle('NumpadDivide'); }}
              >
                {renderKeyLabel('/', 'NumpadDivide')}
              </div>
              <div 
                className={`col-start-3 row-start-2 ${getKeyClasses('NumpadMultiply')}`} 
                onClick={() => handleKeyManualToggle('NumpadMultiply')}
                onContextMenu={(e) => { e.preventDefault(); handleKeyManualToggle('NumpadMultiply'); }}
              >
                {renderKeyLabel('*', 'NumpadMultiply')}
              </div>
              <div 
                className={`col-start-4 row-start-2 ${getKeyClasses('NumpadSubtract')}`} 
                onClick={() => handleKeyManualToggle('NumpadSubtract')}
                onContextMenu={(e) => { e.preventDefault(); handleKeyManualToggle('NumpadSubtract'); }}
              >
                {renderKeyLabel('-', 'NumpadSubtract')}
              </div>

              {/* Row 2 */}
              <div 
                className={`col-start-1 row-start-3 ${getKeyClasses('Numpad7')}`} 
                onClick={() => handleKeyManualToggle('Numpad7')}
                onContextMenu={(e) => { e.preventDefault(); handleKeyManualToggle('Numpad7'); }}
              >
                {renderKeyLabel(showCodes ? 'Numpad7' : '7', 'Numpad7')}
              </div>
              <div 
                className={`col-start-2 row-start-3 ${getKeyClasses('Numpad8')}`} 
                onClick={() => handleKeyManualToggle('Numpad8')}
                onContextMenu={(e) => { e.preventDefault(); handleKeyManualToggle('Numpad8'); }}
              >
                {renderKeyLabel(showCodes ? 'Numpad8' : '8', 'Numpad8')}
              </div>
              <div 
                className={`col-start-3 row-start-3 ${getKeyClasses('Numpad9')}`} 
                onClick={() => handleKeyManualToggle('Numpad9')}
                onContextMenu={(e) => { e.preventDefault(); handleKeyManualToggle('Numpad9'); }}
              >
                {renderKeyLabel(showCodes ? 'Numpad9' : '9', 'Numpad9')}
              </div>

              {/* Numpad Add spanning Row 3 & 4 */}
              <div 
                className={`col-start-4 row-start-3 row-span-2 h-full ${getKeyClasses('NumpadAdd')}`}
                onClick={() => handleKeyManualToggle('NumpadAdd')}
                onContextMenu={(e) => { e.preventDefault(); handleKeyManualToggle('NumpadAdd'); }}
              >
                {renderKeyLabel('+', 'NumpadAdd')}
              </div>

              {/* Row 3 */}
              <div 
                className={`col-start-1 row-start-4 ${getKeyClasses('Numpad4')}`} 
                onClick={() => handleKeyManualToggle('Numpad4')}
                onContextMenu={(e) => { e.preventDefault(); handleKeyManualToggle('Numpad4'); }}
              >
                {renderKeyLabel(showCodes ? 'Numpad4' : '4', 'Numpad4')}
              </div>
              <div 
                className={`col-start-2 row-start-4 ${getKeyClasses('Numpad5')}`} 
                onClick={() => handleKeyManualToggle('Numpad5')}
                onContextMenu={(e) => { e.preventDefault(); handleKeyManualToggle('Numpad5'); }}
              >
                {renderKeyLabel(showCodes ? 'Numpad5' : '5', 'Numpad5')}
              </div>
              <div 
                className={`col-start-3 row-start-4 ${getKeyClasses('Numpad6')}`} 
                onClick={() => handleKeyManualToggle('Numpad6')}
                onContextMenu={(e) => { e.preventDefault(); handleKeyManualToggle('Numpad6'); }}
              >
                {renderKeyLabel(showCodes ? 'Numpad6' : '6', 'Numpad6')}
              </div>

              {/* Row 4 */}
              <div 
                className={`col-start-1 row-start-5 ${getKeyClasses('Numpad1')}`} 
                onClick={() => handleKeyManualToggle('Numpad1')}
                onContextMenu={(e) => { e.preventDefault(); handleKeyManualToggle('Numpad1'); }}
              >
                {renderKeyLabel(showCodes ? 'Numpad1' : '1', 'Numpad1')}
              </div>
              <div 
                className={`col-start-2 row-start-5 ${getKeyClasses('Numpad2')}`} 
                onClick={() => handleKeyManualToggle('Numpad2')}
                onContextMenu={(e) => { e.preventDefault(); handleKeyManualToggle('Numpad2'); }}
              >
                {renderKeyLabel(showCodes ? 'Numpad2' : '2', 'Numpad2')}
              </div>
              <div 
                className={`col-start-3 row-start-5 ${getKeyClasses('Numpad3')}`} 
                onClick={() => handleKeyManualToggle('Numpad3')}
                onContextMenu={(e) => { e.preventDefault(); handleKeyManualToggle('Numpad3'); }}
              >
                {renderKeyLabel(showCodes ? 'Numpad3' : '3', 'Numpad3')}
              </div>

              {/* Numpad Enter spanning Row 5 & 6 */}
              <div 
                className={`col-start-4 row-start-5 row-span-2 h-full ${getKeyClasses('NumpadEnter')}`}
                onClick={() => handleKeyManualToggle('NumpadEnter')}
                onContextMenu={(e) => { e.preventDefault(); handleKeyManualToggle('NumpadEnter'); }}
              >
                {renderKeyLabel('Enter', 'NumpadEnter')}
              </div>

              {/* Row 5 */}
              <div 
                className={`col-start-1 col-span-2 row-start-6 ${getKeyClasses('Numpad0')}`}
                onClick={() => handleKeyManualToggle('Numpad0')}
                onContextMenu={(e) => { e.preventDefault(); handleKeyManualToggle('Numpad0'); }}
              >
                {renderKeyLabel(showCodes ? 'Numpad0' : '0', 'Numpad0')}
              </div>
              <div 
                className={`col-start-3 row-start-6 ${getKeyClasses('NumpadDecimal')}`} 
                onClick={() => handleKeyManualToggle('NumpadDecimal')}
                onContextMenu={(e) => { e.preventDefault(); handleKeyManualToggle('NumpadDecimal'); }}
              >
                {renderKeyLabel(showCodes ? 'NumpadDecimal' : '.', 'NumpadDecimal')}
              </div>
            </div>
          </div>
        </div>

        {/* Event Console & Instruction Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Instructions Box */}
          <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-zinc-250 flex items-center gap-2 mb-3 tracking-widest uppercase font-mono">
                <Info size={14} className="text-amber-500" />
                Technician Instructions
              </h3>
              <ul className="text-xs text-zinc-455 space-y-2 list-disc list-inside leading-relaxed">
                <li>Ketuk tombol apa saja pada keyboard untuk memetakan penekanan.</li>
                <li>Tombol yang merespon dengan benar akan ditandai dengan warna <span className="text-emerald-400 font-semibold">Hijau Tua</span>.</li>
                <li><span className="text-red-400 font-semibold">Klik Kanan</span> pada visualizer tombol untuk menandai tombol yang rusak / terputus (<span className="text-red-500 font-bold">Merah</span>).</li>
                <li>Gunakan filter <span className="text-amber-500 font-semibold">Buka Kode</span> untuk membaca identitas event pemetaan keycode JS.</li>
              </ul>
            </div>
            <div className="mt-4 border-t border-zinc-800/50 pt-3">
              <p className="text-[9px] text-zinc-500 leading-normal font-mono">
                CATATAN: Kebijakan keamanan browser memblokir penangkapan pintasan global OS (seperti Win Key, Ctrl+Alt+Del, PrintScreen).
              </p>
            </div>
          </div>

          {/* Event Stream Log Console */}
          <div className="glass-panel p-5 rounded-2xl flex flex-col lg:col-span-2">
            <h3 className="text-xs font-bold font-mono tracking-widest text-zinc-200 uppercase mb-3 flex justify-between items-center">
              <span>Event Stream Log (Live Monitoring)</span>
              <span className="text-[9px] font-normal text-zinc-500">Fast polling &lt;1ms active</span>
            </h3>
            
            <div className="flex-1 min-h-[140px] font-mono text-[11px] text-zinc-400 bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex flex-col justify-start gap-1.5 overflow-y-auto">
              {eventLog.length === 0 ? (
                <div className="h-full flex items-center justify-center text-zinc-600 italic">
                  Menunggu sinyal input keyboard...
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-zinc-500 border-b border-zinc-800 pb-1">
                      <th className="font-semibold py-0.5 text-[10px]">Time</th>
                      <th className="font-semibold py-0.5 text-[10px]">Event Code</th>
                      <th className="font-semibold py-0.5 text-[10px]">Logical Key</th>
                      <th className="font-semibold py-0.5 text-[10px]">Location</th>
                      <th className="font-semibold py-0.5 text-[10px]">Repeat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventLog.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-900/30 text-zinc-300">
                        <td className="py-0.5 text-zinc-550 text-[10px]">{log.time}</td>
                        <td className="py-0.5 font-bold text-emerald-400">{log.code}</td>
                        <td className="py-0.5 text-indigo-400">"{log.key}"</td>
                        <td className="py-0.5 text-zinc-500">{log.location}</td>
                        <td className="py-0.5 text-zinc-650">{log.repeat}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
