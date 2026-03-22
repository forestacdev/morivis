/**
 * GeoPDF Parser for TypeScript
 *
 * Extracts geospatial information from GeoPDF files.
 * Supports two encoding styles:
 *   1. OGC Encoding Best Practice (LGIDict) - used by USGS, TerraGo
 *   2. ISO 32000 Extension (VP/Measure) - Adobe Geospatial PDF
 *
 * Based on GDAL's PDF driver implementation (frmts/pdf/pdfdataset.cpp).
 *
 * Dependencies:
 *   - pdf-lib (PDF parsing)
 *   - proj4 (coordinate reprojection, optional)
 */

// ============================================================
// Types
// ============================================================

export interface GeoTransform {
  /** X origin (top-left corner geo X) */
  originX: number;
  /** Pixel width (X resolution) */
  pixelWidth: number;
  /** Rotation (row rotation) */
  rotationX: number;
  /** Y origin (top-left corner geo Y) */
  originY: number;
  /** Rotation (column rotation) */
  rotationY: number;
  /** Pixel height (Y resolution, typically negative) */
  pixelHeight: number;
}

export interface GCP {
  /** Pixel coordinate (column) */
  pixel: number;
  /** Line coordinate (row) */
  line: number;
  /** Geographic X (easting or longitude) */
  x: number;
  /** Geographic Y (northing or latitude) */
  y: number;
}

export interface Neatline {
  /** Ring of [x, y] coordinates in PDF page space or geo space */
  coordinates: [number, number][];
}

export interface GeoPDFInfo {
  /** Spatial reference as WKT, EPSG code, or datum string */
  srs: SRSInfo;
  /** Affine geo transform (if computable) */
  geoTransform?: GeoTransform;
  /** Ground control points */
  gcps: GCP[];
  /** Neatline boundary */
  neatline?: Neatline;
  /** VP BBox in PDF page coordinates [x1, y1, x2, y2] (ISO32000 only) */
  vpBbox?: [number, number, number, number];
  /** CTM from LGIDict (OGC BP only) */
  ctm?: number[];
  /** Which encoding style was found */
  encoding: "OGC_BP" | "ISO32000" | "unknown";
}

export interface SRSInfo {
  wkt?: string;
  epsg?: number;
  datum?: string;
  type?: string;
}

// ============================================================
// PDF dictionary access helpers
// ============================================================

/**
 * Generic interface for accessing PDF dictionary values.
 * Implement this to wrap your PDF library's dictionary access.
 */
export interface PDFDict {
  get(key: string): PDFValue | undefined;
  keys(): string[];
}

export interface PDFArray {
  length: number;
  get(index: number): PDFValue | undefined;
}

export type PDFValueType =
  | "name"
  | "string"
  | "int"
  | "real"
  | "array"
  | "dict"
  | "bool"
  | "null";

export interface PDFValue {
  type: PDFValueType;
  asName(): string;
  asString(): string;
  asNumber(): number;
  asArray(): PDFArray;
  asDict(): PDFDict;
}

// ============================================================
// Numeric extraction (matches GDAL's Get() helpers)
// ============================================================

function getNumber(val: PDFValue | undefined): number {
  if (!val) return 0;

  if (val.type === "int" || val.type === "real") {
    return val.asNumber();
  }

  if (val.type === "string") {
    return parseDMSOrNumber(val.asString());
  }

  return 0;
}

function getArrayNumber(arr: PDFArray, index: number): number {
  return getNumber(arr.get(index));
}

function getDictNumber(dict: PDFDict, key: string): number {
  return getNumber(dict.get(key));
}

/**
 * Parse a DMS string like "96 0 0.0W" or a plain number string.
 * Matches GDAL's Get() for PDFObjectType_String.
 */
function parseDMSOrNumber(s: string): number {
  if (!s || s.length === 0) return 0;

  const last = s[s.length - 1];
  if (last === "W" || last === "E" || last === "N" || last === "S") {
    const parts = s.split(/\s+/);
    const deg = parseFloat(parts[0]) || 0;
    const min = parseFloat(parts[1]) || 0;
    const sec = parseFloat(parts[2]) || 0;
    const val = deg + min / 60 + sec / 3600;
    return last === "W" || last === "S" ? -val : val;
  }

  return parseFloat(s) || 0;
}

