import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Camera, X, Trash2, Edit2, Save, Plus, Image,
  ChevronDown, MapPin, FileText, ZoomIn, Search
} from 'lucide-react';
import { getDevice, updateDevice, deleteDevice, uploadPhotos, deletePhoto, updatePhoto, getHardware } from '../api/client';
import { compressAll } from '../utils/compressImage';
import toast from 'react-hot-toast';

const DEVICE_TYPES = ['Camera', 'Access Control', 'Environmental', 'Intercom', 'Alarm', 'Viewing Station', 'Guest', 'Networking', 'Other'];

export default function DeviceDetail() {
  const { jobId, deviceId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const cameraRef = useRef();
  const galleryRef = useRef();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [showModels, setShowModels] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [compressing, setCompressing] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingCaption, setEditingCaption] = useState(null);

  const { data: device, isLoading } = useQuery({
    queryKey: ['device', deviceId],
    queryFn: () => getDevice(deviceId),
  });

  useEffect(() => {
    if (device && !form) setForm({
      name: device.name || '', device_type: device.device_type || '',
      hardware_model_id: device.hardware_model_id || '',
      location: device.location || '', notes: device.notes || '',
    });
  }, [device]);

  const { data: hwData } = useQuery({ queryKey: ['hardware'], queryFn: getHardware });
  const models = hwData?.models || [];
  const grouped = hwData?.grouped || {};

  const baseModels = form?.device_type
    ? models.filter(m => m.category === form.device_type)
    : models;

  const filteredModels = modelSearch.trim()
    ? baseModels.filter(m => {
        const q = modelSearch.toLowerCase();
        return m.model_name.toLowerCase().includes(q)
          || (m.model_number && m.model_number.toLowerCase().includes(q))
          || (m.brand && m.brand.toLowerCase().includes(q));
      })
    : baseModels;

  const searchedGrouped = modelSearch.trim()
    ? { Results: filteredModels }
    : (form?.device_type ? { [form.device_type]: filteredModels } : grouped);

  const selectedModel = models.find(m => m.id === form?.hardware_model_id);

  const saveMut = useMutation({
    mutationFn: (data) => updateDevice(deviceId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['device', deviceId] });
      qc.invalidateQueries({ queryKey: ['job', jobId] });
      toast.success('Device updated');
      setEditing(false);
    },
    onError: () => toast.error('Failed to update device'),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteDevice(deviceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job', jobId] });
      toast.success('Device deleted');
      navigate(`/jobs/${jobId}`);
    },
    onError: () => toast.error('Failed to delete device'),
  });

  const uploadMut = useMutation({
    mutationFn: ({ files }) => uploadPhotos(deviceId, files),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['device', deviceId] });
      qc.invalidateQueries({ queryKey: ['job', jobId] });
      toast.success('Photos uploaded');
    },
    onError: () => toast.error('Failed to upload photos'),
  });

  const deletePhotoMut = useMutation({
    mutationFn: (photoId) => deletePhoto(photoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['device', deviceId] });
      qc.invalidateQueries({ queryKey: ['job', jobId] });
      setLightbox(null);
    },
    onError: () => toast.error('Failed to delete photo'),
  });

  const updateCaptionMut = useMutation({
    mutationFn: ({ id, caption }) => updatePhoto(id, { caption }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['device', deviceId] });
      setEditingCaption(null);
    },
  });

  function startEdit() {
    if (device) setForm({
      name: device.name || '', device_type: device.device_type || '',
      hardware_model_id: device.hardware_model_id || '',
      location: device.location || '', notes: device.notes || '',
    });
    setEditing(true);
  }

  async function handleFileSelect(e) {
    const raw = Array.from(e.target.files || []);
    if (!raw.length) return;
    e.target.value = '';
    setCompressing(true);
    try {
      const compressed = await compressAll(raw);
      uploadMut.mutate({ files: compressed });
    } catch {
      toast.error('Failed to process photos');
    } finally {
      setCompressing(false);
    }
  }

  function selectModel(m) {
    setForm(f => ({ ...f, hardware_model_id: m.id, device_type: m.category }));
    setShowModels(false);
    setModelSearch('');
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const photos = device?.photos || [];

  if (isLoading) return (
    <div className="px-4 pt-4 space-y-3">
      {[1,2,3].map(i => <div key={i} className="card p-4 h-20 animate-pulse" />)}
    </div>
  );
  if (!device) return <div className="px-4 pt-4 text-slate-400">Device not found</div>;

  return (
    <div className="px-4 pt-4 pb-6">
      <div className="flex items-center gap-3 mb-4">
        <Link to={`/jobs/${jobId}`} className="btn-icon btn-secondary">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{device.name}</h1>
          <p className="text-xs text-slate-500">
            {device.model_name
              ? `${device.brand || 'Verkada'} ${device.model_name}${device.model_number ? ` · ${device.model_number}` : ''}`
              : device.device_type || 'No model'}
          </p>
        </div>
        {!editing && (
          <button className="btn-icon btn-secondary" onClick={startEdit}>
            <Edit2 size={16} />
          </button>
        )}
      </div>

      {editing && form ? (
        <div className="card p-4 mb-4 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-slate-300">Edit Device</span>
            <button className="text-xs text-slate-500 hover:text-slate-300" onClick={() => setEditing(false)}>Cancel</button>
          </div>
          <div>
            <label className="label">Device Name *</label>
            <input className="input" value={form.name} onChange={set('name')} />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.device_type} onChange={set('device_type')}>
              <option value="">Select category...</option>
              {DEVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Hardware Model</label>
            <button
              type="button"
              className="input text-left flex items-center justify-between"
              onClick={() => setShowModels(v => !v)}
            >
              <span className={selectedModel ? 'text-slate-100' : 'text-slate-500'}>
                {selectedModel ? `${selectedModel.brand} ${selectedModel.model_name}` : 'Select model...'}
              </span>
              <ChevronDown size={16} className="text-slate-500 flex-shrink-0" />
            </button>
            {showModels && (
              <div className="mt-1 card border border-slate-600 flex flex-col max-h-64">
                <div className="px-3 py-2 border-b border-slate-700 flex-shrink-0">
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      autoFocus
                      type="text"
                      className="input py-1.5 pl-8 pr-3 text-sm"
                      placeholder="Search models… e.g. 53, dome"
                      value={modelSearch}
                      onChange={e => setModelSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="overflow-y-auto flex-1">
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-400 hover:bg-surface-2 border-b border-slate-700"
                    onClick={() => { setForm(f => ({ ...f, hardware_model_id: '' })); setShowModels(false); setModelSearch(''); }}
                  >
                    — None —
                  </button>
                  {Object.entries(searchedGrouped).map(([cat, items]) => (
                    <div key={cat}>
                      {!modelSearch.trim() && (
                        <div className="px-4 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-surface-2">{cat}</div>
                      )}
                      {items.length === 0 && modelSearch.trim() && (
                        <p className="px-4 py-3 text-sm text-slate-500 italic">No models match "{modelSearch}"</p>
                      )}
                      {items.map(m => (
                        <button key={m.id} type="button"
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-surface-2 ${m.id === form.hardware_model_id ? 'text-brand-400 bg-brand-500/10' : 'text-slate-200'}`}
                          onClick={() => selectModel(m)}
                        >
                          {m.model_name}{m.model_number && <span className="text-slate-500 ml-1 text-xs">({m.model_number})</span>}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="label">Install Location</label>
            <input className="input" placeholder="e.g. Lobby ceiling, NE corner" value={form.location} onChange={set('location')} />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={3} value={form.notes} onChange={set('notes')} />
          </div>
          <button
            className="btn-primary w-full"
            onClick={() => saveMut.mutate(form)}
            disabled={saveMut.isPending}
          >
            <Save size={15} /> {saveMut.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      ) : (
        <div className="card p-4 mb-4 space-y-2">
          {device.location && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin size={14} className="text-slate-500 mt-0.5 flex-shrink-0" />
              <span className="text-slate-300">{device.location}</span>
            </div>
          )}
          {device.hw_description && (
            <p className="text-xs text-slate-500">{device.hw_description}</p>
          )}
          {device.notes && (
            <div className="flex items-start gap-2 text-sm mt-1 pt-2 border-t border-slate-700/50">
              <FileText size={14} className="text-slate-500 mt-0.5 flex-shrink-0" />
              <p className="text-slate-300 whitespace-pre-wrap">{device.notes}</p>
            </div>
          )}
          {!device.location && !device.notes && (
            <p className="text-sm text-slate-500 italic">No details recorded. Tap edit to add.</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Photos ({photos.length}){(compressing || uploadMut.isPending) && <span className="ml-2 text-xs text-brand-400 normal-case font-normal">{compressing ? 'compressing…' : 'uploading…'}</span>}
        </h2>
        <div className="flex gap-1.5">
          <button className="btn-secondary text-xs py-2" onClick={() => cameraRef.current?.click()} disabled={compressing || uploadMut.isPending}>
            <Camera size={14} />
          </button>
          <button className="btn-secondary text-xs py-2 px-3" onClick={() => galleryRef.current?.click()} disabled={compressing || uploadMut.isPending}>
            <Image size={14} /> Gallery
          </button>
        </div>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
        <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
      </div>

      {photos.length === 0 ? (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            className="card py-8 flex flex-col items-center gap-2 text-slate-500 hover:border-brand-500/50 hover:text-brand-400 transition-colors"
            onClick={() => cameraRef.current?.click()}
          >
            <Camera size={28} />
            <span className="text-sm">Camera</span>
          </button>
          <button
            className="card py-8 flex flex-col items-center gap-2 text-slate-500 hover:border-brand-500/50 hover:text-brand-400 transition-colors"
            onClick={() => galleryRef.current?.click()}
          >
            <Image size={28} />
            <span className="text-sm">Gallery</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {photos.map((photo, idx) => (
            <button
              key={photo.id}
              className="relative rounded-xl overflow-hidden aspect-square bg-surface-2 border border-slate-700/50 hover:border-brand-500/50 transition-colors"
              onClick={() => setLightbox(idx)}
            >
              <img
                src={`/thumbnails/${photo.thumbnail_filename || photo.filename}`}
                alt={photo.caption || ''}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                <ZoomIn size={20} className="text-white" />
              </div>
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5">
                  <p className="text-xs text-white truncate">{photo.caption}</p>
                </div>
              )}
            </button>
          ))}
          <button
            onClick={() => galleryRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 hover:border-brand-500 hover:text-brand-400 transition-colors"
          >
            <Plus size={20} />
            <span className="text-xs mt-1">Add</span>
          </button>
        </div>
      )}

      <div className="border-t border-slate-800 pt-4">
        {!showDeleteConfirm ? (
          <button className="btn-danger w-full" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 size={14} /> Delete Device
          </button>
        ) : (
          <div className="card p-4 border-red-600/30">
            <p className="text-sm text-red-400 font-medium mb-3 text-center">Delete this device and all its photos?</p>
            <div className="flex gap-2">
              <button className="btn-secondary flex-1" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="btn-danger flex-1" onClick={() => deleteMut.mutate()} disabled={deleteMut.isPending}>
                {deleteMut.isPending ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        )}
      </div>

      {lightbox !== null && (
        <Lightbox
          photos={photos}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onChange={setLightbox}
          onDelete={(photo) => deletePhotoMut.mutate(photo.id)}
          onUpdateCaption={(photo, caption) => updateCaptionMut.mutate({ id: photo.id, caption })}
          editingCaption={editingCaption}
          setEditingCaption={setEditingCaption}
        />
      )}
    </div>
  );
}

function Lightbox({ photos, index, onClose, onChange, onDelete, onUpdateCaption, editingCaption, setEditingCaption }) {
  const photo = photos[index];
  const [captionDraft, setCaptionDraft] = useState(photo?.caption || '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!photo) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="flex items-center justify-between p-4">
        <button onClick={onClose} className="btn-icon text-white bg-white/10 hover:bg-white/20">
          <X size={18} />
        </button>
        <span className="text-sm text-slate-400">{index + 1} / {photos.length}</span>
        <button
          onClick={() => { setCaptionDraft(photo.caption || ''); setConfirmDelete(false); setEditingCaption(photo.id); }}
          className="btn-icon text-white bg-white/10 hover:bg-white/20"
        >
          <Edit2 size={16} />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        <button
          onClick={() => onChange((index - 1 + photos.length) % photos.length)}
          className="absolute left-2 z-10 btn-icon text-white bg-black/40 hover:bg-black/70 disabled:opacity-30"
          disabled={photos.length <= 1}
        >
          <ArrowLeft size={18} />
        </button>
        <img
          src={`/uploads/${photo.filename}`}
          alt={photo.caption || ''}
          className="max-w-full max-h-full object-contain select-none"
          draggable={false}
        />
        <button
          onClick={() => onChange((index + 1) % photos.length)}
          className="absolute right-2 z-10 btn-icon text-white bg-black/40 hover:bg-black/70 disabled:opacity-30"
          disabled={photos.length <= 1}
        >
          <ArrowLeft size={18} className="rotate-180" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {editingCaption === photo.id ? (
          <div className="flex gap-2">
            <input
              className="input flex-1 text-sm"
              value={captionDraft}
              onChange={e => setCaptionDraft(e.target.value)}
              placeholder="Add a caption..."
              autoFocus
            />
            <button
              className="btn-primary px-3"
              onClick={() => { onUpdateCaption(photo, captionDraft); setEditingCaption(null); }}
            >
              <Save size={14} />
            </button>
            <button className="btn-secondary px-3" onClick={() => setEditingCaption(null)}>
              <X size={14} />
            </button>
          </div>
        ) : (
          photo.caption && <p className="text-sm text-slate-300 text-center">{photo.caption}</p>
        )}

        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} className="btn-danger w-full text-sm">
            <Trash2 size={14} /> Delete Photo
          </button>
        ) : (
          <div className="flex gap-2">
            <button className="btn-secondary flex-1 text-sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
            <button className="btn-danger flex-1 text-sm" onClick={() => onDelete(photo)}>Yes, Delete</button>
          </div>
        )}
      </div>
    </div>
  );
}
