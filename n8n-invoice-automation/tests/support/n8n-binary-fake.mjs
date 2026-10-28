// A small model of n8n's binary storage, used only by the local tests. It is NOT n8n.
// It follows the behaviour read in n8n-core 1.120.x (binary-helper-functions.js, file-system.manager.js) and in
// n8n's binary-data controller:
// - prepareBinaryData(bytes, filePath, mimeType) stores the bytes and writes the name and MIME type into the
//   stored metadata, once, at store time. The returned binary gets an `id`.
// - When a binary has an `id`, the download name comes from that stored metadata, not from the `fileName` field
//   of the item. The browser's `fileName` query value is overridden by the server.
// - A binary without an `id` (default binary mode) is downloaded from its own base64 data and `fileName`.
// The real n8n UI behaviour still has to be checked in n8n (see README, "Verification in n8n").
import { randomUUID } from 'node:crypto';
import { parse } from 'node:path';

export function createFakeN8nBinaryStore() {
  const bytesById = new Map();
  const metadataById = new Map();
  let storeCalls = 0;

  function store(bytes, filePath, mimeType) {
    const buffer = Buffer.from(bytes);
    const parts = parse(filePath);
    const id = `filesystem-v2:workflow/execution/${randomUUID()}`;
    bytesById.set(id, buffer);
    metadataById.set(id, { fileName: parts.base, mimeType, fileSize: String(buffer.length) });
    storeCalls += 1;
    return {
      data: '',
      id,
      mimeType,
      fileName: parts.base,
      fileExtension: parts.ext.slice(1) || undefined,
      fileSize: String(buffer.length),
    };
  }

  return {
    // Helpers as the Code node sees them, bound to one input item.
    helpersFor(item) {
      return {
        async getBinaryDataBuffer(itemIndex, propertyName) {
          if (itemIndex !== 0) throw new Error(`fake store only supports item 0, got ${itemIndex}`);
          const binary = item.binary?.[propertyName];
          if (!binary) throw new Error(`no binary property "${propertyName}"`);
          return binary.id ? bytesById.get(binary.id) : Buffer.from(binary.data, 'base64');
        },
        async prepareBinaryData(bytes, filePath, mimeType) {
          return store(bytes, filePath, mimeType);
        },
      };
    },
    // Creates the binary of a UsePDFMaker output item, the way the community node does (name "output.pdf", no fileExtension).
    usePdfMakerItem(bytes) {
      const binary = store(bytes, 'output.pdf', 'application/pdf');
      delete binary.fileExtension;
      return { json: { success: true, operation: 'htmlToPdf' }, binary: { data: binary } };
    },
    // The name the browser download gets, following the server rule described above.
    downloadName(binary) {
      return binary.id ? metadataById.get(binary.id).fileName : binary.fileName;
    },
    downloadMimeType(binary) {
      return binary.id ? metadataById.get(binary.id).mimeType : binary.mimeType;
    },
    readBytes(binary) {
      return binary.id ? bytesById.get(binary.id) : Buffer.from(binary.data, 'base64');
    },
    storedMetadata(binary) {
      return binary.id ? metadataById.get(binary.id) : undefined;
    },
    get storeCalls() {
      return storeCalls;
    },
  };
}

// A minimal PDF-looking byte sequence (not a valid PDF document, but starts with %PDF like UsePDFMaker output).
export const SAMPLE_PDF_BYTES = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< >>\nendobj\n%%EOF\n', 'latin1');
