import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const identity = await getCurrentIdentity();
    if (!identity || !identity.isSuperAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "File size exceeds 2MB limit" }, { status: 400 });
    }

    // Validate type
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Allowed: PNG, JPEG, WEBP, SVG" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split(".").pop() || "png";
    const filename = `logo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const adminClient = createAdminClient();

    const { data, error } = await adminClient.storage
      .from("society-assets")
      .upload(`logos/${filename}`, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      console.error("[upload-logo] Supabase storage error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: publicUrlData } = adminClient.storage
      .from("society-assets")
      .getPublicUrl(`logos/${filename}`);

    return NextResponse.json({
      success: true,
      url: publicUrlData.publicUrl,
    });
  } catch (error) {
    console.error("[upload-logo] Server error:", error);
    return NextResponse.json({ error: "Failed to upload logo" }, { status: 500 });
  }
}

