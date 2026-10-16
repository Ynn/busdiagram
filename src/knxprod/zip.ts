// Reading of a ZIP archive (a .knxprod or .knxproj file): its entries, stored or deflated,
// inflated with the platform's DecompressionStream. No dependency, browser and Node 18+.

export interface ZipEntry {
  name: string;
  /** Uncompressed bytes. */
  read(): Promise<Uint8Array>;
}

const u16 = (b: Uint8Array, o: number) => b[o]! | (b[o + 1]! << 8);
const u32 = (b: Uint8Array, o: number) =>
  (b[o]! | (b[o + 1]! << 8) | (b[o + 2]! << 16) | (b[o + 3]! << 24)) >>> 0;

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate-raw");
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
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
  const names = new TextDecoder();
  for (let k = 0; k < count; k++) {
    if (u32(bytes, p) !== 0x02014b50) throw new Error("corrupt ZIP directory");
    const method = u16(bytes, p + 10);
    const size = u32(bytes, p + 20);
    const nameLen = u16(bytes, p + 28);
    const extraLen = u16(bytes, p + 30);
    const commentLen = u16(bytes, p + 32);
    const local = u32(bytes, p + 42);
    const name = names.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    if (name.endsWith("/")) continue;
    out.push({
      name: name.replace(/\\/g, "/"),
      read: async () => {
        const start =
          local + 30 + u16(bytes, local + 26) + u16(bytes, local + 28);
        const data = bytes.subarray(start, start + size);
        if (method === 0) return data;
        if (method === 8) return inflate(data);
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
