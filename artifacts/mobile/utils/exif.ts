/**
 * Real EXIF parsing utilities for Android and iOS.
 *
 * expo-image-picker returns raw EXIF as a flat Record<string,unknown>.
 * GPS values come back differently depending on platform and image source:
 *   - iOS: GPSLatitude/GPSLongitude as decimal numbers (already converted)
 *   - Android: GPSLatitude as a "deg,min,sec" string like "37/1,26/1,42.6/1"
 *              or as an array [degrees, minutes, seconds]
 */

export interface ParsedGps {
  latitude: number;
  longitude: number;
  altitude?: number;
}

export interface ParsedExif {
  gps?: ParsedGps;
  deviceMake?: string;
  deviceModel?: string;
  capturedAt?: string;
  isoSpeed?: number;
  focalLength?: number;
  aperture?: number;
  exposureTime?: string;
  orientation?: number;
  imageWidth?: number;
  imageHeight?: number;
}

function rationalToDecimal(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    // Android EXIF rational: "37/1" or "26/1" or "42600/1000"
    if (value.includes("/")) {
      const [num, den] = value.split("/").map(Number);
      if (!den || isNaN(num!) || isNaN(den)) return null;
      return num! / den;
    }
    const n = parseFloat(value);
    return isNaN(n) ? null : n;
  }
  if (Array.isArray(value) && value.length >= 2) {
    const [num, den] = value as [number, number];
    if (!den) return null;
    return num / den;
  }
  return null;
}

function dmsToDecimal(
  degrees: unknown,
  minutes: unknown,
  seconds: unknown,
): number | null {
  const d = rationalToDecimal(degrees);
  const m = rationalToDecimal(minutes);
  const s = rationalToDecimal(seconds);
  if (d === null || m === null || s === null) return null;
  return d + m / 60 + s / 3600;
}

function parseAndroidDmsString(str: string): number | null {
  // e.g. "37/1,26/1,42600/1000" → degrees=37, minutes=26, seconds=42.6
  const parts = str.split(",").map((p) => p.trim());
  if (parts.length !== 3) return null;
  return dmsToDecimal(parts[0], parts[1], parts[2]);
}

export function parseGps(exif: Record<string, unknown>): ParsedGps | null {
  // Lat/lng can live under GPSLatitude or GPS.GPSLatitude
  const lat =
    exif["GPSLatitude"] ??
    exif["GPS.GPSLatitude"] ??
    (exif["GPS"] as Record<string, unknown> | undefined)?.["GPSLatitude"];
  const lng =
    exif["GPSLongitude"] ??
    exif["GPS.GPSLongitude"] ??
    (exif["GPS"] as Record<string, unknown> | undefined)?.["GPSLongitude"];
  const latRef =
    (exif["GPSLatitudeRef"] as string | undefined) ??
    (exif["GPS.GPSLatitudeRef"] as string | undefined) ??
    "N";
  const lngRef =
    (exif["GPSLongitudeRef"] as string | undefined) ??
    (exif["GPS.GPSLongitudeRef"] as string | undefined) ??
    "E";

  if (lat == null || lng == null) return null;

  let latDec: number | null;
  let lngDec: number | null;

  if (typeof lat === "string" && lat.includes(",")) {
    latDec = parseAndroidDmsString(lat);
  } else if (Array.isArray(lat) && lat.length === 3) {
    latDec = dmsToDecimal(lat[0], lat[1], lat[2]);
  } else {
    latDec = rationalToDecimal(lat);
  }

  if (typeof lng === "string" && lng.includes(",")) {
    lngDec = parseAndroidDmsString(lng);
  } else if (Array.isArray(lng) && lng.length === 3) {
    lngDec = dmsToDecimal(lng[0], lng[1], lng[2]);
  } else {
    lngDec = rationalToDecimal(lng);
  }

  if (latDec === null || lngDec === null) return null;
  if (isNaN(latDec) || isNaN(lngDec)) return null;
  if (latDec === 0 && lngDec === 0) return null;

  if (latRef === "S" || latRef === "s") latDec = -latDec;
  if (lngRef === "W" || lngRef === "w") lngDec = -lngDec;

  // Parse altitude
  const altRaw =
    exif["GPSAltitude"] ??
    exif["GPS.GPSAltitude"] ??
    (exif["GPS"] as Record<string, unknown> | undefined)?.["GPSAltitude"];
  const altitude = altRaw != null ? (rationalToDecimal(altRaw) ?? undefined) : undefined;

  return { latitude: latDec, longitude: lngDec, altitude };
}

export function parseExif(exif: Record<string, unknown> | null | undefined): ParsedExif {
  if (!exif) return {};

  const result: ParsedExif = {};

  result.gps = parseGps(exif) ?? undefined;

  result.deviceMake =
    (exif["Make"] as string | undefined) ??
    (exif["make"] as string | undefined);
  result.deviceModel =
    (exif["Model"] as string | undefined) ??
    (exif["model"] as string | undefined);

  // Capture time: prefer DateTimeOriginal, fallback to DateTime
  const dt =
    (exif["DateTimeOriginal"] as string | undefined) ??
    (exif["DateTime"] as string | undefined);
  if (dt) {
    // EXIF format: "2024:01:15 14:30:00" → ISO format
    result.capturedAt = dt.replace(
      /^(\d{4}):(\d{2}):(\d{2}) /,
      "$1-$2-$3T",
    );
  }

  const iso = exif["ISOSpeedRatings"] ?? exif["ISO"];
  if (iso != null) {
    const v = Array.isArray(iso) ? (iso[0] as unknown) : iso;
    result.isoSpeed = typeof v === "number" ? v : undefined;
  }

  const fl = rationalToDecimal(exif["FocalLength"]);
  if (fl !== null) result.focalLength = fl;

  const fnRaw = exif["FNumber"] ?? exif["ApertureValue"];
  const fn = rationalToDecimal(fnRaw);
  if (fn !== null) result.aperture = fn;

  const expRaw = exif["ExposureTime"];
  if (expRaw != null) {
    const expNum = rationalToDecimal(expRaw);
    if (expNum !== null) {
      result.exposureTime =
        expNum < 1 ? `1/${Math.round(1 / expNum)}s` : `${expNum}s`;
    }
  }

  const orient = exif["Orientation"];
  if (typeof orient === "number") result.orientation = orient;

  const w =
    exif["PixelXDimension"] ??
    exif["ImageWidth"] ??
    exif["ExifImageWidth"];
  const h =
    exif["PixelYDimension"] ??
    exif["ImageHeight"] ??
    exif["ExifImageHeight"];
  if (typeof w === "number") result.imageWidth = w;
  if (typeof h === "number") result.imageHeight = h;

  return result;
}

export function formatCoordinate(
  lat: number,
  lng: number,
): string {
  const latStr = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}`;
  const lngStr = `${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? "E" : "W"}`;
  return `${latStr}, ${lngStr}`;
}
