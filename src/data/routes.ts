import { CuratedTrail, RouteStop } from '../types';
import { MONUMENTS } from './monuments';

function calcDirectDistanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return Math.round(R * c);
}

function buildTrailStops(monumentIds: string[]): {
  stops: RouteStop[];
  totalKm: number;
  estimatedMinutes: number;
} {
  let totalDirectMeters = 0;
  const stops: RouteStop[] = [];

  for (let i = 0; i < monumentIds.length; i++) {
    const curr = MONUMENTS.find((m) => m.id === monumentIds[i]);
    if (!curr) continue;

    let legDirectMeters = 0;
    if (i > 0) {
      const prev = MONUMENTS.find((m) => m.id === monumentIds[i - 1]);
      if (prev) {
        legDirectMeters = Math.max(0, calcDirectDistanceMeters(prev.coordinates, curr.coordinates));
        totalDirectMeters += legDirectMeters;
      }
    }

    const legMinutesEst = legDirectMeters > 0 ? Math.max(1, Math.round(legDirectMeters / 70)) : 0;
    stops.push({
      monumentId: curr.id,
      order: stops.length + 1,
      walkingTimeMinutes: legMinutesEst,
      walkingDistanceMeters: legDirectMeters,
      highlightNote: curr.generalNotes
        ? `${curr.category} (${curr.surveyCode}) — Field note: "${curr.generalNotes}"`
        : `${curr.category} recorded at ${curr.coordinates.formatted} (${curr.surveyCode}).`,
      bridgesToCross: 0,
    });
  }

  const totalKm = Number(Math.max(0.05, totalDirectMeters / 1000).toFixed(2));
  const estimatedMinutes = Math.max(5, Math.round(totalDirectMeters / 65) + stops.length * 2);

  return { stops, totalKm, estimatedMinutes };
}

// Western Dorsoduro cluster (longitudes ~12.3206 to ~12.3223)
const westernIds = [
  '5def2281-7b8d-4524-995a-d9e604ade96b', // Statue
  '3d26ef79-601d-44ee-934d-0c5a2ae6aa3d', // Relief
  '1b350784-6e65-40e8-9de7-c71fb61b4582', // Relief
  '0983980f-fe3c-4d03-8c0e-54222f6a06a4', // Relief
  '92d275d8-5125-4f64-8977-bb560027a30a', // Statue
  '9149a57b-278a-4348-a62f-1618ac4a7771', // Statue
  '4de68c62-dcea-4a36-bb95-65dcb84e7a84', // Statue
  '771db429-5265-4f8b-ba1b-2152e49f2b8f', // Relief ("There are 8 on this wall")
];

// Central Dorsoduro loop (longitudes ~12.3219 to ~12.3239)
const centralIds = [
  '8e4de8a6-c504-4a70-aab6-66ac086c8f36', // Relief
  'a92deb11-7c77-4d4c-8b6e-6142b9fa535d', // Statue ("1 statue 2 reliefs")
  'a73e0578-d0f6-4300-a5cc-047dfe8b3f49', // Relief
  '3971e738-0d4b-4519-ab09-9a289ed32b11', // Relief
  '3bcff81f-b529-4252-9aed-70761d5e57dc', // Statue
  '9022d815-e7ac-42d6-a590-c8c6336bdf02', // Relief ("multiple on wall")
  '04052a64-5feb-4dbc-a78f-b3e0be637ef9', // Statue
  '54372240-3c26-49bd-b2e6-7440e1a290c7', // Relief
  '9ffda6e2-0b0c-4c47-944c-918ae361d6f4', // Relief
];

