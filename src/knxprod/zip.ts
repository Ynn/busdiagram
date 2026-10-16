// Reading of a ZIP archive (a .knxprod or .knxproj file): its entries, stored or deflated,
// inflated with the platform's DecompressionStream. No dependency, browser and Node 18+.
// An entry outside the archive, larger than it says or than MAX_ENTRY once inflated,
// and two entries of the same name are refused.

export interface ZipEntry {
  name: string;
  /** Uncompressed bytes. */
  read(): Promise<Uint8Array>;
}

/** Largest entry once inflated (a product catalog holds large application programs). */
export const MAX_ENTRY = 512 * 1024 * 1024;

const u16 = (b: Uint8Array, o: number) => (b[o] ?? 0) | ((b[o + 1] ?? 0) << 8);
const u32 = (b: Uint8Array, o: number) =>
  (b[o]! | (b[o + 1]! << 8) | (b[o + 2]! << 16) | (b[o + 3]! << 24)) >>> 0;

/** Inflate an entry, no further than the size it announces. */
async function inflate(
  data: Uint8Array,
  size: number,
  name: string,
): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate-raw");
  const reader = new Blob([data as BlobPart])
    .stream()
    .pipeThrough(ds)
    .getReader();
  const out = new Uint8Array(size);
  let at = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (at + value.length > size) {
      await reader.cancel();
      throw new Error(`${name}: larger than the archive says`);
    }
    out.set(value, at);
    at += value.length;
  }
  if (at !== size) throw new Error(`${name}: shorter than the archive says`);
  return out;
}

/** Entries of a ZIP archive, from its central directory. */
export function readZip(bytes: Uint8Array): ZipEntry[] {
  // End of central directory: the last "PK\x05\x06" (a comment can follow it).
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (u32(bytes, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  if (eocd < 0) throw new Error("not a ZIP archive");
  const count = u16(bytes, eocd + 10);
  let p = u32(bytes, eocd + 16);
  const out: ZipEntry[] = [];
  const seen = new Set<string>();
  const names = new TextDecoder();
  for (let k = 0; k < count; k++) {
    if (u32(bytes, p) !== 0x02014b50) throw new Error("corrupt ZIP directory");
    const method = u16(bytes, p + 10);
    const size = u32(bytes, p + 20);
    const inflated = u32(bytes, p + 24);
    const nameLen = u16(bytes, p + 28);
    const extraLen = u16(bytes, p + 30);
    const commentLen = u16(bytes, p + 32);
    const local = u32(bytes, p + 42);
    const name = names.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    if (name.endsWith("/")) continue;
    const path = name.replace(/\\/g, "/");
    if (seen.has(path)) throw new Error(`${path}: twice in the archive`);
    seen.add(path);
    if (inflated > MAX_ENTRY) throw new Error(`${path}: too large`);
    out.push({
      name: path,
      read: async () => {
        const start =
          local + 30 + u16(bytes, local + 26) + u16(bytes, local + 28);
        if (u32(bytes, local) !== 0x04034b50 || start + size > bytes.length)
          throw new Error(`${path}: outside the archive`);
        const data = bytes.subarray(start, start + size);
        if (method === 0) return data;
        if (method === 8) return inflate(data, inflated, path);
        throw new Error(`${name}: compression method ${method} not supported`);
      },
    });
  }
  return out;
}

/** Text of an entry (UTF-8, BOM removed). */
export async function readText(e: ZipEntry): Promise<string> {
  const t = new TextDecoder("utf-8").decode(await e.read());
  return t.charCodeAt(0) === 0xfeff ? t.slice(1) : t;
}
