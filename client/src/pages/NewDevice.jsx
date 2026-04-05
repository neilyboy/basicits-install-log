import { useState, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Camera, X, Image, ChevronDown } from 'lucide-react';
import { createDevice, uploadPhotos, getHardware } from '../api/client';
import toast from 'react-hot-toast';

const DEVICE_TYPES = ['Camera', 'Access Control', 'Environmental', 'Intercom', 'Alarm', 'Viewing Station', 'Guest', 'Networking', 'Other'];

export default function NewDevice() {
  const { id: jobId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef();

  const [form, setForm] = useState({ name: '', device_type: '', hardware_model_id: '', location: '', notes: '' });
  const [photos, setPhotos] = useState([]);
  const [showModels, setShowModels] = useState(false);

  const { data: hwData } = useQuery({ queryKey: ['hardware'], queryFn: getHardware });
  const models = hwData?.models || [];
  const grouped = hwData?.grouped || {};

  const filteredModels = form.device_type
    ? models.filter(m => m.category === form.device_type)
    : models;

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  function handlePhotoSelect(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const previews = files.map(f => ({ file: f, url: URL.createObjectURL(f), caption: '' }));
    setPhotos(p => [...p, ...previews]);
    e.target.value = '';
  }

  function removePhoto(idx) {
    setPhotos(p => { URL.revokeObjectURL(p[idx].url); return p.filter((_, i) => i !== idx); });
  }

  function selectModel(model) {
    setForm(f => ({
      ...f,
      hardware_model_id: model.id,
      device_type: model.category,
    }));
    setShowModels(false);
  }

  const selectedModel = models.find(m => m.id === form.hardware_model_id);

  const mutation = useMutation({
    mutationFn: async (data) => {
      const device = await createDevice({ ...data, job_id: jobId });
      if (photos.length > 0) {
        try {
          await uploadPhotos(device.id, photos.map(p => p.file), photos.map(p => p.caption));
        } catch {
          toast.error('Device saved but some photos failed to upload');
        }
      }
      return device;
    },
    onSuccess: (device) => {
      qc.invalidateQueries({ queryKey: ['job', jobId] });
      toast.success('Device added');
      navigate(`/jobs/${jobId}/devices/${device.id}`);
    },
    onError: () => toast.error('Failed to add device'),
  });

  function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Device name is required'); return; }
    mutation.mutate(form);
  }

  return (
    <div className="px-4 pt-4 pb-6">
      <div className="flex items-center gap-3 mb-5">
        <Link to={`/jobs/${jobId}`} className="btn-icon btn-secondary">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Add Device</h1>
          <p className="text-xs text-slate-500">Log a new installed device</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="card p-4 space-y-4">
          <div>
            <label className="label">Device Name *</label>
            <input className="input" placeholder="e.g. Front Door Camera, Lobby Dome" value={form.name} onChange={set('name')} required autoFocus />
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
                {selectedModel
                  ? `${selectedModel.brand} ${selectedModel.model_name}${selectedModel.model_number ? ` (${selectedModel.model_number})` : ''}`
                  : 'Select model...'}
              </span>
              <ChevronDown size={16} className="text-slate-500 flex-shrink-0" />
            </button>

            {showModels && (
              <div className="mt-1 card border border-slate-600 max-h-60 overflow-y-auto">
                <button
                  type="button"
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-400 hover:bg-surface-2 border-b border-slate-700"
                  onClick={() => { setForm(f => ({ ...f, hardware_model_id: '' })); setShowModels(false); }}
                >
                  — None —
                </button>
                {Object.entries(
                  (form.device_type ? { [form.device_type]: filteredModels } : grouped)
                ).map(([cat, items]) => (
                  <div key={cat}>
                    <div className="px-4 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-surface-2 sticky top-0">
                      {cat}
                    </div>
                    {items.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-surface-2 transition-colors ${m.id === form.hardware_model_id ? 'text-brand-400 bg-brand-500/10' : 'text-slate-200'}`}
                        onClick={() => selectModel(m)}
                      >
                        <span className="font-medium">{m.model_name}</span>
                        {m.model_number && <span className="text-slate-500 ml-1.5 text-xs">({m.model_number})</span>}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="label">Install Location</label>
            <input className="input" placeholder="e.g. Main entrance, NE corner ceiling" value={form.location} onChange={set('location')} />
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} placeholder="IP address, MAC, mounting height, special notes..." value={form.notes} onChange={set('notes')} />
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="label mb-0">Photos ({photos.length})</label>
            <button
              type="button"
              className="btn-secondary text-xs py-2"
              onClick={() => fileRef.current?.click()}
            >
              <Camera size={14} /> Take / Add Photos
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoSelect}
            />
          </div>

          {photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p, i) => (
                <div key={i} className="relative rounded-lg overflow-hidden aspect-square bg-surface-2">
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 bg-black/70 rounded-full p-0.5"
                  >
                    <X size={12} className="text-white" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-slate-600 flex flex-col items-center justify-center text-slate-500 hover:border-brand-500 hover:text-brand-400 transition-colors"
              >
                <Image size={18} />
                <span className="text-xs mt-1">Add</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full py-8 rounded-xl border-2 border-dashed border-slate-700 flex flex-col items-center gap-2 text-slate-500 hover:border-brand-500 hover:text-brand-400 transition-colors"
            >
              <Camera size={28} />
              <span className="text-sm">Tap to take photos</span>
              <span className="text-xs opacity-70">Photos save to your camera roll</span>
            </button>
          )}
        </div>

        <button type="submit" className="btn-primary w-full py-3" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : `Save Device${photos.length > 0 ? ` + ${photos.length} Photo${photos.length > 1 ? 's' : ''}` : ''}`}
        </button>
      </form>
    </div>
  );
}
