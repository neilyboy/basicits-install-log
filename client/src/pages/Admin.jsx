import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Lock, Plus, Edit2, Trash2, Save, X, Shield, Package,
  ChevronDown, ChevronUp, Eye, EyeOff
} from 'lucide-react';
import { getAllHardware, createHardwareModel, updateHardwareModel, deleteHardwareModel, verifyAdminPin, changeAdminPin } from '../api/client';
import toast from 'react-hot-toast';

const CATEGORIES = ['Camera', 'Access Control', 'Environmental', 'Intercom', 'Alarm', 'Viewing Station', 'Guest', 'Networking', 'Other'];

export default function Admin() {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function handleUnlock(e) {
    e.preventDefault();
    if (!pin) return;
    setVerifying(true);
    try {
      const res = await verifyAdminPin(pin);
      if (res.valid) {
        setUnlocked(true);
        setPin('');
      } else {
        toast.error('Incorrect PIN');
        setPin('');
      }
    } catch {
      toast.error('Failed to verify PIN');
    } finally {
      setVerifying(false);
    }
  }

  if (!unlocked) {
    return (
      <div className="px-4 pt-4">
        <div className="mb-6">
          <h1 className="text-xl font-bold">Admin</h1>
          <p className="text-xs text-slate-500 mt-0.5">Enter PIN to access admin settings</p>
        </div>
        <div className="max-w-xs mx-auto mt-12">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
              <Shield size={28} className="text-brand-400" />
            </div>
          </div>
          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="label text-center block">Admin PIN</label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="input text-center text-xl tracking-widest pr-12"
                  placeholder="••••"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  autoFocus
                  maxLength={8}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  onClick={() => setShowPin(v => !v)}
                >
                  {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={verifying || !pin}>
              <Lock size={15} /> {verifying ? 'Verifying...' : 'Unlock Admin'}
            </button>
          </form>
          <p className="text-xs text-slate-600 text-center mt-4">Default PIN: 1234 (change after first login)</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold">Admin Panel</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage hardware catalog and settings</p>
        </div>
        <button className="btn-secondary text-xs py-2" onClick={() => setUnlocked(false)}>
          <Lock size={13} /> Lock
        </button>
      </div>
      <PinChangeSection />
      <HardwareCatalog />
    </div>
  );
}

function PinChangeSection() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleChange(e) {
    e.preventDefault();
    if (next !== confirm) { toast.error('New PINs do not match'); return; }
    if (next.length < 4) { toast.error('PIN must be at least 4 digits'); return; }
    setSaving(true);
    try {
      await changeAdminPin(current, next);
      toast.success('PIN changed successfully');
      setCurrent(''); setNext(''); setConfirm('');
      setOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to change PIN');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-4 mb-4">
      <button className="w-full flex items-center justify-between" onClick={() => setOpen(v => !v)}>
        <div className="flex items-center gap-2">
          <Lock size={16} className="text-brand-400" />
          <span className="font-semibold text-sm">Change Admin PIN</span>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
      </button>
      {open && (
        <form onSubmit={handleChange} className="mt-4 space-y-3">
          <div>
            <label className="label">Current PIN</label>
            <input type="password" inputMode="numeric" className="input" value={current} onChange={e => setCurrent(e.target.value)} maxLength={8} required />
          </div>
          <div>
            <label className="label">New PIN</label>
            <input type="password" inputMode="numeric" className="input" value={next} onChange={e => setNext(e.target.value)} maxLength={8} required minLength={4} />
          </div>
          <div>
            <label className="label">Confirm New PIN</label>
            <input type="password" inputMode="numeric" className="input" value={confirm} onChange={e => setConfirm(e.target.value)} maxLength={8} required />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving ? 'Saving...' : 'Update PIN'}
          </button>
        </form>
      )}
    </div>
  );
}

function HardwareCatalog() {
  const qc = useQueryClient();
  const [addingModel, setAddingModel] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newForm, setNewForm] = useState({ category: '', brand: 'Verkada', model_name: '', model_number: '', description: '' });
  const [editForm, setEditForm] = useState({});
  const [expandedCat, setExpandedCat] = useState(null);
  const [showInactive, setShowInactive] = useState(false);

  const { data: models = [], isLoading } = useQuery({
    queryKey: ['hardware', 'all'],
    queryFn: getAllHardware,
  });

  const createMut = useMutation({
    mutationFn: createHardwareModel,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hardware'] });
      toast.success('Hardware model added');
      setAddingModel(false);
      setNewForm({ category: '', brand: 'Verkada', model_name: '', model_number: '', description: '' });
    },
    onError: () => toast.error('Failed to add model'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateHardwareModel(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hardware'] });
      toast.success('Model updated');
      setEditingId(null);
    },
    onError: () => toast.error('Failed to update model'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteHardwareModel,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hardware'] }); toast.success('Model removed'); },
    onError: () => toast.error('Failed to remove model'),
  });

  const displayModels = showInactive ? models : models.filter(m => m.is_active);
  const grouped = displayModels.reduce((acc, m) => {
    if (!acc[m.category]) acc[m.category] = [];
    acc[m.category].push(m);
    return acc;
  }, {});

  const setNew = (k) => (e) => setNewForm(f => ({ ...f, [k]: e.target.value }));
  const setEdit = (k) => (e) => setEditForm(f => ({ ...f, [k]: e.target.value }));

  function startEdit(m) {
    setEditingId(m.id);
    setEditForm({ category: m.category, brand: m.brand, model_name: m.model_name, model_number: m.model_number || '', description: m.description || '' });
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package size={16} className="text-brand-400" />
          <span className="font-semibold text-sm">Hardware Catalog</span>
          <span className="text-xs text-slate-500">({displayModels.length} models)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="text-xs text-slate-500 hover:text-slate-300"
            onClick={() => setShowInactive(v => !v)}
          >
            {showInactive ? 'Hide inactive' : 'Show all'}
          </button>
          <button className="btn-primary text-xs py-2" onClick={() => setAddingModel(v => !v)}>
            <Plus size={13} /> Add Model
          </button>
        </div>
      </div>

      {addingModel && (
        <div className="bg-surface-2 rounded-xl p-4 mb-4 border border-slate-600 space-y-3">
          <p className="text-sm font-semibold text-slate-300">New Hardware Model</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Category *</label>
              <select className="input" value={newForm.category} onChange={setNew('category')}>
                <option value="">Select...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Brand</label>
              <input className="input" value={newForm.brand} onChange={setNew('brand')} placeholder="Verkada" />
            </div>
          </div>
          <div>
            <label className="label">Model Name *</label>
            <input className="input" value={newForm.model_name} onChange={setNew('model_name')} placeholder="e.g. CD41 Indoor Dome" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Model Number</label>
              <input className="input" value={newForm.model_number} onChange={setNew('model_number')} placeholder="CD41" />
            </div>
            <div>
              <label className="label">Description</label>
              <input className="input" value={newForm.description} onChange={setNew('description')} placeholder="Brief description" />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary flex-1 text-sm" onClick={() => setAddingModel(false)}>Cancel</button>
            <button
              className="btn-primary flex-1 text-sm"
              onClick={() => { if (!newForm.category || !newForm.model_name) { toast.error('Category and model name required'); return; } createMut.mutate(newForm); }}
              disabled={createMut.isPending}
            >
              {createMut.isPending ? 'Adding...' : 'Add Model'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-10 bg-surface-2 rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="border border-slate-700/50 rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-3 hover:bg-surface-2 transition-colors"
                onClick={() => setExpandedCat(expandedCat === cat ? null : cat)}
              >
                <span className="font-medium text-sm text-slate-200">{cat}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{items.length} models</span>
                  {expandedCat === cat ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                </div>
              </button>

              {expandedCat === cat && (
                <div className="border-t border-slate-700/50">
                  {items.map(m => (
                    <div key={m.id} className={`p-3 border-b border-slate-700/30 last:border-0 ${!m.is_active ? 'opacity-50' : ''}`}>
                      {editingId === m.id ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="label">Model Name</label>
                              <input className="input text-sm" value={editForm.model_name} onChange={setEdit('model_name')} />
                            </div>
                            <div>
                              <label className="label">Model #</label>
                              <input className="input text-sm" value={editForm.model_number} onChange={setEdit('model_number')} />
                            </div>
                          </div>
                          <div>
                            <label className="label">Description</label>
                            <input className="input text-sm" value={editForm.description} onChange={setEdit('description')} />
                          </div>
                          <div className="flex gap-2">
                            <button className="btn-secondary flex-1 text-xs py-1.5" onClick={() => setEditingId(null)}><X size={12} /> Cancel</button>
                            <button className="btn-primary flex-1 text-xs py-1.5" onClick={() => updateMut.mutate({ id: m.id, data: editForm })} disabled={updateMut.isPending}><Save size={12} /> Save</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-200 font-medium">{m.model_name}</p>
                            <p className="text-xs text-slate-500">
                              {m.brand}{m.model_number ? ` · ${m.model_number}` : ''}{m.description ? ` · ${m.description}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button className="btn-icon text-slate-400 hover:text-slate-200 p-1.5" onClick={() => startEdit(m)}><Edit2 size={13} /></button>
                            <button
                              className="btn-icon text-slate-600 hover:text-red-400 p-1.5"
                              onClick={() => { if (confirm('Remove this model?')) deleteMut.mutate(m.id); }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
