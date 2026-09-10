-- ============================================================================
-- DWELLSYNC MIGRATION: Phase - Assets & Inventory Management
-- Migration File: 20260901000017_assets_inventory_management.sql
-- ============================================================================

-- 1. ASSETS TABLE (SOCIETY-WIDE ASSET REGISTER)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  
  -- Identifier / Code (Unique per society)
  asset_code TEXT NOT NULL,
  name TEXT NOT NULL CHECK (char_length(name) >= 2 AND char_length(name) <= 255),
  description TEXT,

  -- Categorization
  category TEXT NOT NULL CHECK (category IN (
    'ELECTRICAL',
    'PLUMBING',
    'HVAC_LIFTS',
    'FIRE_SAFETY',
    'SECURITY_SURVEILLANCE',
    'DG_POWER',
    'CIVIL_INFRASTRUCTURE',
    'COMMON_AREA_FURNITURE',
    'CLUBHOUSE_GYM',
    'GARDENING_LANDSCAPING',
    'OFFICE_IT',
    'OTHER'
  )),
  subcategory TEXT,

  -- Location Hierarchy
  building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
  wing_id UUID REFERENCES public.wings(id) ON DELETE SET NULL,
  location_description TEXT,

  -- Acquisition & Procurement
  purchase_date DATE,
  purchase_cost NUMERIC(12, 2) DEFAULT 0 CHECK (purchase_cost >= 0),
  vendor_name TEXT,
  vendor_id UUID,
  expense_voucher_id UUID REFERENCES public.expense_vouchers(id) ON DELETE SET NULL,

  -- Operational Status & Condition
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN (
    'ACTIVE',
    'UNDER_MAINTENANCE',
    'DAMAGED',
    'DISPOSED',
    'LOST'
  )),
  condition TEXT NOT NULL DEFAULT 'GOOD' CHECK (condition IN (
    'EXCELLENT',
    'GOOD',
    'FAIR',
    'POOR',
    'SCRAP'
  )),

  -- Assignment & Department
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  department TEXT,

  -- Technical Specifications
  manufacturer TEXT,
  model_number TEXT,
  serial_number TEXT,

  -- Warranty & AMC Tracking
  warranty_provider TEXT,
  warranty_start DATE,
  warranty_end DATE,
  warranty_terms TEXT,

  amc_vendor TEXT,
  amc_start DATE,
  amc_end DATE,
  amc_cost NUMERIC(12, 2) DEFAULT 0 CHECK (amc_cost >= 0),
  amc_terms TEXT,

  -- Useful Life & Disposal
  expected_life_years NUMERIC(4, 1),
  disposal_date DATE,
  disposal_reason TEXT,
  disposal_value NUMERIC(12, 2) DEFAULT 0 CHECK (disposal_value >= 0),
  disposed_to TEXT,

  -- Photos, Documents & Handover Provenance
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  handover_asset_id UUID REFERENCES public.handover_assets(id) ON DELETE SET NULL,

  -- Audit & Timestamps
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_assets_society_code UNIQUE (society_id, asset_code)
);

CREATE INDEX IF NOT EXISTS idx_assets_society_status ON public.assets(society_id, status);
CREATE INDEX IF NOT EXISTS idx_assets_society_category ON public.assets(society_id, category);
CREATE INDEX IF NOT EXISTS idx_assets_society_building ON public.assets(society_id, building_id);
CREATE INDEX IF NOT EXISTS idx_assets_warranty_expiry ON public.assets(society_id, warranty_end) WHERE warranty_end IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assets_amc_expiry ON public.assets(society_id, amc_end) WHERE amc_end IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assets_handover_link ON public.assets(handover_asset_id) WHERE handover_asset_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assets_select_society_members" ON public.assets;
CREATE POLICY "assets_select_society_members"
  ON public.assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = assets.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
    )
  );

DROP POLICY IF EXISTS "assets_write_authorized_roles" ON public.assets;
CREATE POLICY "assets_write_authorized_roles"
  ON public.assets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = assets.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'TREASURER', 'MANAGER', 'STAFF', 'SUPER_ADMIN')
    )
  );

