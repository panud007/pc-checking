import React, { useState, useEffect, useRef } from 'react';
import KeyboardTest from './components/KeyboardTest';
import MouseTest from './components/MouseTest';
import AudioTest from './components/AudioTest';
import DisplayTest from './components/DisplayTest';
import ServiceIntakeForm from './components/ServiceIntakeForm';
import {
  Keyboard,
  MousePointer,
  Monitor,
  Activity,
  Settings,
  CheckCircle,
  Globe,
  Sparkles,
  Volume2,
  FileText,
  User,
  Printer,
  X,
  Search,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://pc-checking-api-production.up.railway.app:8080/public/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('diagnostic'); // 'diagnostic' | 'intake'
  const [activeModule, setActiveModule] = useState('dashboard');
  const [isSequential, setIsSequential] = useState(false);
  const [showCompletionMsg, setShowCompletionMsg] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [completed, setCompleted] = useState({
    keyboard: false,
    mouse: false,
    audio: false,
    display: false
  });

  // Real-time parameters to compile the PDF Diagnostic report card
  const [reportData, setReportData] = useState({
    keyboard: { pressedCount: 0, deadKeys: [] },
    mouse: { leftClicked: false, rightClicked: false, middleClicked: false, scrollTested: false, chatterAlert: false },
    audio: { loopbackTested: false, noiseSuppressionEnabled: true, autoGainEnabled: true },
    display: { colorsTested: 0, defects: null }
  });

  const [reportMeta, setReportMeta] = useState({
    technicianName: 'Teknisi Pengecekan',
    customerName: 'Workplace PC User',
    deviceModel: 'Workstation',
    serialNumber: 'NT-' + Math.floor(100000 + Math.random() * 900000),
    notes: 'Unit passed standard entry diagnostics. Inputs responsive.'
  });

  const [diagnosticHistory, setDiagnosticHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('ALL'); // 'ALL' | 'PASSED' | 'DEFECT'
  const [reportCreatedAt, setReportCreatedAt] = useState(null);

  // DB Sync states
  const [isDbConnected, setIsDbConnected] = useState(null);
  const [printWithoutNota, setPrintWithoutNota] = useState(false);
  const isFirstMount = useRef(true);

  const [systemInfo, setSystemInfo] = useState({
    os: 'Unknown OS',
    browser: 'Unknown Browser',
    resolution: 'Unknown',
    pixelRatio: '1.0',
    colorDepth: '24',
    language: 'en-US',
    online: true
  });

  const [hasManuallyEditedNotes, setHasManuallyEditedNotes] = useState(false);

  const getUpdatedNotes = (currentNotes, completedState, reportState) => {
    const issues = [];
    if (completedState.keyboard && reportState.keyboard.deadKeys && reportState.keyboard.deadKeys.length > 0) {
      issues.push("Keyboard");
    }
    if (completedState.mouse && reportState.mouse.chatterAlert) {
      issues.push("Mouse");
    }
    if (completedState.display && reportState.display.defects && (reportState.display.defects.hasDeadPixels || reportState.display.defects.hasBacklightBleed)) {
      issues.push("Display");
    }

    let concludingLine = "";
    if (issues.length > 0) {
      concludingLine = `Unit failed standard entry diagnostics. Issues detected in: ${issues.join(', ')}.`;
    } else if (completedState.keyboard || completedState.mouse || completedState.display || completedState.audio) {
      concludingLine = "Unit passed standard entry diagnostics. Inputs responsive.";
    } else {
      concludingLine = "Unit diagnostic in progress. Awaiting test completions.";
    }

    const conclusions = [
      /Unit passed standard entry diagnostics\. Inputs responsive\./i,
      /Unit failed standard entry diagnostics\. Issues detected in:.*?\./i,
      /Unit diagnostic in progress\. Awaiting test completions\./i
    ];

    let updated = currentNotes;
    let replaced = false;
    for (const regex of conclusions) {
      if (regex.test(updated)) {
        updated = updated.replace(regex, concludingLine);
        replaced = true;
        break;
      }
    }

    if (!replaced) {
      if (updated.trim().length > 0) {
        updated = updated.trim() + "\n\n" + concludingLine;
      } else {
        updated = concludingLine;
      }
    }

    return updated;
  };

  useEffect(() => {
    if (hasManuallyEditedNotes) return;
    setReportMeta(prev => {
      const nextNotes = getUpdatedNotes(prev.notes, completed, reportData);
      if (nextNotes !== prev.notes) {
        return { ...prev, notes: nextNotes };
      }
      return prev;
    });
  }, [completed, reportData, hasManuallyEditedNotes]);

  const fetchDiagnosticHistory = async (query = '') => {
    setIsLoadingHistory(true);
    const apiEndpoint = `${API_BASE_URL}/diagnostics?search=${encodeURIComponent(query)}`;
    try {
      const response = await fetch(apiEndpoint);
      if (!response.ok) throw new Error('API server returned error');
      const data = await response.json();
      setDiagnosticHistory(data);
      setIsDbConnected(true);
    } catch (err) {
      console.warn('API error, falling back to local storage:', err);
      setIsDbConnected(false);

      const stored = localStorage.getItem('hardware_checker_history');
      if (stored) {
        setDiagnosticHistory(JSON.parse(stored));
      } else {
        setDiagnosticHistory([]);
      }
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Debounced search query changes & mount check
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      fetchDiagnosticHistory('');
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      fetchDiagnosticHistory(historySearchQuery);
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [historySearchQuery]);

  const handleSaveReport = async () => {
    const hasIssues = (completed.display && reportData.display.defects && (reportData.display.defects.hasDeadPixels || reportData.display.defects.hasBacklightBleed)) ||
      (completed.keyboard && reportData.keyboard.deadKeys && reportData.keyboard.deadKeys.length > 0) ||
      (completed.mouse && reportData.mouse.chatterAlert);
    const status = hasIssues ? 'DEFECT' : 'PASSED';

    const newReport = {
      ticket_id: reportMeta.serialNumber,
      technician_name: reportMeta.technicianName,
      customer_name: reportMeta.customerName,
      device_model: reportMeta.deviceModel || 'Workstation',
      specs: {},
      test_results: { completed, reportData },
      notes: reportMeta.notes,
      status: status,
      created_at: new Date().toISOString()
    };

    // 1. Save to LocalStorage (Always)
    try {
      const stored = localStorage.getItem('hardware_checker_history');
      let history = stored ? JSON.parse(stored) : [];

      const index = history.findIndex(item => item.ticket_id === reportMeta.serialNumber);
      if (index !== -1) {
        history[index] = newReport;
      } else {
        history.unshift(newReport);
      }

      localStorage.setItem('hardware_checker_history', JSON.stringify(history));
      if (!isDbConnected) {
        setDiagnosticHistory(history);
      }
    } catch (err) {
      console.error('Error saving local report:', err);
    }

    // 2. Save to Laravel API DB (Async)
    try {
      const response = await fetch(`${API_BASE_URL}/diagnostics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(newReport)
      });

      if (!response.ok) throw new Error('Failed to save report to database');

      setIsDbConnected(true);
      fetchDiagnosticHistory(historySearchQuery);
    } catch (err) {
      console.warn('Could not save diagnostic report to database.', err);
      setIsDbConnected(false);
    }

    window.print();
  };

  const handleDeleteReport = async (ticketId) => {
    // 1. Delete from LocalStorage (Always)
    try {
      const stored = localStorage.getItem('hardware_checker_history');
      if (stored) {
        let history = JSON.parse(stored);
        history = history.filter(item => item.ticket_id !== ticketId);
        localStorage.setItem('hardware_checker_history', JSON.stringify(history));
        if (!isDbConnected) {
          setDiagnosticHistory(history);
        }
      }
    } catch (err) {
      console.error('Error deleting local report:', err);
    }

    // 2. Delete from remote Laravel API DB (Async)
    try {
      const response = await fetch(`${API_BASE_URL}/diagnostics/${ticketId}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to delete report from database');

      setIsDbConnected(true);
      fetchDiagnosticHistory(historySearchQuery);
    } catch (err) {
      console.warn('Could not delete report from database.', err);
      setIsDbConnected(false);
    }
  };

  const handleClearAllHistory = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus seluruh riwayat diagnosa lokal? Catatan di database tidak akan terpengaruh.')) {
      try {
        localStorage.removeItem('hardware_checker_history');
        if (!isDbConnected) {
          setDiagnosticHistory([]);
        } else {
          fetchDiagnosticHistory(historySearchQuery);
        }
      } catch (err) {
        console.error('Error clearing history:', err);
      }
    }
  };

  const handleRePrint = (ticket) => {
    setReportMeta({
      technicianName: ticket.technician_name,
      customerName: ticket.customer_name,
      deviceModel: ticket.device_model || 'Workstation',
      serialNumber: ticket.ticket_id,
      notes: ticket.notes || ''
    });
    if (ticket.test_results) {
      if (ticket.test_results.completed) {
        setCompleted(ticket.test_results.completed);
      }
      if (ticket.test_results.reportData) {
        setReportData(ticket.test_results.reportData);
      }
    }
    setHasManuallyEditedNotes(true);
    setReportCreatedAt(ticket.created_at);
    setShowReportModal(true);
  };

  // Gather system details on load
  useEffect(() => {
    const getOS = () => {
      const userAgent = window.navigator.userAgent;
      if (userAgent.indexOf("Windows NT 10.0") !== -1) return "Windows 10/11";
      if (userAgent.indexOf("Windows NT 6.2") !== -1) return "Windows 8";
      if (userAgent.indexOf("Windows NT 6.1") !== -1) return "Windows 7";
      if (userAgent.indexOf("Macintosh") !== -1) return "macOS";
      if (userAgent.indexOf("Linux") !== -1) return "Linux";
      if (userAgent.indexOf("Android") !== -1) return "Android OS";
      if (userAgent.indexOf("like Mac") !== -1) return "iOS";
      return "Generic OS";
    };

    const getBrowser = () => {
      const userAgent = window.navigator.userAgent;
      if (userAgent.indexOf("Chrome") !== -1 && userAgent.indexOf("Edg") === -1) return "Google Chrome";
      if (userAgent.indexOf("Safari") !== -1 && userAgent.indexOf("Chrome") === -1) return "Apple Safari";
      if (userAgent.indexOf("Firefox") !== -1) return "Mozilla Firefox";
      if (userAgent.indexOf("Edg") !== -1) return "Microsoft Edge";
      return "Standard Browser";
    };

    setSystemInfo({
      os: getOS(),
      browser: getBrowser(),
      resolution: `${window.screen.width} × ${window.screen.height}`,
      pixelRatio: window.devicePixelRatio ? window.devicePixelRatio.toFixed(1) : '1.0',
      colorDepth: window.screen.colorDepth ? `${window.screen.colorDepth}-bit` : '24-bit',
      language: window.navigator.language || 'en-US',
      online: window.navigator.onLine
    });

    const handleNetworkChange = () => {
      setSystemInfo(prev => ({ ...prev, online: window.navigator.onLine }));
    };

    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);
    return () => {
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
    };
  }, []);



  const handleStartSequential = () => {
    setIsSequential(true);
    setShowCompletionMsg(false);
    setCompleted({ keyboard: false, mouse: false, audio: false, display: false });
    // Reset report stats
    setReportData({
      keyboard: { pressedCount: 0, deadKeys: [] },
      mouse: { leftClicked: false, rightClicked: false, middleClicked: false, scrollTested: false, chatterAlert: false },
      audio: { loopbackTested: false, noiseSuppressionEnabled: true, autoGainEnabled: true },
      display: { colorsTested: 0, defects: null }
    });
    setReportMeta(prev => ({
      ...prev,
      serialNumber: 'NT-' + Math.floor(100000 + Math.random() * 900000),
      notes: 'Unit passed standard entry diagnostics. Inputs responsive.'
    }));
    setHasManuallyEditedNotes(false);
    setReportCreatedAt(null);
    setActiveModule('keyboard');
  };

  const handleNextFromKeyboard = (stats) => {
    if (stats) {
      setReportData(prev => ({ ...prev, keyboard: stats }));
    }
    setCompleted(prev => ({ ...prev, keyboard: true }));
    setActiveModule('mouse');
  };

  const handleNextFromMouse = (stats) => {
    if (stats) {
      setReportData(prev => ({ ...prev, mouse: stats }));
    }
    setCompleted(prev => ({ ...prev, mouse: true }));
    setActiveModule('audio');
  };

  const handleNextFromAudio = (stats) => {
    if (stats) {
      setReportData(prev => ({ ...prev, audio: stats }));
    }
    setCompleted(prev => ({ ...prev, audio: true }));
    setActiveModule('display');
  };

  const handleFinishDisplay = (stats) => {
    if (stats) {
      setReportData(prev => ({ ...prev, display: stats }));
    }
    setCompleted(prev => ({ ...prev, display: true }));
    if (isSequential) {
      setIsSequential(false);
      setShowCompletionMsg(true);
      // Auto dismiss success overlay after 6 seconds
      setTimeout(() => setShowCompletionMsg(false), 6000);
    }
    setActiveModule('dashboard');
  };

  const handleBackToDashboard = (stats) => {
    setCompleted(prev => {
      const next = { ...prev };
      if (activeModule === 'keyboard') next.keyboard = true;
      if (activeModule === 'mouse') next.mouse = true;
      if (activeModule === 'audio') next.audio = true;
      if (activeModule === 'display') next.display = true;
      return next;
    });

    if (stats) {
      setReportData(prev => ({
        ...prev,
        [activeModule]: stats
      }));
    }

    setIsSequential(false);
    setActiveModule('dashboard');
  };

  // Render intake form tab
  if (activeTab === 'intake') {
    return <ServiceIntakeForm
      onBack={() => setActiveTab('diagnostic')}
      diagnosticCompleted={completed}
      diagnosticReportData={reportData}
      onStartTest={(moduleName) => {
        setActiveTab('diagnostic');
        setActiveModule(moduleName);
      }}
    />;
  }


  // Render active component
  if (activeModule === 'keyboard') {
    return (
      <KeyboardTest
        onBack={handleBackToDashboard}
        onNext={handleNextFromKeyboard}
        isSequential={isSequential}
      />
    );
  }

  if (activeModule === 'mouse') {
    return (
      <MouseTest
        onBack={handleBackToDashboard}
        onNext={handleNextFromMouse}
        isSequential={isSequential}
      />
    );
  }

  if (activeModule === 'audio') {
    return (
      <AudioTest
        onBack={handleBackToDashboard}
        onNext={handleNextFromAudio}
        isSequential={isSequential}
      />
    );
  }

  if (activeModule === 'display') {
    return (
      <DisplayTest
        onBack={handleFinishDisplay}
      />
    );
  }

  const filteredHistory = (diagnosticHistory || []).filter(ticket => {
    if (!ticket) return false;
    const matchesSearch =
      (ticket.ticket_id?.toLowerCase() || '').includes(historySearchQuery.toLowerCase()) ||
      (ticket.customer_name?.toLowerCase() || '').includes(historySearchQuery.toLowerCase()) ||
      (ticket.device_model?.toLowerCase() || '').includes(historySearchQuery.toLowerCase()) ||
      (ticket.technician_name?.toLowerCase() || '').includes(historySearchQuery.toLowerCase());

    if (historyStatusFilter === 'ALL') return matchesSearch;
    return matchesSearch && ticket.status === historyStatusFilter;
  });
  return (
    <>
      <div className="diagnostic-screen w-full flex-1 flex flex-col bg-[#09090b] text-zinc-100 p-4 md:p-8 relative overflow-hidden font-sans">

        {/* Main Container */}
        <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col justify-between gap-6 z-10">
          {/* Header Section */}
          <div className="glass-panel border-zinc-800/80 px-6 py-4.5 rounded-2xl flex flex-col gap-4 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-zinc-800 flex items-center justify-center border border-zinc-700">
                  <Settings size={22} className="text-zinc-200" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2.5 font-display">
                    PC Quick Diagnostic Tool
                    <span className="text-[9px] bg-zinc-800 text-zinc-350 border border-zinc-700 px-2 py-0.5 rounded font-mono font-bold tracking-widest uppercase">
                      v1.2.0 PRO
                    </span>
                  </h1>
                  <p className="text-[11px] text-zinc-400 mt-0.5">High-performance client-side testing suite for hardware technicians</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 w-full sm:w-auto justify-between sm:justify-end">
                <button
                  onClick={() => {
                    setReportMeta(prev => ({
                      ...prev,
                      serialNumber: 'NT-' + Math.floor(100000 + Math.random() * 900000)
                    }));
                    setReportCreatedAt(null);
                    setShowReportModal(true);
                  }}
                  className="px-4.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all duration-350 flex items-center gap-2 active:scale-95 border border-indigo-500/30 font-sans shadow-sm"
                >
                  <FileText size={15} />
                  Cetak Laporan PDF
                </button>

                <div className="h-9 px-3 rounded-xl bg-zinc-900 border border-zinc-800/60 flex items-center gap-2 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  <span className="text-[9px] font-mono text-zinc-450 font-bold uppercase tracking-widest">
                    CORE ONLINE
                  </span>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 border-t border-zinc-800/50 pt-3.5">
              <button
                onClick={() => setActiveTab('diagnostic')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${activeTab === 'diagnostic'
                    ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/25'
                    : 'text-zinc-500 hover:text-zinc-350 hover:bg-zinc-900/60 border border-transparent'
                  }`}
              >
                <Activity size={13} />
                Diagnosa Hardware
              </button>
              <button
                onClick={() => setActiveTab('intake')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${activeTab === 'intake'
                    ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/25'
                    : 'text-zinc-500 hover:text-zinc-350 hover:bg-zinc-900/60 border border-transparent'
                  }`}
              >
                <FileText size={13} />
                Form Penerimaan Unit
              </button>
            </div>
          </div>

          {/* Completion Alert */}
          {showCompletionMsg && (
            <div className="bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 p-4.5 rounded-2xl flex items-center gap-3.5 shadow-[0_4px_20px_rgba(16,185,129,0.1)] animate-fade-in">
              <CheckCircle className="text-emerald-400 shrink-0 shadow-[0_0_10px_#10b981]" size={20} />
              <div className="text-xs">
                <span className="font-bold text-white">Full Sequential Diagnostic Completed!</span> Keyboard matrix checks, mouse tracking precision, feedback loops, and display subpixels were verified successfully.
              </div>
              <button
                onClick={() => setShowCompletionMsg(false)}
                className="ml-auto text-[10px] font-bold text-emerald-400 hover:text-emerald-300 uppercase tracking-widest border border-emerald-500/20 px-2.5 py-1 rounded-lg bg-emerald-950/50"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Core Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

            {/* Diagnostic Modules List (Left Column) */}
            <div className="col-span-1 lg:col-span-8 flex flex-col gap-5 justify-start">

              {/* Sequential Hero Banner */}
              <div
                onClick={handleStartSequential}
                className="group relative cursor-pointer bg-zinc-900 border border-zinc-800 hover:border-indigo-500/40 rounded-2xl p-5 shadow-sm transition-all duration-300 flex justify-between items-center overflow-hidden"
              >
                <div className="flex items-center gap-4 z-10">
                  <div className="h-12 w-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center group-hover:scale-105 transition-transform duration-300 border border-indigo-500/20">
                    <Activity size={22} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white group-hover:text-indigo-400 transition-colors tracking-tight font-display">
                      MULAI DIAGNOSIS BERUNTUN (SEQUENTIAL RUN)
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-1 max-w-md leading-normal font-sans">
                      Rekomendasi teknisi. Membimbing pengetesan terstruktur: <span className="font-semibold text-zinc-300">Keyboard</span> → <span className="font-semibold text-zinc-300">Mouse</span> → <span className="font-semibold text-zinc-300">Audio</span> → <span className="font-semibold text-zinc-300">Layar</span>.
                    </p>
                  </div>
                </div>

                <div className="h-8 w-8 rounded-full border border-zinc-850 flex items-center justify-center text-zinc-400 group-hover:bg-indigo-650 group-hover:text-white group-hover:border-indigo-500 transition-all duration-300">
                  <Sparkles size={14} />
                </div>
              </div>

              {/* Diagnostic Telemetry Console (Middle Panel) */}
              {(() => {
                const completedCount = Object.values(completed).filter(Boolean).length;
                const progressPercent = Math.round((completedCount / 4) * 100);
                const hasIssues = (completed.display && reportData.display.defects && (reportData.display.defects.hasDeadPixels || reportData.display.defects.hasBacklightBleed)) ||
                  (completed.keyboard && reportData.keyboard.deadKeys && reportData.keyboard.deadKeys.length > 0) ||
                  (completed.mouse && reportData.mouse.chatterAlert);
                return (
                  <div className="glass-panel border-zinc-800/80 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-5 relative overflow-hidden">

                    <div className="flex items-center gap-4.5 z-10 w-full sm:w-auto">
                      {/* Progress Radial SVG */}
                      <div className="relative h-16 w-16 flex items-center justify-center shrink-0">
                        <svg className="w-16 h-16 transform -rotate-90">
                          {/* Background circle */}
                          <circle
                            cx="32"
                            cy="32"
                            r="26"
                            stroke="#18181b"
                            strokeWidth="4"
                            fill="transparent"
                          />
                          {/* Foreground circle with animation */}
                          <circle
                            cx="32"
                            cy="32"
                            r="26"
                            stroke={progressPercent === 100 ? '#10b981' : progressPercent > 0 ? '#4f46e5' : '#27272a'}
                            strokeWidth="4"
                            fill="transparent"
                            strokeDasharray={2 * Math.PI * 26}
                            strokeDashoffset={2 * Math.PI * 26 * (1 - progressPercent / 100)}
                            className="transition-all duration-500 ease-out"
                          />
                        </svg>
                        <span className={`absolute text-xs font-black font-mono tracking-tight ${progressPercent === 100 ? 'text-emerald-450' : progressPercent > 0 ? 'text-indigo-400' : 'text-zinc-500'}`}>{progressPercent}%</span>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-zinc-350 tracking-wider uppercase font-mono">Status Progres Uji</h4>
                        <div className="flex flex-wrap gap-2.5 mt-1.5 text-[10px] font-mono text-zinc-400">
                          <span className={`flex items-center gap-1 ${completed.keyboard ? 'text-emerald-455 font-bold' : 'text-zinc-650'}`}>
                            [KB: {completed.keyboard ? 'OK' : '-'}]
                          </span>
                          <span className={`flex items-center gap-1 ${completed.mouse ? 'text-indigo-400 font-bold' : 'text-zinc-650'}`}>
                            [MS: {completed.mouse ? 'OK' : '-'}]
                          </span>
                          <span className={`flex items-center gap-1 ${completed.audio ? 'text-indigo-400 font-bold' : 'text-zinc-650'}`}>
                            [AD: {completed.audio ? 'OK' : '-'}]
                          </span>
                          <span className={`flex items-center gap-1 ${completed.display ? 'text-indigo-400 font-bold' : 'text-zinc-650'}`}>
                            [DS: {completed.display ? 'OK' : '-'}]
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Dynamic Health Index Status */}
                    <div className="flex flex-col items-end text-right z-10 w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-zinc-800/40 pt-3.5 sm:pt-0 sm:pl-5">
                      <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest font-mono">DIAGNOSTIC HEALTH STATUS</span>
                      <span className={`text-sm font-black tracking-tight mt-1 ${progressPercent === 0
                          ? 'text-zinc-500'
                          : hasIssues
                            ? 'text-rose-450'
                            : 'text-emerald-450'
                        }`}>
                        {progressPercent === 0
                          ? 'WAITING TESTS...'
                          : hasIssues
                            ? '⚠ ISSUES DETECTED'
                            : '✓ SYSTEM PASS'}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Standalone Modules Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Keyboard Card */}
                <div
                  onClick={() => { setShowCompletionMsg(false); setActiveModule('keyboard'); }}
                  className="group cursor-pointer glass-panel neon-border-emerald p-5 rounded-2xl flex flex-col justify-between gap-5 hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="flex justify-between items-start">
                    <div className="h-10 w-10 rounded-xl bg-zinc-950 text-emerald-400 flex items-center justify-center border border-zinc-800 shadow-sm">
                      <Keyboard size={18} />
                    </div>
                    {completed.keyboard ? (
                      <span className="text-[8px] font-mono font-bold text-emerald-400 uppercase bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1 shadow-sm">
                        Selesai
                      </span>
                    ) : (
                      <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase bg-zinc-950/60 px-2 py-0.5 rounded border border-zinc-800">
                        Belum Diuji
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-200 group-hover:text-emerald-450 transition-colors text-xs font-display">Keyboard Matrix</h4>
                    <p className="text-[10px] text-zinc-400 mt-1.5 leading-normal font-sans">Visualisasi 104-key ANSI layout. Menguji respon penekanan dan key roll-over.</p>
                  </div>
                </div>

                {/* Mouse Card */}
                <div
                  onClick={() => { setShowCompletionMsg(false); setActiveModule('mouse'); }}
                  className="group cursor-pointer glass-panel neon-border-blue p-5 rounded-2xl flex flex-col justify-between gap-5 hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="flex justify-between items-start">
                    <div className="h-10 w-10 rounded-xl bg-zinc-950 text-blue-400 flex items-center justify-center border border-zinc-800 shadow-sm">
                      <MousePointer size={18} />
                    </div>
                    {completed.mouse ? (
                      <span className="text-[8px] font-mono font-bold text-blue-400 uppercase bg-blue-950/40 px-2 py-0.5 rounded border border-blue-500/20 flex items-center gap-1 shadow-sm">
                        Selesai
                      </span>
                    ) : (
                      <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase bg-zinc-950/60 px-2 py-0.5 rounded border border-zinc-800">
                        Belum Diuji
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-200 group-hover:text-blue-450 transition-colors text-xs font-display">Sensor & Tombol Mouse</h4>
                    <p className="text-[10px] text-zinc-400 mt-1.5 leading-normal font-sans">Uji switch tombol, polling rate Hz, serta pendeteksi chatter/bouncing kontak.</p>
                  </div>
                </div>

                {/* Audio Card */}
                <div
                  onClick={() => { setShowCompletionMsg(false); setActiveModule('audio'); }}
                  className="group cursor-pointer glass-panel neon-border-purple p-5 rounded-2xl flex flex-col justify-between gap-5 hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="flex justify-between items-start">
                    <div className="h-10 w-10 rounded-xl bg-zinc-950 text-purple-400 flex items-center justify-center border border-zinc-800 shadow-sm">
                      <Volume2 size={18} />
                    </div>
                    {completed.audio ? (
                      <span className="text-[8px] font-mono font-bold text-purple-400 uppercase bg-purple-950/40 px-2 py-0.5 rounded border border-purple-500/20 flex items-center gap-1 shadow-sm">
                        Selesai
                      </span>
                    ) : (
                      <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase bg-zinc-950/60 px-2 py-0.5 rounded border border-zinc-800">
                        Belum Diuji
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-200 group-hover:text-purple-450 transition-colors text-xs font-display">Audio & Mikrofon</h4>
                    <p className="text-[10px] text-zinc-400 mt-1.5 leading-normal font-sans">Loopback suara mikrofon real-time dengan peredam bising & uji stereo balance.</p>
                  </div>
                </div>

                {/* Display Card */}
                <div
                  onClick={() => { setShowCompletionMsg(false); setActiveModule('display'); }}
                  className="group cursor-pointer glass-panel neon-border-rose p-5 rounded-2xl flex flex-col justify-between gap-5 hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="flex justify-between items-start">
                    <div className="h-10 w-10 rounded-xl bg-zinc-950 text-rose-450 flex items-center justify-center border border-zinc-800 shadow-sm">
                      <Monitor size={18} />
                    </div>
                    {completed.display ? (
                      <span className="text-[8px] font-mono font-bold text-rose-400 uppercase bg-rose-950/40 px-2 py-0.5 rounded border border-rose-500/20 flex items-center gap-1 shadow-sm">
                        Selesai
                      </span>
                    ) : (
                      <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase bg-zinc-950/60 px-2 py-0.5 rounded border border-zinc-800">
                        Belum Diuji
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-200 group-hover:text-rose-450 transition-colors text-xs font-display">Kalibrasi Layar</h4>
                    <p className="text-[10px] text-zinc-400 mt-1.5 leading-normal font-sans">Cari sub-piksel mati/terjebak menggunakan warna murni & grid geometri.</p>
                  </div>
                </div>

              </div>
            </div>

            {/* System Info Sidebar (Right Column) */}
            <div className="col-span-1 lg:col-span-4 glass-panel border-zinc-800/80 p-5 rounded-2xl flex flex-col justify-between gap-5 shadow-sm relative">
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-4 border-b border-zinc-800/60 pb-2.5">
                  <span className="text-[10px] font-bold font-mono tracking-wider text-indigo-400">
                    METADATA LINGKUNGAN PENGUJIAN
                  </span>
                  <Globe size={13} className="text-indigo-400" />
                </div>

                {/* WEB ENVIRONMENT DETAILS */}
                <div className="space-y-3 font-mono text-[11px] bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/60">
                  <div className="flex justify-between items-center dotted-row">
                    <span className="text-zinc-500">Host OS</span>
                    <span className="text-zinc-200 font-bold">{systemInfo.os}</span>
                  </div>
                  <div className="flex justify-between items-center dotted-row">
                    <span className="text-zinc-500">Browser</span>
                    <span className="text-zinc-350">{systemInfo.browser}</span>
                  </div>
                  <div className="flex justify-between items-center dotted-row">
                    <span className="text-zinc-500">Resolution</span>
                    <span className="text-slate-350">{systemInfo.resolution}</span>
                  </div>
                  <div className="flex justify-between items-center dotted-row">
                    <span className="text-slate-500">Pixel Ratio</span>
                    <span className="text-slate-350">{systemInfo.pixelRatio}x</span>
                  </div>
                  <div className="flex justify-between items-center dotted-row">
                    <span className="text-slate-500">Color Depth</span>
                    <span className="text-slate-350">{systemInfo.colorDepth}</span>
                  </div>
                  <div className="flex justify-between items-center dotted-row">
                    <span className="text-slate-500">Language</span>
                    <span className="text-slate-350">{systemInfo.language}</span>
                  </div>
                  <div className="flex justify-between items-center dotted-row">
                    <span className="text-slate-500">Network</span>
                    <span className={`font-bold ${systemInfo.online ? 'text-emerald-400' : 'text-amber-500'}`}>
                      {systemInfo.online ? 'CONNECTED' : 'OFFLINE'}
                    </span>
                  </div>
                </div>

                {/* Quick Status / Help */}
                <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/60 text-[11px] leading-relaxed text-zinc-400 mt-4">
                  <div className="flex items-center gap-1.5 text-zinc-200 font-bold mb-1.5">
                    <Globe size={13} className="text-indigo-400" />
                    <span>Zero Latency Testing</span>
                  </div>
                  Semua penangkapan aktivitas input melewati rendering langsung demi menjaga latensi di bawah 2ms. Aman diuji untuk display gaming hingga 360Hz.
                </div>
              </div>

            </div>
          </div>

          {/* Diagnostic History Section */}
          <div className="glass-panel border-zinc-800/80 p-6 rounded-2xl shadow-sm flex flex-col gap-4 mt-2">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800/40 pb-4">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2.5 font-display">
                  <FileText size={18} className="text-indigo-400" />
                  RIWAYAT HASIL DIAGNOSA QUICK
                  <div className="flex items-center gap-1.5 bg-zinc-950 px-2 py-0.5 rounded-lg border border-zinc-850 shadow-sm ml-1.5 shrink-0">
                    <span className={`h-1.5 w-1.5 rounded-full ${isDbConnected === true ? 'bg-emerald-500' : isDbConnected === false ? 'bg-amber-500' : 'bg-zinc-600'} ${isDbConnected !== null ? 'animate-pulse' : ''}`}></span>
                    <span className="text-[8px] font-black font-mono text-zinc-400 tracking-wider uppercase">
                      {isDbConnected === true ? 'DB Sync: Online' : isDbConnected === false ? 'DB Sync: Local Fallback' : 'DB Sync: Checking...'}
                    </span>
                  </div>
                </h3>
                <p className="text-[10px] text-zinc-450 mt-0.5">
                  {isDbConnected ? 'Data disinkronisasikan ke database MySQL server secara otomatis.' : 'Menyimpan secara lokal pada browser Anda (Offline / Local Mode).'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[150px] sm:max-w-[240px]">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Cari tiket, pelanggan..."
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 transition-all font-medium"
                  />
                </div>
                {/* Status Filter */}
                <select
                  value={historyStatusFilter}
                  onChange={(e) => setHistoryStatusFilter(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-indigo-550 transition-all cursor-pointer font-medium"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="PASSED">Passed</option>
                  <option value="DEFECT">Defect</option>
                </select>
                {/* Clear All Button */}
                {diagnosticHistory.length > 0 && (
                  <button
                    onClick={handleClearAllHistory}
                    className="px-3.5 py-2 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 hover:border-rose-800/50 text-rose-455 text-xs font-bold rounded-xl transition-all active:scale-95"
                  >
                    Hapus Semua
                  </button>
                )}
              </div>
            </div>

            {isLoadingHistory ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 bg-zinc-950/20 rounded-xl border border-zinc-850/60">
                <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Memuat riwayat...</span>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500 italic bg-zinc-950/20 rounded-xl border border-zinc-850/60">
                {diagnosticHistory.length === 0 ? 'Belum ada riwayat pengujian tersimpan.' : 'Tidak ada riwayat yang cocok dengan pencarian Anda.'}
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800/60 text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Tanggal / Waktu</th>
                      <th className="py-3 px-4">No. Nota</th>
                      <th className="py-3 px-4">Pelanggan</th>
                      <th className="py-3 px-4">Teknisi</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((ticket) => (
                      <tr key={ticket.ticket_id} className="border-b border-zinc-900/40 hover:bg-zinc-900/10 transition-all">
                        <td className="py-3.5 px-4 font-mono text-zinc-400 text-[11px]">
                          {ticket.created_at ? new Date(ticket.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : 'Baru saja'}
                        </td>
                        <td className="py-3.5 px-4 font-bold font-mono text-white tracking-wide">{ticket.ticket_id}</td>
                        <td className="py-3.5 px-4 text-zinc-300 font-medium">{ticket.customer_name}</td>
                        <td className="py-3.5 px-4 text-zinc-400">{ticket.technician_name}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider ${ticket.status === 'DEFECT'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                            {ticket.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex gap-2.5 justify-end">
                            <button
                              onClick={() => handleRePrint(ticket)}
                              className="px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 text-[11px] font-bold rounded-lg transition-all active:scale-95 flex items-center gap-1.5"
                            >
                              <Printer size={12} />
                              Cetak Ulang
                            </button>
                            <button
                              onClick={() => handleDeleteReport(ticket.ticket_id)}
                              className="px-2 py-1.5 bg-rose-600/10 hover:bg-rose-600 text-rose-455 hover:text-white border border-rose-500/20 text-[11px] font-bold rounded-lg transition-all active:scale-95"
                              title="Hapus"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row justify-between items-center border-t border-slate-900 pt-5 text-[10px] text-slate-550 font-mono">
            <span>PC QUICK DIAGNOSTIC TOOL v1.2.0</span>
            <span className="mt-2 sm:mt-0 uppercase">SECURE SANDBOXED ENVIRONMENT • NO DATA TELEMETRY</span>
          </div>

        </div>
      </div>

      {/* Printable Report Preview Modal */}
      {showReportModal && (
        <div className="print-modal-overlay fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 md:p-6">
          <div className="print-modal-content bg-slate-900 border border-slate-800/80 rounded-2xl w-full max-w-6xl max-h-[94vh] flex flex-col p-5 shadow-2xl relative animate-fade-in">

            {/* Modal Header */}
            <div className="print-modal-header flex justify-between items-center pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.3)]" size={18} />
                  Diagnostic Service Report (Live A4 PDF Preview)
                </h3>
                <p className="text-[11px] text-slate-400">Sunting informasi perbaikan dan cetak tanda terima fisik/PDF secara instan</p>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-1.5 rounded-lg bg-slate-855 hover:bg-slate-800 text-slate-400 hover:text-white transition-all flex items-center justify-center border border-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content Grid */}
            <div className="print-modal-grid flex-1 grid grid-cols-1 md:grid-cols-12 gap-5 overflow-y-auto pr-1">

              {/* Left Form (4 cols) */}
              <div className="print-modal-left-col col-span-1 md:col-span-4 flex flex-col gap-3.5 text-xs bg-slate-950/60 p-4 rounded-xl border border-slate-800/40">
                <h4 className="font-bold text-slate-300 uppercase tracking-widest text-[9px] border-b border-slate-800/40 pb-1.5 flex items-center gap-1.5">
                  <User size={12} className="text-blue-400" />
                  Detail Laporan
                </h4>

                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider">Nama Teknisi</label>
                  <input
                    type="text"
                    value={reportMeta.technicianName}
                    onChange={(e) => setReportMeta(prev => ({ ...prev, technicianName: e.target.value }))}
                    className="bg-slate-950 border border-slate-850 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-xs transition-all font-medium"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider">Nama Pelanggan</label>
                  <input
                    type="text"
                    value={reportMeta.customerName}
                    onChange={(e) => setReportMeta(prev => ({ ...prev, customerName: e.target.value }))}
                    className="bg-slate-950 border border-slate-855 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-xs transition-all font-medium"
                  />
                </div>



                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider">Nomor Nota</label>
                  <input
                    type="text"
                    value={reportMeta.serialNumber}
                    onChange={(e) => setReportMeta(prev => ({ ...prev, serialNumber: e.target.value }))}
                    className="bg-slate-950 border border-slate-850 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-xs transition-all font-mono"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer bg-slate-950/40 p-2.5 rounded-lg border border-slate-850 mt-1">
                  <input
                    type="checkbox"
                    checked={printWithoutNota}
                    onChange={(e) => setPrintWithoutNota(e.target.checked)}
                    className="rounded border-slate-850 bg-slate-950 text-blue-500 focus:ring-0 cursor-pointer shadow-inner"
                  />
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cetak tanpa nomor nota (tulis manual)</span>
                </label>

                <div className="flex flex-col gap-1">
                  <label className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider">Catatan Perbaikan</label>
                  <textarea
                    rows={4}
                    value={reportMeta.notes}
                    onChange={(e) => {
                      setReportMeta(prev => ({ ...prev, notes: e.target.value }));
                      setHasManuallyEditedNotes(true);
                    }}
                    className="bg-slate-950 border border-slate-850 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-xs resize-none transition-all leading-normal"
                  />
                </div>

                <div className="mt-2.5 flex flex-col gap-2">
                  <button
                    onClick={handleSaveReport}
                    className="py-2.5 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-500 hover:to-indigo-600 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] border border-blue-400/20"
                  >
                    <Printer size={14} />
                    Cetak / Simpan PDF
                  </button>
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl text-xs transition-all"
                  >
                    Batal
                  </button>
                </div>
              </div>

              {/* Right Preview (8 cols) */}
              <div className="print-modal-right-col col-span-1 md:col-span-8 bg-slate-950 p-6 rounded-xl border border-slate-850 overflow-y-auto max-h-[66vh] flex justify-center shadow-inner relative">
                <div className="absolute top-2 left-3 text-[9px] font-mono text-slate-600 tracking-wider">A4 PAPER EMULATION MOCKUP</div>

                {/* The A4 Print Sheet */}
                <div
                  id="pdf-print-area"
                  className="w-[100%] max-w-[210mm] min-h-[297mm] bg-white text-slate-900 p-12 rounded shadow-2xl flex flex-col justify-between text-left font-sans text-xs border border-slate-300 relative overflow-hidden"
                >
                  <div>
                    {/* Decorative barcode strip */}
                    <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-blue-600 via-slate-900 to-emerald-500"></div>

                    {/* Report Header */}
                    <div className="flex justify-between items-start border-b border-slate-900 pb-5 mb-6">
                      <div>
                        <h1 className="text-lg font-black tracking-tight text-slate-950 uppercase font-mono">SERVICE DIAGNOSTIC REPORT</h1>
                        <p className="text-[10px] text-slate-500 font-bold tracking-wide uppercase mt-1">PRO SERVICE WORKSTATION • SUITE V1.2.0</p>
                      </div>
                      <div className="text-right text-[9px] text-slate-500 font-mono leading-relaxed">
                        <div>TANGGAL: {reportCreatedAt ? new Date(reportCreatedAt).toLocaleDateString() : new Date().toLocaleDateString()}</div>
                        <div>WAKTU: {reportCreatedAt ? new Date(reportCreatedAt).toLocaleTimeString() : new Date().toLocaleTimeString()}</div>
                      </div>
                    </div>

                    {/* Meta section */}
                    <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-100 p-4 rounded border border-slate-200 text-slate-800 text-left leading-normal">
                      <div>
                        <div className="text-[8px] uppercase font-bold tracking-widest text-slate-400 font-mono">Teknisi Penanggung Jawab</div>
                        <div className="font-bold text-slate-900 text-xs mt-0.5">{reportMeta.technicianName}</div>
                        <div className="text-[8px] uppercase font-bold tracking-widest text-slate-400 font-mono mt-3">Nama Pelanggan / User</div>
                        <div className="font-bold text-slate-900 text-xs mt-0.5">{reportMeta.customerName}</div>
                      </div>
                      <div>
                        <div className="text-[8px] uppercase font-bold tracking-widest text-slate-400 font-mono">Nomor Nota</div>
                        <div className="font-bold text-slate-900 font-mono text-xs mt-0.5">{printWithoutNota ? '........................' : reportMeta.serialNumber}</div>
                      </div>
                    </div>

                    {/* Test Results Table */}
                    <div className="mb-6">
                      <h4 className="text-[9px] font-bold uppercase tracking-wider text-slate-900 mb-2.5 border-b border-slate-900 pb-1">Rangkuman Hasil Tes Perangkat</h4>

                      <table className="w-full border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-[8px] uppercase text-slate-500 text-left font-bold font-mono">
                            <th className="py-2">Modul Uji</th>
                            <th className="py-2">Detail Parameter</th>
                            <th className="py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>

                          {/* Keyboard */}
                          <tr className="border-b border-slate-200 text-slate-850">
                            <td className="py-2.5 font-bold font-mono">Keyboard Matrix</td>
                            <td className="py-2.5 leading-relaxed">
                              {completed.keyboard ? (
                                <>
                                  Tombol ditekan: <span className="font-semibold">{reportData.keyboard.pressedCount} tombol</span>.
                                  Tombol rusak (Dead): <span className="font-semibold text-rose-600">{reportData.keyboard.deadKeys && reportData.keyboard.deadKeys.length > 0 ? reportData.keyboard.deadKeys.join(', ') : 'Tidak ada'}</span>.
                                </>
                              ) : (
                                <span className="text-slate-400 italic">Pengecekan dilewati (Untested)</span>
                              )}
                            </td>
                            <td className="py-2.5 font-bold">
                              {completed.keyboard ? (
                                <span className="text-emerald-600 font-bold">✓ PASSED</span>
                              ) : (
                                <span className="text-slate-400">- UNTESTED</span>
                              )}
                            </td>
                          </tr>

                          {/* Mouse */}
                          <tr className="border-b border-slate-200 text-slate-850">
                            <td className="py-2.5 font-bold font-mono">Mouse Sensor & Click</td>
                            <td className="py-2.5 leading-relaxed">
                              {completed.mouse ? (
                                <>
                                  Tombol terdaftar:
                                  <span className="font-semibold"> {reportData.mouse.leftClicked ? 'Klik Kiri' : ''}{reportData.mouse.rightClicked ? ', Klik Kanan' : ''}{reportData.mouse.middleClicked ? ', Klik Tengah' : ''}{reportData.mouse.scrollTested ? ', Scroll' : ''}</span>.
                                  Deteksi Chatter: <span className="font-semibold">{reportData.mouse.chatterAlert ? 'Ada Gangguan (Chatter Alert!)' : 'Normal / OK'}</span>.
                                </>
                              ) : (
                                <span className="text-slate-400 italic">Pengecekan dilewati (Untested)</span>
                              )}
                            </td>
                            <td className="py-2.5 font-bold">
                              {completed.mouse ? (
                                <span className={reportData.mouse.chatterAlert ? "text-amber-600 font-bold" : "text-emerald-600 font-bold"}>
                                  {reportData.mouse.chatterAlert ? '⚠ WARN (CHATTER)' : '✓ PASSED'}
                                </span>
                              ) : (
                                <span className="text-slate-400">- UNTESTED</span>
                              )}
                            </td>
                          </tr>

                          {/* Audio */}
                          <tr className="border-b border-slate-200 text-slate-850">
                            <td className="py-2.5 font-bold font-mono">Audio & Mic Loopback</td>
                            <td className="py-2.5 leading-relaxed">
                              {completed.audio ? (
                                <>
                                  Loopback Mic ke Speaker: <span className="font-semibold">{reportData.audio.loopbackTested ? 'Berhasil Diuji' : 'Belum Selesai'}</span>.
                                  Noise Suppression: <span className="font-semibold">{reportData.audio.noiseSuppressionEnabled ? 'Aktif' : 'Nonaktif'}</span>.
                                  Auto Gain (AGC): <span className="font-semibold">{reportData.audio.autoGainEnabled ? 'Aktif' : 'Nonaktif'}</span>.
                                </>
                              ) : (
                                <span className="text-slate-400 italic">Pengecekan dilewati (Untested)</span>
                              )}
                            </td>
                            <td className="py-2.5 font-bold">
                              {completed.audio ? (
                                <span className="text-emerald-600 font-bold">✓ PASSED</span>
                              ) : (
                                <span className="text-slate-400">- UNTESTED</span>
                              )}
                            </td>
                          </tr>

                          {/* Display */}
                          <tr className="border-b border-slate-200 text-slate-850">
                            <td className="py-2.5 font-bold font-mono">Display Calibration</td>
                            <td className="py-2.5 leading-relaxed">
                              {completed.display ? (
                                <>
                                  <div>Kalibrasi layar: <span className="font-semibold">{reportData.display.colorsTested} warna & pola</span> diuji.</div>
                                  {reportData.display.defects && (reportData.display.defects.hasDeadPixels || reportData.display.defects.hasBacklightBleed) ? (
                                    <div className="text-rose-600 font-semibold mt-1">
                                      ⚠ CACAT LAYAR:
                                      {reportData.display.defects.hasDeadPixels && ` ${reportData.display.defects.deadPixelCount} Dead/Stuck Pixel.`}
                                      {reportData.display.defects.hasBacklightBleed && ` Backlight Bleed (${reportData.display.defects.backlightBleedSeverity === 'mild' ? 'Ringan' : reportData.display.defects.backlightBleedSeverity === 'moderate' ? 'Sedang' : 'Parah'}).`}
                                      {reportData.display.defects.locations?.length > 0 && ` Lokasi: ${reportData.display.defects.locations.join(', ')}.`}
                                      {reportData.display.defects.notes && ` Catatan: "${reportData.display.defects.notes}".`}
                                    </div>
                                  ) : (
                                    <div className="text-emerald-600 font-semibold mt-1">✓ Kondisi Layar: Normal / Tidak ada cacat.</div>
                                  )}
                                </>
                              ) : (
                                <span className="text-slate-400 italic">Pengecekan dilewati (Untested)</span>
                              )}
                            </td>
                            <td className="py-2.5 font-bold">
                              {completed.display ? (
                                reportData.display.defects && (reportData.display.defects.hasDeadPixels || reportData.display.defects.hasBacklightBleed) ? (
                                  <span className="text-rose-600 font-bold">⚠ DEFECT</span>
                                ) : (
                                  <span className="text-emerald-600 font-bold">✓ PASSED</span>
                                )
                              ) : (
                                <span className="text-slate-400">- UNTESTED</span>
                              )}
                            </td>
                          </tr>

                        </tbody>
                      </table>
                    </div>

                    {/* Notes Section */}
                    <div className="mb-6">
                      <h4 className="text-[9px] font-bold uppercase tracking-wider text-slate-900 mb-2.5 border-b border-slate-900 pb-1">Catatan Tambahan Teknisi</h4>
                      <p className="text-slate-700 whitespace-pre-wrap leading-relaxed font-sans font-medium text-[11px]">{reportMeta.notes}</p>
                    </div>

                  </div>

                  {/* Sign-off section */}
                  <div className="flex justify-between items-end border-t border-slate-300 pt-6 mt-8 text-center text-[9px] font-mono">
                    <div className="w-[180px]">
                      <div className="border-b border-slate-300 pb-10"></div>
                      <div className="pt-2 font-bold text-slate-600">TANDA TANGAN TEKNISI</div>
                    </div>

                    {/* CSS-generated Barcode for that premium, corporate IT lookup */}
                    <div className="flex flex-col items-center">
                      <div className="flex items-end gap-[1px] h-6 mb-1">
                        <div className="w-[2px] h-6 bg-slate-900"></div>
                        <div className="w-[1px] h-6 bg-slate-900"></div>
                        <div className="w-[3px] h-6 bg-slate-900"></div>
                        <div className="w-[1px] h-6 bg-transparent"></div>
                        <div className="w-[1px] h-6 bg-slate-900"></div>
                        <div className="w-[2px] h-6 bg-slate-900"></div>
                        <div className="w-[4px] h-6 bg-slate-900"></div>
                        <div className="w-[1px] h-6 bg-transparent"></div>
                        <div className="w-[2px] h-6 bg-slate-900"></div>
                        <div className="w-[1px] h-6 bg-slate-900"></div>
                        <div className="w-[3px] h-6 bg-slate-900"></div>
                        <div className="w-[2px] h-6 bg-slate-900"></div>
                      </div>
                      <div className="text-[7px] text-slate-500 font-mono tracking-widest">{printWithoutNota ? '........................' : reportMeta.serialNumber}</div>
                    </div>

                    <div className="w-[180px]">
                      <div className="border-b border-slate-300 pb-10"></div>
                      <div className="pt-2 font-bold text-slate-600">TANDA TANGAN PELANGGAN</div>
                    </div>
                  </div>

                </div>

              </div>

            </div>

          </div>
        </div>
      )}

    </>
  );
}
