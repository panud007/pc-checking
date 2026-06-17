import React, { useState, useEffect, useRef } from 'react';
import {
  ClipboardList, User, Zap, Save, Printer, X, CheckCircle,
  AlertTriangle, FileText, ArrowLeft, Plus, Laptop, Cpu, Layers, HardDrive, Monitor,
  Search, Scan
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

// ─── Component definitions ────────────────────────────────────────────────────
// detect field: 'manual' | 'diagnostic_keyboard' | 'diagnostic_mouse' |
//               'diagnostic_display' | 'diagnostic_audio'
const COMPONENTS = [
  { id: 'lcd',      label: 'LCD / Layar',              icon: '🖥️', detect: 'diagnostic_display' },
  { id: 'keyboard', label: 'Keyboard',                 icon: '⌨️', detect: 'diagnostic_keyboard' },
  { id: 'touchpad', label: 'Touchpad / Mouse',         icon: '🖱️', detect: 'diagnostic_mouse' },
  { id: 'speaker',  label: 'Speaker / Audio',          icon: '🔊', detect: 'diagnostic_audio' },
  { id: 'casing',   label: 'Casing & Baut',           icon: '🔩', detect: 'manual' },
  { id: 'battery',  label: 'Baterai / Health Battery', icon: '🔋', detect: 'manual' },
  { id: 'charger',  label: 'Charger / Adaptor',        icon: '⚡', detect: 'manual' },
  { id: 'camera',   label: 'Kamera',                   icon: '📷', detect: 'manual' },
  { id: 'usb',      label: 'Port USB',                 icon: '🔌', detect: 'manual' },
];

const SERVICE_TYPES = [
  'Upgrade RAM', 'Upgrade SSD / HDD', 'Cleaning Thermal Paste',
  'Install / Reinstall OS', 'Perbaikan Hardware', 'Perbaikan Software',
  'Ganti LCD', 'Ganti Baterai',
];

const generateNota = () => 'NT-' + Math.floor(100000 + Math.random() * 900000);

const cleanManufacturer = (mfg) => {
  if (!mfg) return '';
  const m = mfg.toUpperCase();
  if (m.includes('ASUSTEK')) return 'ASUS';
  if (m.includes('LENOVO')) return 'Lenovo';
  if (m.includes('MICRO-STAR') || m.includes('MSI')) return 'MSI';
  if (m.includes('HEWLETT-PACKARD') || m === 'HP') return 'HP';
  if (m.includes('DELL')) return 'Dell';
  if (m.includes('ACER')) return 'Acer';
  if (m.includes('GIGABYTE')) return 'Gigabyte';
  return mfg;
};

const cleanModel = (model, manufacturer) => {
  if (!model) return '';
  let m = model.trim();
  if (manufacturer) {
    const cleanMfg = cleanManufacturer(manufacturer).toUpperCase();
    if (m.toUpperCase().startsWith(cleanMfg)) {
      m = m.substring(cleanMfg.length).trim();
    }
  }
  m = m.replace(/_([A-Za-z0-9]+)$/, '');
  return m;
};

const parseDxDiag = (text) => {
  const info = {
    manufacturer: '',
    model: '',
    processor: '',
    gpu: '',
    memory: '',
    drives: []
  };

  const mfgMatch = text.match(/System Manufacturer:\s*([^\r\n]+)/i);
  if (mfgMatch) info.manufacturer = mfgMatch[1].trim();

  const modelMatch = text.match(/System Model:\s*([^\r\n]+)/i);
  if (modelMatch) info.model = modelMatch[1].trim();

  const procMatch = text.match(/Processor:\s*([^\r\n]+)/i);
  if (procMatch) {
    let proc = procMatch[1].replace(/\(R\)|\(TM\)/gi, '');
    const cpuCountIndex = proc.search(/\(\d+\s*CPUs\)/i);
    if (cpuCountIndex !== -1) {
      proc = proc.substring(0, cpuCountIndex).trim();
    }
    // Clean up integrated graphics mention in CPU name (e.g. "Ryzen 3 2200G with Radeon Vega Graphics" -> "Ryzen 3 2200G")
    proc = proc.replace(/\s+with\s+.*graphics.*/i, '');
    proc = proc.replace(/\s+/g, ' ').trim();
    info.processor = proc;
  }

  // GPU / Graphics card parsing
  const gpus = [];
  const displaySectionMatch = text.match(/Display Devices\s*\r?\n\s*-+/i);
  if (displaySectionMatch) {
    const startIndex = text.indexOf(displaySectionMatch[0]);
    const remainingText = text.substring(startIndex);
    const nextSectionMatch = remainingText.substring(displaySectionMatch[0].length).match(/\r?\n\s*-+\r?\n\s*[A-Za-z\s]+\r?\n\s*-+/);
    const sectionText = nextSectionMatch 
      ? remainingText.substring(0, remainingText.indexOf(nextSectionMatch[0], displaySectionMatch[0].length))
      : remainingText;

    const cardRegex = /Card name:\s*([^\r\n]+)/gi;
    let match;
    while ((match = cardRegex.exec(sectionText)) !== null) {
      const gpuName = match[1].trim();
      let cleanGpu = gpuName.replace(/\(R\)|\(TM\)/gi, '').replace(/\s+/g, ' ').trim();
      if (cleanGpu && !gpus.includes(cleanGpu)) {
        gpus.push(cleanGpu);
      }
    }
  } else {
    const cardRegex = /Card name:\s*([^\r\n]+)/gi;
    let match;
    while ((match = cardRegex.exec(text)) !== null) {
      const gpuName = match[1].trim();
      let cleanGpu = gpuName.replace(/\(R\)|\(TM\)/gi, '').replace(/\s+/g, ' ').trim();
      if (cleanGpu && !gpus.includes(cleanGpu)) {
        gpus.push(cleanGpu);
      }
    }
  }
  info.gpu = gpus.join(' / ');

  const memMatch = text.match(/Memory:\s*(\d+)\s*MB\s*RAM/i);
  if (memMatch) {
    const mb = parseInt(memMatch[1], 10);
    info.memory = Math.round(mb / 1024) + ' GB RAM';
  }

  const parts = text.split(/^\s*Drive:\s*/im);
  if (parts.length > 1) {
    for (let i = 1; i < parts.length; i++) {
      const block = parts[i];
      const blockText = block.substring(0, 300);
      const letterMatch = blockText.match(/^([A-Z]:)/i);
      const totalMatch = blockText.match(/Total Space:\s*([\d.]+)\s*(GB|MB)/i);
      const modelMatch = blockText.match(/Model:\s*([^\r\n]+)/i);
      if (letterMatch && totalMatch) {
        const letter = letterMatch[1];
        const size = totalMatch[1] + ' ' + totalMatch[2];
        const model = modelMatch ? modelMatch[1].trim() : 'Generic Drive';
        info.drives.push(`${letter} ${model} (${size})`);
      }
    }
  }

  return info;
};

const getInitialComponentsState = (completed = {}, reportData = {}) => {
  const state = Object.fromEntries(
    COMPONENTS.map(c => [c.id, { status: 'ok', notes: '', autoInfo: null, fromDiagnostic: false }])
  );

  // Keyboard
  if (completed.keyboard) {
    const kb = reportData.keyboard || {};
    const hasDeadKeys = kb.deadKeys && kb.deadKeys.length > 0;
    state.keyboard = {
      status: hasDeadKeys ? 'rusak' : 'ok',
      notes: '',
      fromDiagnostic: true,
      autoInfo: hasDeadKeys
        ? `${kb.pressedCount || 0} tombol • Dead keys: ${kb.deadKeys.join(', ')}`
        : `${kb.pressedCount || 0} tombol ditekan • Tidak ada dead key`,
    };
  } else {
    state.keyboard = {
      status: 'belum_diuji',
      notes: '',
      fromDiagnostic: false,
      autoInfo: null,
    };
  }

  // Mouse / Touchpad
  if (completed.mouse) {
    const ms = reportData.mouse || {};
    const buttons = [
      ms.leftClicked && 'Kiri',
      ms.rightClicked && 'Kanan',
      ms.middleClicked && 'Tengah',
      ms.scrollTested && 'Scroll',
    ].filter(Boolean).join(', ');
    state.touchpad = {
      status: ms.chatterAlert ? 'rusak' : 'ok',
      notes: '',
      fromDiagnostic: true,
      autoInfo: `Tombol: ${buttons || '-'}${ms.chatterAlert ? ' • ⚠ Chatter Detected!' : ' • Normal'}`,
    };
  } else {
    state.touchpad = {
      status: 'belum_diuji',
      notes: '',
      fromDiagnostic: false,
      autoInfo: null,
    };
  }

  // Display
  if (completed.display) {
    const ds = reportData.display || {};
    const hasDefect = ds.defects && (ds.defects.hasDeadPixels || ds.defects.hasBacklightBleed);
    state.lcd = {
      status: hasDefect ? 'rusak' : 'ok',
      notes: '',
      fromDiagnostic: true,
      autoInfo: hasDefect
        ? `Cacat: ${[
            ds.defects?.hasDeadPixels && `${ds.defects.deadPixelCount} dead pixel`,
            ds.defects?.hasBacklightBleed && `Backlight bleed (${ds.defects.backlightBleedSeverity || '-'})`,
          ].filter(Boolean).join(', ')}`
        : `${ds.colorsTested || 0} pola warna diuji • Normal`,
    };
  } else {
    state.lcd = {
      status: 'belum_diuji',
      notes: '',
      fromDiagnostic: false,
      autoInfo: null,
    };
  }

  // Audio
  if (completed.audio) {
    const au = reportData.audio || {};
    state.speaker = {
      status: 'ok',
      notes: '',
      fromDiagnostic: true,
      autoInfo: `Loopback: ${au.loopbackTested ? 'Berhasil' : 'Tidak diuji'} • Noise Suppression: ${au.noiseSuppressionEnabled ? 'Aktif' : 'Off'} • AGC: ${au.autoGainEnabled ? 'Aktif' : 'Off'}`,
    };
  } else {
    state.speaker = {
      status: 'belum_diuji',
      notes: '',
      fromDiagnostic: false,
      autoInfo: null,
    };
  }

  return state;
};

// ─────────────────────────────────────────────────────────────────────────────

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1/Hardware_Checker_API/public/api';

export default function ServiceIntakeForm({
  onBack,
  diagnosticCompleted = {},
  diagnosticReportData = {},
  onStartTest,
}) {
  const [deviceType, setDeviceType] = useState('laptop'); // 'laptop' | 'pc'
  const [customerInfo, setCustomerInfo] = useState({
    nama: '', noHp: '', noNota: generateNota(),
    tipePerangkat: '', tanggalMasuk: new Date().toISOString().slice(0, 10),
    processor: '', gpu: '', ram: '', storage: ''
  });
  const [components, setComponents]     = useState(() =>
    getInitialComponentsState(diagnosticCompleted, diagnosticReportData)
  );
  const [serviceTypes, setServiceTypes] = useState([]);
  const [otherService, setOtherService] = useState('');
  const [kerusakanInti, setKerusakanInti] = useState('');
  const [intakeHistory, setIntakeHistory] = useState([]);
  const [showHistory, setShowHistory]   = useState(false);
  const [savedAlert, setSavedAlert]     = useState(false);

  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [showTutorialModal, setShowTutorialModal] = useState(false);

  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // DB Sync and Search states
  const [isDbConnected, setIsDbConnected] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [printWithoutNota, setPrintWithoutNota] = useState(false);
  const isFirstMount = useRef(true);

  // Barcode scanner states
  const [showScanner, setShowScanner] = useState(false);
  const html5QrCodeRef = useRef(null);

  const stopScanner = () => {
    if (html5QrCodeRef.current) {
      if (html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().then(() => {
          setShowScanner(false);
        }).catch(err => {
          console.error("Failed to stop scanner:", err);
          setShowScanner(false);
        });
      } else {
        setShowScanner(false);
      }
    } else {
      setShowScanner(false);
    }
  };

  useEffect(() => {
    if (showScanner) {
      const timer = setTimeout(() => {
        try {
          const formats = [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.CODABAR
          ];
          const html5QrCode = new Html5Qrcode("reader", { formatsToSupport: formats });
          html5QrCodeRef.current = html5QrCode;
          
          html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 15,
              qrbox: (width, height) => {
                const qrWidth = Math.round(width * 0.85);
                const qrHeight = Math.round(height * 0.55);
                return { width: qrWidth, height: qrHeight };
              }
            },
            (decodedText) => {
              setCustomerInfo(prev => ({ ...prev, noNota: decodedText }));
              stopScanner();
            },
            (errorMessage) => {
              // Ignore verbose error messages
            }
          ).catch(err => {
            console.error("Failed to start scanner:", err);
          });
        } catch (e) {
          console.error("Failed to instantiate Html5Qrcode:", e);
        }
      }, 100);

      return () => clearTimeout(timer);
    }

    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(err => console.error(err));
      }
    };
  }, [showScanner]);

  // Split storage into drives array
  const drives = customerInfo.storage ? customerInfo.storage.split('\n') : [];

  const handleDriveChange = (index, value) => {
    const nextDrives = [...drives];
    // Ensure all pre-existing slots up to index are defined
    while (nextDrives.length <= index) nextDrives.push('');
    nextDrives[index] = value;
    setCustomerInfo(prev => ({
      ...prev,
      storage: nextDrives.join('\n')
    }));
  };

  const handleAddDrive = () => {
    const nextDrives = [...drives, ''];
    setCustomerInfo(prev => ({
      ...prev,
      storage: nextDrives.join('\n')
    }));
  };

  const handleRemoveDrive = (index) => {
    const nextDrives = drives.filter((_, idx) => idx !== index);
    setCustomerInfo(prev => ({
      ...prev,
      storage: nextDrives.join('\n')
    }));
  };

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const parsed = parseDxDiag(text);
      
      const mfg = cleanManufacturer(parsed.manufacturer);
      const model = cleanModel(parsed.model, parsed.manufacturer);
      const deviceName = [mfg, model].filter(Boolean).join(' ');
      
      // Auto-detect Laptop vs PC from DxDiag signature
      const isCustomPC = parsed.model.match(/System Product Name|Desktop|To be filled by O\.E\.M\./i) ||
                         (parsed.manufacturer.match(/Gigabyte|ASRock/i) && !parsed.model.match(/Laptop|Notebook|Book/i));
      if (isCustomPC) {
        setDeviceType('pc');
      } else {
        setDeviceType('laptop');
      }

      setCustomerInfo(prev => ({
        ...prev,
        tipePerangkat: deviceName || prev.tipePerangkat,
        processor: parsed.processor || prev.processor,
        gpu: parsed.gpu || prev.gpu,
        ram: parsed.memory || prev.ram,
        storage: parsed.drives && parsed.drives.length > 0 ? parsed.drives.join('\n') : prev.storage
      }));

      // Show temporary alert/notification
      setSavedAlert(true);
      setTimeout(() => setSavedAlert(false), 2500);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // Fetch history from DB or LocalStorage
  const fetchHistory = async (query = '') => {
    setIsHistoryLoading(true);
    const apiEndpoint = `${API_BASE_URL}/intakes?search=${encodeURIComponent(query)}`;
    try {
      const response = await fetch(apiEndpoint);
      if (!response.ok) throw new Error('API server returned error');
      const data = await response.json();
      
      const mapped = data.map(dbRecord => ({
        id: dbRecord.no_nota,
        customerInfo: {
          nama: dbRecord.nama_pelanggan || '',
          noHp: dbRecord.no_hp || '',
          noNota: dbRecord.no_nota,
          tipePerangkat: dbRecord.tipe_perangkat || '',
          tanggalMasuk: dbRecord.tanggal_masuk || '',
          processor: dbRecord.processor || '',
          gpu: dbRecord.gpu || '',
          ram: dbRecord.ram || '',
          storage: dbRecord.storage || ''
        },
        components: dbRecord.components || {},
        deviceType: dbRecord.device_type || 'laptop',
        serviceTypes: dbRecord.service_types || [],
        kerusakanInti: dbRecord.kerusakan_inti || '',
        createdAt: dbRecord.created_at
      }));
      
      setIntakeHistory(mapped);
      setIsDbConnected(true);
    } catch (err) {
      console.warn('API error, falling back to local storage:', err);
      setIsDbConnected(false);
      
      const stored = localStorage.getItem('hardware_checker_intake');
      if (stored) {
        const localData = JSON.parse(stored);
        const filtered = localData.filter(r => {
          const s = query.toLowerCase();
          return (
            (r.id || '').toLowerCase().includes(s) ||
            (r.customerInfo?.nama || '').toLowerCase().includes(s) ||
            (r.customerInfo?.noHp || '').toLowerCase().includes(s) ||
            (r.customerInfo?.tipePerangkat || '').toLowerCase().includes(s)
          );
        });
        setIntakeHistory(filtered);
      } else {
        setIntakeHistory([]);
      }
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // Debounce search query changes & handle mount check
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      fetchHistory('');
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      fetchHistory(searchQuery);
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const runBrowserDetection = () => {
    const ramGb = navigator.deviceMemory;
    const cpuCores = navigator.hardwareConcurrency;
    const ua = navigator.userAgent;
    let detectedOS = 'Windows PC';
    if (ua.includes('Macintosh') || ua.includes('Mac OS')) detectedOS = 'macOS Device';
    else if (ua.includes('Linux')) detectedOS = 'Linux PC';
    else if (ua.includes('Android')) detectedOS = 'Android Device';
    else if (ua.includes('iPhone') || ua.includes('iPad')) detectedOS = 'iOS Device';

    setCustomerInfo(prev => ({
      ...prev,
      tipePerangkat: prev.tipePerangkat || detectedOS,
      processor: prev.processor || (cpuCores ? `${cpuCores} Cores CPU` : ''),
      ram: prev.ram || (ramGb ? `${ramGb} GB RAM` : ''),
    }));

    if (navigator.getBattery) {
      navigator.getBattery().then(battery => {
        const pct = Math.round(battery.level * 100);
        const stateStr = battery.charging ? 'Mengisi daya (Charging)' : 'Menggunakan baterai (Discharging)';
        const info = `Kondisi saat ini: ${pct}% • ${stateStr}`;
        
        // Also guess desktop PC if battery charging level is 100% and chargingTime is 0 and dischargingTime is Infinity
        const hasRealBattery = !(battery.level === 1 && battery.charging && battery.chargingTime === 0 && battery.dischargingTime === Infinity);
        if (!hasRealBattery) {
          setDeviceType('pc');
        }

        setComponents(prev => ({
          ...prev,
          battery: {
            ...prev.battery,
            autoInfo: info
          }
        }));
      }).catch(() => {
        setDeviceType('pc');
      });
    } else {
      setDeviceType('pc');
    }
  };

  useEffect(() => {
    // Run detection only if device specs are empty
    if (!customerInfo.tipePerangkat && !customerInfo.processor && !customerInfo.ram) {
      runBrowserDetection();
    } else {
      // Still detect battery info for checklist
      if (navigator.getBattery) {
        navigator.getBattery().then(battery => {
          const pct = Math.round(battery.level * 100);
          const stateStr = battery.charging ? 'Mengisi daya (Charging)' : 'Menggunakan baterai (Discharging)';
          const info = `Kondisi saat ini: ${pct}% • ${stateStr}`;
          setComponents(prev => ({
            ...prev,
            battery: {
              ...prev.battery,
              autoInfo: info
            }
          }));
        }).catch(() => {});
      }
    }
  }, []);

  // ── Sync diagnostic results into checklist ──────────────────────────────
  useEffect(() => {
    setComponents(prev => {
      const next = { ...prev };
      const synced = getInitialComponentsState(diagnosticCompleted, diagnosticReportData);

      for (const key of ['keyboard', 'touchpad', 'lcd', 'speaker']) {
        if (synced[key].fromDiagnostic) {
          next[key] = {
            ...next[key],
            status: synced[key].status,
            fromDiagnostic: true,
            autoInfo: synced[key].autoInfo
          };
        } else {
          if (!prev[key]?.fromDiagnostic) {
            next[key] = {
              ...next[key],
              status: 'belum_diuji',
              fromDiagnostic: false,
              autoInfo: null
            };
          }
        }
      }
      return next;
    });
  }, [diagnosticCompleted, diagnosticReportData]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleCustomerChange = (f, v) =>
    setCustomerInfo(prev => ({ ...prev, [f]: v }));

  const handleStatus = (id, status) =>
    setComponents(prev => ({ ...prev, [id]: { ...prev[id], status } }));

  const handleNotes = (id, notes) =>
    setComponents(prev => ({ ...prev, [id]: { ...prev[id], notes } }));

  const toggleService = (svc) =>
    setServiceTypes(prev =>
      prev.includes(svc) ? prev.filter(s => s !== svc) : [...prev, svc]
    );

  const handleReset = () => {
    const ramGb = navigator.deviceMemory;
    const cpuCores = navigator.hardwareConcurrency;
    const ua = navigator.userAgent;
    let detectedOS = 'Windows PC';
    if (ua.includes('Macintosh') || ua.includes('Mac OS')) detectedOS = 'macOS Device';
    else if (ua.includes('Linux')) detectedOS = 'Linux PC';
    else if (ua.includes('Android')) detectedOS = 'Android Device';
    else if (ua.includes('iPhone') || ua.includes('iPad')) detectedOS = 'iOS Device';

    setCustomerInfo({
      nama: '', noHp: '', noNota: generateNota(),
      tipePerangkat: detectedOS,
      tanggalMasuk: new Date().toISOString().slice(0, 10),
      processor: cpuCores ? `${cpuCores} Cores CPU` : '',
      gpu: '',
      ram: ramGb ? `${ramGb} GB RAM` : '',
      storage: ''
    });
    setComponents(getInitialComponentsState(diagnosticCompleted, diagnosticReportData));
    setServiceTypes([]); setOtherService(''); setKerusakanInti('');

    // Re-detect battery for the checklist
    if (navigator.getBattery) {
      navigator.getBattery().then(battery => {
        const pct = Math.round(battery.level * 100);
        const stateStr = battery.charging ? 'Mengisi daya (Charging)' : 'Menggunakan baterai (Discharging)';
        const info = `Kondisi saat ini: ${pct}% • ${stateStr}`;
        setComponents(prev => ({
          ...prev,
          battery: {
            ...prev.battery,
            autoInfo: info
          }
        }));
      }).catch(() => {});
    }
  };

  const handleCleanedStorage = () => {
    return customerInfo.storage
      ? customerInfo.storage.split('\n').map(d => d.trim()).filter(Boolean).join('\n')
      : '';
  };

  const validateForm = () => {
    const errors = [];
    if (!customerInfo.tipePerangkat?.trim()) {
      errors.push("Motherboard / Tipe PC wajib diisi.");
    }
    if (!customerInfo.processor?.trim()) {
      errors.push("Processor (CPU) wajib diisi.");
    }
    if (!customerInfo.ram?.trim()) {
      errors.push("Kapasitas RAM wajib diisi.");
    }

    const untested = [];
    for (const comp of activeComponents) {
      if (comp.detect !== 'manual' && components[comp.id]?.status === 'belum_diuji') {
        untested.push(getCompLabel(comp));
      }
    }
    if (untested.length > 0) {
      errors.push(`Komponen berikut belum diuji: ${untested.join(', ')}.`);
    }

    return errors;
  };

  const handleSave = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      setValidationErrors(errors);
      setShowValidationModal(true);
      return false;
    }

    const cleanedStorage = handleCleanedStorage();
    const updatedCustomerInfo = {
      ...customerInfo,
      storage: cleanedStorage
    };

    setCustomerInfo(prev => ({ ...prev, storage: cleanedStorage }));

    const record = {
      id: customerInfo.noNota,
      customerInfo: updatedCustomerInfo,
      components,
      deviceType,
      serviceTypes: otherService ? [...serviceTypes, otherService] : serviceTypes,
      kerusakanInti,
      createdAt: new Date().toISOString(),
    };

    // 1. Save to LocalStorage (Always)
    try {
      const stored = localStorage.getItem('hardware_checker_intake');
      let history = stored ? JSON.parse(stored) : [];
      const idx = history.findIndex(r => r.id === record.id);
      if (idx !== -1) history[idx] = record; else history.unshift(record);
      localStorage.setItem('hardware_checker_intake', JSON.stringify(history));
      if (!isDbConnected) {
        setIntakeHistory(history);
      }
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }

    // 2. Save to Laravel API DB (Async)
    const apiPayload = {
      no_nota: customerInfo.noNota,
      nama_pelanggan: customerInfo.nama || null,
      no_hp: customerInfo.noHp || null,
      tipe_perangkat: customerInfo.tipePerangkat || null,
      device_type: deviceType,
      tanggal_masuk: customerInfo.tanggalMasuk || null,
      processor: customerInfo.processor || null,
      gpu: customerInfo.gpu || null,
      ram: customerInfo.ram || null,
      storage: cleanedStorage || null,
      components: components,
      service_types: otherService ? [...serviceTypes, otherService] : serviceTypes,
      kerusakan_inti: kerusakanInti || null
    };

    try {
      const response = await fetch(`${API_BASE_URL}/intakes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(apiPayload)
      });

      if (!response.ok) throw new Error('Failed to save to database');
      
      setIsDbConnected(true);
      fetchHistory(searchQuery);
    } catch (err) {
      console.warn('Could not save to remote database. Local copy saved.', err);
      setIsDbConnected(false);
    }

    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 3000);
    return true;
  };

  const handlePrint = async () => {
    const saved = await handleSave();
    if (saved) {
      setTimeout(() => window.print(), 150);
    }
  };

  const handleLoadHistory = (r) => {
    setCustomerInfo(r.customerInfo);
    setComponents(r.components);
    setDeviceType(r.deviceType || 'laptop');
    setServiceTypes(r.serviceTypes || []);
    setKerusakanInti(r.kerusakanInti || '');
    setShowHistory(false);
  };

  const handleDeleteHistory = async (id) => {
    // 1. Delete from LocalStorage (Always)
    try {
      const stored = localStorage.getItem('hardware_checker_intake');
      let history = stored ? JSON.parse(stored) : [];
      history = history.filter(r => r.id !== id);
      localStorage.setItem('hardware_checker_intake', JSON.stringify(history));
      if (!isDbConnected) {
        setIntakeHistory(history);
      }
    } catch (e) {
      console.error('Error deleting from localStorage:', e);
    }

    // 2. Delete from remote Laravel API DB (Async)
    try {
      const response = await fetch(`${API_BASE_URL}/intakes/${id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to delete from database');

      setIsDbConnected(true);
      fetchHistory(searchQuery);
    } catch (err) {
      console.warn('Could not delete from remote database.', err);
      setIsDbConnected(false);
    }
  };

  // Component Filter Logic
  const getFilteredComponents = (type) => {
    if (type === 'pc') {
      return COMPONENTS.filter(c => !['battery', 'charger', 'camera', 'casing', 'usb'].includes(c.id));
    }
    return COMPONENTS;
  };

  const getCompLabel = (comp) => {
    if (comp.id === 'touchpad' && deviceType === 'pc') {
      return 'Mouse';
    }
    return comp.label;
  };

  const activeComponents = getFilteredComponents(deviceType);
  const rusakCount  = activeComponents.filter(c => components[c.id]?.status === 'rusak').length;
  const tidakAdaCount = activeComponents.filter(c => components[c.id]?.status === 'tidak_ada').length;
  const diagLinked  = activeComponents.filter(c => c.detect !== 'manual' && components[c.id]?.fromDiagnostic);
  const DIAGNOSED_COMPONENTS = activeComponents.filter(c => c.detect !== 'manual');
  const MANUAL_COMPONENTS = activeComponents.filter(c => c.detect === 'manual');

  // ── Component card renderer ────────────────────────────────────────────────
  const renderComp = (comp) => {
    const s = components[comp.id] || { status: 'ok', notes: '', autoInfo: null, fromDiagnostic: false };
    
    // Status color presets mapping
    const statusConfig = {
      ok: {
        bg: 'bg-emerald-950/10 border-emerald-500/20 hover:border-emerald-500/40',
        glow: 'shadow-[0_0_20px_rgba(16,185,129,0.02)]',
        btnActive: 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]',
        btnInactive: 'bg-slate-900/80 text-slate-500 border border-slate-800 hover:text-slate-300 hover:border-slate-700'
      },
      rusak: {
        bg: 'bg-rose-950/10 border-rose-500/20 hover:border-rose-500/45',
        glow: 'shadow-[0_0_20px_rgba(244,63,94,0.02)]',
        btnActive: 'bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.4)]',
        btnInactive: 'bg-slate-900/80 text-slate-500 border border-slate-800 hover:text-slate-300 hover:border-slate-700'
      },
      tidak_ada: {
        bg: 'bg-slate-950/25 border-slate-800/60 hover:border-slate-700/60',
        glow: 'shadow-none',
        btnActive: 'bg-slate-600 text-white shadow-[0_0_12px_rgba(100,116,139,0.3)]',
        btnInactive: 'bg-slate-900/80 text-slate-500 border border-slate-800 hover:text-slate-300 hover:border-slate-700'
      },
      belum_diuji: {
        bg: 'bg-amber-955/5 border-amber-500/20 hover:border-amber-500/40 border-dashed',
        glow: 'shadow-[0_0_20px_rgba(245,158,11,0.02)]',
        btnActive: 'bg-amber-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.4)]',
        btnInactive: 'bg-slate-900/80 text-slate-500 border border-slate-800 hover:text-slate-300 hover:border-slate-700'
      }
    };
    
    const activePreset = statusConfig[s.status] || statusConfig.ok;
 
    return (
      <div 
        key={comp.id} 
        className={`rounded-xl border p-4 transition-all duration-300 hover:-translate-y-0.5 flex flex-col justify-between gap-3 ${activePreset.bg} ${activePreset.glow}`}
      >
        {/* Row: Icon + Label & Status Switcher */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl shrink-0 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">{comp.icon}</span>
            <div className="flex flex-col">
              <span className="text-xs font-black text-slate-100 tracking-wide leading-tight">{getCompLabel(comp)}</span>
              {s.fromDiagnostic ? (
                <span className="text-[9px] text-indigo-400 font-extrabold mt-0.5 flex items-center gap-0.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  Auto-sync
                </span>
              ) : s.status === 'belum_diuji' ? (
                <span className="text-[9px] text-amber-500 font-bold mt-0.5 flex items-center gap-0.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-555 animate-ping" />
                  Wajib Diuji
                </span>
              ) : null}
            </div>
          </div>
          {s.status === 'belum_diuji' ? (
            <button
              type="button"
              onClick={() => {
                const moduleName = comp.id === 'lcd' ? 'display' : comp.id === 'touchpad' ? 'mouse' : comp.id === 'speaker' ? 'audio' : comp.id;
                if (onStartTest) onStartTest(moduleName);
              }}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase tracking-wider text-[8px] rounded-lg transition-all active:scale-95 flex items-center gap-1 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
            >
              <Zap size={10} className="animate-bounce text-slate-950" /> Uji Sekarang
            </button>
          ) : (
            <div className="flex gap-0.5 shrink-0 bg-slate-950 p-0.5 rounded-lg border border-slate-900/80">
              {[
                { val: 'ok', label: 'OK' },
                { val: 'rusak', label: 'Rusak' },
                { val: 'tidak_ada', label: 'N/A' },
              ].map(({ val, label }) => {
                const isActive = s.status === val;
                const btnClass = isActive ? statusConfig[val].btnActive : statusConfig[val].btnInactive;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleStatus(comp.id, val)}
                    className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider transition-all duration-200 active:scale-95 ${btnClass}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
 
        {/* Diagnostic Detailed Specs */}
        {s.autoInfo && (
          <div className="text-[10px] font-mono text-slate-300 bg-slate-950/80 border border-slate-800/40 rounded-lg px-2.5 py-1.5 leading-normal relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 w-[2px] bg-indigo-500" />
            <div className="pl-1.5 font-medium">{s.autoInfo}</div>
          </div>
        )}
 
        {/* Note Editor */}
        <div className="relative flex items-center">
          <input
            type="text"
            value={s.notes}
            onChange={e => handleNotes(comp.id, e.target.value)}
            disabled={s.status === 'belum_diuji'}
            placeholder={s.status === 'belum_diuji' ? "Uji komponen terlebih dahulu..." : "Keterangan tambahan..."}
            className="w-full bg-zinc-950 focus:bg-zinc-900 border border-zinc-800 focus:border-indigo-550 text-[10px] text-zinc-200 rounded-lg pl-3 pr-8 py-1.5 outline-none transition-all placeholder:text-zinc-650"
          />
        </div>
      </div>
    );
  };

  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Screen UI ── */}
      <div className="intake-screen w-full flex-1 flex flex-col bg-[#09090b] text-zinc-105 p-4 md:p-8 relative overflow-hidden font-sans min-h-screen">

        <div className="max-w-6xl mx-auto w-full flex flex-col gap-6 z-10">

          {/* Header */}
          <div className="glass-panel border-zinc-800/80 px-6 py-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="h-9 w-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="h-12 w-12 rounded-xl bg-zinc-800 flex items-center justify-center border border-zinc-700">
                <ClipboardList size={22} className="text-zinc-200" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2.5 font-display">
                  Form Penerimaan Unit
                  <span className="text-[9px] bg-zinc-800 text-zinc-350 border border-zinc-700 px-2 py-0.5 rounded font-mono font-bold tracking-widest uppercase">
                    SERVICE INTAKE
                  </span>
                </h1>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Dokumentasi kondisi awal unit sebelum servis
                  {diagLinked.length > 0 && (
                    <span className="text-indigo-400 ml-2 font-semibold">
                      • {diagLinked.length} komponen terisi dari Diagnosa
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              {savedAlert && (
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 animate-fade-in">
                  <CheckCircle size={13} /> Tersimpan!
                </span>
              )}
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
              >
                <FileText size={13} /> Riwayat ({intakeHistory.length})
              </button>
              <button
                onClick={handleReset}
                className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
              >
                <Plus size={13} /> Form Baru
              </button>
            </div>
          </div>

          {/* Device Type Toggle */}
          <div className="glass-panel border-zinc-800/80 p-3 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm bg-zinc-950/20">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider pl-1.5">Kategori Perangkat:</span>
              <span className="text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                {deviceType === 'pc' ? '🖥️ Desktop PC Mode' : '💻 Laptop Mode'}
              </span>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setDeviceType('laptop')}
                className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 border ${
                  deviceType === 'laptop'
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-550 hover:text-zinc-300 hover:border-zinc-700'
                }`}
              >
                <Laptop size={14} /> Laptop
              </button>
              <button
                type="button"
                onClick={() => setDeviceType('pc')}
                className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 border ${
                  deviceType === 'pc'
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-550 hover:text-zinc-300 hover:border-zinc-700'
                }`}
              >
                <Monitor size={14} /> PC / Desktop
              </button>
            </div>
          </div>

          {/* History Panel */}
          {showHistory && (
            <div className="glass-panel border-zinc-800/80 p-5 rounded-2xl flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/40 pb-3">
                <h3 className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                  <FileText size={14} className="text-indigo-400" /> Riwayat Form Penerimaan
                </h3>
                
                {/* Database Connection Status Badge */}
                <div className="flex items-center gap-2 bg-zinc-950 px-3 py-1 rounded-xl border border-zinc-850">
                  <span className={`h-2 w-2 rounded-full ${isDbConnected === true ? 'bg-emerald-500' : isDbConnected === false ? 'bg-amber-500' : 'bg-zinc-600'} ${isDbConnected !== null ? 'animate-pulse' : ''}`}></span>
                  <span className="text-[9px] font-black font-mono text-zinc-400 tracking-wider uppercase">
                    {isDbConnected === true ? 'DB Sync: Online' : isDbConnected === false ? 'DB Sync: Local Fallback' : 'DB Sync: Checking...'}
                  </span>
                </div>
              </div>

              {/* Search bar inside history panel */}
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500 pointer-events-none">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari berdasarkan nomor nota, nama pelanggan, no HP, atau perangkat..."
                  className="w-full bg-zinc-950 border border-zinc-850 hover:border-zinc-700 focus:border-indigo-500 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none transition-all shadow-sm"
                />
              </div>

              {isHistoryLoading ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Memuat riwayat...</span>
                </div>
              ) : intakeHistory.length === 0 ? (
                <p className="text-xs text-zinc-500 italic text-center py-4">
                  {searchQuery ? 'Tidak ada riwayat yang cocok dengan pencarian.' : 'Belum ada riwayat tersimpan.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800/50 text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
                        <th className="py-2 px-3">No. Nota</th>
                        <th className="py-2 px-3">Pelanggan</th>
                        <th className="py-2 px-3">Perangkat</th>
                        <th className="py-2 px-3">Tanggal</th>
                        <th className="py-2 px-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {intakeHistory.map(r => (
                        <tr key={r.id} className="border-b border-zinc-900/40 hover:bg-zinc-900/10 transition-all">
                          <td className="py-2.5 px-3 font-mono font-bold text-white">{r.id}</td>
                          <td className="py-2.5 px-3 text-zinc-300">{r.customerInfo?.nama || '-'}</td>
                          <td className="py-2.5 px-3 text-zinc-400">{r.customerInfo?.tipePerangkat || '-'}</td>
                          <td className="py-2.5 px-3 text-zinc-500 font-mono">
                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString('id-ID') : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => handleLoadHistory(r)} className="px-3 py-1 bg-indigo-650/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 text-[10px] font-bold rounded-lg transition-all active:scale-95">Buka</button>
                              <button onClick={() => handleDeleteHistory(r.id)} className="px-2 py-1 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 rounded-lg transition-all active:scale-95"><X size={11} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Main Layout Container */}
          <div className="flex flex-col gap-6">

            {/* SECTION 1: Identitas Pelanggan & Spesifikasi Hardware (Grid 2 Kolom) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Kolom Kiri: Identitas Pelanggan & Import DxDiag */}
              <div className="flex flex-col gap-5">
                {/* Drag and Drop DxDiag */}
                <div className="flex flex-col gap-2">
                  <div
                    onDragOver={e => {
                      e.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`glass-panel border-dashed p-4.5 rounded-2xl flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all duration-200 ${
                      dragActive
                        ? 'border-indigo-500 bg-indigo-950/20'
                        : 'border-zinc-800 hover:border-indigo-500/50 bg-zinc-950/20'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".txt"
                      className="hidden"
                    />
                    <div className="h-10 w-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-indigo-400 transition-all">
                      <FileText size={18} className={dragActive ? 'text-indigo-400 animate-bounce' : 'text-zinc-400'} />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-zinc-200 uppercase tracking-wider">Import Spesifikasi via DxDiag</p>
                      <p className="text-[9px] text-zinc-550 mt-1 leading-normal">Drag & drop file <span className="font-semibold text-indigo-400 font-mono">DxDiag.txt</span> atau klik untuk unggah</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTutorialModal(true);
                    }}
                    className="px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-indigo-500/30 text-indigo-400 hover:text-indigo-300 text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 w-full font-mono active:scale-95 shadow-sm"
                  >
                    ❓ Cara Mendapatkan DxDiag.txt
                  </button>
                </div>

                {/* Customer Info */}
                <div className="glass-panel border-zinc-800/80 p-5 rounded-2xl flex flex-col gap-4">
                  <div className="flex items-center gap-2 border-b border-zinc-800/40 pb-3">
                    <User size={14} className="text-indigo-400" />
                    <span className="text-[10px] font-bold font-mono tracking-wider text-indigo-400 uppercase">Info Pelanggan</span>
                  </div>
                  {[
                    { label: 'Nama Pelanggan',       field: 'nama',          type: 'text', placeholder: 'John Doe' },
                    { label: 'No. HP / Telp',         field: 'noHp',          type: 'tel',  placeholder: '08xx-xxxx-xxxx' },
                    { label: 'No. Nota / Ticket',     field: 'noNota',        type: 'text', placeholder: 'NT-xxxxxx', mono: true },
                    { label: 'Tanggal Masuk',         field: 'tanggalMasuk',  type: 'date', placeholder: '' },
                  ].map(({ label, field, type, placeholder, mono }) => (
                    <div key={field} className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-zinc-450 uppercase tracking-wider">{label}</label>
                      <div className="relative flex items-center">
                        <input
                          type={type}
                          value={customerInfo[field]}
                          onChange={e => handleCustomerChange(field, e.target.value)}
                          placeholder={placeholder}
                          className={`w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 text-xs focus:outline-none focus:border-indigo-550 transition-all ${mono ? 'font-mono pr-10' : ''}`}
                        />
                        {field === 'noNota' && (
                          <button
                            type="button"
                            onClick={() => setShowScanner(true)}
                            className="absolute right-2.5 p-1 text-zinc-400 hover:text-indigo-400 active:scale-95 transition-all"
                            title="Scan Barcode / QR Code"
                          >
                            <Scan size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Kolom Kanan: Spesifikasi Perangkat & Storage */}
              <div className="flex flex-col gap-5">
                <div className="glass-panel border-zinc-800/80 p-5 rounded-2xl shadow-sm flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-zinc-800/40 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-indigo-400" />
                        <span className="text-[10px] font-bold font-mono tracking-wider text-indigo-400 uppercase">Spesifikasi Perangkat (Mobo, CPU, GPU, RAM)</span>
                      </div>
                      <span className="text-[9px] bg-zinc-850 text-zinc-400 border border-zinc-800 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                        🖥️ SYSTEM SPEC
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Laptop Type */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-zinc-450 uppercase tracking-wider flex items-center gap-1.5">
                          {deviceType === 'pc' ? <Monitor size={11} className="text-indigo-400" /> : <Laptop size={11} className="text-indigo-400" />} 
                          {deviceType === 'pc' ? 'Motherboard / Tipe PC' : 'Tipe Laptop / Perangkat (Mobo)'}
                        </label>
                        <input
                          type="text"
                          value={customerInfo.tipePerangkat}
                          onChange={e => setCustomerInfo(prev => ({ ...prev, tipePerangkat: e.target.value }))}
                          placeholder={deviceType === 'pc' ? "ASUS ROG Mobo, Custom Desktop..." : "Asus ROG, Lenovo ThinkPad..."}
                          className="bg-zinc-950 border border-zinc-800 focus:border-indigo-550 rounded-lg px-3 py-2 text-zinc-200 text-xs focus:outline-none transition-all font-medium"
                        />
                      </div>

                      {/* Processor */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-zinc-450 uppercase tracking-wider flex items-center gap-1.5">
                          <Cpu size={11} className="text-indigo-400" /> Processor (CPU)
                        </label>
                        <input
                          type="text"
                          value={customerInfo.processor}
                          onChange={e => setCustomerInfo(prev => ({ ...prev, processor: e.target.value }))}
                          placeholder="Intel Core i7, AMD Ryzen 5..."
                          className="bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-zinc-200 text-xs focus:outline-none transition-all font-medium"
                        />
                      </div>

                      {/* GPU */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-zinc-450 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="text-[10px]">🎮</span> GPU (Graphics)
                        </label>
                        <input
                          type="text"
                          value={customerInfo.gpu || ''}
                          onChange={e => setCustomerInfo(prev => ({ ...prev, gpu: e.target.value }))}
                          placeholder="NVIDIA GTX 1060, Intel HD Graphics..."
                          className="bg-zinc-950 border border-zinc-800 focus:border-indigo-550 rounded-lg px-3 py-2 text-zinc-200 text-xs focus:outline-none transition-all font-medium"
                        />
                      </div>

                      {/* RAM */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-semibold text-zinc-450 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers size={11} className="text-indigo-400" /> Kapasitas RAM
                        </label>
                        <input
                          type="text"
                          value={customerInfo.ram}
                          onChange={e => setCustomerInfo(prev => ({ ...prev, ram: e.target.value }))}
                          placeholder="8 GB, 16 GB, 32 GB..."
                          className="bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-zinc-200 text-xs focus:outline-none transition-all font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Storage Drives (Full Width) */}
                  <div className="flex flex-col gap-2 bg-zinc-950/45 p-4 rounded-xl border border-zinc-800/60 mt-4">
                    <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-800/40 pb-2">
                      <HardDrive size={12} className="text-indigo-400" /> Daftar Drive Penyimpanan (HDD / SSD)
                    </label>
                    
                    <div className="flex flex-col gap-2 mt-2">
                      {drives.length === 0 ? (
                        <div className="text-center py-4 bg-zinc-950 border border-zinc-850 rounded-lg border-dashed">
                          <p className="text-[10px] text-zinc-550">Belum ada drive terdeteksi atau ditambahkan</p>
                        </div>
                      ) : (
                        drives.map((drive, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-zinc-555 w-5 text-right font-bold">#{idx+1}</span>
                            <div className="relative flex-1 flex items-center">
                              <span className="absolute left-3 text-zinc-500 text-xs">💾</span>
                              <input
                                type="text"
                                value={drive}
                                onChange={e => handleDriveChange(idx, e.target.value)}
                                placeholder={`Contoh: C: SSD NVMe 512GB`}
                                className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-indigo-550 rounded-lg pl-8 pr-3 py-2 text-zinc-200 text-xs focus:outline-none transition-all font-mono"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveDrive(idx)}
                              className="p-2 rounded-lg bg-rose-955/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 transition-all active:scale-95"
                              title="Hapus Drive"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <button
                      type="button"
                      onClick={handleAddDrive}
                      className="mt-2 px-3 py-2 rounded-lg bg-indigo-650/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/25 text-[10px] font-black tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 w-full sm:w-fit"
                    >
                      <Plus size={12} /> Tambah Drive Baru
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* SECTION 2: Checklist Kondisi Komponen (Grid 2 Kolom) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Kolom Kiri: Hasil Diagnosa Terhubung (Auto-Sync) */}
              <div className="glass-panel border-zinc-800/80 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-zinc-800/40 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <ClipboardList size={14} className="text-indigo-400" />
                      <span className="text-[10px] font-bold font-mono tracking-wider text-indigo-400 uppercase">Hasil Diagnosa (Auto-Sync)</span>
                    </div>
                    <span className="text-[9px] bg-zinc-855 text-indigo-400 border border-zinc-800 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                      🔬 TERUJI & TERHUBUNG
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {DIAGNOSED_COMPONENTS.map(renderComp)}
                  </div>
                </div>
              </div>

              {/* Kolom Kanan: Pemeriksaan Fisik & Port (Input Manual) */}
              <div className="glass-panel border-zinc-800/80 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-zinc-800/40 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <ClipboardList size={14} className="text-indigo-400" />
                      <span className="text-[10px] font-bold font-mono tracking-wider text-indigo-400 uppercase">Pemeriksaan Fisik & Port (Input Manual)</span>
                    </div>
                    <div className="text-[9px] bg-zinc-850 text-indigo-400 border border-zinc-800 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                      🔩 MANUAL CHECK
                    </div>
                  </div>

                  {deviceType === 'pc' ? (
                    <div className="text-center py-8 bg-zinc-950/20 border border-zinc-850 border-dashed rounded-xl flex flex-col items-center justify-center text-zinc-550 text-xs">
                      <span>Tidak memerlukan pemeriksaan fisik manual (Laptop-only components hidden)</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {MANUAL_COMPONENTS.map(renderComp)}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* SECTION 3: Detail Layanan & Kerusakan Inti (Grid 2 Kolom) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Kolom Kiri: Jenis Layanan */}
              <div className="glass-panel border-zinc-800/80 p-5 rounded-2xl flex flex-col gap-3">
                <div className="flex items-center gap-2 border-b border-zinc-800/40 pb-3">
                  <Zap size={14} className="text-indigo-400" />
                  <span className="text-[10px] font-bold font-mono tracking-wider text-indigo-400 uppercase">Jenis Layanan</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                  {SERVICE_TYPES.map(svc => (
                    <label key={svc} className="flex items-center gap-3 cursor-pointer group" onClick={() => toggleService(svc)}>
                      <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${serviceTypes.includes(svc) ? 'bg-indigo-650 border-indigo-600' : 'bg-transparent border-zinc-800 group-hover:border-indigo-500/50'}`}>
                        {serviceTypes.includes(svc) && <span className="text-[9px] text-white font-bold">✓</span>}
                      </div>
                      <span className={`text-xs transition-colors ${serviceTypes.includes(svc) ? 'text-indigo-300 font-semibold' : 'text-zinc-400 group-hover:text-zinc-300'}`}>{svc}</span>
                    </label>
                  ))}
                </div>
                <div className="flex flex-col gap-1 mt-3 pt-3 border-t border-zinc-850">
                  <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Lainnya</label>
                  <input
                    type="text" value={otherService} onChange={e => setOtherService(e.target.value)}
                    placeholder="Jenis layanan lain..."
                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 text-xs focus:outline-none focus:border-indigo-550 transition-all"
                  />
                </div>
              </div>

              {/* Kolom Kanan: Keterangan Kerusakan Inti & Aksi */}
              <div className="flex flex-col gap-5 justify-between">
                <div className="glass-panel border-zinc-800/80 p-5 rounded-2xl flex-1 flex flex-col gap-4">
                  <div className="flex items-center gap-2 border-b border-zinc-800/40 pb-3">
                    <AlertTriangle size={14} className="text-rose-400" />
                    <span className="text-[10px] font-bold font-mono tracking-wider text-rose-400 uppercase">Keterangan Kerusakan Inti</span>
                  </div>
                  <textarea
                    rows={4}
                    value={kerusakanInti}
                    onChange={e => setKerusakanInti(e.target.value)}
                    placeholder="Deskripsikan keluhan utama / kerusakan yang dilaporkan customer saat penerimaan unit..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 text-xs focus:outline-none focus:border-rose-500/30 resize-none transition-all leading-relaxed flex-1"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  {/* Option to print empty Nota number */}
                  <label className="flex items-center gap-2 cursor-pointer bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800">
                    <input
                      type="checkbox"
                      checked={printWithoutNota}
                      onChange={(e) => setPrintWithoutNota(e.target.checked)}
                      className="rounded border-zinc-800 bg-zinc-950 text-indigo-505 focus:ring-0 cursor-pointer shadow-sm"
                    />
                    <span className="text-[9px] font-bold text-zinc-450 uppercase tracking-wider">Cetak tanpa nomor nota (tulis manual)</span>
                  </label>

                  {/* Actions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button onClick={handlePrint} className="py-3 bg-indigo-650 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] border border-indigo-500/25 shadow-sm">
                      <Printer size={15} /> Simpan & Cetak PDF
                    </button>
                    <button onClick={handleSave} className="py-3 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all border border-zinc-700 shadow-sm">
                      <Save size={15} /> Simpan Tanpa Cetak
                    </button>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>

      {/* ── Print Area (A4) ── */}
      <div className="intake-print-area hidden">
        <div className="intake-print-sheet">
          <div className="intake-accent-bar" />

          <div className="intake-title-block">
            <h1 className="intake-title">FORM PENERIMAAN UNIT SERVIS</h1>
            <p className="intake-subtitle">PC Service Center &nbsp;•&nbsp; Bukti Kondisi Awal Sebelum Servis</p>
          </div>

          <div className="intake-meta-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '8px 12px' }}>
            {[
              ['Nama Pelanggan', customerInfo.nama || '—'],
              ['No. HP / Telp', customerInfo.noHp || '—'],
              ['No. Nota / Ticket', printWithoutNota ? '........................' : customerInfo.noNota],
              ['Tanggal Masuk', customerInfo.tanggalMasuk ? new Date(customerInfo.tanggalMasuk).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '—'],
              ['Jenis Layanan', [...serviceTypes, otherService].filter(Boolean).join(' • ') || '—'],
            ].map(([lbl, val]) => (
              <div key={lbl} className="intake-meta-item">
                <div className="intake-meta-label">{lbl}</div>
                <div className={`intake-meta-value ${lbl.includes('Nota') ? 'intake-mono' : ''}`}>{val}</div>
              </div>
            ))}
          </div>

          <div className="intake-section-title" style={{ marginTop: '10px' }}>SPESIFIKASI PERANGKAT</div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px 16px',
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '10px 12px',
            marginBottom: '12px',
            fontSize: '9pt',
            color: '#1e293b'
          }}>
            <div>
              <div style={{ fontSize: '7.5pt', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>
                {deviceType === 'pc' ? 'Motherboard / Tipe PC' : 'Tipe Laptop / Mobo'}
              </div>
              <div style={{ fontWeight: '700', color: '#0f172a' }}>{customerInfo.tipePerangkat || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '7.5pt', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Processor</div>
              <div style={{ fontWeight: '700', color: '#0f172a' }}>{customerInfo.processor || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '7.5pt', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>GPU (Graphics)</div>
              <div style={{ fontWeight: '700', color: '#0f172a' }}>{customerInfo.gpu || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '7.5pt', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Memori RAM</div>
              <div style={{ fontWeight: '700', color: '#0f172a' }}>{customerInfo.ram || '—'}</div>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: '7.5pt', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Penyimpanan (HDD/SSD)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '2px' }}>
                {customerInfo.storage ? (
                  customerInfo.storage.split('\n').map((line, idx) => (
                    <div key={idx} style={{ fontSize: '8.5pt', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px', lineHeight: '1.3' }}>
                      💾 {line}
                    </div>
                  ))
                ) : (
                  <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>—</div>
                )}
              </div>
            </div>
          </div>

          <div className="intake-section-title">CHECKLIST KONDISI KOMPONEN</div>
          <table className="intake-table">
            <thead>
              <tr>
                <th>Komponen</th>
                <th className="intake-col-status">OK</th>
                <th className="intake-col-status">Rusak</th>
                <th className="intake-col-status">Tdk Ada</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {activeComponents.map(comp => {
                const s = components[comp.id] || { status: 'ok', notes: '', autoInfo: null };
                const info = [s.autoInfo, s.notes].filter(Boolean).join(' • ');
                return (
                  <tr key={comp.id}>
                    <td className="intake-comp-label">{comp.icon} {getCompLabel(comp)}</td>
                    <td className="intake-col-status intake-check">{s.status === 'ok' ? '✓' : ''}</td>
                    <td className="intake-col-status intake-check intake-rusak">{s.status === 'rusak' ? '✓' : ''}</td>
                    <td className="intake-col-status intake-check">{s.status === 'tidak_ada' ? '✓' : ''}</td>
                    <td className="intake-notes-col">{info || ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="intake-section-title" style={{ marginTop: '12px' }}>KETERANGAN KERUSAKAN INTI</div>
          <div className="intake-kerusakan-box">{kerusakanInti || '—'}</div>

          <div className="intake-terms">
            <strong>Syarat & Ketentuan:</strong>
            <ol>
              <li>Pihak servis tidak bertanggung jawab atas kerusakan yang sudah terdokumentasi di form ini sebelum unit diterima.</li>
              <li>Kerusakan komponen yang tidak tercantum pada form ini menjadi tanggung jawab pihak servis.</li>
              <li>Unit yang tidak diambil lebih dari 30 hari setelah selesai servis tidak menjadi tanggung jawab kami.</li>
              <li>Pelanggan menyetujui estimasi biaya sebelum proses servis dimulai.</li>
            </ol>
          </div>

          <div className="intake-sign-row">
            <div className="intake-sign-box">
              <div className="intake-sign-line" />
              <div className="intake-sign-label">Tanda Tangan Pelanggan</div>
              <div className="intake-sign-name">{customerInfo.nama || '_______________'}</div>
            </div>
            <div className="intake-sign-box">
              <div className="intake-sign-line" />
              <div className="intake-sign-label">Tanda Tangan Teknisi</div>
              <div className="intake-sign-name">_______________</div>
            </div>
            <div className="intake-sign-box">
              <div className="intake-sign-label intake-sign-label-sm">Tanggal</div>
              <div className="intake-sign-name">
                {customerInfo.tanggalMasuk ? new Date(customerInfo.tanggalMasuk).toLocaleDateString('id-ID') : new Date().toLocaleDateString('id-ID')}
              </div>
              <div style={{ marginTop: '8px' }} className="intake-sign-label intake-sign-label-sm">No. Nota</div>
              <div className="intake-sign-name intake-mono">{printWithoutNota ? '........................' : customerInfo.noNota}</div>
            </div>
          </div>
        </div>
      </div>

      {showValidationModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-2 text-rose-455 font-bold border-b border-slate-800 pb-3 mb-4">
              <AlertTriangle size={20} className="animate-pulse" />
              <h3 className="text-sm uppercase tracking-wider font-mono">Pengecekan Tidak Lengkap</h3>
            </div>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed font-sans">
              Mohon lengkapi data berikut sebelum menyimpan atau mencetak laporan:
            </p>
            <ul className="space-y-2 mb-6">
              {validationErrors.map((err, idx) => (
                <li key={idx} className="text-xs text-rose-350 flex items-start gap-2 bg-rose-955/10 p-2.5 rounded-lg border border-rose-950/30">
                  <span className="shrink-0 text-rose-400 font-mono mt-0.5">⚠️</span>
                  <span>{err}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowValidationModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-350 text-xs font-bold transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {showTutorialModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-fade-in max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 mb-4 shrink-0">
              <div className="flex items-center gap-2 text-indigo-400 font-bold">
                <FileText size={18} />
                <h3 className="text-sm uppercase tracking-wider font-mono">Cara Mendapatkan File DxDiag.txt</h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowTutorialModal(false)}
                className="p-1 rounded-lg bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-white transition-all border border-slate-900"
              >
                <X size={14} />
              </button>
            </div>
            
            <div className="overflow-y-auto pr-1 flex-1 space-y-4 text-xs text-slate-350 leading-relaxed font-sans">
              <p>
                DxDiag (DirectX Diagnostic Tool) adalah utilitas bawaan Windows yang merangkum spesifikasi hardware komputer Anda dengan sangat rinci.
              </p>
              
              <div className="space-y-3">
                <div className="flex gap-3 bg-slate-950/45 p-3 rounded-xl border border-slate-900">
                  <span className="h-6 w-6 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] font-black text-indigo-400 font-mono shrink-0">1</span>
                  <div>
                    <p className="font-bold text-slate-200">Buka Menu Run</p>
                    <p className="mt-0.5">Tekan tombol kombinasi <kbd className="bg-slate-850 border border-slate-750 px-1.5 py-0.5 rounded text-[10px] text-white font-bold font-mono">Win + R</kbd> pada keyboard Anda.</p>
                  </div>
                </div>

                <div className="flex gap-3 bg-slate-950/45 p-3 rounded-xl border border-slate-900">
                  <span className="h-6 w-6 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] font-black text-indigo-400 font-mono shrink-0">2</span>
                  <div>
                    <p className="font-bold text-slate-200">Jalankan Perintah DxDiag</p>
                    <p className="mt-0.5">Ketik <code className="bg-slate-850 border border-slate-750 px-1.5 py-0.5 rounded text-[10px] text-indigo-300 font-bold font-mono">dxdiag</code> di kolom input lalu tekan Enter atau klik OK.</p>
                  </div>
                </div>

                <div className="flex gap-3 bg-slate-950/45 p-3 rounded-xl border border-slate-900">
                  <span className="h-6 w-6 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] font-black text-indigo-400 font-mono shrink-0">3</span>
                  <div>
                    <p className="font-bold text-slate-200">Tunggu Proses Pengumpulan Data</p>
                    <p className="mt-0.5">Tunggu beberapa detik sampai bilah indikator proses (progress bar) di pojok kiri bawah jendela DirectX Diagnostic Tool selesai memuat data.</p>
                  </div>
                </div>

                <div className="flex gap-3 bg-slate-950/45 p-3 rounded-xl border border-slate-900">
                  <span className="h-6 w-6 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] font-black text-indigo-400 font-mono shrink-0">4</span>
                  <div>
                    <p className="font-bold text-slate-200">Simpan Informasi Hardware</p>
                    <p className="mt-0.5">Klik tombol <strong className="text-slate-200 bg-slate-900 px-1.5 py-0.5 border border-slate-800 rounded font-bold">"Save All Information..."</strong> yang ada di bagian bawah jendela.</p>
                  </div>
                </div>

                <div className="flex gap-3 bg-slate-950/45 p-3 rounded-xl border border-slate-900">
                  <span className="h-6 w-6 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] font-black text-indigo-400 font-mono shrink-0">5</span>
                  <div>
                    <p className="font-bold text-slate-200">Simpan Sebagai File Teks (.txt)</p>
                    <p className="mt-0.5">Pilih direktori penyimpanan (misal di Desktop) dan simpan dengan nama default <code className="text-slate-200 font-semibold font-mono">DxDiag.txt</code>.</p>
                  </div>
                </div>

                <div className="flex gap-3 bg-slate-950/45 p-3 rounded-xl border border-slate-900">
                  <span className="h-6 w-6 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] font-black text-indigo-400 font-mono shrink-0">6</span>
                  <div>
                    <p className="font-bold text-slate-200">Unggah File ke Aplikasi</p>
                    <p className="mt-0.5">Drag & drop file tersebut ke area kotak unggah di aplikasi, atau klik kotak tersebut untuk memilih file.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-t border-slate-800 pt-4 mt-4 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowTutorialModal(false)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all active:scale-95 shadow-[0_0_10px_rgba(37,99,235,0.2)]"
              >
                Mengerti & Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {showScanner && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm sm:max-w-md p-4 sm:p-5 shadow-2xl animate-fade-in flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-indigo-400 font-bold">
                <Scan size={18} />
                <h3 className="text-sm uppercase tracking-wider font-mono">Scan Barcode / QR Code</h3>
              </div>
              <button 
                type="button"
                onClick={stopScanner}
                className="p-1 rounded-lg bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-white transition-all border border-slate-900"
              >
                <X size={14} />
              </button>
            </div>
            
            <div className="relative overflow-hidden rounded-xl bg-black border border-zinc-850 w-full aspect-[4/3] sm:aspect-video flex items-center justify-center">
              <div id="reader" className="w-full h-full"></div>
              <div className="absolute inset-0 pointer-events-none border border-dashed border-indigo-500/30 rounded-xl m-4">
                <div className="scanner-overlay-line"></div>
              </div>
            </div>
            
            <p className="text-[10px] text-zinc-450 text-center leading-normal">
              Arahkan kamera ke Barcode nota penjualan atau QR Code. Pastikan pencahayaan cukup dan kode terlihat jelas di dalam kotak.
            </p>
            
            <div className="border-t border-slate-800 pt-3 flex justify-end">
              <button
                type="button"
                onClick={stopScanner}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-350 text-xs font-bold transition-all active:scale-95"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
