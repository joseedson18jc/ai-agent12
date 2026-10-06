import { useState, useMemo, useCallback } from 'react';
import { claudeAgents as defaultAgents, agentCategories as defaultCategories, type ClaudeAgent, type AgentCategoryInfo, type AgentCategory } from '@/data/claudeAgents';

const AGENTS_STORAGE_KEY = 'claude-agents';

const loadAgentsFromStorage = (): ClaudeAgent[] => {
  try {
    const stored = localStorage.getItem(AGENTS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(defaultAgents));
    return defaultAgents;
  } catch {
    return defaultAgents;
  }
};

export const useClaudeAgents = () => {
  const [agents] = useState<ClaudeAgent[]>(() => loadAgentsFromStorage());
  const categories = defaultCategories;

  const stats = useMemo(() => ({
    total: agents.length,
    byCategory: Object.fromEntries(
      defaultCategories.map(c => [c.id, agents.filter(a => a.category === c.id).length])
    ) as Record<AgentCategory, number>,
  }), [agents]);

  const getCategoryInfo = useCallback((categoryId: AgentCategory): AgentCategoryInfo | undefined => {
    return categories.find(c => c.id === categoryId);
  }, [categories]);

  const searchAgents = useCallback((
    query: string,
    categoryFilter: AgentCategory | null,
  ): ClaudeAgent[] => {
    return agents.filter(agent => {
      const matchesSearch =
        !query ||
        agent.name.toLowerCase().includes(query.toLowerCase()) ||
        agent.role.toLowerCase().includes(query.toLowerCase()) ||
        agent.description.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = !categoryFilter || agent.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [agents]);

  return {
    agents,
    categories,
    stats,
    getCategoryInfo,
    searchAgents,
  };
};
