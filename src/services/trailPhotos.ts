import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import {
  auth,
  buildFirestoreErrorInfo,
  db,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import { CURATED_TRAILS } from '../data/routes';
import { CuratedTrail } from '../types';

export const PREMADE_TRAIL_IDS = new Set(CURATED_TRAILS.map((t) => t.id));

export function isPremadeTrail(trail: CuratedTrail | null | undefined): trail is CuratedTrail {
  return Boolean(trail && PREMADE_TRAIL_IDS.has(trail.id));
}

export interface TrailPhoto {
  id: string;
  trailId: string;
  trailTitle: string;
  imageDataUrl: string;
  caption?: string;
  authorUid: string;
  authorName: string;
  stopTitle?: string;
  lat?: number;
  lng?: number;
  createdAtMs: number;
}

export interface UploadTrailPhotoInput {
  trail: CuratedTrail;
  imageDataUrl: string;
  caption?: string;
  authorName?: string;
  stopTitle?: string;
  lat?: number;
  lng?: number;
}

const COLLECTION_PATH = 'trailPhotos';
const MAX_IMAGE_DATA_URL_LENGTH = 450000;

export function subscribeToTrailPhotos(
  trailId: string,
  onPhotos: (photos: TrailPhoto[]) => void,
  onError?: (friendlyMessage: string) => void
): () => void {
  if (!PREMADE_TRAIL_IDS.has(trailId)) {
    onPhotos([]);
    return () => {};
  }

  const q = query(collection(db, COLLECTION_PATH), where('trailId', '==', trailId));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: TrailPhoto[] = snapshot.docs.map((d) => {
        const data = d.data() as Record<string, any>;
        const rawTs = data.createdAt;
        let createdAtMs = Date.now();
        if (rawTs instanceof Timestamp) {
          createdAtMs = rawTs.toMillis();
        } else if (rawTs && typeof rawTs.toMillis === 'function') {
          createdAtMs = rawTs.toMillis();
        }
        return {
          id: d.id,
          trailId: String(data.trailId || trailId),
          trailTitle: String(data.trailTitle || ''),
          imageDataUrl: String(data.imageDataUrl || ''),
          caption: typeof data.caption === 'string' && data.caption ? data.caption : undefined,
          authorUid: String(data.authorUid || ''),
          authorName: String(data.authorName || 'Venice Explorer'),
          stopTitle: typeof data.stopTitle === 'string' && data.stopTitle ? data.stopTitle : undefined,
          lat: typeof data.lat === 'number' ? data.lat : undefined,
          lng: typeof data.lng === 'number' ? data.lng : undefined,
          createdAtMs,
        };
      });

      items.sort((a, b) => b.createdAtMs - a.createdAtMs);
      onPhotos(items);
    },
    (error) => {
      const errInfo = buildFirestoreErrorInfo(error, OperationType.LIST, COLLECTION_PATH);
      console.error('Firestore Error: ', JSON.stringify(errInfo));
      if (onError) {
        onError(
          error.message.includes('Quota exceeded')
            ? 'Public photo gallery daily quota reached. Please try again tomorrow.'
            : 'Unable to load public trail photos right now.'
        );
      }
    }
  );
}

export async function uploadTrailPhoto(input: UploadTrailPhotoInput): Promise<TrailPhoto> {
  if (!isPremadeTrail(input.trail)) {
    throw new Error('Route photos can only be uploaded to premade curated trails.');
  }

  const user = auth.currentUser;
  if (!user) {
    throw new Error('Please sign in with Google before posting a public trail photo.');
  }

  const cleanDataUrl = input.imageDataUrl.trim();
  if (
    cleanDataUrl.length < 30 ||
    cleanDataUrl.length > MAX_IMAGE_DATA_URL_LENGTH ||
    !/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(cleanDataUrl)
  ) {
    throw new Error('Photo must be a compressed JPEG, PNG, or WebP image under 450 KB.');
  }

  const sanitizedAuthorName =
    (input.authorName || user.displayName || 'Venice Explorer')
      .trim()
      .slice(0, 80) || 'Venice Explorer';
  const sanitizedTrailTitle = input.trail.title.trim().slice(0, 120) || 'Curated Trail';
  const sanitizedCaption = input.caption?.trim().slice(0, 240);
  const sanitizedStopTitle = input.stopTitle?.trim().slice(0, 120);

  const photoId = `tp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const docPath = `${COLLECTION_PATH}/${photoId}`;

  const payload: Record<string, unknown> = {
    trailId: input.trail.id,
    trailTitle: sanitizedTrailTitle,
    imageDataUrl: cleanDataUrl,
    authorUid: user.uid,
    authorName: sanitizedAuthorName,
    createdAt: serverTimestamp(),
  };

  if (sanitizedCaption) {
    payload.caption = sanitizedCaption;
  }
  if (sanitizedStopTitle) {
    payload.stopTitle = sanitizedStopTitle;
  }
  if (typeof input.lat === 'number' && Number.isFinite(input.lat) && input.lat >= -90 && input.lat <= 90) {
    payload.lat = Number(input.lat.toFixed(6));
  }
  if (typeof input.lng === 'number' && Number.isFinite(input.lng) && input.lng >= -180 && input.lng <= 180) {
    payload.lng = Number(input.lng.toFixed(6));
  }

  try {
    await setDoc(doc(db, COLLECTION_PATH, photoId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }

  return {
    id: photoId,
    trailId: input.trail.id,
    trailTitle: sanitizedTrailTitle,
    imageDataUrl: cleanDataUrl,
    caption: sanitizedCaption,
    authorUid: user.uid,
    authorName: sanitizedAuthorName,
    stopTitle: sanitizedStopTitle,
    lat: payload.lat as number | undefined,
    lng: payload.lng as number | undefined,
    createdAtMs: Date.now(),
  };
}

export async function deleteTrailPhoto(photoId: string): Promise<void> {
  const docPath = `${COLLECTION_PATH}/${photoId}`;
  try {
    await deleteDoc(doc(db, COLLECTION_PATH, photoId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}
