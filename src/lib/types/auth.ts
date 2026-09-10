import { Profile, RoleId, Society, ImpersonationSession, SocietyMembership } from "./database";

export interface UserIdentity {
  user: {
    id: string;
    email: string;
  };
  profile: Profile;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isSocietyAdmin: boolean;
  isImpersonating: boolean;
  originalUser: Profile;
  effectiveUser: Profile;
  currentSociety: Society | null;
  availableSocieties?: (SocietyMembership & { society: Society })[];
  currentRole: RoleId | null;
  permissions: string[];
  impersonationSession?: ImpersonationSession | null;
}

export interface ClientAuthState {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isSocietyAdmin: boolean;
  isImpersonating: boolean;
  originalUser: Profile | null;
  effectiveUser: Profile | null;
  currentSociety: Society | null;
  availableSocieties?: (SocietyMembership & { society: Society })[];
  currentRole: RoleId | null;
  permissions: string[];
  impersonationSession: ImpersonationSession | null;
  isLoading: boolean;
}

export interface ImpersonationStartRequest {
  targetUserId: string;
  targetSocietyId?: string;
  targetRoleId?: RoleId;
  reason?: string;
}

export interface ImpersonationResult {
  success: boolean;
  error?: string;
  sessionId?: string;
  sessionToken?: string;
  targetRole?: RoleId;
  targetSocietyId?: string;
}
