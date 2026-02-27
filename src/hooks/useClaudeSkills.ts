import { useState, useMemo, useCallback } from 'react';
import { claudeSkills as defaultSkills, skillCategories as defaultCategories, type ClaudeSkill, type SkillCategory } from '@/data/claudeSkills';

const SKILLS_STORAGE_KEY = 'claude-skills';
const CATEGORIES_STORAGE_KEY = 'claude-skill-categories';

const loadSkillsFromStorage = (): ClaudeSkill[] => {
  try {
    const stored = localStorage.getItem(SKILLS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    // First visit: seed from hardcoded data
    localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(defaultSkills));
    return defaultSkills;
  } catch {
    return defaultSkills;
  }
};

const loadCategoriesFromStorage = (): SkillCategory[] => {
  try {
    const stored = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    // First visit: seed from hardcoded data
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(defaultCategories));
    return defaultCategories;
  } catch {
    return defaultCategories;
  }
};

const saveSkillsToStorage = (skills: ClaudeSkill[]) => {
  localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(skills));
};

const saveCategoriesToStorage = (categories: SkillCategory[]) => {
  localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
};

export const useClaudeSkills = () => {
  const [skills, setSkills] = useState<ClaudeSkill[]>(() => loadSkillsFromStorage());
  const [categories, setCategories] = useState<SkillCategory[]>(() => loadCategoriesFromStorage());
  const [loading] = useState(false);

  const stats = useMemo(() => ({
    total: skills.length,
    verified: skills.filter(s => s.status === 'verified').length,
    community: skills.filter(s => s.status === 'community').length,
    needed: skills.filter(s => s.status === 'needed').length,
  }), [skills]);

  const getCategoryInfo = useCallback((categoryId: string) => {
    return categories.find(c => c.id === categoryId);
  }, [categories]);

  const searchSkills = useCallback((
    query: string,
    categoryFilter: string | null,
    statusFilter: string | null
  ): ClaudeSkill[] => {
    return skills.filter(skill => {
      const matchesSearch =
        !query ||
        skill.name.toLowerCase().includes(query.toLowerCase()) ||
        skill.description.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = !categoryFilter || skill.category === categoryFilter;
      const matchesStatus = !statusFilter || skill.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [skills]);

  const resetToDefaults = useCallback(() => {
    saveSkillsToStorage(defaultSkills);
    saveCategoriesToStorage(defaultCategories);
    setSkills(defaultSkills);
    setCategories(defaultCategories);
  }, []);

  const refetch = useCallback(() => {
    setSkills(loadSkillsFromStorage());
    setCategories(loadCategoriesFromStorage());
  }, []);

  return {
    skills,
    categories,
    stats,
    loading,
    getCategoryInfo,
    searchSkills,
    resetToDefaults,
    refetch,
  };
};