// ============================================================
// Core parser
// ============================================================

export function parseGeoPDF(pageDict: PDFDict): GeoPDFInfo {
  // Try OGC Encoding Best Practice (LGIDict) first
  const lgiDict = pageDict.get("LGIDict");
  if (lgiDict) {
    const result = parseLGIDict(lgiDict);
    if (result) return result;
  }

  // Try ISO 32000 (VP array in page dictionary)
  const vp = pageDict.get("VP");
  if (vp && vp.type === "array") {
    const mediaBox = pageDict.get("MediaBox");
    let mediaBoxWidth = 612; // default letter
    let mediaBoxHeight = 792;
    if (mediaBox && mediaBox.type === "array") {
      const arr = mediaBox.asArray();
      mediaBoxWidth = getArrayNumber(arr, 2) - getArrayNumber(arr, 0);
      mediaBoxHeight = getArrayNumber(arr, 3) - getArrayNumber(arr, 1);
    }
    const result = parseVP(vp.asArray(), mediaBoxWidth, mediaBoxHeight);
    if (result) return result;
  }

  return {
    srs: {},
    gcps: [],
    encoding: "unknown",
  };
}

// ============================================================
// OGC Encoding Best Practice - LGIDict
// ============================================================

function parseLGIDict(lgiVal: PDFValue): GeoPDFInfo | null {
  if (lgiVal.type === "array") {
    return parseLGIDictArray(lgiVal.asArray());
  } else if (lgiVal.type === "dict") {
    return parseLGIDictSingle(lgiVal.asDict());
  }
  return null;
}

function parseLGIDictArray(arr: PDFArray): GeoPDFInfo | null {
  // Find the best candidate (largest neatline area)
  let bestIndex = -1;
  let maxArea = 0;

  for (let i = 0; i < arr.length; i++) {
    const elt = arr.get(i);
    if (!elt || elt.type !== "dict") return null;
    const dict = elt.asDict();

    const typeVal = dict.get("Type");
    if (!typeVal || typeVal.asName() !== "LGIDict") continue;

    const neatArea = computeNeatlineArea(dict);
    if (neatArea > maxArea || bestIndex < 0) {
      maxArea = neatArea;
      bestIndex = i;
    }
  }

  if (bestIndex < 0) return null;

  const best = arr.get(bestIndex)!.asDict();
  return parseLGIDictSingle(best);
}

