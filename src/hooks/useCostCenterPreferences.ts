import { useState, useEffect, useCallback } from 'react';

export interface CostCenterPreference {
  category: string;
  costCenter: string;
  usageCount: number;
  lastUsed: number;
}

const STORAGE_KEY = 'cost_center_preferences';

export const useCostCenterPreferences = () => {
  const [preferences, setPreferences] = useState<CostCenterPreference[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setPreferences(JSON.parse(stored));
      } catch {
        setPreferences([]);
      }
    }
  }, []);

  const savePreference = useCallback((category: string, costCenter: string) => {
    if (!category || !costCenter) return;
    
    setPreferences(prev => {
      const existing = prev.find(p => 
        p.category.toLowerCase() === category.toLowerCase()
      );
      
      let updated: CostCenterPreference[];
      
      if (existing) {
        // Update existing preference
        updated = prev.map(p => 
          p.category.toLowerCase() === category.toLowerCase()
            ? { 
                ...p, 
                costCenter, 
                usageCount: p.usageCount + 1,
                lastUsed: Date.now()
              }
            : p
        );
      } else {
        // Add new preference
        updated = [
          ...prev,
          {
            category,
            costCenter,
            usageCount: 1,
            lastUsed: Date.now()
          }
        ];
      }
      
      // Keep only top 100 preferences sorted by usage
      updated = updated
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 100);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const saveBulkPreferences = useCallback((entries: Array<{ category: string; costCenter: string }>) => {
    setPreferences(prev => {
      const updated = [...prev];
      
      entries.forEach(({ category, costCenter }) => {
        if (!category || !costCenter) return;
        
        const existingIdx = updated.findIndex(p => 
          p.category.toLowerCase() === category.toLowerCase()
        );
        
        if (existingIdx >= 0) {
          updated[existingIdx] = {
            ...updated[existingIdx],
            costCenter,
            usageCount: updated[existingIdx].usageCount + 1,
            lastUsed: Date.now()
          };
        } else {
          updated.push({
            category,
            costCenter,
            usageCount: 1,
            lastUsed: Date.now()
          });
        }
      });
      
      // Keep only top 100 preferences sorted by usage
      const sorted = updated
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 100);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
      return sorted;
    });
  }, []);

  const getCostCenterForCategory = useCallback((category: string): string | null => {
    if (!category) return null;
    const pref = preferences.find(p => 
      p.category.toLowerCase() === category.toLowerCase()
    );
    return pref?.costCenter || null;
  }, [preferences]);

  const getMostUsedCostCenters = useCallback((limit: number = 10): string[] => {
    const costCenterCounts = new Map<string, number>();
    
    preferences.forEach(p => {
      const current = costCenterCounts.get(p.costCenter) || 0;
      costCenterCounts.set(p.costCenter, current + p.usageCount);
    });
    
    return [...costCenterCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([costCenter]) => costCenter);
  }, [preferences]);

  const clearPreferences = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setPreferences([]);
  }, []);

  return {
    preferences,
    savePreference,
    saveBulkPreferences,
    getCostCenterForCategory,
    getMostUsedCostCenters,
    clearPreferences,
  };
};

