// Modern Google Maps Routes API (Route.computeRoutes) pedestrian routing utility for Venice calli and bridges.
// Reference: https://developers.google.com/maps/documentation/javascript/routes?utm_campaign=gmp_mcp_codeassist_v1_aistudio

declare const google: any;

export type RouteStatus = 'OK' | 'UNAVAILABLE' | 'QUOTA_EXCEEDED';

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface WalkingStep {
  instruction: string;
  maneuver: string;
  distanceMeters: number;
  durationMillis: number;
  distanceText: string;
  durationText: string;
  path: LatLngPoint[];
  startLocation: LatLngPoint | null;
  endLocation: LatLngPoint | null;
}

export interface WalkingLeg {
  fromIndex: number;
  toIndex: number;
  path: LatLngPoint[];
  steps: WalkingStep[];
  distanceText?: string;
  durationText?: string;
  distanceMeters?: number;
}

export interface ComputedWalkingLegResult {
  status: RouteStatus;
  path: LatLngPoint[];
  steps: WalkingStep[];
  distanceText: string;
  durationText: string;
  distanceMeters: number | null;
  durationMillis: number | null;
  directDistanceMeters: number;
  errorReason?: string;
}

export interface MultiStopRouteResult {
  legs: ComputedWalkingLegResult[];
  overallStatus: RouteStatus;
  totalDistanceMeters: number | null;
  totalDurationMillis: number | null;
  failedLegCount: number;
  errorReason?: string;
}

export interface RemainingRouteMetrics {
  remainingDistanceMeters: number;
  remainingDurationMillis: number;
  remainingDistanceText: string;
  remainingDurationText: string;
  liveStepIndex: number;
  currentStepRemainingMeters: number | null;
  currentStepRemainingText: string | null;
  distanceFromRouteMeters: number;
}

// In-memory session cache of valid computed walking legs keyed by exact 5-decimal origin->destination
const SESSION_CACHE_PREFIX = 'pv_walk_leg_v1:';
const pairLegCache: Record<string, ComputedWalkingLegResult> = {};
// In-flight deduplication map to avoid duplicate Route.computeRoutes calls for the same pair
const inFlightRequests: Record<string, Promise<ComputedWalkingLegResult>> = {};
// Track whether Maps quota has been reached in this session to avoid repeated failing calls
const QUOTA_STORAGE_KEY = 'pv_gmp_quota_exceeded';
let sessionQuotaExceeded = (() => {
  try {
    return typeof window !== 'undefined' && Boolean(window.sessionStorage?.getItem(QUOTA_STORAGE_KEY));
  } catch {
    return false;
  }
})();

if (typeof window !== 'undefined') {
  window.addEventListener('gmp-quota-exceeded', () => {
    sessionQuotaExceeded = true;
  });
  window.addEventListener('gmp-quota-reset', () => {
    sessionQuotaExceeded = false;
  });
}

export function isSessionQuotaExceeded(): boolean {
  return sessionQuotaExceeded;
}

function toPairKey(origin: LatLngPoint, destination: LatLngPoint): string {
  return `${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}->${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}`;
}

function getCachedLeg(key: string): ComputedWalkingLegResult | null {
  if (pairLegCache[key]?.status === 'OK') {
    return pairLegCache[key];
  }
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const raw = window.sessionStorage.getItem(SESSION_CACHE_PREFIX + key);
      if (raw) {
        const parsed = JSON.parse(raw) as ComputedWalkingLegResult;
        if (parsed?.status === 'OK' && Array.isArray(parsed.path) && parsed.path.length >= 2) {
          pairLegCache[key] = parsed;
          return parsed;
        }
      }
    }
  } catch {
    // Ignore storage unavailable / private mode errors
  }
  return null;
}

function setCachedLeg(key: string, value: ComputedWalkingLegResult): void {
  if (value.status !== 'OK' || value.path.length < 2) return;
  pairLegCache[key] = value;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(SESSION_CACHE_PREFIX + key, JSON.stringify(value));
    }
  } catch {
    // Ignore storage quota exceeded
  }
}

