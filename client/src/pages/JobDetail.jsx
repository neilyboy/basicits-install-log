import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Plus, CheckCircle, Archive, Download, Edit2, Trash2,
  Camera, Lock, Wind, Monitor, Bell, Wifi, Users, ChevronRight,
  RotateCcw, MapPin, Phone, User, FileText, ExternalLink, Printer, Link2
} from 'lucide-react';
import { getJob, completeJob, reopenJob, archiveJob, deleteJob, getExportUrl, getShareUrl, getReportPrintUrl } from '../api/client';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const CATEGORY_ICONS = {
  Camera: Camera, 'Access Control': Lock, Environmental: Wind,
  'Viewing Station': Monitor, Alarm: Bell, Networking: Wifi,
  Guest: Users, Intercom: Phone,
};

function CategoryIcon({ category, size = 16 }) {
  const Icon = CATEGORY_ICONS[category] || Camera;
  return <Icon size={size} />;
}

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const copyShareLink = () => {
    const url = window.location.origin + getShareUrl(id);
    navigator.clipboard?.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    }).catch(() => toast.error('Could not copy link'));
  };

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => getJob(id),
  });

  const completeMut = useMutation({
    mutationFn: () => completeJob(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['job', id] }); qc.invalidateQueries({ queryKey: ['jobs'] }); toast.success('Job marked complete'); },
    onError: () => toast.error('Failed to update job'),
  });

  const reopenMut = useMutation({
    mutationFn: () => reopenJob(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['job', id] }); qc.invalidateQueries({ queryKey: ['jobs'] }); toast.success('Job reopened'); },
    onError: () => toast.error('Failed to reopen job'),
  });

  const archiveMut = useMutation({
    mutationFn: () => archiveJob(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['jobs'] }); toast.success('Job archived'); navigate('/'); },
    onError: () => toast.error('Failed to archive job'),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteJob(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['jobs'] }); toast.success('Job deleted'); navigate('/'); },
    onError: () => toast.error('Failed to delete job'),
  });

  if (isLoading) return (
    <div className="px-4 pt-4 space-y-3">
      {[1,2,3].map(i => <div key={i} className="card p-4 animate-pulse h-20" />)}
    </div>
  );

  if (!job) return <div className="px-4 pt-4 text-slate-400">Job not found</div>;

  const totalPhotos = (job.devices || []).reduce((s, d) => s + (d.photos || []).length, 0);
  const isOpen = job.status === 'open';
  const isComplete = job.status === 'complete';
  const isArchived = job.status === 'archived';

  return (
    <div className="px-4 pt-4 pb-6">
      <div className="flex items-center gap-3 mb-4">
        <Link to="/" className="btn-icon btn-secondary">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white truncate">{job.name}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            {job.status === 'open' && <span className="badge-open">In Progress</span>}
            {job.status === 'complete' && <span className="badge-complete">Complete</span>}
            {job.status === 'archived' && <span className="badge-archived">Archived</span>}
            <span className="text-xs text-slate-500">{format(new Date(job.created_at), 'MMM d, yyyy')}</span>
          </div>
        </div>
        <Link to={`/jobs/${id}/edit`} className="btn-icon btn-secondary">
          <Edit2 size={16} />
        </Link>
      </div>

      {(job.client || job.address || job.contact_name) && (
        <div className="card p-3 mb-4 space-y-1.5">
          {job.client && (
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Users size={13} className="text-slate-500 flex-shrink-0" />
              <span className="font-medium">{job.client}</span>
            </div>
          )}
          {job.address && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <MapPin size={13} className="text-slate-500 flex-shrink-0" />
              <span>{job.address}</span>
            </div>
          )}
          {job.contact_name && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <User size={13} className="text-slate-500 flex-shrink-0" />
              <span>{job.contact_name}{job.contact_phone ? ` · ${job.contact_phone}` : ''}</span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-brand-400">{(job.devices || []).length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Devices</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-brand-400">{totalPhotos}</p>
          <p className="text-xs text-slate-500 mt-0.5">Photos</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-brand-400">
            {new Set((job.devices || []).map(d => d.hw_category || d.device_type).filter(Boolean)).size}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Categories</p>
        </div>
      </div>

      {job.notes && (
        <div className="card p-3 mb-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <FileText size={13} className="text-slate-500" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Notes</span>
          </div>
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{job.notes}</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Devices ({(job.devices || []).length})
        </h2>
        {!isArchived && (
          <Link to={`/jobs/${id}/devices/new`} className="btn-primary text-xs py-2 px-3">
            <Plus size={14} /> Add Device
          </Link>
        )}
      </div>

      {(job.devices || []).length === 0 ? (
        <div className="card p-8 text-center mb-4">
          <Camera size={32} className="mx-auto mb-2 text-slate-600" />
          <p className="text-sm text-slate-500">No devices logged yet</p>
          {!isArchived && (
            <Link to={`/jobs/${id}/devices/new`} className="btn-primary inline-flex mt-3 text-sm">
              <Plus size={14} /> Add First Device
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          {(job.devices || []).map(device => (
            <Link
              key={device.id}
              to={`/jobs/${id}/devices/${device.id}`}
              className="card p-3.5 flex items-center gap-3 hover:border-brand-500/50 transition-colors active:bg-surface-2 block"
            >
              <div className="w-9 h-9 rounded-lg bg-slate-700/50 flex items-center justify-center flex-shrink-0 text-slate-400">
                <CategoryIcon category={device.hw_category || device.device_type} size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-white truncate">{device.name}</p>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {device.model_name
                    ? `${device.brand || 'Verkada'} ${device.model_name}`
                    : device.device_type || 'No model set'}
                  {device.location ? ` · ${device.location}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {device.photo_count > 0 && (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Camera size={11} /> {device.photo_count}
                  </span>
                )}
                <ChevronRight size={14} className="text-slate-600" />
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="space-y-2 pt-2 border-t border-slate-800">
        <div className="card p-3 mb-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Report &amp; Share</p>
          <div className="grid grid-cols-3 gap-2">
            <a
              href={getShareUrl(id)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs py-2 flex flex-col items-center gap-1 h-auto"
            >
              <ExternalLink size={14} />
              <span>View</span>
            </a>
            <a
              href={getReportPrintUrl(id)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs py-2 flex flex-col items-center gap-1 h-auto"
            >
              <Printer size={14} />
              <span>Print/PDF</span>
            </a>
            <button
              className={`btn-secondary text-xs py-2 flex flex-col items-center gap-1 h-auto ${linkCopied ? 'text-emerald-400 border-emerald-500/50' : ''}`}
              onClick={copyShareLink}
            >
              <Link2 size={14} />
              <span>{linkCopied ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>
          <a
            href={getExportUrl(id)}
            download
            className="btn-secondary w-full flex items-center justify-center gap-2 mt-2 text-xs py-2"
          >
            <Download size={13} /> Download ZIP (offline report + CSV)
          </a>
        </div>

        {isOpen && (
          <button
            className="btn-success w-full"
            onClick={() => completeMut.mutate()}
            disabled={completeMut.isPending}
          >
            <CheckCircle size={16} />
            {completeMut.isPending ? 'Updating...' : 'Mark Job Complete'}
          </button>
        )}
        {isComplete && (
          <>
            <button
              className="btn-success w-full"
              onClick={() => archiveMut.mutate()}
              disabled={archiveMut.isPending}
            >
              <Archive size={16} />
              {archiveMut.isPending ? 'Archiving...' : 'Archive Job'}
            </button>
            <button
              className="btn-secondary w-full text-slate-400"
              onClick={() => reopenMut.mutate()}
              disabled={reopenMut.isPending}
            >
              <RotateCcw size={14} /> Reopen Job
            </button>
          </>
        )}
        {isArchived && (
          <>
            <button
              className="btn-secondary w-full text-slate-400"
              onClick={() => reopenMut.mutate()}
              disabled={reopenMut.isPending}
            >
              <RotateCcw size={14} /> Restore to Active
            </button>
          </>
        )}

        {!showDeleteConfirm ? (
          <button className="btn-danger w-full mt-2" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 size={14} /> Delete Job
          </button>
        ) : (
          <div className="card p-4 border-red-600/30">
            <p className="text-sm text-red-400 font-medium mb-3 text-center">Delete this job and all its data?</p>
            <div className="flex gap-2">
              <button className="btn-secondary flex-1" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="btn-danger flex-1" onClick={() => deleteMut.mutate()} disabled={deleteMut.isPending}>
                {deleteMut.isPending ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
