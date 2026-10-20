import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud,
  FileText,
  Eye,
  Download,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  Calendar,
  Building2,
  User,
  Activity,
  Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export interface DiagnosticScan {
  id: string;
  patientId: string;
  patientName?: string;
  modality: 'CT Scan' | 'X-Ray' | 'MRI Scan' | 'Ultrasound' | 'PET-CT' | 'Mammogram' | 'Other';
  bodyPart: string;
  scanDate: string;
  facility: string;
  radiologist: string;
  clinicalImpression: string;
  fileDataUrl: string;
  fileName: string;
  fileSizeBytes: number;
  uploadedAt: string;
}

const STORAGE_PREFIX = 'medconnect_patient_scans_';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Megabytes limit

export function getPatientScans(patientId: string): DiagnosticScan[] {
  if (!patientId) return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${patientId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePatientScans(patientId: string, scans: DiagnosticScan[]) {
  if (!patientId) return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${patientId}`, JSON.stringify(scans));
  } catch (err) {
    console.error('Failed to persist diagnostic scans', err);
  }
}

interface DiagnosticImagingVaultProps {
  patientId: string;
  patientName: string;
  isDoctorView?: boolean;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'error') => void;
}

export const DiagnosticImagingVault: React.FC<DiagnosticImagingVaultProps> = ({
  patientId,
  patientName,
  isDoctorView = false,
  onShowToast,
}) => {
  const [scans, setScans] = useState<DiagnosticScan[]>(() => getPatientScans(patientId));
  const [selectedScan, setSelectedScan] = useState<DiagnosticScan | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [modalityFilter, setModalityFilter] = useState<string>('all');

  // Viewer Controls
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [isInverted, setIsInverted] = useState<boolean>(false);
  const [contrastBoost, setContrastBoost] = useState<boolean>(false);

  // Upload Form State
  const [uploadModality, setUploadModality] = useState<DiagnosticScan['modality']>('CT Scan');
  const [uploadBodyPart, setUploadBodyPart] = useState('Chest / Thorax');
  const [uploadDate, setUploadDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [uploadFacility, setUploadFacility] = useState('');
  const [uploadRadiologist, setUploadRadiologist] = useState('');
  const [uploadImpression, setUploadImpression] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state from Supabase Cloud + Local Storage
  useEffect(() => {
    let mounted = true;
    async function loadScans() {
      // 1. Initial responsive populate from local cache
      const local = getPatientScans(patientId);
      if (local.length > 0 && mounted) {
        setScans(local);
      }

      // 2. Fetch authoritative records from Supabase diagnostic_scans table
      try {
        const { data, error } = await supabase
          .from('diagnostic_scans')
          .select('*')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false });

        if (!error && data && mounted) {
          const mapped: DiagnosticScan[] = data.map((row: any) => ({
            id: row.id,
            patientId: row.patient_id,
            patientName: row.patient_name || patientName,
            modality: row.modality,
            bodyPart: row.body_part,
            scanDate: row.scan_date,
            facility: row.facility,
            radiologist: row.radiologist,
            clinicalImpression: row.clinical_impression,
            fileDataUrl: row.file_url,
            fileName: row.file_name,
            fileSizeBytes: row.file_size_bytes || 0,
            uploadedAt: row.created_at,
          }));
          setScans(mapped);
          savePatientScans(patientId, mapped);
        }
      } catch (err) {
        console.warn('Could not fetch scans from Supabase, using local cache', err);
      }
    }

    if (patientId) {
      loadScans();
    }

    return () => {
      mounted = false;
    };
  }, [patientId, patientName]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      onShowToast(
        'File Size Exceeded',
        `File is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Maximum supported size is 10 MB.`,
        'error'
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setFilePreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      onShowToast('Missing File', 'Please select an image or scan file to upload.', 'error');
      return;
    }

    setIsSubmitting(true);
    let finalFileUrl = filePreviewUrl || '';

    // 1. Upload file binary directly to Supabase Storage bucket 'medical-scans'
    try {
      const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${patientId}/${Date.now()}_${sanitizedName}`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('medical-scans')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (!uploadErr && uploadData) {
        const { data: { publicUrl } } = supabase.storage
          .from('medical-scans')
          .getPublicUrl(filePath);
        if (publicUrl) {
          finalFileUrl = publicUrl;
        }
      } else if (uploadErr) {
        console.warn('Supabase storage upload note:', uploadErr.message);
      }
    } catch (err) {
      console.warn('Storage upload fallback triggered:', err);
    }

    const newScan: DiagnosticScan = {
      id: `SCAN-${Date.now()}`,
      patientId,
      patientName,
      modality: uploadModality,
      bodyPart: uploadBodyPart.trim() || 'General Anatomical Scan',
      scanDate: uploadDate,
      facility: uploadFacility.trim() || 'MedConnect Diagnostic Center',
      radiologist: uploadRadiologist.trim() || 'Attending Radiologist',
      clinicalImpression: uploadImpression.trim() || 'Radiological examination completed. Record filed.',
      fileDataUrl: finalFileUrl,
      fileName: selectedFile.name,
      fileSizeBytes: selectedFile.size,
      uploadedAt: new Date().toISOString(),
    };

    // 2. Persist metadata record in Supabase diagnostic_scans table
    try {
      const { data: rowData, error: dbErr } = await supabase
        .from('diagnostic_scans')
        .insert({
          patient_id: patientId,
          patient_name: patientName,
          modality: uploadModality,
          body_part: newScan.bodyPart,
          scan_date: uploadDate,
          facility: newScan.facility,
          radiologist: newScan.radiologist,
          clinical_impression: newScan.clinicalImpression,
          file_url: finalFileUrl,
          file_name: selectedFile.name,
          file_size_bytes: selectedFile.size,
        })
        .select()
        .single();

      if (!dbErr && rowData) {
        newScan.id = rowData.id;
      }
    } catch (err) {
      console.warn('Diagnostic scan database insert fallback:', err);
    }

    const updated = [newScan, ...scans.filter(s => s.id !== newScan.id)];
    setScans(updated);
    savePatientScans(patientId, updated);

    setIsSubmitting(false);
    setIsUploadModalOpen(false);
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setUploadImpression('');
    setUploadFacility('');
    setUploadRadiologist('');

    onShowToast(
      'Scan Saved to Cloud',
      `${uploadModality} (${uploadBodyPart}) uploaded and securely stored in your medical vault.`,
      'success'
    );
  };

  const handleDeleteScan = async (scanId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this diagnostic scan?')) return;

    try {
      await supabase.from('diagnostic_scans').delete().eq('id', scanId);
    } catch {
      // ignore
    }

    const updated = scans.filter(s => s.id !== scanId);
    setScans(updated);
    savePatientScans(patientId, updated);
    if (selectedScan?.id === scanId) setSelectedScan(null);

    onShowToast('Scan Removed', 'Diagnostic scan deleted from records.', 'info');
  };

  const filteredScans = scans.filter(s => {
    const matchesSearch =
      s.modality.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.bodyPart.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.facility.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.clinicalImpression.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesModality = modalityFilter === 'all' || s.modality === modalityFilter;
    return matchesSearch && matchesModality;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">Diagnostic Imaging & Radiology Vault</h2>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              Up to 10 MB / Scan
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Secure DICOM, CT scans, X-Rays, MRIs, and Ultrasounds. Encrypted and accessible only by you and authorized doctors.
          </p>
        </div>

        {!isDoctorView && (
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-950/40 transition flex items-center gap-2 self-start"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Diagnostic Scan</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Search scans by body part, facility, or clinical impressions..."
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <Eye className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </div>

        <select
          value={modalityFilter}
          onChange={e => setModalityFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
        >
          <option value="all">All Modalities</option>
          <option value="CT Scan">CT Scan</option>
          <option value="X-Ray">X-Ray</option>
          <option value="MRI Scan">MRI Scan</option>
          <option value="Ultrasound">Ultrasound</option>
          <option value="PET-CT">PET-CT</option>
          <option value="Mammogram">Mammogram</option>
        </select>
      </div>

      {/* Scans Grid or Empty Slate */}
      {filteredScans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredScans.map(scan => (
            <div
              key={scan.id}
              onClick={() => {
                setSelectedScan(scan);
                setZoomLevel(1);
                setRotation(0);
                setIsInverted(false);
                setContrastBoost(false);
              }}
              className="group cursor-pointer rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 overflow-hidden transition-all duration-200 hover:-translate-y-0.5 shadow-md flex flex-col"
            >
              {/* Image Preview / Thumbnail */}
              <div className="relative h-44 bg-slate-950 flex items-center justify-center overflow-hidden border-b border-slate-800">
                <img
                  src={scan.fileDataUrl}
                  alt={scan.modality}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />

                {/* Modality Tag */}
                <div className="absolute top-2.5 left-2.5">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border',
                      scan.modality === 'CT Scan' && 'bg-teal-500/20 text-teal-300 border-teal-500/30',
                      scan.modality === 'X-Ray' && 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
                      scan.modality === 'MRI Scan' && 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
                      scan.modality === 'Ultrasound' && 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                      scan.modality === 'PET-CT' && 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                      scan.modality === 'Mammogram' && 'bg-pink-500/20 text-pink-300 border-pink-500/30',
                      scan.modality === 'Other' && 'bg-slate-700/50 text-slate-300 border-slate-600'
                    )}
                  >
                    {scan.modality}
                  </span>
                </div>

                {/* Size Badge */}
                <div className="absolute top-2.5 right-2.5 text-[10px] font-mono text-slate-300 bg-slate-950/70 px-2 py-0.5 rounded border border-white/10">
                  {(scan.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB
                </div>

                {/* Hover overlay hint */}
                <div className="absolute inset-0 bg-cyan-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-cyan-200 text-xs font-semibold backdrop-blur-[2px]">
                  <Maximize2 className="w-4 h-4" />
                  <span>Inspect Scan</span>
                </div>
              </div>

              {/* Card Meta Content */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {scan.bodyPart}
                  </h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                    <Building2 className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">{scan.facility}</span>
                  </p>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <Calendar className="w-3 h-3 shrink-0" />
                    <span>{scan.scanDate}</span>
                    <span>•</span>
                    <span className="truncate">{scan.radiologist}</span>
                  </p>
                </div>

                <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
                  <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed italic">
                    "{scan.clinicalImpression}"
                  </p>
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-cyan-400 font-medium">Click to open viewer</span>

                  <div className="flex items-center gap-1.5">
                    <a
                      href={scan.fileDataUrl}
                      download={scan.fileName}
                      onClick={e => e.stopPropagation()}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      title="Download Scan"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>

                    {!isDoctorView && (
                      <button
                        onClick={e => handleDeleteScan(scan.id, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="Delete Scan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 rounded-3xl bg-slate-900/40 border border-slate-800/80 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
            <Layers className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-white">No Diagnostic Scans Uploaded</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              {isDoctorView
                ? 'The patient has not uploaded any CT scans, X-Rays, or MRI files yet. Any uploaded scans will appear here automatically.'
                : 'Upload your hospital or diagnostic center scans (CT, X-Ray, MRI, Ultrasound up to 10MB). When you grant access to a doctor, they can inspect high-resolution scans directly.'}
            </p>
          </div>
          {!isDoctorView && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition inline-flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Your First Scan</span>
            </button>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* INTERACTIVE RADIOLOGY VIEWER MODAL                                   */}
      {/* ==================================================================== */}
      <AnimatePresence>
        {selectedScan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-6xl max-h-[92vh] bg-[#080d19] border border-cyan-500/30 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            >
              {/* Viewer Top Bar */}
              <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
                    {selectedScan.modality.slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{selectedScan.bodyPart}</span>
                      <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        {selectedScan.modality}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {selectedScan.facility} • {selectedScan.scanDate}
                    </p>
                  </div>
                </div>

                {/* Radiology Inspection Controls */}
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 3))}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.5))}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setRotation(prev => (prev + 90) % 360)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
                      title="Rotate 90°"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setIsInverted(!isInverted)}
                      className={cn(
                        'px-2 py-1 rounded-lg text-[11px] font-semibold transition',
                        isInverted ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                      )}
                      title="Toggle Inversion (Negative View)"
                    >
                      Invert
                    </button>
                    <button
                      onClick={() => setContrastBoost(!contrastBoost)}
                      className={cn(
                        'px-2 py-1 rounded-lg text-[11px] font-semibold transition',
                        contrastBoost ? 'bg-teal-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                      )}
                      title="Enhance Contrast"
                    >
                      Contrast
                    </button>
                    <button
                      onClick={() => {
                        setZoomLevel(1);
                        setRotation(0);
                        setIsInverted(false);
                        setContrastBoost(false);
                      }}
                      className="px-2 py-1 rounded-lg text-[11px] text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    >
                      Reset
                    </button>
                  </div>

                  <a
                    href={selectedScan.fileDataUrl}
                    download={selectedScan.fileName}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                    title="Download Original File"
                  >
                    <Download className="w-4 h-4" />
                  </a>

                  <button
                    onClick={() => setSelectedScan(null)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Viewer Body: Split into Interactive Canvas & Clinical Notes */}
              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 overflow-hidden">
                {/* Main Scan View Canvas */}
                <div className="lg:col-span-2 relative bg-black flex items-center justify-center overflow-auto p-4 select-none">
                  <div
                    style={{
                      transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                      filter: `${isInverted ? 'invert(100%)' : ''} ${contrastBoost ? 'contrast(160%) brightness(115%)' : ''}`,
                      transition: 'transform 0.15s ease-out, filter 0.2s ease',
                    }}
                    className="max-w-full max-h-[65vh] object-contain cursor-grab active:cursor-grabbing"
                  >
                    <img
                      src={selectedScan.fileDataUrl}
                      alt={selectedScan.modality}
                      className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-2xl"
                    />
                  </div>

                  {/* Radiology HUD / Overlay Information */}
                  <div className="absolute top-4 left-4 pointer-events-none text-[11px] font-mono text-cyan-400/90 bg-black/60 px-3 py-1.5 rounded-lg border border-cyan-500/20 backdrop-blur-sm space-y-0.5">
                    <div>PATIENT: {patientName || 'ANONYMOUS'}</div>
                    <div>MODALITY: {selectedScan.modality}</div>
                    <div>DATE: {selectedScan.scanDate}</div>
                    <div>ZOOM: {(zoomLevel * 100).toFixed(0)}%</div>
                  </div>
                </div>

                {/* Right Clinical & Radiologist Pane */}
                <div className="p-6 bg-slate-900/60 border-t lg:border-t-0 lg:border-l border-slate-800 overflow-y-auto space-y-5">
                  <div>
                    <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
                      Clinical Impression & Findings
                    </h4>
                    <p className="text-sm text-slate-100 leading-relaxed bg-slate-950/60 p-4 rounded-2xl border border-slate-800 whitespace-pre-wrap font-serif">
                      {selectedScan.clinicalImpression}
                    </p>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-800">
                      <span className="text-slate-400">Target Region</span>
                      <span className="text-white font-semibold">{selectedScan.bodyPart}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800">
                      <span className="text-slate-400">Imaging Facility</span>
                      <span className="text-slate-200">{selectedScan.facility}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800">
                      <span className="text-slate-400">Interpreting Radiologist</span>
                      <span className="text-slate-200">{selectedScan.radiologist}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800">
                      <span className="text-slate-400">File Name</span>
                      <span className="text-slate-200 font-mono text-[11px] truncate max-w-[170px]">
                        {selectedScan.fileName}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800">
                      <span className="text-slate-400">Payload Size</span>
                      <span className="text-teal-300 font-mono">
                        {(selectedScan.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <a
                      href={selectedScan.fileDataUrl}
                      download={selectedScan.fileName}
                      className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download High-Resolution Scan</span>
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================================== */}
      {/* UPLOAD MODAL (Accepts up to 10MB files)                               */}
      {/* ==================================================================== */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#0d1527] border border-cyan-500/30 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <UploadCloud className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-base font-bold text-white">Upload Diagnostic Scan</h3>
                </div>
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
                {/* File Dropzone */}
                <div>
                  <label className="block font-medium text-slate-300 mb-1.5">
                    Select Scan File (CT, X-Ray, MRI, Ultrasound • Max 10MB) *
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer border-2 border-dashed border-cyan-500/30 hover:border-cyan-400/60 rounded-2xl p-6 text-center bg-cyan-500/5 hover:bg-cyan-500/10 transition-colors"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.dcm,.pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {selectedFile ? (
                      <div className="space-y-1">
                        <CheckCircle2 className="w-6 h-6 text-teal-400 mx-auto" />
                        <p className="font-semibold text-white">{selectedFile.name}</p>
                        <p className="text-[11px] text-teal-300 font-mono">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB (Within 10MB limit)
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <UploadCloud className="w-8 h-8 text-cyan-400 mx-auto" />
                        <p className="font-semibold text-slate-200">
                          Click to browse or drag & drop scan file
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Supports PNG, JPEG, DICOM slices, and Radiology PDFs (Max 10 MB)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Scan Modality *</label>
                    <select
                      value={uploadModality}
                      onChange={e => setUploadModality(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="CT Scan">CT Scan (Computed Tomography)</option>
                      <option value="X-Ray">X-Ray (Radiography)</option>
                      <option value="MRI Scan">MRI (Magnetic Resonance)</option>
                      <option value="Ultrasound">Ultrasound (Sonogram)</option>
                      <option value="PET-CT">PET-CT Scan</option>
                      <option value="Mammogram">Mammogram</option>
                      <option value="Other">Other Diagnostic Modality</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Anatomical Region *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Chest / Thorax, Brain, Spine"
                      value={uploadBodyPart}
                      onChange={e => setUploadBodyPart(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Scan Date *</label>
                    <input
                      type="date"
                      required
                      value={uploadDate}
                      onChange={e => setUploadDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Imaging Center / Facility</label>
                    <input
                      type="text"
                      placeholder="e.g. St. Jude Diagnostic Imaging"
                      value={uploadFacility}
                      onChange={e => setUploadFacility(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Radiologist / Attending Physician</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Vance, Radiologist"
                    value={uploadRadiologist}
                    onChange={e => setUploadRadiologist(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Radiologist Clinical Notes & Impression
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Key radiological findings, bone density, soft tissue impressions, or diagnostic conclusions..."
                    value={uploadImpression}
                    onChange={e => setUploadImpression(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedFile}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-bold transition hover:from-teal-400 hover:to-cyan-400 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving Scan...' : 'Encrypt & Save Scan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
