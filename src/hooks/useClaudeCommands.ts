import { useState, useMemo, useCallback } from 'react';
import { claudeCommands as defaultCommands, commandCategories as defaultCategories, type ClaudeCommand, type CommandCategoryInfo, type CommandCategory } from '@/data/claudeCommands';

const COMMANDS_STORAGE_KEY = 'claude-commands';

const loadCommandsFromStorage = (): ClaudeCommand[] => {
  try {
    const stored = localStorage.getItem(COMMANDS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    localStorage.setItem(COMMANDS_STORAGE_KEY, JSON.stringify(defaultCommands));
    return defaultCommands;
  } catch {
    return defaultCommands;
  }
};

export const useClaudeCommands = () => {
  const [commands] = useState<ClaudeCommand[]>(() => loadCommandsFromStorage());
  const categories = defaultCategories;

  const stats = useMemo(() => ({
    total: commands.length,
    byCategory: Object.fromEntries(
      defaultCategories.map(c => [c.id, commands.filter(cmd => cmd.category === c.id).length])
    ) as Record<CommandCategory, number>,
  }), [commands]);

  const getCategoryInfo = useCallback((categoryId: CommandCategory): CommandCategoryInfo | undefined => {
    return categories.find(c => c.id === categoryId);
  }, [categories]);

  const searchCommands = useCallback((
    query: string,
    categoryFilter: CommandCategory | null,
  ): ClaudeCommand[] => {
    return commands.filter(cmd => {
      const matchesSearch =
        !query ||
        cmd.name.toLowerCase().includes(query.toLowerCase()) ||
        cmd.description.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = !categoryFilter || cmd.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [commands]);

  return {
    commands,
    categories,
    stats,
    getCategoryInfo,
    searchCommands,
  };
};