// Eastern Dorsoduro cluster (longitudes ~12.3246 to ~12.3267)
const easternIds = [
  '0c471cfc-8fc5-466f-b5d1-163f66f0bd26', // Relief
  '5142cdba-bef2-4a58-a6a7-63cc327d64f1', // Relief
  'baff92f1-e03f-4e8f-bcf2-7ad1b85cf051', // Relief
  '939ae128-ed80-48d9-8620-9bbc8b8b842e', // Relief ("2 in 1")
  '0b6a8108-e065-4cde-84b0-1bc3120aff1c', // Relief ("multiple statues/ reliefs on wall")
  '5a560534-bec1-4cb0-a698-aef1a1d89050', // Statue
  'e15f389c-7ba1-4ca6-b3b9-871fe0543856', // Relief
  'b14ecfeb-d105-42e6-8e03-1ce2865ad80a', // Relief ("multiple on building")
];

// Central San Marco walkable cluster
const sanMarcoIds = [
  '694130ce-440f-4f9e-9a70-fd2fcba7862f',
  '873a1f1a-9e0b-46b5-b8c4-53ec2ff8e476',
  '79afe4c1-71b5-4abc-80cf-983377911345',
  '23c6e7c5-1d24-46dd-9aea-fb79f6511403',
  '7d8a7202-89bc-4199-81dd-80870d29e688',
  'e7b521a9-7652-456d-8bf6-fbe13671276c',
  '62af9f24-c25d-493b-b870-1ff20a343bd8',
];

// San Polo walkable cluster
const sanPoloIds = [
  'dd0c8833-c020-4dfc-89f9-f5d834c1475f',
  'd3512e37-2c1f-45fc-b6cd-8d0f5c370ada',
  '32e69126-bb5c-4774-b4b2-6005bfd59612',
  '58ccb3bd-b647-4ae8-99e8-8181404d91fc',
  'f207fe91-896c-4fb8-846e-effcfa6afca0',
  'f8743a32-f101-48be-b91d-b8f34c41bb4d',
  '71e0fc90-9890-4863-a04c-c68e3400d485',
];

// Giudecca walkable waterfront cluster
const giudeccaIds = [
  'a1e05a70-b3bf-46e6-8ff3-b111ed52d628',
  '78f53b42-46c1-432f-a75e-9230d94c0533',
  '8450e147-f002-40e5-ba89-240084641890',
  'e03437b0-4c76-4b4e-9863-4de967bb8e65',
  'cdce3168-2a4e-48e7-8ae7-eb6bf8ea53e0',
  '2e1ba89e-63d6-4cbe-995d-7a4a6d4aa127',
  '11598798-62cd-44b9-8950-2083045ee5ef',
];

const westernMetrics = buildTrailStops(westernIds);
const centralMetrics = buildTrailStops(centralIds);
const easternMetrics = buildTrailStops(easternIds);
const sanMarcoMetrics = buildTrailStops(sanMarcoIds);
const sanPoloMetrics = buildTrailStops(sanPoloIds);
const giudeccaMetrics = buildTrailStops(giudeccaIds);

