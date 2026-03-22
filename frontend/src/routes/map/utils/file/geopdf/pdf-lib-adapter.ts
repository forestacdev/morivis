/**
 * Adapter to bridge pdf-lib's PDFDocument to the PDFDict/PDFValue interface
 * used by geopdf-parser.
 *
 * pdf-lib exposes low-level PDF objects via its `context` API, which is
 * sufficient for reading GeoPDF dictionary structures.
 *
 * Usage:
 *   import { PDFDocument } from 'pdf-lib';
 *   import { wrapPage } from './pdf-lib-adapter';
 *   import { parseGeoPDF } from './geopdf-parser';
 *
 *   const doc = await PDFDocument.load(buffer);
 *   const page = doc.getPage(0);
 *   const pageDict = wrapPage(page);
 *   const info = parseGeoPDF(pageDict);
 */

import {
  PDFDocument,
  PDFPage,
  PDFDict as PdfLibDict,
  PDFArray as PdfLibArray,
  PDFName,
  PDFNumber,
  PDFString,
  PDFHexString,
  PDFBool,
  PDFNull,
  PDFRef,
  PDFRawStream,
  PDFStream,
  PDFObject,
  decodePDFRawStream,
} from "pdf-lib";

import type {
  PDFDict,
  PDFArray,
  PDFValue,
  PDFValueType,
} from "./geopdf-parser";

function resolveRef(obj: PDFObject, context: any): PDFObject {
  if (obj instanceof PDFRef) {
    return context.lookup(obj) ?? obj;
  }
  return obj;
}

function wrapPDFObject(raw: PDFObject, context: any): PDFValue | undefined {
  const obj = resolveRef(raw, context);
  if (!obj || obj === PDFNull) return undefined;

  if (obj instanceof PDFName) {
    const name = obj.decodeText();
    return {
      type: "name" as PDFValueType,
      asName: () => name,
      asString: () => name,
      asNumber: () => parseFloat(name) || 0,
      asArray: () => {
        throw new Error("Not an array");
      },
      asDict: () => {
        throw new Error("Not a dict");
      },
    };
  }

  if (obj instanceof PDFNumber) {
    const n = obj.asNumber();
    return {
      type: (Number.isInteger(n) ? "int" : "real") as PDFValueType,
      asName: () => String(n),
      asString: () => String(n),
      asNumber: () => n,
      asArray: () => {
        throw new Error("Not an array");
      },
      asDict: () => {
        throw new Error("Not a dict");
      },
    };
  }

  if (obj instanceof PDFString || obj instanceof PDFHexString) {
    const s = obj.decodeText();
    return {
      type: "string" as PDFValueType,
      asName: () => s,
      asString: () => s,
      asNumber: () => parseFloat(s) || 0,
      asArray: () => {
        throw new Error("Not an array");
      },
      asDict: () => {
        throw new Error("Not a dict");
      },
    };
  }

  if (obj instanceof PDFBool) {
    return {
      type: "bool" as PDFValueType,
      asName: () => String(obj.asBoolean()),
      asString: () => String(obj.asBoolean()),
      asNumber: () => (obj.asBoolean() ? 1 : 0),
      asArray: () => {
        throw new Error("Not an array");
      },
      asDict: () => {
        throw new Error("Not a dict");
      },
    };
  }

  if (obj instanceof PdfLibArray) {
    return {
      type: "array" as PDFValueType,
      asName: () => {
        throw new Error("Not a name");
      },
      asString: () => {
        throw new Error("Not a string");
      },
      asNumber: () => {
        throw new Error("Not a number");
      },
      asArray: () => wrapPDFArray(obj, context),
      asDict: () => {
        throw new Error("Not a dict");
      },
    };
  }

  if (obj instanceof PdfLibDict || obj instanceof PDFStream || obj instanceof PDFRawStream) {
    const dict = obj instanceof PdfLibDict ? obj : (obj as any).dict;
    return {
      type: "dict" as PDFValueType,
      asName: () => {
        throw new Error("Not a name");
      },
      asString: () => {
        throw new Error("Not a string");
      },
      asNumber: () => {
        throw new Error("Not a number");
      },
      asArray: () => {
        throw new Error("Not an array");
      },
      asDict: () => wrapPDFDict(dict, context),
    };
  }

  return undefined;
}

function wrapPDFArray(arr: PdfLibArray, context: any): PDFArray {
  return {
    length: arr.size(),
    get(index: number): PDFValue | undefined {
      const raw = arr.get(index);
      if (!raw) return undefined;
      return wrapPDFObject(raw, context);
    },
  };
}

function wrapPDFDict(dict: PdfLibDict, context: any): PDFDict {
  return {
    get(key: string): PDFValue | undefined {
      const raw = dict.get(PDFName.of(key));
      if (!raw) return undefined;
      return wrapPDFObject(raw, context);
    },
    keys(): string[] {
      const entries = dict.entries();
      return entries.map(([name]) => name.decodeText());
    },
  };
}

/**
 * Wrap a pdf-lib PDFPage into a PDFDict that geopdf-parser can consume.
 */
export function wrapPage(page: PDFPage): PDFDict {
  const node = page.node;
  const context = (page as any).doc?.context ?? node.context;
  return wrapPDFDict(node, context);
}

/**
 * High-level convenience: load a PDF buffer and extract GeoPDF info from page 0.
 */
export async function parseGeoPDFFromBuffer(
  buffer: ArrayBuffer | Uint8Array,
  pageIndex = 0
) {
  const { parseGeoPDF } = await import("./geopdf-parser");
  const doc = await PDFDocument.load(buffer);
  const page = doc.getPage(pageIndex);
  const pageDict = wrapPage(page);
  return parseGeoPDF(pageDict);
}

/**
 * PDFページのcontent streamをデコードして文字列として返す。
 * また、ページサイズ（MediaBox）も返す。
 */
export async function extractContentStream(
  buffer: ArrayBuffer | Uint8Array,
  pageIndex = 0
): Promise<{ content: string; pageWidth: number; pageHeight: number }> {
  const doc = await PDFDocument.load(buffer);
  const page = doc.getPage(pageIndex);
  const node = page.node;
  const context = doc.context;

  // MediaBox からページサイズ取得
  const mediaBox = node.MediaBox();
  const pageWidth = mediaBox.lookup(2, PDFNumber).asNumber() - mediaBox.lookup(0, PDFNumber).asNumber();
  const pageHeight = mediaBox.lookup(3, PDFNumber).asNumber() - mediaBox.lookup(1, PDFNumber).asNumber();

  // Contents 取得（単一ストリームまたは配列）
  const contentsRef = node.get(PDFName.of("Contents"));
  if (!contentsRef) return { content: "", pageWidth, pageHeight };

  const decoder = new TextDecoder("utf-8");
  let content = "";

  const decodeStream = (obj: PDFObject): string => {
    if (obj instanceof PDFRawStream) {
      const decoded = decodePDFRawStream(obj);
      return decoder.decode(decoded.decode());
    }
    return "";
  };

  const resolved = contentsRef instanceof PDFRef ? context.lookup(contentsRef) : contentsRef;

  if (resolved instanceof PDFRawStream || resolved instanceof PDFStream) {
    content = decodeStream(resolved as PDFRawStream);
  } else if (resolved instanceof PdfLibArray) {
    for (let i = 0; i < resolved.size(); i++) {
      const item = resolved.get(i);
      const obj = item instanceof PDFRef ? context.lookup(item) : item;
      if (obj instanceof PDFRawStream) {
        content += decodeStream(obj);
      }
    }
  }

  return { content, pageWidth, pageHeight };
}
