import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { getJob, updateJob } from '../api/client';
import toast from 'react-hot-toast';

export default function EditJob() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState(null);

  const { data: job } = useQuery({ queryKey: ['job', id], queryFn: () => getJob(id) });

  useEffect(() => {
    if (job) setForm({
      name: job.name || '',
      client: job.client || '',
      address: job.address || '',
      contact_name: job.contact_name || '',
      contact_phone: job.contact_phone || '',
      notes: job.notes || '',
    });
  }, [job]);

  const mutation = useMutation({
    mutationFn: (data) => updateJob(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job', id] });
      qc.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job updated');
      navigate(`/jobs/${id}`);
    },
    onError: () => toast.error('Failed to update job'),
  });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  if (!form) return <div className="px-4 pt-4 text-slate-400">Loading...</div>;

  function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Job name is required'); return; }
    mutation.mutate(form);
  }

  return (
    <div className="px-4 pt-4">
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/jobs/${id}`} className="btn-icon btn-secondary">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold">Edit Job</h1>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="card p-4 space-y-4">
          <div>
            <label className="label">Job Name *</label>
            <input className="input" value={form.name} onChange={set('name')} required />
          </div>
          <div>
            <label className="label">Client / Company</label>
            <input className="input" value={form.client} onChange={set('client')} />
          </div>
          <div>
            <label className="label">Site Address</label>
            <input className="input" value={form.address} onChange={set('address')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Contact Name</label>
              <input className="input" value={form.contact_name} onChange={set('contact_name')} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" type="tel" value={form.contact_phone} onChange={set('contact_phone')} />
            </div>
          </div>
        </div>
        <div className="card p-4 space-y-2">
          <label className="label">Job Notes</label>
          <textarea className="input resize-none" rows={4} value={form.notes} onChange={set('notes')} />
        </div>
        <button type="submit" className="btn-primary w-full py-3" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
