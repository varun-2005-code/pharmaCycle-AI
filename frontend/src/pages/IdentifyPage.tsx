import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  UploadCloud,
  Camera,
  X,
  RefreshCw,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  MapPin,
  Calendar,
  Layers,
  HelpCircle,
  FileCheck,
  Video,
  VideoOff,
  Sliders,
  Database,
  ShieldCheck
} from 'lucide-react';
import type { AnalyzeResponse, DisposalRecommendResponse } from '../types';

export const IdentifyPage: React.FC = () => {
  // State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  // Quick Recommendation Panel (Section 4D)
  const [quickRec, setQuickRec] = useState<DisposalRecommendResponse | null>(null);
  const [loadingQuickRec, setLoadingQuickRec] = useState<boolean>(false);

  // Demo Mode Controls (Section 4B)
  const [modelMode, setModelMode] = useState<'demo' | 'real'>('demo');
  const [sampleCategory, setSampleCategory] = useState<string>('Empty blister pack');
  const [saveToTracking, setSaveToTracking] = useState<boolean>(true);

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const allowedFormats = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSizeBytes = 5 * 1024 * 1024; // 5 MB

  const sampleCategories = [
    'Empty blister pack',
    'Medicine or tablet strip',
    'Medicine bottle or container',
    'Cardboard or paper pharmaceutical packaging',
    'Unknown or other'
  ];

  // Clean up object URLs and camera streams on unmount
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      stopCamera();
    };
  }, [previewUrl]);

  // Client-side file validation
  const validateFile = (file: File): string | null => {
    if (!allowedFormats.includes(file.type.toLowerCase()) && 
        !/\.(jpg|jpeg|png|webp)$/i.test(file.name)) {
      return 'Unsupported file format. Please upload JPG, PNG, or WEBP images only.';
    }
    if (file.size > maxSizeBytes) {
      return `File size is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 5 MB.`;
    }
    if (file.size === 0) {
      return 'Uploaded file is empty (0 bytes). Please choose a valid image.';
    }
    return null;
  };

  const handleFileSelect = (file: File) => {
    setErrorMessage(null);
    setResult(null);

    const error = validateFile(file);
    if (error) {
      setErrorMessage(error);
      return;
    }

    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(objectUrl);
    stopCamera();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Remove & Replace
  const handleRemoveImage = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setQuickRec(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Automatically fetch deterministic recommendation when visual category is determined
  useEffect(() => {
    if (result?.predicted_category) {
      setLoadingQuickRec(true);
      fetch('/api/disposal/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          waste_category: result.predicted_category,
          expiry_status: 'unverified',
          location: 'Central City'
        })
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: DisposalRecommendResponse | null) => {
          setQuickRec(data);
        })
        .catch((err) => {
          console.error('Failed to fetch recommendation preview', err);
        })
        .finally(() => {
          setLoadingQuickRec(false);
        });
    } else {
      setQuickRec(null);
    }
  }, [result]);

  // Camera Management
  const startCamera = async () => {
    setCameraError(null);
    setErrorMessage(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your current browser.');
      }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
      } catch {
        // Fallback to standard video stream for desktop/laptop webcams
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      streamRef.current = stream;
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((e) => console.error('Video play error:', e));
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      let msg = 'Could not access camera. Please verify camera permissions in your browser.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please allow camera access in your browser (click the camera or lock icon in your address bar).';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No video capture device (webcam or camera) was found on your system.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'Camera is already in use by another application (e.g. Zoom, Teams, or another browser tab).';
      }
      setCameraError(msg);
      setIsCameraActive(false);
    }
  };

  // Ensure video element receives active media stream upon mounting
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((e) => console.error('Video play error:', e));
    }
  }, [isCameraActive]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const captureCameraFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `camera-scan-${Date.now()}.jpg`, { type: 'image/jpeg' });
        handleFileSelect(file);
      }
    }, 'image/jpeg', 0.92);

    stopCamera();
  };

  // Helper to load sample test images directly on-the-fly
  const loadSyntheticSample = (category: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw background
    ctx.fillStyle = '#f0fdf4';
    ctx.fillRect(0, 0, 600, 400);

    // Draw stylized packaging illustration
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 4;
    ctx.fillStyle = '#ffffff';

    if (category.includes('blister')) {
      // Blister pack grid
      ctx.roundRect(150, 80, 300, 240, 16);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#cbd5e1';
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          ctx.beginPath();
          ctx.arc(200 + c * 100, 130 + r * 70, 24, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
    } else if (category.includes('bottle')) {
      // Bottle shape
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(230, 70, 140, 50); // cap
      ctx.fillStyle = '#d97706';
      ctx.roundRect(200, 120, 200, 220, 24); // body
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(220, 160, 160, 120); // label
    } else if (category.includes('Cardboard')) {
      // Box
      ctx.fillStyle = '#f8fafc';
      ctx.strokeRect(160, 90, 280, 220);
      ctx.fillRect(160, 90, 280, 220);
      ctx.fillStyle = '#0f3e2e';
      ctx.fillRect(190, 120, 220, 30);
    } else {
      // Tablets / Strips
      ctx.roundRect(160, 100, 280, 200, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.ellipse(300, 200, 70, 40, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Label text on synthetic image
    ctx.fillStyle = '#0f3e2e';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`PharmaCycle AI Sample: ${category}`, 40, 40);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `sample-${category.toLowerCase().replace(/\s+/g, '-')}.png`, {
          type: 'image/png'
        });
        setSampleCategory(category);
        handleFileSelect(file);
      }
    }, 'image/png');
  };

  // Submit to Backend POST /api/analyze
  const handleAnalyze = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select or capture an image first.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('model_mode', modelMode);
    if (sampleCategory) {
      formData.append('sample_category', sampleCategory);
    }
    formData.append('save_record', saveToTracking ? 'true' : 'false');

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const detailMsg = typeof errorData.detail === 'string'
          ? errorData.detail
          : (errorData.detail?.error || 'Analysis service failed. Please check file format.');
        throw new Error(detailMsg);
      }

      const data: AnalyzeResponse = await response.json();
      setResult(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error communicating with the backend analysis service.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 lg:py-14">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-botanical-100 text-botanical-900 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-tealAccent-600" />
          Section 4B • Computer Vision Pipeline
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-botanical-900 tracking-tight">
          AI Pharmaceutical Waste Identification
        </h1>
        <p className="text-sm text-slate-600 mt-2 max-w-2xl mx-auto leading-relaxed">
          Distinguish active medicines from composite packaging (PVC/Alu blisters, glass bottles, and paper cartons) to determine safe disposal paths and avoid environmental contamination.
        </p>
      </div>

      {/* Mandatory Safety Notice per Section 1 & 4B */}
      <div className="mb-8 p-4 rounded-2xl bg-botanical-50 border border-emerald-200 text-xs text-botanical-950 flex items-start gap-3 shadow-2xs">
        <ShieldAlert className="w-5 h-5 text-tealAccent-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="font-bold text-botanical-900">Safety & Compliance Disclosure:</strong>
          <span className="text-slate-700 ml-1">
            Visual classification identifies material packaging categories only. It does <strong>not</strong> establish medication expiration, chemical purity, drug potency, or municipal curbside recyclability. Never flush medicines down domestic drainage.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Upload / Camera / Settings (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-soft">
            
            {/* Mode & Demo Selector Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 mb-5 border-b border-slate-100 gap-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-tealAccent-600" />
                <span className="text-xs font-bold text-botanical-900 uppercase tracking-wider">
                  Model Adapter Settings
                </span>
              </div>

              {/* Mode Toggle */}
              <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setModelMode('demo')}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    modelMode === 'demo'
                      ? 'bg-white text-botanical-900 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-botanical-900'
                  }`}
                >
                  Demo Mode
                </button>
                <button
                  type="button"
                  onClick={() => setModelMode('real')}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    modelMode === 'real'
                      ? 'bg-white text-botanical-900 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-botanical-900'
                  }`}
                >
                  Real Model
                </button>
              </div>
            </div>

            {/* Demo Mode Target Category Selector (Section 4B) */}
            {modelMode === 'demo' && (
              <div className="mb-6 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-amber-600" /> Demo Target Category:
                  </span>
                  <span className="text-[10px] text-amber-700 font-semibold bg-amber-100/80 px-2 py-0.5 rounded-md">
                    Deterministic Simulation
                  </span>
                </div>
                <select
                  value={sampleCategory}
                  onChange={(e) => setSampleCategory(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-white border border-amber-300 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-tealAccent-500"
                >
                  {sampleCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-amber-800 mt-2 leading-relaxed">
                  Per Section 4B: Demo simulation explicitly returns <code>confidence=null</code> and labels results clearly to ensure transparent evaluation.
                </p>
              </div>
            )}

            {/* Real Model Notice */}
            {modelMode === 'real' && (
              <div className="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                <span className="font-bold text-botanical-900 block mb-1">Configured Model Path:</span>
                <code className="text-[11px] bg-white px-2 py-1 rounded-md border border-slate-200 text-slate-800 block">
                  ./models/waste_classifier.onnx
                </code>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  If weights are absent, the server safely reports model unconfigured and provides evaluation guidance.
                </span>
              </div>
            )}

            {/* Hidden Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={handleInputChange}
              className="hidden"
            />

            {/* Camera Viewport Modal / View */}
            {isCameraActive ? (
              <div className="rounded-2xl border-2 border-tealAccent-500 overflow-hidden bg-black relative p-2">
                <video
                  ref={(el) => {
                    videoRef.current = el;
                    if (el && streamRef.current && el.srcObject !== streamRef.current) {
                      el.srcObject = streamRef.current;
                      el.play().catch((e) => console.error('Video play error:', e));
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 sm:h-80 object-cover rounded-xl"
                />
                <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-3 px-4">
                  <button
                    type="button"
                    onClick={captureCameraFrame}
                    className="px-5 py-2.5 rounded-xl bg-tealAccent-500 hover:bg-tealAccent-400 text-botanical-950 font-bold text-xs flex items-center gap-1.5 shadow-lg"
                  >
                    <Camera className="w-4 h-4" /> Capture Photo
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white font-semibold text-xs flex items-center gap-1.5"
                  >
                    <VideoOff className="w-4 h-4" /> Cancel
                  </button>
                </div>
              </div>
            ) : previewUrl ? (
              /* Image Preview Panel */
              <div className="relative rounded-2xl overflow-hidden border border-emerald-100 bg-slate-50 p-3">
                <div className="relative rounded-xl overflow-hidden max-h-80 flex items-center justify-center bg-black/5">
                  <img
                    src={previewUrl}
                    alt="Packaging Scan Preview"
                    className="max-h-80 w-auto object-contain rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    title="Remove image"
                    className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-slate-500 px-1 gap-2">
                  <div className="truncate max-w-xs">
                    <strong className="text-slate-800">{selectedFile?.name}</strong>
                    <span className="ml-2">({((selectedFile?.size || 0) / 1024).toFixed(1)} KB)</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-semibold text-tealAccent-700 hover:text-tealAccent-800"
                    >
                      Replace Image
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Drag & Drop Upload Zone */
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-tealAccent-500 bg-tealAccent-50/50 scale-[1.01]'
                    : 'border-emerald-200 hover:border-emerald-300 bg-botanical-50/40 hover:bg-botanical-50/70'
                }`}
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-botanical-900 to-tealAccent-600 flex items-center justify-center text-white shadow-md">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-base text-botanical-900">
                  Drag and drop packaging image here
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Click to browse from your device. Supported formats: <strong>JPG, JPEG, PNG, WEBP</strong> (Max 5 MB).
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="px-4 py-2 rounded-xl bg-botanical-900 hover:bg-botanical-800 text-white font-semibold text-xs transition-colors shadow-2xs"
                  >
                    Browse Files
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      startCamera();
                    }}
                    className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5 text-tealAccent-600" /> Use Camera
                  </button>
                </div>
              </div>
            )}

            {/* Camera Error Message */}
            {cameraError && (
              <div role="alert" aria-live="assertive" className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Validation / API Error Message */}
            {errorMessage && (
              <div role="alert" aria-live="assertive" className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <strong className="font-bold block">Validation Alert:</strong>
                  <span>{errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-rose-500 hover:text-rose-700 cursor-pointer"
                  aria-label="Dismiss alert"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Quick Demo Test Presets */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
                Quick Test Samples (One-Click Evaluation)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => loadSyntheticSample('Empty blister pack')}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 text-[11px] font-medium text-slate-700 text-left transition-colors truncate"
                >
                  ⚡ Blister Pack
                </button>
                <button
                  type="button"
                  onClick={() => loadSyntheticSample('Medicine or tablet strip')}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 text-[11px] font-medium text-slate-700 text-left transition-colors truncate"
                >
                  ⚡ Tablet Strip
                </button>
                <button
                  type="button"
                  onClick={() => loadSyntheticSample('Medicine bottle or container')}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 text-[11px] font-medium text-slate-700 text-left transition-colors truncate"
                >
                  ⚡ Syrup Bottle
                </button>
                <button
                  type="button"
                  onClick={() => loadSyntheticSample('Unknown or other')}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-200 text-[11px] font-medium text-slate-700 text-left transition-colors truncate"
                >
                  ⚡ Unknown / Review
                </button>
              </div>
            </div>

            {/* Options & Action Button */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={saveToTracking}
                  onChange={(e) => setSaveToTracking(e.target.checked)}
                  className="rounded-sm border-slate-300 text-tealAccent-600 focus:ring-tealAccent-500"
                />
                <span className="flex items-center gap-1">
                  <Database className="w-3.5 h-3.5 text-tealAccent-600" />
                  Log record to tracking dashboard state machine
                </span>
              </label>

              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!selectedFile || isAnalyzing}
                className={`w-full sm:w-auto px-7 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
                  !selectedFile || isAnalyzing
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-botanical-900 hover:bg-botanical-800 text-white hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-tealAccent-400" />
                    Analyzing Waste Packaging...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-tealAccent-400" />
                    Analyze Waste
                  </>
                )}
              </button>
            </div>

          </div>
        </div>

        {/* Right Column: Analysis Results Panel (5 Cols) */}
        <div className="lg:col-span-5">
          {result ? (
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-emerald-200 shadow-soft-lg space-y-5 animate-in fade-in duration-300">
              
              {/* Header with Mode Badge */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Analysis Results
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    result.model_mode === 'demo'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${result.model_mode === 'demo' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  {result.model_mode === 'demo' ? 'Demo Simulation Mode' : 'Real Model Output'}
                </span>
              </div>

              {/* Detected Category */}
              <div>
                <span className="text-[11px] font-medium text-slate-500 block">Predicted Visual Category</span>
                <h3 className="text-xl font-extrabold text-botanical-900 mt-1 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-tealAccent-600 shrink-0" />
                  {result.predicted_category}
                </h3>
              </div>

              {/* Confidence Score Display (Section 4B rule: ONLY if returned by actual configured model) */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-700">Model Confidence:</span>
                  {result.model_mode === 'real' && result.confidence !== null ? (
                    <span className="font-mono font-bold text-emerald-700">
                      {(result.confidence * 100).toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-slate-500 font-medium">
                      N/A (Demo Simulation Mode)
                    </span>
                  )}
                </div>
                {result.model_mode === 'demo' && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    *Confidence percentage is omitted in demo mode to prevent misrepresentation as real computer vision.
                  </p>
                )}
              </div>

              {/* Explanation */}
              <div className="space-y-1 text-xs">
                <span className="font-bold text-botanical-900 block">Visual Assessment:</span>
                <p className="text-slate-600 leading-relaxed bg-botanical-50/50 p-3 rounded-xl border border-emerald-100">
                  {result.explanation}
                </p>
              </div>

              {/* Uncertainty / Limitations (Section 4B) */}
              {result.uncertainty_notes && (
                <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 text-xs space-y-1">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Uncertainty & Limitations
                  </span>
                  <p className="text-amber-800 leading-relaxed text-[11px]">
                    {result.uncertainty_notes}
                  </p>
                </div>
              )}

              {/* Database Tracked Status */}
              {result.waste_item_id && (
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 flex items-center justify-between">
                  <span>Tracked Record Created: <strong>ID #{result.waste_item_id}</strong></span>
                  <Link to="/dashboard" className="font-bold text-purple-700 hover:underline flex items-center gap-1">
                    View in Dashboard <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )}

              {/* Deterministic Disposal Recommendation Panel (Section 4D) */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-botanical-900 block mb-2">
                  Disposal Recommendation:
                </span>
                {loadingQuickRec ? (
                  <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-xs text-slate-500 text-center flex items-center justify-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-tealAccent-600" />
                    Evaluating deterministic rules engine...
                  </div>
                ) : quickRec ? (
                  <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-tealAccent-700" />
                        Deterministic Rule Output
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        quickRec.verification_status === 'verified'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}>
                        {quickRec.verification_status === 'verified' ? 'Verified Local Rule' : 'General Guidance'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-emerald-950 block mb-0.5">Recommended Action:</span>
                      <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                        {quickRec.recommended_action}
                      </p>
                    </div>

                    {quickRec.handling_cautions && (
                      <div className="text-[11px] text-rose-900 bg-rose-50/80 p-2.5 rounded-xl border border-rose-200">
                        <strong>Caution:</strong> {quickRec.handling_cautions}
                      </div>
                    )}

                    <div className="pt-1 flex flex-col sm:flex-row gap-2">
                      <Link
                        to={`/recommendations?category=${encodeURIComponent(result.predicted_category)}`}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-botanical-900 hover:bg-botanical-800 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <span>Full Recommendation Studio</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                      <Link
                        to={`/guide?category=${encodeURIComponent(result.predicted_category)}`}
                        className="py-1.5 px-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <BookOpen className="w-3 h-3 text-slate-500" />
                        <span>View Guide</span>
                      </Link>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Suggested Next Actions */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="text-xs font-bold text-botanical-900 block">Suggested Next Actions:</span>
                <div className="space-y-2 text-xs">
                  <Link
                    to={`/recommendations?category=${encodeURIComponent(result.predicted_category)}`}
                    className="w-full py-2 px-3 rounded-xl bg-tealAccent-50 hover:bg-tealAccent-100 text-tealAccent-900 font-semibold flex items-center justify-between transition-colors border border-tealAccent-200"
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-tealAccent-700" /> Evidence-Based Recommendation
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-tealAccent-600" />
                  </Link>

                  <Link
                    to="/guide"
                    className="w-full py-2 px-3 rounded-xl bg-botanical-50 hover:bg-botanical-100 text-botanical-900 font-semibold flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-tealAccent-600" /> Explore Disposal Guide
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>

                  <Link
                    to="/facilities"
                    className="w-full py-2 px-3 rounded-xl bg-botanical-50 hover:bg-botanical-100 text-botanical-900 font-semibold flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-tealAccent-600" /> Find Collection Centre
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>

                  <Link
                    to="/ocr"
                    className="w-full py-2 px-3 rounded-xl bg-botanical-50 hover:bg-botanical-100 text-botanical-900 font-semibold flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-tealAccent-600" /> Verify Expiry Date (OCR)
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>
                </div>
              </div>

            </div>
          ) : (
            /* Empty State Waiting for Image Analysis */
            <div className="bg-white rounded-3xl p-8 border border-dashed border-slate-200 text-center space-y-4 text-slate-500">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
                <FileCheck className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-bold text-slate-700 text-sm">No Active Analysis</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Upload an image or select a quick test preset, then click <strong>Analyze Waste</strong> to view classification results.
                </p>
              </div>

              <div className="pt-2 text-left bg-botanical-50/60 p-4 rounded-2xl border border-emerald-100 text-xs space-y-1.5 text-botanical-900">
                <span className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-tealAccent-600" /> What will be inspected:
                </span>
                <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px]">
                  <li>File magic byte signature & integrity.</li>
                  <li>Polymer, aluminium, and blister geometries.</li>
                  <li>Material-specific take-back recommendations.</li>
                  <li>Optional enrollment in state machine tracking.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
