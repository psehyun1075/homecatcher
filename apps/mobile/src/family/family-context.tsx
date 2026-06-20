import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { listFamilies } from "../api/families-api";
import type { Family } from "../api/types";
import { clearSelectedFamilyId, loadSelectedFamilyId, saveSelectedFamilyId } from "./family-storage";

interface FamilyContextValue {
  families: Family[];
  selectedFamily: Family | null;
  selectedFamilyId: string | null;
  isLoadingFamilies: boolean;
  isSwitchingFamily: boolean;
  familyError: Error | null;
  familyStorageWarning: string | null;
  templateOnboardingFamilyId: string | null;
  clearFamilyStorageWarning: () => void;
  startTemplateOnboarding: (familyId: string) => void;
  startNewFamilyTemplateOnboarding: (family: Family) => Promise<void>;
  finishTemplateOnboarding: () => void;
  refetchFamilies: () => Promise<void>;
  selectFamily: (family: Family) => Promise<void>;
  clearFamily: () => Promise<void>;
}

const FamilyContext = createContext<FamilyContextValue | null>(null);

export function FamilyProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [loadedStoredFamily, setLoadedStoredFamily] = useState(false);
  const [isSwitchingFamily, setIsSwitchingFamily] = useState(false);
  const [familyStorageWarning, setFamilyStorageWarning] = useState<string | null>(null);
  const [templateOnboardingFamilyId, setTemplateOnboardingFamilyId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    void (async () => {
      const stored = await loadSelectedFamilyId();
      if (active) {
        setSelectedFamilyId(stored);
        setLoadedStoredFamily(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const query = useQuery({
    queryKey: ["families"],
    queryFn: listFamilies,
    enabled: enabled && loadedStoredFamily,
  });

  const families = query.data?.families ?? [];
  const selectedFamily = families.find((family) => family.id === selectedFamilyId) ?? null;

  useEffect(() => {
    if (!enabled || !loadedStoredFamily || query.isLoading) return;
    if (selectedFamilyId && !selectedFamily) {
      void clearSelectedFamilyId();
      setSelectedFamilyId(null);
    }
  }, [enabled, loadedStoredFamily, query.isLoading, selectedFamily, selectedFamilyId]);

  const selectFamily = useCallback(
    async (family: Family) => {
      setIsSwitchingFamily(true);
      try {
        const previousFamilyId = selectedFamilyId;
        if (previousFamilyId) {
          await queryClient.cancelQueries({ queryKey: ["familyScope", previousFamilyId] });
          queryClient.removeQueries({ queryKey: ["familyScope", previousFamilyId] });
        }
        queryClient.setQueryData<{ families: Family[] }>(["families"], (current) => {
          const currentFamilies = current?.families ?? [];
          if (currentFamilies.some((currentFamily) => currentFamily.id === family.id)) {
            return { families: currentFamilies.map((currentFamily) => (currentFamily.id === family.id ? { ...currentFamily, ...family } : currentFamily)) };
          }
          return { families: [...currentFamilies, family] };
        });
        setSelectedFamilyId(family.id);
        const saved = await saveSelectedFamilyId(family.id);
        setFamilyStorageWarning(saved ? null : "우리집 선택을 저장하지 못했어요. 지금은 계속 사용할 수 있어요.");
        await queryClient.invalidateQueries({ queryKey: ["familyScope", family.id] });
      } finally {
        setIsSwitchingFamily(false);
      }
    },
    [queryClient, selectedFamilyId],
  );

  const startNewFamilyTemplateOnboarding = useCallback(
    async (family: Family) => {
      setIsSwitchingFamily(true);
      try {
        const previousFamilyId = selectedFamilyId;
        if (previousFamilyId) {
          await queryClient.cancelQueries({ queryKey: ["familyScope", previousFamilyId] });
          queryClient.removeQueries({ queryKey: ["familyScope", previousFamilyId] });
        }
        queryClient.setQueryData<{ families: Family[] }>(["families"], (current) => {
          const currentFamilies = current?.families ?? [];
          if (currentFamilies.some((currentFamily) => currentFamily.id === family.id)) {
            return { families: currentFamilies.map((currentFamily) => (currentFamily.id === family.id ? { ...currentFamily, ...family } : currentFamily)) };
          }
          return { families: [...currentFamilies, family] };
        });
        setTemplateOnboardingFamilyId(family.id);
        setSelectedFamilyId(family.id);
        const saved = await saveSelectedFamilyId(family.id);
        setFamilyStorageWarning(saved ? null : "우리집 선택을 저장하지 못했어요. 지금은 계속 사용할 수 있어요.");
        await queryClient.invalidateQueries({ queryKey: ["familyScope", family.id] });
      } finally {
        setIsSwitchingFamily(false);
      }
    },
    [queryClient, selectedFamilyId],
  );

  const clearFamily = useCallback(async () => {
    const previousFamilyId = selectedFamilyId;
    setSelectedFamilyId(null);
    if (previousFamilyId) {
      await queryClient.cancelQueries({ queryKey: ["familyScope", previousFamilyId] });
      queryClient.removeQueries({ queryKey: ["familyScope", previousFamilyId] });
    }
    await clearSelectedFamilyId();
  }, [queryClient, selectedFamilyId]);

  const refetchFamilies = useCallback(async () => {
    await query.refetch();
  }, [query]);

  const clearFamilyStorageWarning = useCallback(() => {
    setFamilyStorageWarning(null);
  }, []);

  const startTemplateOnboarding = useCallback((familyId: string) => {
    setTemplateOnboardingFamilyId(familyId);
  }, []);

  const finishTemplateOnboarding = useCallback(() => {
    setTemplateOnboardingFamilyId(null);
  }, []);

  const value = useMemo(
    () => ({
      families,
      selectedFamily,
      selectedFamilyId,
      isLoadingFamilies: !loadedStoredFamily || query.isLoading,
      isSwitchingFamily,
      familyError: query.error,
      familyStorageWarning,
      templateOnboardingFamilyId,
      clearFamilyStorageWarning,
      startTemplateOnboarding,
      startNewFamilyTemplateOnboarding,
      finishTemplateOnboarding,
      refetchFamilies,
      selectFamily,
      clearFamily,
    }),
    [
      clearFamily,
      clearFamilyStorageWarning,
      families,
      familyStorageWarning,
      isSwitchingFamily,
      loadedStoredFamily,
      query.error,
      query.isLoading,
      refetchFamilies,
      selectFamily,
      selectedFamily,
      selectedFamilyId,
      startNewFamilyTemplateOnboarding,
      startTemplateOnboarding,
      finishTemplateOnboarding,
      templateOnboardingFamilyId,
    ],
  );

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}

export function useFamily() {
  const value = useContext(FamilyContext);
  if (!value) throw new Error("useFamily must be used inside FamilyProvider");
  return value;
}
