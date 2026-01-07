import { useState, useEffect, useCallback } from 'react';
import { BPSection } from '@/types/finance';

export interface ImportHistoryEntry {
  id: string;
  filename: string;
  columnHeaders: string[];
  timestamp: number;
  entryCount: number;
  savedMappings?: Record<string, BPSection>;
}

const STORAGE_KEY = 'csv_import_history';
const MAX_HISTORY = 10;

export const useImportHistory = () => {
  const [history, setHistory] = useState<ImportHistoryEntry[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch {
        setHistory([]);
      }
    }
  }, []);

  const saveToHistory = useCallback((entry: Omit<ImportHistoryEntry, 'id' | 'timestamp'>) => {
    const newEntry: ImportHistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    setHistory(prev => {
      // Check if similar file already exists (same headers)
      const headerKey = entry.columnHeaders.sort().join('|');
      const existing = prev.find(h => h.columnHeaders.sort().join('|') === headerKey);
      
      let updated: ImportHistoryEntry[];
      if (existing) {
        // Update existing entry, preserve mappings if new ones not provided
        const mergedMappings = entry.savedMappings 
          ? { ...existing.savedMappings, ...entry.savedMappings }
          : existing.savedMappings;
        updated = prev.map(h => h.id === existing.id 
          ? { ...newEntry, id: existing.id, savedMappings: mergedMappings } 
          : h
        );
      } else {
        // Add new entry, limit to MAX_HISTORY
        updated = [newEntry, ...prev].slice(0, MAX_HISTORY);
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    return newEntry;
  }, []);

  const updateMappings = useCallback((historyId: string, mappings: Record<string, BPSection>) => {
    setHistory(prev => {
      const updated = prev.map(h => 
        h.id === historyId 
          ? { ...h, savedMappings: { ...h.savedMappings, ...mappings }, timestamp: Date.now() }
          : h
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const findSimilarImport = useCallback((columnHeaders: string[]): ImportHistoryEntry | null => {
    const headerKey = columnHeaders.sort().join('|').toLowerCase();
    
    // First try exact match
    const exactMatch = history.find(h => 
      h.columnHeaders.sort().join('|').toLowerCase() === headerKey
    );
    if (exactMatch) return exactMatch;

    // Try fuzzy match (at least 70% columns match)
    const headerSet = new Set(columnHeaders.map(h => h.toLowerCase().trim()));
    for (const entry of history) {
      const entrySet = new Set(entry.columnHeaders.map(h => h.toLowerCase().trim()));
      const matches = [...headerSet].filter(h => entrySet.has(h)).length;
      const matchRate = matches / Math.max(headerSet.size, entrySet.size);
      if (matchRate >= 0.7) return entry;
    }

    return null;
  }, [history]);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setHistory(prev => {
      const updated = prev.filter(h => h.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return {
    history,
    saveToHistory,
    updateMappings,
    findSimilarImport,
    clearHistory,
    deleteEntry,
  };
};
