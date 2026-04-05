import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, ChevronRight, Camera, Lock, Building2, Search, Upload } from 'lucide-react';
import { getJobs, importJob } from '../api/client';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

function statusBadge(status) {
  if (status === 'open') return <span className="badge-open">In Progress</span>;
  if (status === 'complete') return <span className="badge-complete">Complete</span>;
  return <span className="badge-archived">Archived</span>;
}

function DeviceIcon({ count }) {
  return (
    <span className="flex items-center gap-1 text-xs text-slate-400">
      <Camera size={12} />
      {count}
    </span>
  );
}

export default function Dashboard() {
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);

  const { data: jobs = [], isLoading, refetch } = useQuery({
    queryKey: ['jobs', 'active'],
    queryFn: () => getJobs({ status: ['open', 'complete'] }),
  });

  const filtered = jobs.filter(j =>
    !search ||
    j.name.toLowerCase().includes(search.toLowerCase()) ||
    (j.client || '').toLowerCase().includes(search.toLowerCase()) ||
    (j.address || '').toLowerCase().includes(search.toLowerCase())
  );

  const open = filtered.filter(j => j.status === 'open');
  const complete = filtered.filter(j => j.status === 'complete');

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      await importJob(file);
      toast.success('Job imported successfully');
      refetch();
    } catch {
      toast.error('Failed to import job archive');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  }

  return (
    <div className="px-4 pt-4 pb-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-white">Active Jobs</h1>
          <p className="text-xs text-slate-500 mt-0.5">{open.length} in progress · {complete.length} complete</p>
        </div>
        <div className="flex items-center gap-2">
          <label className={`btn-secondary text-xs cursor-pointer ${importing ? 'opacity-50' : ''}`}>
            <Upload size={14} />
            <span className="hidden sm:inline">Import</span>
            <input type="file" accept=".zip" className="hidden" onChange={handleImport} disabled={importing} />
          </label>
          <Link to="/jobs/new" className="btn-primary text-sm">
            <Plus size={16} />
            New Job
          </Link>
        </div>
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          className="input pl-9"
          placeholder="Search jobs..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-1/2 mb-2" />
              <div className="h-3 bg-slate-700 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Building2 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{search ? 'No jobs match your search' : 'No active jobs'}</p>
          {!search && (
            <p className="text-sm mt-1 mb-4">Create your first job to get started</p>
          )}
          {!search && (
            <Link to="/jobs/new" className="btn-primary inline-flex">
              <Plus size={16} /> Create Job
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {open.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">In Progress</h2>
              <div className="space-y-2">
                {open.map(job => <JobCard key={job.id} job={job} />)}
              </div>
            </section>
          )}
          {complete.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Awaiting Archive</h2>
              <div className="space-y-2">
                {complete.map(job => <JobCard key={job.id} job={job} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function JobCard({ job }) {
  return (
    <Link to={`/jobs/${job.id}`} className="card p-4 flex items-center gap-3 hover:border-brand-500/50 transition-colors active:bg-surface-2 block">
      <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
        <Building2 size={18} className="text-brand-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-semibold text-white truncate text-sm">{job.name}</p>
          {statusBadge(job.status)}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {job.client && <span className="truncate">{job.client}</span>}
          {job.address && <span className="truncate hidden sm:block">{job.address}</span>}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <DeviceIcon count={job.device_count} />
          <span className="text-xs text-slate-600">
            {format(new Date(job.updated_at), 'MMM d, yyyy')}
          </span>
        </div>
      </div>
      <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />
    </Link>
  );
}
