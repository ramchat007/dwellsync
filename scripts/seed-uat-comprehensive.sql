-- ===============================================================================
-- DWELLSYNC COMPREHENSIVE UAT DATA SEED SCRIPT (PostgreSQL / Supabase SQL Editor)
-- Purpose: Seeds complete test data across all housing society SaaS domains.
-- Target Society Code: UAT001
-- Safe & Idempotent: Deletes any prior UAT001 test data before re-inserting.
-- ===============================================================================

DO $$
DECLARE
    v_society_id UUID;
    v_tower_a_id UUID;
    v_tower_b_id UUID;
    v_wing_a_id UUID;
    v_wing_b_id UUID;
    v_unit_a101 UUID;
    v_unit_a102 UUID;
    v_unit_a201 UUID;
    v_unit_a301 UUID;
    v_unit_a502 UUID;
    v_unit_b101 UUID;
    v_unit_b102 UUID;
    v_unit_b201 UUID;
    v_unit_b204 UUID;
    v_unit_b501 UUID;
    v_admin_uid UUID;
    v_sec_uid UUID;
    v_trs_uid UUID;
    v_owner_uid UUID;
    v_resident_uid UUID;
    v_tenant_uid UUID;
    v_billing_cycle_id UUID;
    v_inv_paid_id UUID;
    v_amenity_clubhouse_id UUID;
    v_complaint_id UUID;
    v_committee_id UUID;
    v_meeting_id UUID;
    v_handover_id UUID;
    v_coa_bank_id UUID;
    v_pmc_id UUID;
