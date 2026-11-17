const MAX_BYTES = 3 * 1024 * 1024;
const MAX_FILES = 3;

function sniff(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buf.toString("ascii", 0, 3) === "GIF") return "image/gif";
  return null;
}

export type ParsedAttachment = { filename: string; mime: string; size: number; data: Buffer };

/** Validates uploaded screenshots by size and magic bytes (never trusts the client-provided type). */
export async function parseAttachments(formData: FormData, field = "attachments"): Promise<{ files: ParsedAttachment[]; error?: string }> {
  const raw = formData.getAll(field).filter((f): f is File => f instanceof File && f.size > 0);
  if (raw.length > MAX_FILES) return { files: [], error: `Attach at most ${MAX_FILES} screenshots.` };
  const files: ParsedAttachment[] = [];
  for (const f of raw) {
    if (f.size > MAX_BYTES) return { files: [], error: `${f.name} is larger than 3 MB.` };
    const data = Buffer.from(await f.arrayBuffer());
    const mime = sniff(data);
    if (!mime) return { files: [], error: `${f.name} is not a PNG, JPEG, WebP or GIF image.` };
    files.push({ filename: f.name.replace(/[^\w.\- ]/g, "_").slice(0, 120), mime, size: f.size, data });
  }
  return { files };
}
