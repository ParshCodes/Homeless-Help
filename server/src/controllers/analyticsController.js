import Scan from '../models/Scan.js';
import Person from '../models/Person.js';

const HOUR_IN_MS = 3_600_000;
const SIX_HOURS_IN_MS = 6 * HOUR_IN_MS;

const DEMO_COORDS = [
  { lat: 32.7157, lon: -117.1611 },
  { lat: 32.7353, lon: -117.149 },
  { lat: 32.7482, lon: -117.213 },
  { lat: 32.7074, lon: -117.1581 },
  { lat: 32.7792, lon: -117.13 },
];

const buildDemoRegistrationEvents = () =>
  DEMO_COORDS.map((coords, index) => ({
    _id: `demo-registration-${index + 1}`,
    type: 'Registration',
    coords,
    timestamp: new Date(Date.now() - index * HOUR_IN_MS).toISOString(),
    name: `Demo Resident ${index + 1}`,
    address: 'San Diego, CA',
    barcodeId: `DEMO-${index + 1}`,
  }));

const buildDemoScanEvents = () =>
  DEMO_COORDS.map((coords, index) => ({
    _id: `demo-scan-${index + 1}`,
    type: index % 2 === 0 ? 'Outreach' : 'Wellness Check',
    coords,
    timestamp: new Date(Date.now() - index * SIX_HOURS_IN_MS).toISOString(),
    name: `Demo Outreach ${index + 1}`,
    address: 'Downtown San Diego',
    barcodeId: `SCAN-${index + 1}`,
  }));

const normalizeCoordinate = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const resolveLocationCoords = (location = {}) => {
  if (!location || typeof location !== 'object') {
    return null;
  }

  if (Array.isArray(location.coordinates) && location.coordinates.length === 2) {
    const [maybeLon, maybeLat] = location.coordinates;
    const lat = normalizeCoordinate(maybeLat);
    const lon = normalizeCoordinate(maybeLon);

    if (lat !== null && lon !== null) {
      return { lat, lon, address: location.address };
    }
  }

  const lat = normalizeCoordinate(location.lat ?? location.latitude);
  const lon = normalizeCoordinate(location.lon ?? location.lng ?? location.longitude);

  if (lat !== null && lon !== null) {
    return { lat, lon, address: location.address };
  }

  return null;
};

export async function getMetrics(req, res) {
  try {
    const scanCount = await Scan.countDocuments();
    res.json({ scanCount });
  } catch (error) {
    console.error('Failed to load analytics metrics', error);
    res.json({ scanCount: 0 });
  }
}

export async function getRegistrationEvents(req, res) {
  try {
    const people = await Person.find({
      $or: [
        { 'location.coordinates.0': { $exists: true } },
        { 'location.lat': { $exists: true } },
        { 'location.latitude': { $exists: true } },
      ],
    })
      .select({
        name: 1,
        location: 1,
        createdAt: 1,
        barcodeId: 1,
      })
      .lean();

    const registrations = people
      .map((person) => {
        const resolved = resolveLocationCoords(person.location);

        if (!resolved) {
          return null;
        }

        return {
          _id: person._id,
          type: 'Registration',
          coords: {
            lat: resolved.lat,
            lon: resolved.lon,
          },
          timestamp: person.createdAt,
          name: person.name,
          address: resolved.address,
          barcodeId: person.barcodeId,
        };
      })
      .filter(Boolean);

    res.json({ registrations: registrations.length ? registrations : buildDemoRegistrationEvents() });
  } catch (error) {
    console.error('Failed to load registration analytics', error);
    res.json({ registrations: buildDemoRegistrationEvents() });
  }
}

export async function getScanEvents(req, res) {
  try {
    const limit = Number.parseInt(req.query.limit, 10);
    const boundedLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 500) : 200;

    const scans = await Scan.find({
      $or: [
        {
          'coords.lat': { $ne: null },
          'coords.lon': { $ne: null },
        },
        {
          'coords.latitude': { $ne: null },
          'coords.longitude': { $ne: null },
        },
        {
          'coords.lat': { $ne: null },
          'coords.lng': { $ne: null },
        },
        {
          'location.coordinates.0': { $exists: true },
          'location.coordinates.1': { $exists: true },
        },
      ],
    })
      .sort({ timestamp: -1 })
      .limit(boundedLimit)
      .lean();

    const personIds = [
      ...new Set(
        scans
          .map((scan) => scan.user_id)
          .filter((value) => Boolean(value))
          .map((value) => value.toString())
      ),
    ];

    const people = personIds.length
      ? await Person.find({ _id: { $in: personIds } })
          .select({ name: 1, barcodeId: 1, location: 1 })
          .lean()
      : [];

    const peopleById = new Map(people.map((person) => [person._id.toString(), person]));

    const events = scans
      .map((scan) => {
        const coords = scan.coords || {};
        const normalizedCoords = resolveLocationCoords({
          coordinates: Array.isArray(coords.coordinates) ? coords.coordinates : undefined,
          lat: coords.lat ?? coords.latitude,
          lon: coords.lon ?? coords.lng ?? coords.longitude,
          address: coords.address,
        });

        const locationCoords = scan.location ? resolveLocationCoords(scan.location) : null;

        const personId = scan.user_id ? scan.user_id.toString() : null;
        const person = personId ? peopleById.get(personId) : null;

        const coordsFromPerson = person ? resolveLocationCoords(person.location) : null;
        const finalCoords = normalizedCoords || locationCoords || coordsFromPerson;

        const finalAddress =
          normalizedCoords?.address || locationCoords?.address || coordsFromPerson?.address || person?.location?.address;

        if (!finalCoords) {
          return null;
        }

        return {
          _id: scan._id,
          type: scan.role || scan.type || 'Outreach',
          coords: {
            lat: finalCoords.lat,
            lon: finalCoords.lon,
          },
          timestamp: scan.timestamp || scan.createdAt,
          personId: scan.user_id,
          name: person?.name,
          barcodeId: person?.barcodeId,
          address: finalAddress,
          role: scan.role,
        };
      })
      .filter(Boolean);

    res.json({ scans: events.length ? events : buildDemoScanEvents() });
  } catch (error) {
    console.error('Failed to load scan analytics', error);
    res.json({ scans: buildDemoScanEvents() });
  }
}
