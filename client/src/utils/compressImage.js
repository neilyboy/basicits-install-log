import imageCompression from 'browser-image-compression';

const OPTS = {
  maxSizeMB: 1.5,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/jpeg',
  initialQuality: 0.82,
  exifOrientation: -1,   // preserve / auto-rotate via EXIF
};

export async function compressImage(file) {
  if (!file.type.startsWith('image/')) return file;
  try {
    const out = await imageCompression(file, OPTS);
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([out], name, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

export async function compressAll(files) {
  return Promise.all(files.map(compressImage));
}
