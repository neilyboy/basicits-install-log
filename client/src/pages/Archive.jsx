import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Archive as ArchiveIcon, ChevronRight, Download, Search, Building2, Camera } from 'lucide-react';
import { getJobs, getExportUrl } from '../api/client';
import { format } from 'date-fns';

export default function Archive() {
  const [search, setSearch] = useState('');

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs', 'archived'],
    queryFn: () => getJobs({ status: 'archived' }),
  });

  const filtered = jobs.filter(j =>
    !search ||
    j.name.toLowerCase().includes(search.toLowerCase()) ||
    (j.client || '').toLowerCase().includes(search.toLowerCase()) ||
    (j.address || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="px-4 pt-4 pb-4">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-white">Archive</h1>
        <p className="text-xs text-slate-500 mt-0.5">{jobs.length} archived job{jobs.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input className="input pl-9" placeholder="Search archived jobs..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="card p-4 animate-pulse h-20" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <ArchiveIcon size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{search ? 'No archived jobs match your search' : 'No archived jobs yet'}</p>
          <p className="text-sm mt-1">Complete and archive jobs from the Jobs tab</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(job => (
            <div key={job.id} className="card p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-700/30 border border-slate-700 flex items-center justify-center flex-shrink-0">
                  <Building2 size={18} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-white truncate text-sm">{job.name}</p>
                    <span className="badge-archived whitespace-nowrap">Archived</span>
                  </div>
                  {job.client && <p className="text-xs text-slate-500 truncate">{job.client}</p>}
                  {job.address && <p className="text-xs text-slate-600 truncate">{job.address}</p>}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Camera size={11} /> {job.device_count}
                    </span>
                    {job.completed_at && (
                      <span className="text-xs text-slate-600">
                        Completed {format(new Date(job.completed_at), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700/50">
                <Link
                  to={`/jobs/${job.id}`}
                  className="btn-secondary flex-1 text-xs py-2 justify-center"
                >
                  <ChevronRight size={14} /> View
                </Link>
                <a
                  href={getExportUrl(job.id)}
                  download
                  className="btn-secondary flex-1 text-xs py-2 justify-center"
                >
                  <Download size={14} /> Export ZIP
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
