import { NextResponse } from "next/server";
import { submitOnboardingRequest } from "@/lib/services/onboardingVerificationService";
import { AccessRequestRole, UnitType, VehicleDefinition } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ societyId: string }> }
) {
  try {
    const { societyId } = await params;
    const formData = await req.formData();

    const applicant_name = (formData.get("applicant_name") as string)?.trim();
    const applicant_email = (formData.get("applicant_email") as string)?.trim();
    const applicant_phone = (formData.get("applicant_phone") as string)?.trim();
    const requested_role = (formData.get("requested_role") as AccessRequestRole) || "OWNER";
    const building_name = (formData.get("building_name") as string)?.trim();
    const wing_name = (formData.get("wing_name") as string)?.trim() || undefined;
    const floor_number_str = formData.get("floor_number") as string;
    const floor_number = floor_number_str ? parseInt(floor_number_str, 10) : undefined;
    const unit_number = (formData.get("unit_number") as string)?.trim();
    const unit_type = (formData.get("unit_type") as UnitType) || undefined;
    const area_sqft_str = formData.get("area_sqft") as string;
    const area_sqft = area_sqft_str ? parseFloat(area_sqft_str) : undefined;

    const has_parking = formData.get("has_parking") === "true";
    const parking_slot_number = (formData.get("parking_slot_number") as string)?.trim() || undefined;
    const parking_type = (formData.get("parking_type") as string)?.trim() || undefined;

    let vehicles: VehicleDefinition[] = [];
    const vehiclesRaw = formData.get("vehicles") as string;
    if (vehiclesRaw) {
      try {
        vehicles = JSON.parse(vehiclesRaw);
      } catch (e) {
        console.warn("[onboard-submit] Failed to parse vehicles JSON:", e);
      }
    }

    const document_type = (formData.get("document_type") as string)?.trim() || undefined;
    const lease_start_date = (formData.get("lease_start_date") as string)?.trim() || undefined;
    const lease_end_date = (formData.get("lease_end_date") as string)?.trim() || undefined;
    const owner_contact_name = (formData.get("owner_contact_name") as string)?.trim() || undefined;
    const owner_contact_phone = (formData.get("owner_contact_phone") as string)?.trim() || undefined;
    const notes = (formData.get("notes") as string)?.trim() || undefined;

    // File buffer extraction
    const proofFile = formData.get("proof_file") as File | null;
    let fileBuffer: Buffer | undefined;
    let fileName: string | undefined;
    let mimeType: string | undefined;

    if (proofFile && typeof proofFile.arrayBuffer === "function" && proofFile.size > 0) {
      const arrayBuffer = await proofFile.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      fileName = proofFile.name;
      mimeType = proofFile.type || "application/octet-stream";
    }

    if (!applicant_name || !applicant_email || !applicant_phone || !unit_number || !building_name) {
      return NextResponse.json(
        { error: "Required fields missing (Name, Email, Phone, Flat/Unit Number, and Tower/Building are mandatory)." },
        { status: 400 }
      );
    }

    const result = await submitOnboardingRequest({
      societyId,
      applicant_name,
      applicant_email,
      applicant_phone,
      requested_role,
      building_name,
      wing_name,
      floor_number,
      unit_number,
      unit_type,
      area_sqft,
      has_parking,
      parking_slot_number,
      parking_type,
      vehicles,
      document_type,
      fileBuffer,
      fileName,
      mimeType,
      lease_start_date,
      lease_end_date,
      owner_contact_name,
      owner_contact_phone,
      notes,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[onboard-submit POST] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to submit onboarding request." },
      { status: 500 }
    );
  }
}