BEGIN
    -- 1. CLEANUP PREVIOUS UAT SOCIETY & PMC
    DELETE FROM public.societies WHERE code = 'UAT001';
    DELETE FROM public.management_companies WHERE code = 'APEX-PMC-UAT';

    -- 2. CREATE UAT SOCIETY
    INSERT INTO public.societies (
        name, code, society_type, address_line_1, city, district, state,
        pincode, country, timezone, currency, contact_email, contact_phone, status
    ) VALUES (
        '[UAT] DwellSync Grand Residency', 'UAT001', 'COOPERATIVE_HOUSING',
        '77 Heritage Boulevard, Sector 14', 'Mumbai', 'Mumbai Suburban', 'Maharashtra',
        '400076', 'India', 'Asia/Kolkata', 'INR', 'office@grandresidency-uat.com', '+91 98200 99887', 'ACTIVE'
    ) RETURNING id INTO v_society_id;

    -- 3. BUILDINGS & WINGS
    INSERT INTO public.buildings (society_id, name, code, description, number_of_floors, status)
    VALUES (v_society_id, 'Tower A (Sunrise)', 'TWR-A', '5-Storey Residential Tower', 5, 'ACTIVE')
    RETURNING id INTO v_tower_a_id;

    INSERT INTO public.buildings (society_id, name, code, description, number_of_floors, status)
    VALUES (v_society_id, 'Tower B (Sunset)', 'TWR-B', '5-Storey Residential Tower', 5, 'ACTIVE')
    RETURNING id INTO v_tower_b_id;

    INSERT INTO public.wings (society_id, building_id, name, code, status)
    VALUES (v_society_id, v_tower_a_id, 'Wing A', 'W-A', 'ACTIVE')
    RETURNING id INTO v_wing_a_id;

    INSERT INTO public.wings (society_id, building_id, name, code, status)
    VALUES (v_society_id, v_tower_b_id, 'Wing B', 'W-B', 'ACTIVE')
    RETURNING id INTO v_wing_b_id;

    -- 4. UNITS (10 Distinct Apartments)
    INSERT INTO public.units (society_id, building_id, wing_id, unit_number, unit_type, area_sqft, status)
    VALUES (v_society_id, v_tower_a_id, v_wing_a_id, 'A-101', '2_BHK', 980, 'OCCUPIED') RETURNING id INTO v_unit_a101;

    INSERT INTO public.units (society_id, building_id, wing_id, unit_number, unit_type, area_sqft, status)
    VALUES (v_society_id, v_tower_a_id, v_wing_a_id, 'A-102', '2_BHK', 980, 'VACANT') RETURNING id INTO v_unit_a102;

    INSERT INTO public.units (society_id, building_id, wing_id, unit_number, unit_type, area_sqft, status)
    VALUES (v_society_id, v_tower_a_id, v_wing_a_id, 'A-201', '3_BHK', 1350, 'OCCUPIED') RETURNING id INTO v_unit_a201;

    INSERT INTO public.units (society_id, building_id, wing_id, unit_number, unit_type, area_sqft, status)
    VALUES (v_society_id, v_tower_a_id, v_wing_a_id, 'A-301', '3_BHK', 1350, 'OCCUPIED') RETURNING id INTO v_unit_a301;

    INSERT INTO public.units (society_id, building_id, wing_id, unit_number, unit_type, area_sqft, status)
    VALUES (v_society_id, v_tower_a_id, v_wing_a_id, 'A-502', 'PENTHOUSE', 2150, 'OCCUPIED') RETURNING id INTO v_unit_a502;

    INSERT INTO public.units (society_id, building_id, wing_id, unit_number, unit_type, area_sqft, status)
    VALUES (v_society_id, v_tower_b_id, v_wing_b_id, 'B-101', '1_BHK', 650, 'VACANT') RETURNING id INTO v_unit_b101;

    INSERT INTO public.units (society_id, building_id, wing_id, unit_number, unit_type, area_sqft, status)
    VALUES (v_society_id, v_tower_b_id, v_wing_b_id, 'B-102', '2_BHK', 980, 'OCCUPIED') RETURNING id INTO v_unit_b102;

    INSERT INTO public.units (society_id, building_id, wing_id, unit_number, unit_type, area_sqft, status)
    VALUES (v_society_id, v_tower_b_id, v_wing_b_id, 'B-201', '2_BHK', 980, 'OCCUPIED') RETURNING id INTO v_unit_b201;

    INSERT INTO public.units (society_id, building_id, wing_id, unit_number, unit_type, area_sqft, status)
    VALUES (v_society_id, v_tower_b_id, v_wing_b_id, 'B-204', '3_BHK', 1350, 'OCCUPIED') RETURNING id INTO v_unit_b204;

    INSERT INTO public.units (society_id, building_id, wing_id, unit_number, unit_type, area_sqft, status)
    VALUES (v_society_id, v_tower_b_id, v_wing_b_id, 'B-501', 'PENTHOUSE', 2150, 'OCCUPIED') RETURNING id INTO v_unit_b501;

    -- 5. RESOLVE UAT PERSONA PROFILE IDs (Pre-existing from Auth)
    SELECT id INTO v_admin_uid FROM public.profiles WHERE email = 'admin@uat.internal' LIMIT 1;
    SELECT id INTO v_sec_uid FROM public.profiles WHERE email = 'secretary@uat.internal' LIMIT 1;
    SELECT id INTO v_trs_uid FROM public.profiles WHERE email = 'treasurer@uat.internal' LIMIT 1;
    SELECT id INTO v_owner_uid FROM public.profiles WHERE email = 'owner@uat.internal' LIMIT 1;
    SELECT id INTO v_resident_uid FROM public.profiles WHERE email = 'resident@uat.internal' LIMIT 1;
    SELECT id INTO v_tenant_uid FROM public.profiles WHERE email = 'tenant@uat.internal' LIMIT 1;

    -- Fallback to any active profile if testing standalone
    IF v_admin_uid IS NULL THEN
        SELECT id INTO v_admin_uid FROM public.profiles LIMIT 1;
        v_sec_uid := v_admin_uid;
        v_trs_uid := v_admin_uid;
        v_owner_uid := v_admin_uid;
        v_resident_uid := v_admin_uid;
        v_tenant_uid := v_admin_uid;
    END IF;

    -- Link Developer Super User (ramchat007@gmail.com) as Society Admin
    INSERT INTO public.society_memberships (society_id, user_id, role_id, status)
    SELECT v_society_id, id, 'SOCIETY_ADMIN', 'ACTIVE'
    FROM public.profiles WHERE email = 'ramchat007@gmail.com'
    ON CONFLICT (society_id, user_id, role_id) DO NOTHING;

    -- 6. OWNERSHIP & OCCUPANCIES
    INSERT INTO public.unit_owners (society_id, unit_id, user_id, is_primary, ownership_percentage, ownership_type, status)
    VALUES
        (v_society_id, v_unit_a101, v_admin_uid, true, 100.0, 'PRIMARY', 'ACTIVE'),
        (v_society_id, v_unit_a201, v_owner_uid, true, 100.0, 'PRIMARY', 'ACTIVE');

    INSERT INTO public.unit_occupancies (society_id, unit_id, user_id, occupancy_type, move_in_date, status)
    VALUES
        (v_society_id, v_unit_a101, v_admin_uid, 'OWNER_OCCUPIED', '2026-01-01', 'ACTIVE'),
        (v_society_id, v_unit_b102, v_resident_uid, 'FAMILY_OCCUPIED', '2026-02-01', 'ACTIVE'),
        (v_society_id, v_unit_b201, v_tenant_uid, 'TENANT_OCCUPIED', '2026-03-01', 'ACTIVE');

    INSERT INTO public.family_members (society_id, unit_id, primary_resident_user_id, full_name, relationship, phone, email, is_minor, gate_access_allowed)
    VALUES (v_society_id, v_unit_b102, v_resident_uid, 'Chirayu Sharma', 'CHILD', '+91 98200 11223', 'chirayu@uat.internal', false, true);

    -- 7. NOTICES
    INSERT INTO public.notices (society_id, title, description, category, priority, published_by, status)
    VALUES
        (v_society_id, 'Annual Water Overhead Tank Cleaning', 'Water supply suspended on Sunday 9am-3pm.', 'MAINTENANCE', 'HIGH', v_admin_uid, 'PUBLISHED'),
        (v_society_id, 'Notice of Extraordinary General Meeting (EGM)', 'Convenes EGM for Solar Panel Ratification.', 'GENERAL', 'EMERGENCY', v_admin_uid, 'PUBLISHED');

    -- 8. AMENITIES & BOOKINGS
    INSERT INTO public.amenities (society_id, name, description, category, capacity, status)
    VALUES (v_society_id, 'Clubhouse & Community Hall', 'Air-conditioned banquet hall.', 'CLUBHOUSE', 120, 'AVAILABLE')
    RETURNING id INTO v_amenity_clubhouse_id;

    INSERT INTO public.amenities (society_id, name, description, category, capacity, status)
    VALUES (v_society_id, 'Olympic Swimming Pool', '25-meter lap pool.', 'SWIMMING_POOL', 30, 'AVAILABLE');

    INSERT INTO public.amenity_bookings (society_id, amenity_id, unit_id, booked_by, booking_date, start_time, end_time, status)
    VALUES (v_society_id, v_amenity_clubhouse_id, v_unit_b102, v_resident_uid, CURRENT_DATE + 3, '10:00:00', '14:00:00', 'CONFIRMED');

    -- 9. MAINTENANCE BILLING, INVOICES & PAYMENTS
    INSERT INTO public.billing_cycles (society_id, name, period_start, period_end, due_date, status, created_by)
    VALUES (v_society_id, 'September 2026 Billing', '2026-09-01', '2026-09-30', '2026-09-25', 'GENERATED', v_admin_uid)
    RETURNING id INTO v_billing_cycle_id;

    INSERT INTO public.invoices (society_id, unit_id, billing_cycle_id, invoice_number, invoice_date, due_date, subtotal, total_amount, amount_paid, balance_due, status)
    VALUES (v_society_id, v_unit_a101, v_billing_cycle_id, 'INV-2026-09-001', '2026-09-01', '2026-09-25', 4500, 4500, 4500, 0, 'PAID')
    RETURNING id INTO v_inv_paid_id;

    INSERT INTO public.invoices (society_id, unit_id, billing_cycle_id, invoice_number, invoice_date, due_date, subtotal, total_amount, amount_paid, balance_due, status)
    VALUES (v_society_id, v_unit_a201, v_billing_cycle_id, 'INV-2026-09-002', '2026-09-01', '2026-09-25', 6200, 6200, 0, 6200, 'UNPAID');

    INSERT INTO public.invoices (society_id, unit_id, billing_cycle_id, invoice_number, invoice_date, due_date, subtotal, total_amount, amount_paid, balance_due, status)
    VALUES (v_society_id, v_unit_b102, v_billing_cycle_id, 'INV-2026-08-003', '2026-08-01', '2026-08-25', 4500, 4500, 0, 4500, 'OVERDUE');

    INSERT INTO public.payments (society_id, invoice_id, unit_id, amount, payment_date, payment_method, reference_number, status, recorded_by)
    VALUES (v_society_id, v_inv_paid_id, v_unit_a101, 4500, CURRENT_DATE, 'BANK_TRANSFER', 'NEFT-HDFC-9918231', 'COMPLETED', v_admin_uid);

    -- 10. VISITORS & GATE PASSES
    INSERT INTO public.visitors (society_id, unit_id, visitor_name, visitor_phone, purpose, pass_code, status, check_in_at, gate_number, created_by)
    VALUES
        (v_society_id, v_unit_a101, 'Rajesh Verma (Amazon Delivery)', '+91 98920 44556', 'DELIVERY', '9981', 'CHECKED_IN', NOW(), 'Gate 1', v_admin_uid),
        (v_society_id, v_unit_a201, 'Amit Sharma (Guest)', '+91 98111 22334', 'GUEST', '4421', 'EXPECTED', NULL, 'Gate 1', v_owner_uid);

    -- 11. HELPDESK COMPLAINTS & SLA TIMELINE
    INSERT INTO public.complaints (society_id, unit_id, created_by, title, description, category, priority, status)
    VALUES (v_society_id, v_unit_a201, v_owner_uid, 'Tower A Passenger Elevator Door Sensor Erratic', 'Door reopens multiple times on 2nd floor.', 'ELEVATOR', 'HIGH', 'IN_PROGRESS')
    RETURNING id INTO v_complaint_id;

    INSERT INTO public.complaint_sla_events (society_id, complaint_id, event_type, actor_id, notes)
    VALUES
        (v_society_id, v_complaint_id, 'CREATED', v_owner_uid, 'Ticket logged by resident.'),
        (v_society_id, v_complaint_id, 'ASSIGNED', v_admin_uid, 'Assigned to Apex Elevators for repair.');

    -- 12. DOCUMENTS & FOLDERS
    INSERT INTO public.document_folders (society_id, name, description, created_by)
    VALUES
        (v_society_id, 'Society Bylaws & Registration', 'Official society deed and bylaws.', v_admin_uid),
        (v_society_id, 'Statutory Financial Audit Reports', 'Audited annual accounts.', v_admin_uid);

    INSERT INTO public.documents (society_id, title, description, category, file_url, visibility, uploaded_by)
    VALUES (v_society_id, 'DwellSync Society Model Bylaws 2026', 'Official adopted bylaws', 'SOCIETY_BYLAWS', 'https://example.com/docs/bylaws.pdf', 'ALL_RESIDENTS', v_admin_uid);

    -- 13. GOVERNANCE: COMMITTEES, MEETINGS & RESOLUTIONS
    INSERT INTO public.committees (society_id, name, description, committee_type, term_start_date, term_end_date, status, created_by)
    VALUES (v_society_id, 'Managing Committee (2026 - 2028)', 'Statutory elected governing committee.', 'MANAGING_COMMITTEE', '2026-04-01', '2028-03-31', 'ACTIVE', v_admin_uid)
    RETURNING id INTO v_committee_id;

    INSERT INTO public.committee_members (society_id, committee_id, user_id, designation, status)
    VALUES
        (v_society_id, v_committee_id, v_sec_uid, 'SECRETARY', 'ACTIVE'),
        (v_society_id, v_committee_id, v_trs_uid, 'TREASURER', 'ACTIVE');

    INSERT INTO public.society_meetings (society_id, title, meeting_type, location_type, location_details, scheduled_at, status, organized_by)
    VALUES (v_society_id, 'Annual General Body Meeting (AGM 2026)', 'AGM', 'PHYSICAL', 'Grand Residency Clubhouse Hall', '2026-10-15 10:00:00+00', 'SCHEDULED', v_admin_uid)
    RETURNING id INTO v_meeting_id;

    INSERT INTO public.governance_resolutions (society_id, meeting_id, resolution_number, title, description, resolution_type, status, votes_for, votes_against, votes_abstained, passed_date, effective_date, created_by)
    VALUES (v_society_id, v_meeting_id, 'RES-2026-04', 'Resolution #04/2026: Rooftop Solar Power Plant Installation', 'Sanction ₹14,50,000 for 40kW rooftop solar power.', 'ORDINARY', 'PASSED', 35, 2, 1, '2026-09-10', '2026-09-15', v_admin_uid);

    -- 14. BUILDER HANDOVER
    INSERT INTO public.handover_projects (society_id, title, builder_name, status, created_by)
    VALUES (v_society_id, 'Prestige Developers Phase 1 Handover', 'Prestige Infrastructure Ltd.', 'IN_PROGRESS', v_admin_uid)
    RETURNING id INTO v_handover_id;

    INSERT INTO public.handover_checklist_items (society_id, handover_project_id, category, title, priority, status, created_by)
    VALUES
        (v_society_id, v_handover_id, 'STATUTORY', 'Fire Safety Compliance & Final NOC Verification', 'CRITICAL', 'COMPLETED', v_admin_uid),
        (v_society_id, v_handover_id, 'ELECTRICAL', 'DG Set 125 KVA Synchronization Panel Testing', 'HIGH', 'PENDING', v_admin_uid);

    INSERT INTO public.handover_defects (society_id, handover_project_id, title, description, category, severity, status, created_by)
    VALUES (v_society_id, v_handover_id, 'Basement 2 Stormwater Sump Pump Seepage', 'Water seepage observed around mounting flange.', 'PLUMBING', 'CRITICAL', 'OPEN', v_admin_uid);

    -- 15. ASSETS & INVENTORY
    INSERT INTO public.assets (society_id, asset_code, name, category, location_description, status, condition)
    VALUES
        (v_society_id, 'AST-GEN-01', 'Kirloskar 125 KVA Silent Diesel Generator', 'DG_POWER', 'DG Yard Behind Tower A', 'ACTIVE', 'EXCELLENT'),
        (v_society_id, 'AST-LFT-01', 'Otis V3F 8-Passenger Automatic Elevator #1', 'HVAC_LIFTS', 'Tower A Core', 'ACTIVE', 'GOOD');

    INSERT INTO public.inventory_items (society_id, item_code, name, category, unit_of_measure, opening_quantity, current_quantity, min_reorder_level, unit_cost)
    VALUES (v_society_id, 'INV-ELEC-01', '40W LED Batten Tubelights (Cool White)', 'ELECTRICAL', 'PIECES', 100, 65, 20, 250);

    -- 16. CHART OF ACCOUNTS & BANK ACCOUNTS
    INSERT INTO public.chart_of_accounts (society_id, account_code, account_name, account_type, category, is_active)
    VALUES
        (v_society_id, '1001', 'Cash in Hand', 'ASSET', 'CASH', true),
        (v_society_id, '1002', 'HDFC Bank Account', 'ASSET', 'BANK', true)
    RETURNING id INTO v_coa_bank_id;

    INSERT INTO public.chart_of_accounts (society_id, account_code, account_name, account_type, category, is_active)
    VALUES
        (v_society_id, '4001', 'Maintenance Charges Collection', 'INCOME', 'OPERATING_INCOME', true),
        (v_society_id, '5001', 'Security Guard Service Charges', 'EXPENSE', 'OPERATING_EXPENSE', true);

    INSERT INTO public.society_bank_accounts (society_id, account_id, bank_name, account_number, account_type, opening_balance, current_balance, is_primary, is_active)
    VALUES (v_society_id, v_coa_bank_id, 'HDFC Bank Ltd', '50200088992211', 'CURRENT', 500000.0, 500000.0, true, true);

    -- 17. PROPERTY MANAGEMENT COMPANY (PMC)
    INSERT INTO public.management_companies (name, code, contact_email, contact_phone, status)
    VALUES ('Apex Integrated Facility Management Ltd.', 'APEX-PMC-UAT', 'support@apexpmc.internal', '+91 22 4455 6677', 'ACTIVE')
    RETURNING id INTO v_pmc_id;

    INSERT INTO public.management_company_societies (management_company_id, society_id, status)
    VALUES (v_pmc_id, v_society_id, 'ACTIVE');

    RAISE NOTICE 'DwellSync UAT Seeder completed successfully for Society ID: %', v_society_id;
END $$;

