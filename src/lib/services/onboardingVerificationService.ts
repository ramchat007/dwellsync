import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/auth/audit";
import {
  AccessRequestRole,
  AccessRequestStatus,
  SocietyAccessRequest,
  UnitType,
  VehicleDefinition,
} from "@/lib/types/database";

const STORAGE_BUCKET = "society-documents";

export interface OnboardingSubmissionInput {
  societyId: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  requested_role: AccessRequestRole;
  building_name: string;
  wing_name?: string;
  floor_number?: number;
  unit_number: string;
  unit_type?: UnitType;
  area_sqft?: number;
  has_parking?: boolean;
  parking_slot_number?: string;
  parking_type?: string;
  vehicles?: VehicleDefinition[];
  document_type?: string;
  fileBuffer?: Buffer;
  fileName?: string;
  mimeType?: string;
  lease_start_date?: string;
  lease_end_date?: string;
  owner_contact_name?: string;
  owner_contact_phone?: string;
  notes?: string;
}

export function normalizeApplicantInput(input: {
  applicant_email: string;
  applicant_phone: string;
  applicant_name: string;
  unit_number: string;
  requested_role: AccessRequestRole;
  vehicles?: VehicleDefinition[];
}) {
  return {
    email: input.applicant_email.trim().toLowerCase(),
    phone: input.applicant_phone.replace(/[^0-9+]/g, "").trim(),
    name: input.applicant_name.trim(),
    unitNumber: input.unit_number.trim().toUpperCase(),
    defaultDocumentType: input.requested_role === "OWNER" ? "INDEX_II" : "RENT_AGREEMENT",
    vehicles: (input.vehicles || []).map((v) => ({
      ...v,
      plate_number: v.plate_number.trim().toUpperCase(),
      fuel_type: v.is_ev ? "ELECTRIC" : (v.fuel_type || "PETROL"),
    })),
  };
}

export async function getSocietyPublicInfo(societyIdentifier: string) {
  const adminClient = createAdminClient();

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      societyIdentifier
    );

  let query = adminClient
    .from("societies")
    .select("id, name, registration_number, address_line1, city, state, postal_code, status");

  if (isUuid) {
    query = query.eq("id", societyIdentifier);
  } else {
    query = query.ilike("name", societyIdentifier.replace(/-/g, " "));
  }

  const { data: society, error: socError } = await query.maybeSingle();

  if (socError || !society) {
    return { success: false, error: "Society not found." };
  }

  const { data: buildings } = await adminClient
    .from("buildings")
    .select("id, name, code, wings(id, name, code)")
    .eq("society_id", society.id)
    .eq("status", "ACTIVE")
    .order("name", { ascending: true });

  return {
    success: true,
    data: {
      society,
      buildings: buildings || [],
    },
  };
}

