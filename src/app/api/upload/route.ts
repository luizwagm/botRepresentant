import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_IMAGE = 8 * 1024 * 1024; // 8 MB
const MAX_VIDEO = 50 * 1024 * 1024; // 50 MB

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

function kindOf(mime: string): "image" | "video" | null {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return null;
}

export async function POST(req: NextRequest) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "campo 'file' obrigatório" }, { status: 400 });
  }

  const ext = EXT_BY_MIME[file.type];
  const kind = kindOf(file.type);
  if (!ext || !kind) {
    return NextResponse.json(
      { error: `tipo não suportado: ${file.type || "desconhecido"}` },
      { status: 400 },
    );
  }

  const limit = kind === "video" ? MAX_VIDEO : MAX_IMAGE;
  if (file.size > limit) {
    const mb = Math.round(limit / (1024 * 1024));
    return NextResponse.json({ error: `arquivo maior que ${mb}MB` }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${randomUUID()}.${ext}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), buffer);

  return NextResponse.json({ url: `/uploads/${filename}`, type: file.type, kind, size: file.size });
}