function computeNeatlineArea(dict: PDFDict): number {
  const neatline = dict.get("Neatline");
  if (!neatline || neatline.type !== "array") return 0;

  const arr = neatline.asArray();
  const n = arr.length;
  if (n < 4 || n % 2 !== 0) return 0;

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (let i = 0; i < n; i += 2) {
    const x = getArrayNumber(arr, i);
    const y = getArrayNumber(arr, i + 1);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return (maxX - minX) * (maxY - minY);
}

function parseLGIDictSingle(dict: PDFDict): GeoPDFInfo | null {
  // Validate Type
  const typeVal = dict.get("Type");
  if (!typeVal || typeVal.asName() !== "LGIDict") return null;

  // Parse Neatline
  const neatline = parseNeatline(dict);

  // Parse CTM
  const ctm = parseCTM(dict);

  // Parse Registration (GCPs)
  const gcps = parseRegistration(dict);

  if (!ctm && gcps.length === 0) return null;

  // Parse Projection
  const projVal = dict.get("Projection");
  if (!projVal || projVal.type !== "dict") return null;
  const srs = parseProjDict(projVal.asDict());

  // Compute GeoTransform from CTM
  let geoTransform: GeoTransform | undefined;
  if (ctm) {
    // Default (rotation=0) case:
    // GT[0] = CTM[4] + CTM[2]*pageHeight + CTM[0]*pageX1
    // GT[1] = CTM[0] / userUnit
    // GT[2] = -CTM[2] / userUnit
    // GT[3] = CTM[5] + CTM[3]*pageHeight + CTM[1]*pageX1
    // GT[4] = CTM[1] / userUnit
    // GT[5] = -CTM[3] / userUnit
    //
    // Simplified (no rotation, userUnit=1, X1=0):
    geoTransform = {
      originX: ctm[4],
      pixelWidth: ctm[0],
      rotationX: -ctm[2],
      originY: ctm[5],
      rotationY: ctm[1],
      pixelHeight: -ctm[3],
    };
  }

  return {
    srs,
    geoTransform,
    gcps,
    neatline: neatline ?? undefined,
    ctm: ctm ?? undefined,
    encoding: "OGC_BP",
  };
}

function parseNeatline(dict: PDFDict): Neatline | null {
  const neatVal = dict.get("Neatline");
  if (!neatVal || neatVal.type !== "array") return null;

  const arr = neatVal.asArray();
  const n = arr.length;
  if (n < 4 || n % 2 !== 0) return null;

  const coords: [number, number][] = [];

  if (n === 4) {
    // 2 points = bounding box -> expand to 4 corners
    const x1 = getArrayNumber(arr, 0);
    const y1 = getArrayNumber(arr, 1);
    const x2 = getArrayNumber(arr, 2);
    const y2 = getArrayNumber(arr, 3);
    coords.push([x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, y1]);
  } else {
    for (let i = 0; i < n; i += 2) {
      coords.push([getArrayNumber(arr, i), getArrayNumber(arr, i + 1)]);
    }
    // Close ring
    if (
      coords.length > 0 &&
      (coords[0][0] !== coords[coords.length - 1][0] ||
        coords[0][1] !== coords[coords.length - 1][1])
    ) {
      coords.push([...coords[0]]);
    }
  }

  return { coordinates: coords };
}

function parseCTM(dict: PDFDict): number[] | null {
  const ctmVal = dict.get("CTM");
  if (!ctmVal || ctmVal.type !== "array") return null;

  const arr = ctmVal.asArray();
  if (arr.length !== 6) return null;

  const ctm: number[] = [];
  for (let i = 0; i < 6; i++) {
    let v = getArrayNumber(arr, i);
    // Nullify insignificant rotation terms (matches GDAL logic)
    if ((i === 1 || i === 2) && Math.abs(v) < Math.abs(ctm[0] ?? 0) * 1e-10) {
      v = 0;
    }
    ctm.push(v);
  }
  return ctm;
}

function parseRegistration(dict: PDFDict): GCP[] {
  const regVal = dict.get("Registration");
  if (!regVal || regVal.type !== "array") return [];

  const arr = regVal.asArray();
  const gcps: GCP[] = [];

  for (let i = 0; i < arr.length; i++) {
    const gcpVal = arr.get(i);
    if (!gcpVal || gcpVal.type !== "array") continue;
    const gcpArr = gcpVal.asArray();
    if (gcpArr.length !== 4) continue;

    gcps.push({
      pixel: getArrayNumber(gcpArr, 0),
      line: getArrayNumber(gcpArr, 1),
      x: getArrayNumber(gcpArr, 2),
      y: getArrayNumber(gcpArr, 3),
    });
  }

  return gcps;
}

// ============================================================
// Projection dictionary parsing
// ============================================================

/** Well-known datum codes from OGC GeoPDF spec Annex A */
const DATUM_MAP: Record<string, { name: string; epsg?: number }> = {
  WE: { name: "WGS 84", epsg: 4326 },
  WGE: { name: "WGS 84", epsg: 4326 },
  NAR: { name: "NAD83", epsg: 4269 },
  NAS: { name: "NAD27", epsg: 4267 },
  GDS: { name: "GDA94", epsg: 4283 },
};

function parseProjDict(projDict: PDFDict): SRSInfo {
  // Priority 1: WKT string (GDAL extension)
  const wktVal = projDict.get("WKT");
  if (wktVal && wktVal.type === "string") {
    const wkt = wktVal.asString();
    if (wkt.length > 0) {
      return { wkt };
    }
  }

  const srs: SRSInfo = {};

  // Extract Datum
  const datumVal = projDict.get("Datum");
  if (datumVal) {
    if (datumVal.type === "string") {
      const datumCode = datumVal.asString();
      srs.datum = datumCode;

      // Check well-known codes
      const upper = datumCode.toUpperCase();
      const known =
        DATUM_MAP[upper] ??
        Object.entries(DATUM_MAP).find(([k]) =>
          upper.startsWith(k + "-")
        )?.[1];
      if (known?.epsg) {
        srs.epsg = known.epsg;
      }
    } else if (datumVal.type === "dict") {
      // Custom datum with Ellipsoid definition
      const datumDict = datumVal.asDict();
      const descVal = datumDict.get("Description");
      if (descVal) srs.datum = descVal.asString();
    }
  }

  // Extract projection type (e.g., "UTM")
  const projTypeVal = projDict.get("ProjectionType");
  if (projTypeVal && projTypeVal.type === "string") {
    srs.type = projTypeVal.asString();
  }

  return srs;
}

// ============================================================
// ISO 32000 - VP / Measure
// ============================================================

function parseVP(
  vpArray: PDFArray,
  mediaBoxWidth: number,
  mediaBoxHeight: number
): GeoPDFInfo | null {
  // Find largest BBox with Measure.Subtype == "GEO"
  let bestIndex = -1;
  let largestArea = 0;

  for (let i = 0; i < vpArray.length; i++) {
    const elt = vpArray.get(i);
    if (!elt || elt.type !== "dict") return null;
    const d = elt.asDict();

    const measure = d.get("Measure");
    if (!measure || measure.type !== "dict") continue;

    const subtype = measure.asDict().get("Subtype");
    if (!subtype || subtype.asName() !== "GEO") continue;

    const bbox = d.get("BBox");
    if (!bbox || bbox.type !== "array") continue;
    const bArr = bbox.asArray();
    if (bArr.length !== 4) continue;

    const area =
      Math.abs(getArrayNumber(bArr, 2) - getArrayNumber(bArr, 0)) *
      Math.abs(getArrayNumber(bArr, 3) - getArrayNumber(bArr, 1));

    if (area > largestArea) {
      largestArea = area;
      bestIndex = i;
    }
  }

  if (bestIndex < 0) return null;

  const vpElt = vpArray.get(bestIndex)!.asDict();
  const bboxVal = vpElt.get("BBox")!.asArray();

  const rawBboxX1 = getArrayNumber(bboxVal, 0);
  const rawBboxY1 = getArrayNumber(bboxVal, 1);
  const rawBboxX2 = getArrayNumber(bboxVal, 2);
  const rawBboxY2 = getArrayNumber(bboxVal, 3);

  const dfULX = rawBboxX1;
  const dfULY = mediaBoxHeight - rawBboxY1;
  const dfLRX = rawBboxX2;
  const dfLRY = mediaBoxHeight - rawBboxY2;

  const measureVal = vpElt.get("Measure")!;
  const result = parseMeasure(
    measureVal.asDict(),
    mediaBoxWidth,
    mediaBoxHeight,
    dfULX,
    dfULY,
    dfLRX,
    dfLRY
  );
  if (result) {
    // VP BBox in PDF page coordinates (origin=bottom-left)
    result.vpBbox = [rawBboxX1, rawBboxY1, rawBboxX2, rawBboxY2];
  }
  return result;
}

function parseMeasure(
  measureDict: PDFDict,
  mediaBoxWidth: number,
  mediaBoxHeight: number,
  dfULX: number,
  dfULY: number,
  dfLRX: number,
  dfLRY: number
): GeoPDFInfo | null {
  // Verify Subtype == "GEO"
  const subtype = measureDict.get("Subtype");
  if (!subtype || subtype.asName() !== "GEO") return null;

  // Extract GPTS (Geographic Points) - try lgit: prefix first for higher precision
  const gptsVal =
    measureDict.get("lgit:GPTS") ?? measureDict.get("GPTS");
  if (!gptsVal || gptsVal.type !== "array") return null;

  const gptsArr = gptsVal.asArray();
  const gptsLen = gptsArr.length;
  if (gptsLen % 2 !== 0 || gptsLen < 6) return null;

  const gpts: number[] = [];
  for (let i = 0; i < gptsLen; i++) {
    gpts.push(getArrayNumber(gptsArr, i));
  }

  // Extract LPTS (Local Points in page space)
  const lptsVal =
    measureDict.get("lgit:LPTS") ?? measureDict.get("LPTS");
  if (!lptsVal || lptsVal.type !== "array") return null;

  const lptsArr = lptsVal.asArray();
  if (lptsArr.length !== gptsLen) return null;

  const lpts: number[] = [];
  for (let i = 0; i < gptsLen; i++) {
    lpts.push(getArrayNumber(lptsArr, i));
  }

  // Extract GCS (Geographic Coordinate System)
  const gcsVal = measureDict.get("GCS");
  if (!gcsVal || gcsVal.type !== "dict") return null;
  const gcsDict = gcsVal.asDict();

  const srs = parseGCS(gcsDict);

  // Build GCPs: LPTS -> pixel coords, GPTS -> geo coords
  const nPoints = gptsLen / 2;
  const gcps: GCP[] = [];
  const neatlineCoords: [number, number][] = [];

  for (let i = 0; i < nPoints; i++) {
    // LPTS values are typically 0 or 1 (normalized to BBox)
    const lx = lpts[2 * i];
    const ly = lpts[2 * i + 1];

    // Convert from normalized BBox coords to pixel coords
    // (matching GDAL's formula)
    const pixel =
      ((dfULX * (1 - lx) + dfLRX * lx) / mediaBoxWidth) * mediaBoxWidth;
    const line =
      ((dfULY * (1 - ly) + dfLRY * ly) / mediaBoxHeight) * mediaBoxHeight;

    const lat = gpts[2 * i];
    const lon = gpts[2 * i + 1];

    gcps.push({ pixel, line, x: lon, y: lat });
    neatlineCoords.push([lon, lat]);
  }

  // Close neatline ring
  if (neatlineCoords.length >= 3) {
    neatlineCoords.push([...neatlineCoords[0]]);
  }

  // Compute GeoTransform from GCPs (affine least squares)
  const geoTransform = gcpsToGeoTransform(gcps);

  return {
    srs,
    geoTransform: geoTransform ?? undefined,
    gcps,
    neatline:
      neatlineCoords.length >= 4
        ? { coordinates: neatlineCoords }
        : undefined,
    encoding: "ISO32000",
  };
}

function parseGCS(gcsDict: PDFDict): SRSInfo {
  const srs: SRSInfo = {};

  const typeVal = gcsDict.get("Type");
  if (typeVal) srs.type = typeVal.asName();

  const epsgVal = gcsDict.get("EPSG");
  if (epsgVal && (epsgVal.type === "int" || epsgVal.type === "real")) {
    srs.epsg = epsgVal.asNumber();
  }

  const wktVal = gcsDict.get("WKT");
  if (wktVal && wktVal.type === "string") {
    srs.wkt = wktVal.asString();
  }

  return srs;
}

// ============================================================
// GCPs -> GeoTransform (affine least squares)
// ============================================================

/**
 * Compute a 6-parameter affine GeoTransform from GCPs.
 * Mirrors GDAL's GDALGCPsToGeoTransform().
 *
 * For 3+ GCPs, solves:
 *   X = a0 + a1*pixel + a2*line
 *   Y = b0 + b1*pixel + b2*line
 *
 * Returns null if the system is singular.
 */
export function gcpsToGeoTransform(gcps: GCP[]): GeoTransform | null {
  const n = gcps.length;
  if (n < 3) {
    if (n === 2) return gcpsToGeoTransform2(gcps);
    return null;
  }

  // Build normal equations for least squares
  // A^T A x = A^T b, where A = [[1, pixel, line], ...]
  let s1 = 0,
    sp = 0,
    sl = 0,
    spp = 0,
    sll = 0,
    spl = 0;
  let sx = 0,
    spx = 0,
    slx = 0;
  let sy = 0,
    spy = 0,
    sly = 0;

  for (const g of gcps) {
    s1 += 1;
    sp += g.pixel;
    sl += g.line;
    spp += g.pixel * g.pixel;
    sll += g.line * g.line;
    spl += g.pixel * g.line;
    sx += g.x;
    spx += g.pixel * g.x;
    slx += g.line * g.x;
    sy += g.y;
    spy += g.pixel * g.y;
    sly += g.line * g.y;
  }

  // Solve 3x3 system using Cramer's rule
  // | s1  sp  sl  |   | a0 |   | sx  |
  // | sp  spp spl | * | a1 | = | spx |
  // | sl  spl sll |   | a2 |   | slx |

  const det =
    s1 * (spp * sll - spl * spl) -
    sp * (sp * sll - spl * sl) +
    sl * (sp * spl - spp * sl);

  if (Math.abs(det) < 1e-15) return null;

  const a0 =
    (sx * (spp * sll - spl * spl) -
      sp * (spx * sll - slx * spl) +
      sl * (spx * spl - slx * spp)) /
    det;
  const a1 =
    (s1 * (spx * sll - slx * spl) -
      sx * (sp * sll - spl * sl) +
      sl * (sp * slx - spx * sl)) /
    det;
  const a2 =
    (s1 * (spp * slx - spl * spx) -
      sp * (sp * slx - spx * sl) +
      sx * (sp * spl - spp * sl)) /
    det;

  const b0 =
    (sy * (spp * sll - spl * spl) -
      sp * (spy * sll - sly * spl) +
      sl * (spy * spl - sly * spp)) /
    det;
  const b1 =
    (s1 * (spy * sll - sly * spl) -
      sy * (sp * sll - spl * sl) +
      sl * (sp * sly - spy * sl)) /
    det;
  const b2 =
    (s1 * (spp * sly - spl * spy) -
      sp * (sp * sly - spy * sl) +
      sy * (sp * spl - spp * sl)) /
    det;

  return {
    originX: a0,
    pixelWidth: a1,
    rotationX: a2,
    originY: b0,
    rotationY: b1,
    pixelHeight: b2,
  };
}

/** Special case for exactly 2 GCPs (no rotation) */
function gcpsToGeoTransform2(gcps: GCP[]): GeoTransform | null {
  const [g0, g1] = gcps;
  const dp = g1.pixel - g0.pixel;
  const dl = g1.line - g0.line;

  if (Math.abs(dp) < 1e-15 && Math.abs(dl) < 1e-15) return null;

  if (Math.abs(dp) > Math.abs(dl)) {
    const pw = (g1.x - g0.x) / dp;
    const ph = (g1.y - g0.y) / dp;
    return {
      originX: g0.x - pw * g0.pixel,
      pixelWidth: pw,
      rotationX: 0,
      originY: g0.y - ph * g0.pixel,
      rotationY: 0,
      pixelHeight: ph,
    };
  } else {
    const pw = (g1.x - g0.x) / dl;
    const ph = (g1.y - g0.y) / dl;
    return {
      originX: g0.x - pw * g0.line,
      pixelWidth: 0,
      rotationX: pw,
      originY: g0.y - ph * g0.line,
      rotationY: ph,
      pixelHeight: 0,
    };
  }
}

// ============================================================
// Convenience: pixel/line <-> geo coordinate conversion
// ============================================================

export function pixelToGeo(
  gt: GeoTransform,
  pixel: number,
  line: number
): { x: number; y: number } {
  return {
    x: gt.originX + gt.pixelWidth * pixel + gt.rotationX * line,
    y: gt.originY + gt.rotationY * pixel + gt.pixelHeight * line,
  };
}

export function geoToPixel(
  gt: GeoTransform,
  x: number,
  y: number
): { pixel: number; line: number } {
  const det = gt.pixelWidth * gt.pixelHeight - gt.rotationX * gt.rotationY;
  if (Math.abs(det) < 1e-15) {
    throw new Error("Singular GeoTransform, cannot invert");
  }
  const dx = x - gt.originX;
  const dy = y - gt.originY;
  return {
    pixel: (gt.pixelHeight * dx - gt.rotationX * dy) / det,
    line: (-gt.rotationY * dx + gt.pixelWidth * dy) / det,
  };
}
