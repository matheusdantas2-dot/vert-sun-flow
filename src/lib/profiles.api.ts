import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "./auth";

export type Profile = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  avatar_url: string | null;
  cor: string;
  ativo: boolean;
};

export type ProfileWithRoles = Profile & { roles: AppRole[] };

export function useProfilesQuery() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
    staleTime: 60_000,
  });
}

export function useProfilesWithRolesQuery() {
  return useQuery({
    queryKey: ["profiles_with_roles"],
    queryFn: async (): Promise<ProfileWithRoles[]> => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").order("nome"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      const rolesByUser = new Map<string, AppRole[]>();
      for (const r of rolesRes.data ?? []) {
        const arr = rolesByUser.get(r.user_id) ?? [];
        arr.push(r.role as AppRole);
        rolesByUser.set(r.user_id, arr);
      }
      return (profilesRes.data ?? []).map((p) => ({
        ...(p as Profile),
        roles: rolesByUser.get(p.id) ?? [],
      }));
    },
    staleTime: 30_000,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Profile> }) => {
      const { error } = await supabase.from("profiles").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
      qc.invalidateQueries({ queryKey: ["profiles_with_roles"] });
    },
  });
}

export function useSetUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role, enabled }: { userId: string; role: AppRole; enabled: boolean }) => {
      if (enabled) {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role })
          .select()
          .maybeSingle();
        if (error && !String(error.message).includes("duplicate")) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", role);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profiles_with_roles"] }),
  });
}

export function useInviteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; nome: string; role: AppRole; password: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-invite-user", {
        body: input,
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      return data as { user_id: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
      qc.invalidateQueries({ queryKey: ["profiles_with_roles"] });
    },
  });
}
