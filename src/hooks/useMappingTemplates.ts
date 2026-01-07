import { useState, useEffect, useCallback } from 'react';
import { BPSection } from '@/types/finance';

export interface MappingTemplate {
  id: string;
  name: string;
  description?: string;
  mappings: Record<string, BPSection>;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'mapping_templates';

export const useMappingTemplates = () => {
  const [templates, setTemplates] = useState<MappingTemplate[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setTemplates(JSON.parse(stored));
      } catch {
        setTemplates([]);
      }
    }
  }, []);

  const saveTemplate = useCallback((name: string, mappings: Record<string, BPSection>, description?: string) => {
    const newTemplate: MappingTemplate = {
      id: crypto.randomUUID(),
      name,
      description,
      mappings,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setTemplates(prev => {
      const updated = [newTemplate, ...prev];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    return newTemplate;
  }, []);

  const updateTemplate = useCallback((id: string, updates: Partial<Omit<MappingTemplate, 'id' | 'createdAt'>>) => {
    setTemplates(prev => {
      const updated = prev.map(t => 
        t.id === id 
          ? { ...t, ...updates, updatedAt: Date.now() }
          : t
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    setTemplates(prev => {
      const updated = prev.filter(t => t.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getTemplate = useCallback((id: string) => {
    return templates.find(t => t.id === id);
  }, [templates]);

  return {
    templates,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplate,
  };
};