export const CURATED_TRAILS: CuratedTrail[] = [
  {
    id: 'dorsoduro-central-survey',
    number: 'TRAIL 01',
    title: 'Dorsoduro Central Survey Walk',
    description:
      'Pedestrian route linking 9 Survey123-recorded statues and reliefs across central Dorsoduro.',
    distanceKm: centralMetrics.totalKm,
    estimatedMinutes: centralMetrics.estimatedMinutes,
    stopsCount: centralMetrics.stops.length,
    imageUrl: MONUMENTS.find((m) => m.id === '3bcff81f-b529-4252-9aed-70761d5e57dc')?.imageUrl || MONUMENTS[0].imageUrl,
    featuredBadge: 'Dorsoduro Dataset',
    tags: ['Dorsoduro', 'Statues & Reliefs', 'Survey123'],
    sestieriCovered: ['Dorsoduro'],
    vaporettoAccessStop: 'San Basilio / Zattere (Dorsoduro)',
    stops: centralMetrics.stops,
  },
  {
    id: 'dorsoduro-west-survey',
    number: 'TRAIL 02',
    title: 'Western Dorsoduro Artworks',
    description:
      'Walking loop covering 8 documented statues and facade reliefs in western Dorsoduro.',
    distanceKm: westernMetrics.totalKm,
    estimatedMinutes: westernMetrics.estimatedMinutes,
    stopsCount: westernMetrics.stops.length,
    imageUrl: MONUMENTS.find((m) => m.id === '92d275d8-5125-4f64-8977-bb560027a30a')?.imageUrl || MONUMENTS[0].imageUrl,
    tags: ['Dorsoduro', 'Statues', 'Reliefs'],
    sestieriCovered: ['Dorsoduro'],
    vaporettoAccessStop: 'San Basilio (Dorsoduro)',
    stops: westernMetrics.stops,
  },
  {
    id: 'dorsoduro-east-survey',
    number: 'TRAIL 03',
    title: 'Eastern Dorsoduro Reliefs',
    description:
      'Explore 8 Survey123 sites in eastern Dorsoduro, including multi-relief facades noted in the field.',
    distanceKm: easternMetrics.totalKm,
    estimatedMinutes: easternMetrics.estimatedMinutes,
    stopsCount: easternMetrics.stops.length,
    imageUrl: MONUMENTS.find((m) => m.id === 'baff92f1-e03f-4e8f-bcf2-7ad1b85cf051')?.imageUrl || MONUMENTS[0].imageUrl,
    tags: ['Dorsoduro', 'Reliefs', 'Field Notes'],
    sestieriCovered: ['Dorsoduro'],
    vaporettoAccessStop: 'Zattere (Dorsoduro)',
    stops: easternMetrics.stops,
  },
  {
    id: 'san-marco-central-survey',
    number: 'TRAIL 04',
    title: 'San Marco Heritage Circuit',
    description:
      'Pedestrian survey walk connecting 7 documented statues and reliefs in central San Marco.',
    distanceKm: sanMarcoMetrics.totalKm,
    estimatedMinutes: sanMarcoMetrics.estimatedMinutes,
    stopsCount: sanMarcoMetrics.stops.length,
    imageUrl: MONUMENTS.find((m) => m.id === sanMarcoIds[0])?.imageUrl || '',
    featuredBadge: 'San Marco',
    tags: ['San Marco', 'Statues & Reliefs', 'Survey123'],
    sestieriCovered: ['San Marco'],
    vaporettoAccessStop: 'San Marco Vallaresso / Rialto',
    stops: sanMarcoMetrics.stops,
  },
  {
    id: 'san-polo-central-survey',
    number: 'TRAIL 05',
    title: 'San Polo Calli & Campi Walk',
    description:
      'Walkable 7-stop route through San Polo connecting surveyed public statues and facade reliefs.',
    distanceKm: sanPoloMetrics.totalKm,
    estimatedMinutes: sanPoloMetrics.estimatedMinutes,
    stopsCount: sanPoloMetrics.stops.length,
    imageUrl: MONUMENTS.find((m) => m.id === sanPoloIds[0])?.imageUrl || '',
    featuredBadge: 'San Polo',
    tags: ['San Polo', 'Statues & Reliefs', 'Survey123'],
    sestieriCovered: ['San Polo'],
    vaporettoAccessStop: 'San Silvestro / Rialto Mercato',
    stops: sanPoloMetrics.stops,
  },
  {
    id: 'giudecca-waterfront-survey',
    number: 'TRAIL 06',
    title: 'Giudecca Canal Survey Walk',
    description:
      'Explore 7 Survey123-recorded reliefs along the Giudecca waterfront and interior fondamente.',
    distanceKm: giudeccaMetrics.totalKm,
    estimatedMinutes: giudeccaMetrics.estimatedMinutes,
    stopsCount: giudeccaMetrics.stops.length,
    imageUrl: MONUMENTS.find((m) => m.id === giudeccaIds[0])?.imageUrl || '',
    featuredBadge: 'Giudecca Island',
    tags: ['Giudecca', 'Reliefs', 'Survey123'],
    sestieriCovered: ['Guidecca'],
    vaporettoAccessStop: 'Palanca / Redentore (Giudecca)',
    stops: giudeccaMetrics.stops,
  },
];
