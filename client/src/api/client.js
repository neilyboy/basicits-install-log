import axios from 'axios';
import { getOfflineQueue, addToOfflineQueue, removeFromOfflineQueue } from '../store/offlineStore';

const BASE = '/api';

const api = axios.create({ baseURL: BASE, timeout: 30000 });

export const isOnline = () => navigator.onLine;

export const getJobs = (params) => api.get('/jobs', { params }).then(r => r.data);
export const getJob = (id) => api.get(`/jobs/${id}`).then(r => r.data);
export const createJob = (data) => api.post('/jobs', data).then(r => r.data);
export const updateJob = (id, data) => api.put(`/jobs/${id}`, data).then(r => r.data);
export const completeJob = (id) => api.post(`/jobs/${id}/complete`).then(r => r.data);
export const reopenJob = (id) => api.post(`/jobs/${id}/reopen`).then(r => r.data);
export const archiveJob = (id) => api.post(`/jobs/${id}/archive`).then(r => r.data);
export const deleteJob = (id) => api.delete(`/jobs/${id}`).then(r => r.data);

export const getDevices = (job_id) => api.get('/devices', { params: { job_id } }).then(r => r.data);
export const getDevice = (id) => api.get(`/devices/${id}`).then(r => r.data);
export const createDevice = (data) => api.post('/devices', data).then(r => r.data);
export const updateDevice = (id, data) => api.put(`/devices/${id}`, data).then(r => r.data);
export const deleteDevice = (id) => api.delete(`/devices/${id}`).then(r => r.data);

export const uploadPhotos = (device_id, files, captions = []) => {
  const formData = new FormData();
  formData.append('device_id', device_id);
  files.forEach((file, i) => {
    formData.append('photos', file);
    if (captions[i]) formData.append('captions', captions[i]);
  });
  return api.post('/photos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  }).then(r => r.data);
};

export const updatePhoto = (id, data) => api.put(`/photos/${id}`, data).then(r => r.data);
export const deletePhoto = (id) => api.delete(`/photos/${id}`).then(r => r.data);

export const getHardware = () => api.get('/hardware').then(r => r.data);
export const getAllHardware = () => api.get('/hardware/all').then(r => r.data);
export const createHardwareModel = (data) => api.post('/hardware', data).then(r => r.data);
export const updateHardwareModel = (id, data) => api.put(`/hardware/${id}`, data).then(r => r.data);
export const deleteHardwareModel = (id) => api.delete(`/hardware/${id}`).then(r => r.data);

export const verifyAdminPin = (pin) => api.post('/admin/verify-pin', { pin }).then(r => r.data);
export const changeAdminPin = (current_pin, new_pin) => api.post('/admin/change-pin', { current_pin, new_pin }).then(r => r.data);

export const importJob = (file) => {
  const formData = new FormData();
  formData.append('archive', file);
  return api.post('/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  }).then(r => r.data);
};

export const getExportUrl = (jobId) => `${BASE}/jobs/${jobId}/export`;
export const getShareUrl = (jobId) => `/share/${jobId}`;
export const getReportPrintUrl = (jobId) => `/share/${jobId}/print`;

export default api;
