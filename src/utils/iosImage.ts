/**
 * Client-side iPhone / iOS Safari image normalization for PreserVenice Lens.
 * - Preserves small raw JPEGs (<= 1.5 MB) untouched so Survey123 dataset/test uploads keep exact SHA-256 hashes.
 * - Downscales oversized iPhone 12–48 MP camera photos & screenshots via Canvas to <= 1600px JPEG (~200–350 KB).
 * - Converts Safari-decodable HEIC/HEIF/PNG/WebP files to JPEG; falls back cleanly to raw HEIC/HEIF if the
 *   current browser lacks native HEIC decoding so the server-side Gemini endpoint can still process it.
 */

export interface PreparedLensImage {
  dataUrl: string;
  mimeType: string;
  isHeicFallback: boolean;
  fileName: string;
}

const MAX_DIMENSION = 1600;
const RAW_JPEG_PASSTHROUGH_BYTES = 1_500_000;
const MAX_UPLOAD_BYTES = 18_000_000;

export function detectImageMimeType(file: File): string {
  const rawType = (file.type || '').toLowerCase().trim();
  if (rawType.startsWith('image/')) {
    if (rawType === 'image/jpg') return 'image/jpeg';
    return rawType;
  }
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.heic')) return 'image/heic';
  if (name.endsWith('.heif')) return 'image/heif';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Unable to read image file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read selected photo from device.'));
    reader.readAsDataURL(file);
  });
}

function drawResizedToJpegDataUrl(source: ImageBitmap | HTMLImageElement, width: number, height: number): string {
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height, 1));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable on this browser.');
  }
  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
  return canvas.toDataURL('image/jpeg', 0.86);
}

async function decodeAndNormalizeToJpeg(file: File): Promise<string> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      try {
        return drawResizedToJpegDataUrl(bitmap, bitmap.width, bitmap.height);
      } finally {
        bitmap.close();
      }
    } catch {
      // Fall through to HTMLImageElement loader
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Browser could not decode this image format.'));
      el.src = objectUrl;
    });
    return drawResizedToJpegDataUrl(img, img.naturalWidth || img.width, img.naturalHeight || img.height);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function prepareImageForLens(file: File): Promise<PreparedLensImage> {
  const detectedMime = detectImageMimeType(file);
  const fileName = file.name || 'photo.jpg';

  if (file.size === 0) {
    throw new Error('The selected file is empty. Please capture or choose another photo.');
  }

  // Keep <= 1.5 MB JPEGs byte-exact so Survey123 reference/test images hit exact SHA-256 matching
  if (detectedMime === 'image/jpeg' && file.size <= RAW_JPEG_PASSTHROUGH_BYTES) {
    const dataUrl = await readFileAsDataUrl(file);
    return {
      dataUrl,
      mimeType: 'image/jpeg',
      isHeicFallback: false,
      fileName,
    };
  }

  // Normalize large JPEGs, PNGs, WebPs, and Safari-readable HEIC/HEIF to <= 1600px JPEG
  try {
    const jpegDataUrl = await decodeAndNormalizeToJpeg(file);
    return {
      dataUrl: jpegDataUrl,
      mimeType: 'image/jpeg',
      isHeicFallback: false,
      fileName,
    };
  } catch (decodeErr) {
    // If current browser cannot natively decode HEIC/HEIF, pass raw HEIC/HEIF bytes to Gemini
    if (detectedMime === 'image/heic' || detectedMime === 'image/heif') {
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new Error(
          'This HEIC photo is over 18 MB and cannot be resized in your browser. Please take a photo with the camera or choose a smaller JPEG/PNG.'
        );
      }
      const rawDataUrl = await readFileAsDataUrl(file);
      const base64Body = rawDataUrl.includes(',') ? rawDataUrl.split(',')[1] : rawDataUrl;
      return {
        dataUrl: `data:${detectedMime};base64,${base64Body}`,
        mimeType: detectedMime,
        isHeicFallback: true,
        fileName,
      };
    }

    throw decodeErr instanceof Error
      ? decodeErr
      : new Error('Unable to process this image file. Please try JPEG, PNG, or HEIC.');
  }
}

export function captureVideoFrameForLens(
  video: HTMLVideoElement,
  canvasEl?: HTMLCanvasElement | null
): string {
  const rawW = video.videoWidth || 640;
  const rawH = video.videoHeight || 480;
  const scale = Math.min(1, MAX_DIMENSION / Math.max(rawW, rawH, 1));
  const targetW = Math.max(1, Math.round(rawW * scale));
  const targetH = Math.max(1, Math.round(rawH * scale));

  const canvas = canvasEl || document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to capture frame from camera stream.');
  }
  ctx.drawImage(video, 0, 0, targetW, targetH);
  return canvas.toDataURL('image/jpeg', 0.86);
}

const TRAIL_PHOTO_MAX_DATA_URL_LENGTH = 420_000;

function drawBoundedJpeg(
  source: ImageBitmap | HTMLImageElement | HTMLVideoElement,
  rawWidth: number,
  rawHeight: number,
  maxDim: number,
  quality: number
): string {
  const scale = Math.min(1, maxDim / Math.max(rawWidth, rawHeight, 1));
  const targetWidth = Math.max(1, Math.round(rawWidth * scale));
  const targetHeight = Math.max(1, Math.round(rawHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable on this browser.');
  }
  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
  return canvas.toDataURL('image/jpeg', quality);
}

function compressToTrailLimit(
  source: ImageBitmap | HTMLImageElement | HTMLVideoElement,
  rawWidth: number,
  rawHeight: number
): string {
  const attempts: Array<[number, number]> = [
    [960, 0.8],
    [880, 0.72],
    [760, 0.64],
    [640, 0.56],
    [540, 0.5],
  ];

  for (const [dim, quality] of attempts) {
    const candidate = drawBoundedJpeg(source, rawWidth, rawHeight, dim, quality);
    if (candidate.length <= TRAIL_PHOTO_MAX_DATA_URL_LENGTH) {
      return candidate;
    }
  }
  return drawBoundedJpeg(source, rawWidth, rawHeight, 480, 0.45);
}

export async function prepareTrailPhotoForUpload(file: File): Promise<string> {
  if (file.size === 0) {
    throw new Error('The selected photo is empty. Please retake or pick another photo.');
  }

  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      try {
        return compressToTrailLimit(bitmap, bitmap.width, bitmap.height);
      } finally {
        bitmap.close();
      }
    } catch {
      // Fallback to HTMLImageElement
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () =>
        reject(
          new Error(
            'Your browser could not decode this image format. On iPhone Safari, try Take Selfie or pick a JPEG/PNG photo.'
          )
        );
      el.src = objectUrl;
    });
    return compressToTrailLimit(img, img.naturalWidth || img.width, img.naturalHeight || img.height);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function captureSelfieVideoFrame(video: HTMLVideoElement): string {
  const rawW = video.videoWidth || 640;
  const rawH = video.videoHeight || 480;
  return compressToTrailLimit(video, rawW, rawH);
}

