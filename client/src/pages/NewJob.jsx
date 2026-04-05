import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2 } from 'lucide-react';
import { createJob } from '../api/client';
import toast from 'react-hot-toast';

export default function NewJob() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: '', client: '', address: '', contact_name: '', contact_phone: '', notes: '',
  });

  const mutation = useMutation({
    mutationFn: createJob,
    onSuccess: (job) => {
      qc.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job created');
      navigate(`/jobs/${job.id}`);
    },
    onError: () => toast.error('Failed to create job'),
  });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Job name is required'); return; }
    mutation.mutate(form);
  }

  return (
    <div className="px-4 pt-4">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="btn-icon btn-secondary">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold">New Job</h1>
          <p className="text-xs text-slate-500">Create a new installation job</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="card p-4 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={16} className="text-brand-400" />
            <span className="text-sm font-semibold text-slate-300">Job Details</span>
          </div>
          <div>
            <label className="label">Job Name *</label>
            <input className="input" placeholder="e.g. Acme Corp - Main Office" value={form.name} onChange={set('name')} required />
          </div>
          <div>
            <label className="label">Client / Company</label>
            <input className="input" placeholder="Client name" value={form.client} onChange={set('client')} />
          </div>
          <div>
            <label className="label">Site Address</label>
            <input className="input" placeholder="123 Main St, City, State" value={form.address} onChange={set('address')} />
          </div>
        </div>

        <div className="card p-4 space-y-4">
          <span className="text-sm font-semibold text-slate-300">Site Contact</span>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Contact Name</label>
              <input className="input" placeholder="John Doe" value={form.contact_name} onChange={set('contact_name')} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" type="tel" placeholder="(555) 000-0000" value={form.contact_phone} onChange={set('contact_phone')} />
            </div>
          </div>
        </div>

        <div className="card p-4 space-y-2">
          <label className="label">Job Notes</label>
          <textarea
            className="input resize-none"
            rows={3}
            placeholder="Initial notes, scope, special instructions..."
            value={form.notes}
            onChange={set('notes')}
          />
        </div>

        <button type="submit" className="btn-primary w-full py-3" disabled={mutation.isPending}>
          {mutation.isPending ? 'Creating...' : 'Create Job'}
        </button>
      </form>
    </div>
  );
}
