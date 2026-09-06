"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ClientAuthState, UserIdentity } from "../types/auth";
import { RoleId } from "../types/database";
import { roleHasPermission } from "./permissions";

interface AuthContextValue extends ClientAuthState {
  refreshSession: () => Promise<void>;
  switchSociety: (societyId: string) => Promise<boolean>;
  hasRole: (role: RoleId | RoleId[]) => boolean;
  hasPermission: (permission: string) => boolean;
  can: (permission: string) => boolean;
  isSuperAdmin: boolean;
  isSocietyAdmin: boolean;
  isImpersonating: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  children,
  initialIdentity,
}: {
  children: React.ReactNode;
  initialIdentity?: UserIdentity | null;
}) {
  const router = useRouter();
  const [state, setState] = useState<ClientAuthState>(() => {
    if (initialIdentity) {
      return {
        user: initialIdentity.user,
        profile: initialIdentity.profile,
        isAuthenticated: initialIdentity.isAuthenticated,
        isSuperAdmin: initialIdentity.isSuperAdmin,
        isSocietyAdmin: initialIdentity.isSocietyAdmin,
        isImpersonating: initialIdentity.isImpersonating,
        originalUser: initialIdentity.originalUser,
        effectiveUser: initialIdentity.effectiveUser,
        currentSociety: initialIdentity.currentSociety,
        availableSocieties: initialIdentity.availableSocieties || [],
        currentRole: initialIdentity.currentRole,
        permissions: initialIdentity.permissions,
        impersonationSession: initialIdentity.impersonationSession || null,
        isLoading: false,
      };
    }
    return {
      user: null,
      profile: null,
      isAuthenticated: false,
      isSuperAdmin: false,
      isSocietyAdmin: false,
      isImpersonating: false,
      originalUser: null,
      effectiveUser: null,
      currentSociety: null,
      availableSocieties: [],
      currentRole: null,
      permissions: [],
      impersonationSession: null,
      isLoading: true,
    };
  });

  const refreshSession = React.useCallback(async () => {
    try {
      const response = await fetch("/api/auth/identity");
      if (response.ok) {
        const identity: UserIdentity = await response.json();
        setState({
          user: identity.user,
          profile: identity.profile,
          isAuthenticated: identity.isAuthenticated,
          isSuperAdmin: identity.isSuperAdmin,
          isSocietyAdmin: identity.isSocietyAdmin,
          isImpersonating: identity.isImpersonating,
          originalUser: identity.originalUser,
          effectiveUser: identity.effectiveUser,
          currentSociety: identity.currentSociety,
          availableSocieties: identity.availableSocieties || [],
          currentRole: identity.currentRole,
          permissions: identity.permissions,
          impersonationSession: identity.impersonationSession || null,
          isLoading: false,
        });
      } else {
        setState((prev) => ({
          ...prev,
          user: null,
          profile: null,
          isAuthenticated: false,
          isSuperAdmin: false,
          isSocietyAdmin: false,
          isImpersonating: false,
          originalUser: null,
          effectiveUser: null,
          currentSociety: null,
          availableSocieties: [],
          currentRole: null,
          permissions: [],
          impersonationSession: null,
          isLoading: false,
        }));
      }
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    if (!initialIdentity) {
      refreshSession();
    }
  }, [initialIdentity, refreshSession]);

  const switchSociety = React.useCallback(async (societyId: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/switch-society", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ societyId }),
      });

      if (res.ok) {
        const data = await res.json();
        await refreshSession();
        router.push(data.redirectUrl || `/society/${societyId}/dashboard`);
        router.refresh();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error switching society:", err);
      return false;
    }
  }, [refreshSession, router]);

  const hasRole = React.useCallback((role: RoleId | RoleId[]): boolean => {
    if (!state.currentRole) return false;
    if (Array.isArray(role)) {
      return role.includes(state.currentRole);
    }
    return state.currentRole === role;
  }, [state.currentRole]);

  const hasPermission = React.useCallback((permission: string): boolean => {
    if (state.isSuperAdmin && !state.isImpersonating) return true;
    return (
      state.permissions.includes(permission) ||
      roleHasPermission(state.currentRole, permission)
    );
  }, [state.currentRole, state.isImpersonating, state.isSuperAdmin, state.permissions]);

  const can = hasPermission;

  const value = useMemo(
    () => ({
      ...state,
      refreshSession,
      switchSociety,
      hasRole,
      hasPermission,
      can,
    }),
    [state, refreshSession, switchSociety, hasRole, hasPermission, can]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