-- ============================================================================
-- 2. ASSET MAINTENANCE RECORDS TABLE (SERVICE HISTORY)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.asset_maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,

  title TEXT NOT NULL CHECK (char_length(title) >= 2 AND char_length(title) <= 255),
  maintenance_type TEXT NOT NULL DEFAULT 'PREVENTIVE' CHECK (maintenance_type IN (
    'PREVENTIVE',
    'BREAKDOWN',
    'INSPECTION',
    'AMC_SERVICE',
    'STATUTORY_INSPECTION',
    'OVERHAUL',
    'OTHER'
  )),
  status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN (
    'SCHEDULED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
  )),

  service_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completion_date DATE,
  work_description TEXT NOT NULL,

  -- Vendor & Technician
  vendor_name TEXT,
  technician_name TEXT,
  technician_contact TEXT,

  -- Cost & Finance Integration
  cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
  is_covered_under_warranty BOOLEAN NOT NULL DEFAULT false,
  is_covered_under_amc BOOLEAN NOT NULL DEFAULT false,
  amc_reference TEXT,
  expense_voucher_id UUID REFERENCES public.expense_vouchers(id) ON DELETE SET NULL,

  -- Follow-up
  next_service_date DATE,
  notes TEXT,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Audit & Timestamps
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_maint_society_asset ON public.asset_maintenance_records(society_id, asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_maint_service_date ON public.asset_maintenance_records(society_id, service_date DESC);
CREATE INDEX IF NOT EXISTS idx_asset_maint_next_service ON public.asset_maintenance_records(society_id, next_service_date) WHERE next_service_date IS NOT NULL;

-- Enable RLS
ALTER TABLE public.asset_maintenance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "asset_maint_select_society_members" ON public.asset_maintenance_records;
CREATE POLICY "asset_maint_select_society_members"
  ON public.asset_maintenance_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = asset_maintenance_records.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
    )
  );

DROP POLICY IF EXISTS "asset_maint_write_authorized_roles" ON public.asset_maintenance_records;
CREATE POLICY "asset_maint_write_authorized_roles"
  ON public.asset_maintenance_records FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = asset_maintenance_records.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'TREASURER', 'MANAGER', 'STAFF', 'SUPER_ADMIN')
    )
  );

-- ============================================================================
-- 3. INVENTORY ITEMS TABLE (CONSUMABLES & STOCK REGISTER)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,

  item_code TEXT NOT NULL,
  name TEXT NOT NULL CHECK (char_length(name) >= 2 AND char_length(name) <= 255),
  description TEXT,

  category TEXT NOT NULL CHECK (category IN (
    'ELECTRICAL',
    'PLUMBING',
    'HOUSEKEEPING',
    'SECURITY_STATIONERY',
    'CIVIL_REPAIR',
    'HARDWARE_TOOLS',
    'GARDENING',
    'FIRE_SAFETY',
    'OFFICE_SUPPLIES',
    'OTHER'
  )),

  unit_of_measure TEXT NOT NULL CHECK (unit_of_measure IN (
    'PIECES',
    'METERS',
    'LITERS',
    'KGS',
    'BOXES',
    'PACKETS',
    'SETS',
    'ROLLS',
    'OTHER'
  )),

  -- Quantities & Thresholds
  opening_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (opening_quantity >= 0),
  current_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0,
  min_reorder_level NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (min_reorder_level >= 0),
  unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),

  supplier_name TEXT,
  supplier_contact TEXT,
  storage_location TEXT,

  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISCONTINUED')),
  notes TEXT,

  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_inventory_society_code UNIQUE (society_id, item_code)
);

CREATE INDEX IF NOT EXISTS idx_inventory_society_cat ON public.inventory_items(society_id, category);
CREATE INDEX IF NOT EXISTS idx_inventory_society_stock ON public.inventory_items(society_id, current_quantity);
CREATE INDEX IF NOT EXISTS idx_inventory_reorder_alert ON public.inventory_items(society_id, min_reorder_level);

