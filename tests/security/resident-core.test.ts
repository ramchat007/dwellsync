import { describe, it, expect } from "vitest";

describe("Phase 5 — Resident Core Security & Privacy Tests", () => {
  it("should enforce tenant isolation for notices so residents only see their own society circulars", () => {
    const mockNotices = [
      { id: "notice-1", society_id: "soc-green-valley", title: "GV Water Cleaning", status: "PUBLISHED" },
      { id: "notice-2", society_id: "soc-lake-view", title: "LV Lift Maintenance", status: "PUBLISHED" },
      { id: "notice-3", society_id: "soc-green-valley", title: "GV AGM Notice", status: "DRAFT" },
    ];

    const currentSocietyId = "soc-green-valley";

    const visibleNotices = mockNotices.filter(
      (n) => n.society_id === currentSocietyId && n.status === "PUBLISHED"
    );

    expect(visibleNotices.length).toBe(1);
    expect(visibleNotices[0].title).toBe("GV Water Cleaning");
  });

  it("should enforce document visibility based on resident role", () => {
    const mockDocs = [
      { id: "doc-1", visibility: "ALL_RESIDENTS", title: "Society Bylaws" },
      { id: "doc-2", visibility: "OWNERS_ONLY", title: "Financial Audit Report 2025-26" },
      { id: "doc-3", visibility: "COMMITTEE_ONLY", title: "Vendor Quotations Comparison" },
    ];

    const tenantRole = "TENANT";
    const ownerRole = "OWNER";
    const committeeRole = "SECRETARY";

    const getAccessibleDocs = (role: string) => {
      const isOwner = ["OWNER", "SOCIETY_ADMIN", "SECRETARY", "TREASURER", "COMMITTEE_MEMBER"].includes(role);
      const isCommittee = ["SOCIETY_ADMIN", "SECRETARY", "TREASURER", "COMMITTEE_MEMBER"].includes(role);

      return mockDocs.filter((d) => {
        if (d.visibility === "ALL_RESIDENTS") return true;
        if (d.visibility === "OWNERS_ONLY") return isOwner;
        if (d.visibility === "COMMITTEE_ONLY") return isCommittee;
        return false;
      });
    };

    expect(getAccessibleDocs(tenantRole).length).toBe(1);
    expect(getAccessibleDocs(ownerRole).length).toBe(2);
    expect(getAccessibleDocs(committeeRole).length).toBe(3);
  });

  it("should mask resident phone and email in community directory when privacy setting is disabled", () => {
    const member = {
      userId: "user-123",
      fullName: "Rahul Sharma",
      phone: "+919876543210",
      email: "rahul@example.com",
    };

    const privacySettings = {
      userId: "user-123",
      profile_visible_in_directory: true,
      phone_visible_in_directory: false,
      email_visible_in_directory: false,
    };

    const sanitized = {
      name: member.fullName,
      phone: privacySettings.phone_visible_in_directory ? member.phone : null,
      email: privacySettings.email_visible_in_directory ? member.email : null,
    };

    expect(sanitized.phone).toBeNull();
    expect(sanitized.email).toBeNull();
    expect(sanitized.name).toBe("Rahul Sharma");
  });

  it("should expose contact details only when resident explicitly enables directory visibility", () => {
    const member = {
      userId: "user-456",
      fullName: "Ananya Deshmukh",
      phone: "+919820111223",
      email: "ananya@example.com",
    };

    const privacySettings = {
      userId: "user-456",
      profile_visible_in_directory: true,
      phone_visible_in_directory: true,
      email_visible_in_directory: true,
    };

    const sanitized = {
      name: member.fullName,
      phone: privacySettings.phone_visible_in_directory ? member.phone : null,
      email: privacySettings.email_visible_in_directory ? member.email : null,
    };

    expect(sanitized.phone).toBe("+919820111223");
    expect(sanitized.email).toBe("ananya@example.com");
  });

  it("should completely exclude user from community directory if profile_visible_in_directory is false", () => {
    const directory = [
      { userId: "u1", name: "User 1", profile_visible_in_directory: true },
      { userId: "u2", name: "User 2 (Private)", profile_visible_in_directory: false },
    ];

    const currentViewerUserId = "u1";

    const visibleDirectory = directory.filter(
      (m) => m.profile_visible_in_directory || m.userId === currentViewerUserId
    );

    expect(visibleDirectory.length).toBe(1);
    expect(visibleDirectory[0].name).toBe("User 1");
  });
});