export function formatDistance(distanceMeters: number): string {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) return '0 m';
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`;
  }
  return `${(distanceMeters / 1000).toFixed(2)} km`;
}

export function formatWalkingDuration(durationMillis: number): string {
  if (!Number.isFinite(durationMillis) || durationMillis <= 0) return '< 1 min';
  const mins = Math.max(1, Math.round(durationMillis / 60000));
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return remMins > 0 ? `${hrs} hr ${remMins} min` : `${hrs} hr`;
  }
  return `${mins} min`;
}

/**
 * Compute initial geographic bearing (0-360 clockwise from true North) between two points.
 */
export function computeBearing(from: LatLngPoint, to: LatLngPoint): number {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatManeuverLabel(maneuver: string | null | undefined): string {
  switch ((maneuver || '').toUpperCase()) {
    case 'TURN_LEFT':
      return 'Turn left';
    case 'TURN_SLIGHT_LEFT':
      return 'Keep slight left';
    case 'TURN_SHARP_LEFT':
      return 'Turn sharp left';
    case 'TURN_RIGHT':
      return 'Turn right';
    case 'TURN_SLIGHT_RIGHT':
      return 'Keep slight right';
    case 'TURN_SHARP_RIGHT':
      return 'Turn sharp right';
    case 'UTURN_LEFT':
    case 'UTURN_RIGHT':
      return 'Turn around';
    case 'STRAIGHT':
      return 'Continue straight ahead';
    case 'DEPART':
      return 'Start walking along the route';
    default:
      return 'Continue along pedestrian route';
  }
}

function normalizeLatLng(point: any): LatLngPoint | null {
  if (!point) return null;
  const source = point.latLng ? point.latLng : point;
  const lat = typeof source.lat === 'function' ? source.lat() : Number(source.lat);
  const lng = typeof source.lng === 'function' ? source.lng() : Number(source.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }
  return null;
}

function appendDeduplicatedPoints(target: LatLngPoint[], incoming: LatLngPoint[]) {
  for (const pt of incoming) {
    const prev = target[target.length - 1];
    if (
      !prev ||
      Math.abs(prev.lat - pt.lat) > 1e-6 ||
      Math.abs(prev.lng - pt.lng) > 1e-6
    ) {
      target.push(pt);
    }
  }
}

function extractLegPath(leg: any, fallbackRoutePath?: LatLngPoint[]): LatLngPoint[] {
  const stepConcatPath: LatLngPoint[] = [];
  if (Array.isArray(leg?.steps)) {
    for (const step of leg.steps) {
      if (Array.isArray(step?.path)) {
        const pts = step.path.map(normalizeLatLng).filter(Boolean) as LatLngPoint[];
        appendDeduplicatedPoints(stepConcatPath, pts);
      }
    }
  }

  const legOwnPath: LatLngPoint[] = [];
  if (Array.isArray(leg?.path)) {
    const pts = leg.path.map(normalizeLatLng).filter(Boolean) as LatLngPoint[];
    appendDeduplicatedPoints(legOwnPath, pts);
  }

  // Prefer whichever source yields richer street-level geometry
  if (stepConcatPath.length >= legOwnPath.length && stepConcatPath.length >= 2) {
    return stepConcatPath;
  }
  if (legOwnPath.length >= 2) {
    return legOwnPath;
  }
  if (fallbackRoutePath && fallbackRoutePath.length >= 2) {
    return fallbackRoutePath;
  }
  return [];
}

function extractLegSteps(
  leg: any,
  origin: LatLngPoint,
  destination: LatLngPoint
): WalkingStep[] {
  const steps: WalkingStep[] = [];
  if (!Array.isArray(leg?.steps)) return steps;

  for (const rawStep of leg.steps) {
    const stepPath: LatLngPoint[] = [];
    if (Array.isArray(rawStep?.path)) {
      const pts = rawStep.path.map(normalizeLatLng).filter(Boolean) as LatLngPoint[];
      appendDeduplicatedPoints(stepPath, pts);
    }

    const startLoc = normalizeLatLng(rawStep?.startLocation) || stepPath[0] || origin;
    const endLoc =
      normalizeLatLng(rawStep?.endLocation) || stepPath[stepPath.length - 1] || destination;
    const distMeters =
      typeof rawStep?.distanceMeters === 'number' && Number.isFinite(rawStep.distanceMeters)
        ? rawStep.distanceMeters
        : computePolylineLengthMeters(stepPath);
    const durMillis =
      typeof rawStep?.staticDurationMillis === 'number' &&
      Number.isFinite(rawStep.staticDurationMillis)
        ? rawStep.staticDurationMillis
        : 0;
    const maneuver = rawStep?.maneuver ? String(rawStep.maneuver) : 'STRAIGHT';

    const rawInstructions = rawStep?.instructions
      ? stripHtmlTags(String(rawStep.instructions))
      : '';
    const instruction = rawInstructions || formatManeuverLabel(maneuver);

    steps.push({
      instruction,
      maneuver,
      distanceMeters: distMeters,
      durationMillis: durMillis,
      distanceText: rawStep?.localizedValues?.distance || formatDistance(distMeters),
      durationText:
        rawStep?.localizedValues?.staticDuration || formatWalkingDuration(durMillis),
      path: stepPath,
      startLocation: startLoc,
      endLocation: endLoc,
    });
  }

  return steps;
}

function parseComputedLeg(
  leg: any,
  origin: LatLngPoint,
  destination: LatLngPoint,
  routeFallbackPath?: LatLngPoint[],
  routeDistanceMeters?: number,
  routeDurationMillis?: number,
  routeLocalizedValues?: any
): ComputedWalkingLegResult {
  const directDistanceMeters = Math.max(0, Math.round(getDistanceKm(origin, destination) * 1000));
  const finalPath = extractLegPath(leg, routeFallbackPath);
  const steps = extractLegSteps(leg, origin, destination);

  if (finalPath.length < 2) {
    return buildUnavailableResult(
      origin,
      destination,
      'UNAVAILABLE',
      'Google Maps did not return a walkable pedestrian geometry for this segment.'
    );
  }

  const rawDist =
    typeof leg?.distanceMeters === 'number' && Number.isFinite(leg.distanceMeters)
      ? leg.distanceMeters
      : typeof routeDistanceMeters === 'number' && Number.isFinite(routeDistanceMeters)
      ? routeDistanceMeters
      : computePolylineLengthMeters(finalPath);

  const rawDur =
    typeof leg?.durationMillis === 'number' && Number.isFinite(leg.durationMillis)
      ? leg.durationMillis
      : typeof leg?.staticDurationMillis === 'number' &&
        Number.isFinite(leg.staticDurationMillis)
      ? leg.staticDurationMillis
      : typeof routeDurationMillis === 'number' && Number.isFinite(routeDurationMillis)
      ? routeDurationMillis
      : Math.round((rawDist / 1.25) * 1000);

  const distanceText =
    leg?.localizedValues?.distance ||
    routeLocalizedValues?.distance ||
    formatDistance(rawDist);
  const durationText =
    leg?.localizedValues?.duration ||
    leg?.localizedValues?.staticDuration ||
    routeLocalizedValues?.duration ||
    routeLocalizedValues?.staticDuration ||
    formatWalkingDuration(rawDur);

  return {
    status: 'OK',
    path: finalPath,
    steps,
    distanceText,
    durationText,
    distanceMeters: Math.round(rawDist),
    durationMillis: Math.round(rawDur),
    directDistanceMeters,
  };
}

function isQuotaError(err: unknown): boolean {
  const msg = String(
    (err as any)?.message || (err as any)?.status || (err as any)?.code || err || ''
  ).toUpperCase();
  return (
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('OVER_QUERY_LIMIT') ||
    msg.includes('QUOTA') ||
    msg.includes('429')
  );
}

function classifyRoutingError(err: unknown): {
  status: 'UNAVAILABLE' | 'QUOTA_EXCEEDED';
  reason: string;
} {
  if (isQuotaError(err)) {
    return {
      status: 'QUOTA_EXCEEDED',
      reason:
        'Google Maps Routes request quota reached for this key. Walking directions are temporarily unavailable.',
    };
  }
  const msg = String((err as any)?.message || err || '').toUpperCase();
  if (msg.includes('ZERO_RESULTS') || msg.includes('NO_ROUTE') || msg.includes('NOT_FOUND')) {
    return {
      status: 'UNAVAILABLE',
      reason:
        'No continuous pedestrian walkway or bridge route was found between these points.',
    };
  }
  if (msg.includes('NETWORK') || msg.includes('FAILED TO FETCH')) {
    return {
      status: 'UNAVAILABLE',
      reason: 'Network error while requesting walking directions from Google Maps.',
    };
  }
  return {
    status: 'UNAVAILABLE',
    reason: 'Walking directions could not be calculated along Venice pedestrian walkways.',
  };
}

export function buildUnavailableResult(
  origin: LatLngPoint,
  destination: LatLngPoint,
  status: 'UNAVAILABLE' | 'QUOTA_EXCEEDED',
  errorReason: string
): ComputedWalkingLegResult {
  const directDistanceMeters = Math.max(0, Math.round(getDistanceKm(origin, destination) * 1000));
  return {
    status,
    path: [], // Never draw a straight-line polyline as a walking route
    steps: [], // Never synthesize fake turn-by-turn steps
    distanceText: 'Unavailable',
    durationText: 'Unavailable',
    distanceMeters: null,
    durationMillis: null,
    directDistanceMeters,
    errorReason,
  };
}

/**
 * Fetch a single walking leg between two coordinates using Google Maps Routes API
 * (`Route.computeRoutes` with `WALKING` mode and `HIGH_QUALITY` polyline geometry).
 * Never substitutes a straight-line polyline or fabricated metrics on failure.
 */
export async function fetchSingleWalkingLeg(
  origin: LatLngPoint,
  destination: LatLngPoint,
  routesLib?: any,
  options?: { bypassCache?: boolean }
): Promise<ComputedWalkingLegResult> {
  const directKm = getDistanceKm(origin, destination);
  const directMeters = Math.max(0, Math.round(directKm * 1000));

  // Only treat literally co-located points (<= 2m) as already arrived; anything > 2m must route via pedestrian network
  if (directKm <= 0.002) {
    return {
      status: 'OK',
      path: [origin, destination],
      steps: [
        {
          instruction: 'You are at the artwork location',
          maneuver: 'ARRIVE',
          distanceMeters: directMeters,
          durationMillis: 0,
          distanceText: formatDistance(directMeters),
          durationText: '< 1 min',
          path: [origin, destination],
          startLocation: origin,
          endLocation: destination,
        },
      ],
      distanceText: formatDistance(directMeters),
      durationText: '< 1 min',
      distanceMeters: directMeters,
      durationMillis: 0,
      directDistanceMeters: directMeters,
    };
  }

  const cacheKey = toPairKey(origin, destination);
  const existingCached = !options?.bypassCache ? getCachedLeg(cacheKey) : null;
  if (existingCached) {
    return existingCached;
  }

  if (cacheKey in inFlightRequests) {
    return inFlightRequests[cacheKey];
  }

  const canImportRoutes =
    typeof window !== 'undefined' &&
    Boolean(routesLib?.Route?.computeRoutes || (window as any).google?.maps?.importLibrary);

  if (sessionQuotaExceeded) {
    return buildUnavailableResult(
      origin,
      destination,
      'QUOTA_EXCEEDED',
      'Google Maps Routes request quota reached for this key. Walking directions are temporarily unavailable.'
    );
  }

  if (!canImportRoutes) {
    return buildUnavailableResult(
      origin,
      destination,
      'UNAVAILABLE',
      'Google Maps Routes library is still loading or unavailable.'
    );
  }

  const requestPromise = (async (): Promise<ComputedWalkingLegResult> => {
    try {
      const lib = routesLib?.Route ? routesLib : await google.maps.importLibrary('routes');
      const RouteClass = lib?.Route;
      if (!RouteClass?.computeRoutes) {
        return buildUnavailableResult(
          origin,
          destination,
          'UNAVAILABLE',
          'Google Maps Routes service is unavailable in this session.'
        );
      }

      const travelMode = lib?.TravelMode?.WALKING || 'WALKING';
      const polylineQuality = lib?.PolylineQuality?.HIGH_QUALITY || 'HIGH_QUALITY';

      const response = await RouteClass.computeRoutes({
        origin,
        destination,
        travelMode,
        polylineQuality,
        fields: ['path', 'distanceMeters', 'durationMillis', 'legs', 'localizedValues'],
      });

      const primaryRoute = response?.routes?.[0];
      if (!primaryRoute) {
        return buildUnavailableResult(
          origin,
          destination,
          'UNAVAILABLE',
          'No walkable pedestrian path found along Venice streets and bridges between these points.'
        );
      }

      const routeFallbackPath: LatLngPoint[] = Array.isArray(primaryRoute.path)
        ? (primaryRoute.path.map(normalizeLatLng).filter(Boolean) as LatLngPoint[])
        : [];
      const primaryLeg = primaryRoute.legs?.[0];

      const result = parseComputedLeg(
        primaryLeg || { path: routeFallbackPath },
        origin,
        destination,
        routeFallbackPath,
        primaryRoute.distanceMeters,
        primaryRoute.durationMillis,
        primaryRoute.localizedValues
      );

      if (result.status === 'OK') {
        setCachedLeg(cacheKey, result);
      }

      return result;
    } catch (err) {
      if (isQuotaError(err)) {
        sessionQuotaExceeded = true;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
      }
      const { status, reason } = classifyRoutingError(err);
      return buildUnavailableResult(origin, destination, status, reason);
    } finally {
      delete inFlightRequests[cacheKey];
    }
  })();

  inFlightRequests[cacheKey] = requestPromise;
  return requestPromise;
}

/**
 * Fetch an entire multi-stop pedestrian route using `intermediates` in Google Maps `Route.computeRoutes`
 * so a 9-stop Venice trail consumes 1 API request instead of 8 while retaining per-leg street geometry
 * and turn-by-turn steps. Falls back to per-leg requests ONLY for non-quota partial errors.
 */
export async function fetchMultiStopWalkingRoute(
  stops: LatLngPoint[],
  routesLib?: any
): Promise<MultiStopRouteResult> {
  if (stops.length < 2) {
    return {
      legs: [],
      overallStatus: 'OK',
      totalDistanceMeters: 0,
      totalDurationMillis: 0,
      failedLegCount: 0,
    };
  }

  // 1. Serve immediately from cache if every pair is already cached
  const cachedLegs: ComputedWalkingLegResult[] = [];
  let allCached = true;
  for (let i = 0; i < stops.length - 1; i++) {
    const key = toPairKey(stops[i], stops[i + 1]);
    const cached = getCachedLeg(key);
    if (cached) {
      cachedLegs.push(cached);
    } else {
      allCached = false;
      break;
    }
  }
  if (allCached && cachedLegs.length === stops.length - 1) {
    return summarizeMultiStopLegs(cachedLegs);
  }

  if (sessionQuotaExceeded) {
    const quotaLegs = stops
      .slice(0, -1)
      .map((s, i) =>
        buildUnavailableResult(
          s,
          stops[i + 1],
          'QUOTA_EXCEEDED',
          'Google Maps Routes request quota reached for this key. Walking directions are temporarily unavailable.'
        )
      );
    return summarizeMultiStopLegs(quotaLegs);
  }

  if (stops.length === 2) {
    const single = await fetchSingleWalkingLeg(stops[0], stops[1], routesLib);
    return summarizeMultiStopLegs([single]);
  }

  const canImportRoutes =
    typeof window !== 'undefined' &&
    Boolean(routesLib?.Route?.computeRoutes || (window as any).google?.maps?.importLibrary);

  if (!canImportRoutes) {
    const loadingLegs = stops
      .slice(0, -1)
      .map((s, i) =>
        buildUnavailableResult(
          s,
          stops[i + 1],
          'UNAVAILABLE',
          'Google Maps Routes library is still loading or unavailable.'
        )
      );
    return summarizeMultiStopLegs(loadingLegs);
  }

  try {
    const lib = routesLib?.Route ? routesLib : await google.maps.importLibrary('routes');
    const RouteClass = lib?.Route;
    if (!RouteClass?.computeRoutes) {
      throw new Error('Route.computeRoutes unavailable');
    }

    const travelMode = lib?.TravelMode?.WALKING || 'WALKING';
    const polylineQuality = lib?.PolylineQuality?.HIGH_QUALITY || 'HIGH_QUALITY';

    // Chunk at max 26 stops (24 intermediates) per Google Routes API spec
    const allLegs: ComputedWalkingLegResult[] = [];
    let chunkStart = 0;

    while (chunkStart < stops.length - 1) {
      const chunkEnd = Math.min(stops.length - 1, chunkStart + 25);
      const chunkStops = stops.slice(chunkStart, chunkEnd + 1);
      const origin = chunkStops[0];
      const destination = chunkStops[chunkStops.length - 1];
      const intermediates = chunkStops.slice(1, -1).map((loc) => ({ location: loc }));

      const response = await RouteClass.computeRoutes({
        origin,
        destination,
        ...(intermediates.length > 0 ? { intermediates } : {}),
        travelMode,
        polylineQuality,
        fields: ['path', 'distanceMeters', 'durationMillis', 'legs', 'localizedValues'],
      });

      const primaryRoute = response?.routes?.[0];
      if (!primaryRoute || !Array.isArray(primaryRoute.legs) || primaryRoute.legs.length !== chunkStops.length - 1) {
        throw new Error('ZERO_RESULTS');
      }

      for (let i = 0; i < chunkStops.length - 1; i++) {
        const legOrigin = chunkStops[i];
        const legDest = chunkStops[i + 1];
        const parsed = parseComputedLeg(primaryRoute.legs[i], legOrigin, legDest);
        if (parsed.status === 'OK') {
          setCachedLeg(toPairKey(legOrigin, legDest), parsed);
        }
        allLegs.push(parsed);
      }

      chunkStart = chunkEnd;
    }

    return summarizeMultiStopLegs(allLegs);
  } catch (err) {
    if (isQuotaError(err)) {
      sessionQuotaExceeded = true;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
      const quotaLegs = stops
        .slice(0, -1)
        .map((s, i) =>
          buildUnavailableResult(
            s,
            stops[i + 1],
            'QUOTA_EXCEEDED',
            'Google Maps Routes request quota reached for this key. Walking directions are temporarily unavailable.'
          )
        );
      return summarizeMultiStopLegs(quotaLegs);
    }

    // For non-quota multi-stop failures (e.g. 1 unreachable waypoint), resolve leg-by-leg
    // so valid segments remain walkable while broken segments report cleanly without straight lines.
    const perLegResults: ComputedWalkingLegResult[] = [];
    for (let i = 0; i < stops.length - 1; i++) {
      if (sessionQuotaExceeded) {
        perLegResults.push(
          buildUnavailableResult(
            stops[i],
            stops[i + 1],
            'QUOTA_EXCEEDED',
            'Google Maps Routes request quota reached for this key.'
          )
        );
      } else {
        const res = await fetchSingleWalkingLeg(stops[i], stops[i + 1], routesLib);
        perLegResults.push(res);
      }
    }
    return summarizeMultiStopLegs(perLegResults);
  }
}

function summarizeMultiStopLegs(legs: ComputedWalkingLegResult[]): MultiStopRouteResult {
  let failedLegCount = 0;
  let quotaFailed = false;
  let firstError: string | undefined;
  let sumDist = 0;
  let sumDur = 0;

  for (const leg of legs) {
    if (leg.status !== 'OK') {
      failedLegCount += 1;
      if (leg.status === 'QUOTA_EXCEEDED') quotaFailed = true;
      if (!firstError && leg.errorReason) firstError = leg.errorReason;
    } else {
      sumDist += leg.distanceMeters ?? 0;
      sumDur += leg.durationMillis ?? 0;
    }
  }

  const overallStatus: RouteStatus =
    failedLegCount === 0 ? 'OK' : quotaFailed ? 'QUOTA_EXCEEDED' : 'UNAVAILABLE';

  return {
    legs,
    overallStatus,
    totalDistanceMeters: failedLegCount === legs.length ? null : Math.round(sumDist),
    totalDurationMillis: failedLegCount === legs.length ? null : Math.round(sumDur),
    failedLegCount,
    errorReason: firstError,
  };
}

/**
 * Legacy-compatible helper returning legs array for callers expecting `ComputedWalkingLegResult[]`.
 */
export async function fetchAllRouteLegsWithSteps(
  stops: LatLngPoint[],
  _routeId?: string,
  routesLib?: any
): Promise<ComputedWalkingLegResult[]> {
  const multi = await fetchMultiStopWalkingRoute(stops, routesLib);
  return multi.legs;
}

/**
 * Calculate geodesic distance in kilometers between two GPS coordinates (Haversine formula).
 * Note: Returns direct straight-line distance only, NOT pedestrian walking distance.
 */
export function getDistanceKm(coord1: LatLngPoint, coord2: LatLngPoint): number {
  const R = 6371;
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.lat * Math.PI) / 180) *
      Math.cos((coord2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function computePolylineLengthMeters(path: LatLngPoint[]): number {
  if (!path || path.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    total += getDistanceKm(path[i], path[i + 1]) * 1000;
  }
  return total;
}

/**
 * Project a point onto segment AB using local equirectangular scaling accurate at Venice latitude (~45.43°).
 */
function projectPointOntoSegment(
  p: LatLngPoint,
  a: LatLngPoint,
  b: LatLngPoint
): { closestPoint: LatLngPoint; distanceMeters: number; t: number } {
  const cosLat = Math.cos((p.lat * Math.PI) / 180);
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * cosLat;

  const ax = (a.lng - p.lng) * metersPerDegLng;
  const ay = (a.lat - p.lat) * metersPerDegLat;
  const bx = (b.lng - p.lng) * metersPerDegLng;
  const by = (b.lat - p.lat) * metersPerDegLat;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq < 1e-9) {
    return {
      closestPoint: a,
      distanceMeters: Math.hypot(ax, ay),
      t: 0,
    };
  }

  const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lenSq));
  const closestX = ax + t * dx;
  const closestY = ay + t * dy;

  return {
    closestPoint: {
      lat: a.lat + t * (b.lat - a.lat),
      lng: a.lng + t * (b.lng - a.lng),
    },
    distanceMeters: Math.hypot(closestX, closestY),
    t,
  };
}

/**
 * Compute minimum perpendicular distance in meters from `point` to a polyline path.
 */
export function distanceFromPointToPolylineMeters(
  point: LatLngPoint,
  path: LatLngPoint[]
): {
  distanceMeters: number;
  nearestSegmentIndex: number;
  nearestPoint: LatLngPoint;
} {
  if (!path || path.length === 0) {
    return { distanceMeters: Infinity, nearestSegmentIndex: 0, nearestPoint: point };
  }
  if (path.length === 1) {
    return {
      distanceMeters: getDistanceKm(point, path[0]) * 1000,
      nearestSegmentIndex: 0,
      nearestPoint: path[0],
    };
  }

  let minDist = Infinity;
  let bestSeg = 0;
  let bestPoint = path[0];

  for (let i = 0; i < path.length - 1; i++) {
    const proj = projectPointOntoSegment(point, path[i], path[i + 1]);
    if (proj.distanceMeters < minDist) {
      minDist = proj.distanceMeters;
      bestSeg = i;
      bestPoint = proj.closestPoint;
    }
  }

  return {
    distanceMeters: minDist,
    nearestSegmentIndex: bestSeg,
    nearestPoint: bestPoint,
  };
}

/**
 * Split a polyline into `behindPath` (portion already traversed behind `userLocation`)
 * and `aheadPath` (remaining path forward from `userLocation`), matching Google Maps navigation tracks.
 */
export function splitPolylineAtLocation(
  path: LatLngPoint[],
  userLocation: LatLngPoint | null | undefined,
  options?: { maxSnapDistanceMeters?: number; minSegmentMeters?: number }
): {
  behindPath: LatLngPoint[];
  aheadPath: LatLngPoint[];
  distanceMeters: number;
} {
  if (!path || path.length < 2) {
    return { behindPath: [], aheadPath: [], distanceMeters: Infinity };
  }
  if (!userLocation) {
    return { behindPath: [], aheadPath: path, distanceMeters: Infinity };
  }

  const maxSnapMeters = options?.maxSnapDistanceMeters ?? 120;
  const minSegMeters = options?.minSegmentMeters ?? 2;

  const { distanceMeters, nearestSegmentIndex, nearestPoint } =
    distanceFromPointToPolylineMeters(userLocation, path);

  if (!Number.isFinite(distanceMeters) || distanceMeters > maxSnapMeters) {
    return { behindPath: [], aheadPath: path, distanceMeters };
  }

  const behindRaw: LatLngPoint[] = [];
  appendDeduplicatedPoints(behindRaw, path.slice(0, nearestSegmentIndex + 1));
  appendDeduplicatedPoints(behindRaw, [nearestPoint]);

  const aheadRaw: LatLngPoint[] = [];
  appendDeduplicatedPoints(aheadRaw, [nearestPoint]);
  appendDeduplicatedPoints(aheadRaw, path.slice(nearestSegmentIndex + 1));

  const behindLen = computePolylineLengthMeters(behindRaw);
  const aheadLen = computePolylineLengthMeters(aheadRaw);

  const behindPath = behindRaw.length >= 2 && behindLen >= minSegMeters ? behindRaw : [];
  const aheadPath = aheadRaw.length >= 2 && aheadLen >= minSegMeters ? aheadRaw : [];

  return {
    behindPath,
    aheadPath,
    distanceMeters,
  };
}

/**
 * Dynamically calculate remaining walking distance, remaining ETA, and active step progress
 * along an authentic Google Maps pedestrian polyline.
 */
export function computeRemainingRouteMetrics(
  userLocation: LatLngPoint | null,
  path: LatLngPoint[],
  steps: WalkingStep[],
  totalDistanceMeters: number | null,
  totalDurationMillis: number | null
): RemainingRouteMetrics | null {
  if (!path || path.length < 2 || totalDistanceMeters === null || totalDurationMillis === null) {
    return null;
  }

  const fullPolyMeters = Math.max(1, computePolylineLengthMeters(path));
  const baselineDist = Math.max(totalDistanceMeters, 1);

  if (!userLocation) {
    return {
      remainingDistanceMeters: Math.round(totalDistanceMeters),
      remainingDurationMillis: Math.round(totalDurationMillis),
      remainingDistanceText: formatDistance(totalDistanceMeters),
      remainingDurationText: formatWalkingDuration(totalDurationMillis),
      liveStepIndex: 0,
      currentStepRemainingMeters: steps[0]?.distanceMeters ?? null,
      currentStepRemainingText: steps[0]?.distanceText ?? null,
      distanceFromRouteMeters: 0,
    };
  }

  const { distanceMeters: distOffRoute, nearestSegmentIndex, nearestPoint } =
    distanceFromPointToPolylineMeters(userLocation, path);

  // Sum polyline distance from projected point -> end of polyline
  let remainingPolyMeters =
    getDistanceKm(nearestPoint, path[nearestSegmentIndex + 1]) * 1000;
  for (let i = nearestSegmentIndex + 1; i < path.length - 1; i++) {
    remainingPolyMeters += getDistanceKm(path[i], path[i + 1]) * 1000;
  }

  // Scale proportionally onto Google's reported route distance/duration
  const progressFraction = Math.max(0, Math.min(1, remainingPolyMeters / fullPolyMeters));
  const remainingDistanceMeters = Math.max(
    0,
    Math.round(baselineDist * progressFraction)
  );
  const remainingDurationMillis = Math.max(
    0,
    Math.round(totalDurationMillis * progressFraction)
  );

  // Determine active WalkingStep using segment projection onto each step's polyline
  let liveStepIndex = 0;
  let currentStepRemainingMeters: number | null = null;

  if (steps.length > 0) {
    let bestStepDist = Infinity;
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const stepPts =
        s.path.length >= 2
          ? s.path
          : s.startLocation && s.endLocation
          ? [s.startLocation, s.endLocation]
          : [];
      if (stepPts.length === 0) continue;
      const d = distanceFromPointToPolylineMeters(userLocation, stepPts).distanceMeters;
      if (d < bestStepDist) {
        bestStepDist = d;
        liveStepIndex = i;
      }
    }

    const activeStep = steps[liveStepIndex];
    if (
      activeStep?.endLocation &&
      liveStepIndex < steps.length - 1 &&
      getDistanceKm(userLocation, activeStep.endLocation) * 1000 < 10
    ) {
      liveStepIndex += 1;
    }

    const currStep = steps[liveStepIndex];
    if (currStep) {
      const currPts =
        currStep.path.length >= 2
          ? currStep.path
          : currStep.startLocation && currStep.endLocation
          ? [currStep.startLocation, currStep.endLocation]
          : [];
      if (currPts.length >= 2) {
        const proj = distanceFromPointToPolylineMeters(userLocation, currPts);
        let remStep =
          getDistanceKm(proj.nearestPoint, currPts[proj.nearestSegmentIndex + 1]) * 1000;
        for (let k = proj.nearestSegmentIndex + 1; k < currPts.length - 1; k++) {
          remStep += getDistanceKm(currPts[k], currPts[k + 1]) * 1000;
        }
        currentStepRemainingMeters = Math.max(1, Math.round(remStep));
      } else {
        currentStepRemainingMeters = Math.round(currStep.distanceMeters);
      }
    }
  }

  return {
    remainingDistanceMeters,
    remainingDurationMillis,
    remainingDistanceText: formatDistance(remainingDistanceMeters),
    remainingDurationText: formatWalkingDuration(remainingDurationMillis),
    liveStepIndex,
    currentStepRemainingMeters,
    currentStepRemainingText:
      currentStepRemainingMeters !== null ? formatDistance(currentStepRemainingMeters) : null,
    distanceFromRouteMeters: Math.round(distOffRoute),
  };
}

/**
 * Reorder route stops so that Stop 1 is always the nearest artifact to the user's current GPS location.
 * Cycles the route stops so that the nearest waypoint becomes index 0 (Stop 1) and retains route continuity.
 */
export function optimizeRouteStopsForLocation(
  trail: { stops: { monumentId: string; order: number; [key: string]: any }[]; [key: string]: any },
  userLocation?: LatLngPoint | null,
  monumentsList: { id: string; coordinates: LatLngPoint }[] = []
) {
  if (!userLocation || !trail || trail.stops.length <= 1) {
    return trail;
  }

  let minDistance = Infinity;
  let nearestIndex = 0;

  trail.stops.forEach((stop, index) => {
    const m = monumentsList.find((item) => item.id === stop.monumentId);
    if (m) {
      const dist = getDistanceKm(userLocation, m.coordinates);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIndex = index;
      }
    }
  });

  if (nearestIndex === 0) {
    return trail;
  }

  const reorderedStops = [
    ...trail.stops.slice(nearestIndex),
    ...trail.stops.slice(0, nearestIndex),
  ].map((stop, idx) => ({
    ...stop,
    order: idx + 1,
  }));

  return {
    ...trail,
    stops: reorderedStops,
  };
}