-- Enable RLS
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_select_society_members" ON public.inventory_items;
CREATE POLICY "inventory_select_society_members"
  ON public.inventory_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = inventory_items.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
    )
  );

DROP POLICY IF EXISTS "inventory_write_authorized_roles" ON public.inventory_items;
CREATE POLICY "inventory_write_authorized_roles"
  ON public.inventory_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = inventory_items.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'TREASURER', 'MANAGER', 'STAFF', 'SUPER_ADMIN')
    )
  );

-- ============================================================================
-- 4. INVENTORY STOCK MOVEMENTS TABLE (CONSUMPTION & RESTOCK LEDGER)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.inventory_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,

  movement_type TEXT NOT NULL CHECK (movement_type IN ('RECEIPT', 'ISSUE', 'ADJUSTMENT', 'RETURN')),
  quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
  quantity_delta NUMERIC(12, 2) NOT NULL, -- positive for RECEIPT/RETURN, negative for ISSUE, signed for ADJUSTMENT
  balance_before NUMERIC(12, 2) NOT NULL,
  balance_after NUMERIC(12, 2) NOT NULL,

  unit_price NUMERIC(12, 2) DEFAULT 0 CHECK (unit_price >= 0),
  total_cost NUMERIC(12, 2) DEFAULT 0 CHECK (total_cost >= 0),
  movement_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Recipient / Requester
  issued_to_name TEXT,
  issued_to_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  department TEXT,
  purpose TEXT,
  building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,

  -- Adjustment specifics (Mandatory for ADJUSTMENT)
  adjustment_reason TEXT CHECK (
    adjustment_reason IS NULL OR
    adjustment_reason IN (
      'DAMAGED_EXPIRED',
      'AUDIT_DISCREPANCY',
      'INITIAL_CORRECTION',
      'SCRAP',
      'THEFT_LOSS',
      'OTHER'
    )
  ),
  notes TEXT,

  -- Finance & Document Reference
  expense_voucher_id UUID REFERENCES public.expense_vouchers(id) ON DELETE SET NULL,

  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_mov_society_item ON public.inventory_stock_movements(society_id, item_id, movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_mov_type ON public.inventory_stock_movements(society_id, movement_type);

-- Enable RLS
ALTER TABLE public.inventory_stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_mov_select_society_members" ON public.inventory_stock_movements;
CREATE POLICY "stock_mov_select_society_members"
  ON public.inventory_stock_movements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = inventory_stock_movements.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
    )
  );

DROP POLICY IF EXISTS "stock_mov_write_authorized_roles" ON public.inventory_stock_movements;
CREATE POLICY "stock_mov_write_authorized_roles"
  ON public.inventory_stock_movements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.society_memberships sm
      WHERE sm.society_id = inventory_stock_movements.society_id
        AND sm.user_id = auth.uid()
        AND sm.status = 'ACTIVE'
        AND sm.role_id IN ('SOCIETY_ADMIN', 'SECRETARY', 'TREASURER', 'MANAGER', 'STAFF', 'SUPER_ADMIN')
    )
  );

-- ============================================================================
-- 5. EXTEND DOCUMENT ENTITY LINKS (CROSS-MODULE INTEGRATION)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_entity_links') THEN
    ALTER TABLE public.document_entity_links DROP CONSTRAINT IF EXISTS document_entity_links_entity_type_check;
    ALTER TABLE public.document_entity_links ADD CONSTRAINT document_entity_links_entity_type_check CHECK (
      entity_type IN (
        'FINANCIAL_REPORT',
        'EXPENSE_VOUCHER',
        'INVOICE',
        'PAYMENT',
        'RECEIPT',
        'BANK_RECONCILIATION',
        'NOTICE',
        'MEETING',
        'HANDOVER_PROJECT',
        'HANDOVER_DEFECT',
        'HANDOVER_ASSET',
        'HANDOVER_CONTRACT',
        'COMPLAINT',
        'UNIT',
        'RESIDENT',
        'ASSET',
        'ASSET_MAINTENANCE',
        'INVENTORY_ITEM',
        'STOCK_MOVEMENT',
        'GENERAL'
      )
    );
  END IF;
END $$;