export async function submitOnboardingRequest(input: OnboardingSubmissionInput) {
  const adminClient = createAdminClient();

  const normalized = normalizeApplicantInput(input);
  const cleanEmail = normalized.email;
  const cleanPhone = normalized.phone;
  const cleanName = normalized.name;
  const cleanUnitNumber = normalized.unitNumber;

  let documentUrl: string | null = null;
  let documentName: string | null = input.fileName || null;
  let documentFileSizeKb: number | null = null;

  if (input.fileBuffer && input.fileName) {
    const sanitizedFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `resident-proofs/${input.societyId}/${Date.now()}_${sanitizedFileName}`;

    const { error: uploadError } = await adminClient.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, input.fileBuffer, {
        contentType: input.mimeType || "application/octet-stream",
        upsert: true,
      });

    if (uploadError) {
      console.warn("[OnboardingVerification] Document upload failed:", uploadError);
    } else {
      documentUrl = `/api/society/${input.societyId}/documents/storage/${encodeURIComponent(filePath)}`;
      documentFileSizeKb = Math.ceil(input.fileBuffer.length / 1024);
    }
  }

  let userId: string | null = null;

  const { data: existingProfile } = await adminClient
    .from("profiles")
    .select("id")
    .eq("email", cleanEmail)
    .maybeSingle();

  if (existingProfile) {
    userId = existingProfile.id;
  } else {
    const { data: authUsers } = await adminClient.auth.admin.listUsers();
    const existingAuth = authUsers?.users?.find(
      (u) => u.email?.toLowerCase() === cleanEmail
    );

    if (existingAuth) {
      userId = existingAuth.id;
    } else {
      const tempPassword = `DwellSync@${Math.floor(100000 + Math.random() * 900000)}!`;
      const { data: newUser, error: createError } =
        await adminClient.auth.admin.createUser({
          email: cleanEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { full_name: cleanName, phone: cleanPhone },
        });

      if (createError || !newUser.user) {
        throw new Error(`Failed to create account: ${createError?.message}`);
      }
      userId = newUser.user.id;
    }

    await adminClient.from("profiles").upsert(
      {
        id: userId,
        email: cleanEmail,
        full_name: cleanName,
        phone: cleanPhone || null,
        status: "ACTIVE",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  }

  const payload = {
    society_id: input.societyId,
    user_id: userId,
    unit_number: cleanUnitNumber,
    applicant_name: cleanName,
    applicant_phone: cleanPhone,
    applicant_email: cleanEmail,
    requested_role: input.requested_role,
    status: "PENDING" as AccessRequestStatus,
    building_name: input.building_name?.trim() || null,
    wing_name: input.wing_name?.trim() || null,
    floor_number: input.floor_number ?? null,
    unit_type: input.unit_type || null,
    area_sqft: input.area_sqft ? Number(input.area_sqft) : null,
    has_parking: Boolean(input.has_parking),
    parking_slot_number: input.parking_slot_number?.trim() || null,
    parking_type: input.parking_type || null,
    vehicles: normalized.vehicles,
    document_type: input.document_type || normalized.defaultDocumentType,
    document_url: documentUrl,
    document_name: documentName,
    document_file_size_kb: documentFileSizeKb,
    lease_start_date: input.lease_start_date || null,
    lease_end_date: input.lease_end_date || null,
    owner_contact_name: input.owner_contact_name?.trim() || null,
    owner_contact_phone: input.owner_contact_phone?.trim() || null,
    notes: input.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { data: existingRequest } = await adminClient
    .from("society_access_requests")
    .select("id")
    .eq("society_id", input.societyId)
    .eq("user_id", userId)
    .eq("status", "PENDING")
    .maybeSingle();

  let requestId: string;

  if (existingRequest) {
    const { data: updated, error: updateErr } = await adminClient
      .from("society_access_requests")
      .update(payload)
      .eq("id", existingRequest.id)
      .select("id")
      .single();

    if (updateErr || !updated) {
      throw new Error(`Failed to update access request: ${updateErr?.message}`);
    }
    requestId = updated.id;
  } else {
    const { data: created, error: insertErr } = await adminClient
      .from("society_access_requests")
      .insert(payload)
      .select("id")
      .single();

    if (insertErr || !created) {
      throw new Error(`Failed to create access request: ${insertErr?.message}`);
    }
    requestId = created.id;
  }

  return {
    success: true,
    data: {
      requestId,
      applicantEmail: cleanEmail,
      unitNumber: cleanUnitNumber,
      requestedRole: input.requested_role,
    },
  };
}

export async function getSocietyAccessRequests(
  societyId: string,
  statusFilter?: AccessRequestStatus
) {
  const adminClient = createAdminClient();

  let query = adminClient
    .from("society_access_requests")
    .select("*")
    .eq("society_id", societyId)
    .order("created_at", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[getSocietyAccessRequests] Error:", error);
    return [];
  }

  return (data || []) as SocietyAccessRequest[];
}

function toCode(text: string): string {
  return text
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);
}

export async function approveAccessRequest(
  requestId: string,
  adminUserId: string
) {
  const adminClient = createAdminClient();

  const { data: request, error: reqErr } = await adminClient
    .from("society_access_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (reqErr || !request) {
    throw new Error("Access request not found.");
  }

  if (request.status !== "PENDING") {
    throw new Error(`This request has already been ${request.status.toLowerCase()}.`);
  }

  const societyId = request.society_id;
  const userId = request.user_id;
  const unitNumber = request.unit_number.toUpperCase().trim();

  let buildingId: string | null = null;
  const bldgName = request.building_name?.trim() || "Main Building";

  const { data: existingBldg } = await adminClient
    .from("buildings")
    .select("id")
    .eq("society_id", societyId)
    .ilike("name", bldgName)
    .maybeSingle();

  if (existingBldg) {
    buildingId = existingBldg.id;
  } else {
    const { data: newBldg, error: bldgErr } = await adminClient
      .from("buildings")
      .insert({
        society_id: societyId,
        name: bldgName,
        code: toCode(bldgName) || "BLDG",
        status: "ACTIVE",
        number_of_floors: 10,
      })
      .select("id")
      .single();

    if (bldgErr || !newBldg) {
      throw new Error(`Failed to create building: ${bldgErr?.message}`);
    }
    buildingId = newBldg.id;
  }

  let wingId: string | null = null;
  if (request.wing_name?.trim()) {
    const wingName = request.wing_name.trim();
    const { data: existingWing } = await adminClient
      .from("wings")
      .select("id")
      .eq("society_id", societyId)
      .eq("building_id", buildingId)
      .ilike("name", wingName)
      .maybeSingle();

    if (existingWing) {
      wingId = existingWing.id;
    } else {
      const { data: newWing, error: wingErr } = await adminClient
        .from("wings")
        .insert({
          society_id: societyId,
          building_id: buildingId,
          name: wingName,
          code: toCode(wingName) || "W1",
          status: "ACTIVE",
        })
        .select("id")
        .single();

      if (!wingErr && newWing) {
        wingId = newWing.id;
      }
    }
  }

  let floorId: string | null = null;
  const floorNum = request.floor_number ?? 1;
  const { data: existingFloor } = await adminClient
    .from("floors")
    .select("id")
    .eq("society_id", societyId)
    .eq("building_id", buildingId)
    .eq("floor_number", floorNum)
    .maybeSingle();

  if (existingFloor) {
    floorId = existingFloor.id;
  } else {
    const { data: newFloor, error: flrErr } = await adminClient
      .from("floors")
      .insert({
        society_id: societyId,
        building_id: buildingId,
        wing_id: wingId,
        name: `Floor ${floorNum}`,
        floor_number: floorNum,
        display_order: floorNum,
        status: "ACTIVE",
      })
      .select("id")
      .single();

    if (!flrErr && newFloor) {
      floorId = newFloor.id;
    }
  }

  let unitId: string | null = null;
  const { data: existingUnit } = await adminClient
    .from("units")
    .select("id, area_sqft, unit_type")
    .eq("society_id", societyId)
    .eq("unit_number", unitNumber)
    .maybeSingle();

  if (existingUnit) {
    unitId = existingUnit.id;
    const updateData: Record<string, any> = {};
    if (!existingUnit.area_sqft && request.area_sqft) {
      updateData.area_sqft = request.area_sqft;
      updateData.carpet_area_sqft = request.area_sqft;
    }
    if (request.unit_type && (!existingUnit.unit_type || existingUnit.unit_type === "OTHER")) {
      updateData.unit_type = request.unit_type;
    }
    if (request.has_parking && request.parking_slot_number) {
      updateData.parking_slots = 1;
    }
    if (Object.keys(updateData).length > 0) {
      await adminClient.from("units").update(updateData).eq("id", unitId);
    }
  } else {
    const { data: newUnit, error: unitErr } = await adminClient
      .from("units")
      .insert({
        society_id: societyId,
        building_id: buildingId,
        wing_id: wingId,
        floor_id: floorId,
        unit_number: unitNumber,
        unit_type: request.unit_type || "2_BHK",
        area_sqft: request.area_sqft || null,
        carpet_area_sqft: request.area_sqft || null,
        parking_slots: request.has_parking ? 1 : 0,
        status: request.requested_role === "TENANT" ? "OCCUPIED" : "VACANT",
      })
      .select("id")
      .single();

    if (unitErr || !newUnit) {
      throw new Error(`Failed to create unit: ${unitErr?.message}`);
    }
    unitId = newUnit.id;
  }

  await adminClient.from("society_memberships").upsert(
    {
      society_id: societyId,
      user_id: userId,
      role_id: request.requested_role,
      unit_number: unitNumber,
      status: "ACTIVE",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "society_id,user_id,role_id" }
  );

  if (request.requested_role === "OWNER") {
    await adminClient.from("unit_owners").upsert(
      {
        society_id: societyId,
        unit_id: unitId,
        user_id: userId,
        is_primary: true,
        ownership_percentage: 100.0,
        ownership_type: "PRIMARY",
        start_date: new Date().toISOString().split("T")[0],
        status: "ACTIVE",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "unit_id,user_id" }
    );
  } else {
    await adminClient.from("unit_occupancies").upsert(
      {
        society_id: societyId,
        unit_id: unitId,
        user_id: userId,
        occupancy_type: "TENANT_OCCUPIED",
        is_primary_tenant: true,
        lease_start: request.lease_start_date || new Date().toISOString().split("T")[0],
        lease_end: request.lease_end_date || null,
        status: "ACTIVE",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "unit_id,user_id" }
    );
    await adminClient.from("units").update({ status: "OCCUPIED" }).eq("id", unitId);
  }

  if (request.vehicles && Array.isArray(request.vehicles) && request.vehicles.length > 0) {
    for (const v of request.vehicles) {
      if (v.plate_number?.trim()) {
        const cleanPlate = v.plate_number.toUpperCase().trim();
        await adminClient.from("society_vehicles").upsert(
          {
            society_id: societyId,
            unit_id: unitId,
            user_id: userId,
            vehicle_type: v.vehicle_type || "TWO_WHEELER",
            plate_number: cleanPlate,
            make_model: v.make_model || null,
            color: v.color || null,
            fuel_type: v.fuel_type || "PETROL",
            is_ev: Boolean(v.is_ev),
            parking_slot_number: request.parking_slot_number || null,
            parking_type: request.parking_type || null,
            status: "ACTIVE",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "society_id,plate_number" }
        );
      }
    }
  }

  if (request.document_url) {
    await adminClient.from("society_documents").insert({
      society_id: societyId,
      title: `${request.document_type || "Verification Proof"} - Flat ${unitNumber}`,
      description: `Uploaded during self-onboarding verification for Flat ${unitNumber} by ${request.applicant_name}`,
      category: "RESIDENT_UNIT_DOCUMENTS",
      visibility: "OWNERS_ONLY",
      status: "APPROVED",
      file_url: request.document_url,
      file_name: request.document_name || "proof_document",
      file_size_kb: request.document_file_size_kb || 100,
      file_type: "PDF",
      resident_id: userId,
      unit_id: unitId,
      created_by: adminUserId,
    });
  }

  await adminClient
    .from("society_access_requests")
    .update({
      status: "APPROVED",
      unit_id: unitId,
      reviewed_by: adminUserId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  await recordAuditLog({
    actorUserId: adminUserId,
    societyId,
    action: "MEMBER_STATUS_CHANGED",
    resourceType: "society_access_requests",
    resourceId: requestId,
    metadata: {
      action: "APPROVED",
      unit_number: unitNumber,
      role: request.requested_role,
      user_id: userId,
    },
  });

  return { success: true, unitId };
}

export async function rejectAccessRequest(
  requestId: string,
  adminUserId: string,
  notes?: string
) {
  const adminClient = createAdminClient();

  const { data: request, error: reqErr } = await adminClient
    .from("society_access_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (reqErr || !request) {
    throw new Error("Access request not found.");
  }

  await adminClient
    .from("society_access_requests")
    .update({
      status: "REJECTED",
      notes: notes || "Verification details did not match records.",
      reviewed_by: adminUserId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  await recordAuditLog({
    actorUserId: adminUserId,
    societyId: request.society_id,
    action: "MEMBER_STATUS_CHANGED",
    resourceType: "society_access_requests",
    resourceId: requestId,
    metadata: {
      action: "REJECTED",
      notes: notes || "",
    },
  });

  return { success: true };
}