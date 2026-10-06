import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, ExternalLink, Filter, Bot, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/dashboard/ThemeToggle';
import { useClaudeAgents } from '@/hooks/useClaudeAgents';
import type { ClaudeAgent, AgentCategory } from '@/data/claudeAgents';

const ClaudeAgents = () => {
  const navigate = useNavigate();
  const { agents, categories, stats, searchAgents, getCategoryInfo } = useClaudeAgents();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AgentCategory | null>(null);

  const filteredAgents = useMemo(() => {
    return searchAgents(search, selectedCategory);
  }, [search, selectedCategory, searchAgents]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-background/70 border-b border-border/20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-20 flex items-center justify-between">
          <motion.div
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="rounded-xl text-muted-foreground hover:text-primary"
            >
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight leading-none flex items-center gap-2">
                <Bot size={22} className="text-primary" />
                Claude Agents
              </h1>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-[0.25em] mt-1.5">
                Specialized Subagents
              </p>
            </div>
          </motion.div>

          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <a
              href="https://github.com/affaan-m/everything-claude-code"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="rounded-xl gap-2 text-xs">
                <ExternalLink size={14} />
                Source
              </Button>
            </a>
            <ThemeToggle />
          </motion.div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {/* Stats */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="border-border/30 bg-card/50 col-span-2 md:col-span-1">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Agents</p>
            </CardContent>
          </Card>
          {categories.map((cat) => (
            <Card key={cat.id} className="border-border/30 bg-card/50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-primary">{stats.byCategory[cat.id]}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{cat.icon} {cat.label.split(' ')[0]}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Search & Filters */}
        <motion.div
          className="space-y-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="Search agents by name, role, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl border-border/30 bg-card/50"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="rounded-xl text-xs"
            >
              <Filter size={12} className="mr-1.5" />
              All Categories
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                className="rounded-xl text-xs"
              >
                <span className="mr-1.5">{cat.icon}</span>
                {cat.label}
              </Button>
            ))}
          </div>
        </motion.div>

        <p className="text-sm text-muted-foreground mb-4">
          Showing {filteredAgents.length} of {agents.length} agents
        </p>

        {/* Agents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredAgents.map((agent, index) => (
              <AgentCard key={agent.id} agent={agent} index={index} getCategoryInfo={getCategoryInfo} />
            ))}
          </AnimatePresence>
        </div>

        {filteredAgents.length === 0 && (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-muted-foreground text-lg">No agents found matching your filters.</p>
            <Button
              variant="outline"
              className="mt-4 rounded-xl"
              onClick={() => {
                setSearch('');
                setSelectedCategory(null);
              }}
            >
              Clear filters
            </Button>
          </motion.div>
        )}

        {/* Navigation Links */}
        <motion.div
          className="flex flex-wrap gap-3 mt-12 pt-8 border-t border-border/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button variant="outline" className="rounded-xl text-xs gap-2" onClick={() => navigate('/claude-skills')}>
            View Skills Catalog
          </Button>
          <Button variant="outline" className="rounded-xl text-xs gap-2" onClick={() => navigate('/claude-commands')}>
            View Slash Commands
          </Button>
        </motion.div>
      </main>
    </div>
  );
};

interface AgentCardProps {
  agent: ClaudeAgent;
  index: number;
  getCategoryInfo: (id: AgentCategory) => { id: string; label: string; icon: string; description: string } | undefined;
}

const AgentCard = ({ agent, index, getCategoryInfo }: AgentCardProps) => {
  const category = getCategoryInfo(agent.category);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className="h-full border-border/30 bg-card/50 hover:bg-card/80 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bot size={16} className="text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-mono font-bold text-foreground group-hover:text-primary transition-colors">
                  {agent.name}
                </CardTitle>
                <p className="text-[10px] text-primary/70 font-medium">{agent.role}</p>
              </div>
            </div>
            {category && (
              <Badge variant="outline" className="shrink-0 text-[10px] bg-primary/5 text-primary/80 border-primary/20">
                {category.icon} {category.label.split(' ')[0]}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">{agent.description}</p>
          <div className="flex flex-wrap gap-1.5">
            {agent.capabilities.map((cap) => (
              <span
                key={cap}
                className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground"
              >
                <Zap size={8} />
                {cap}
              </span>
            ))}
          </div>
          <div className="flex items-center justify-end pt-1">
            <a
              href={agent.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-primary/60 hover:text-primary flex items-center gap-1 transition-colors"
            >
              {agent.source}
              <ExternalLink size={10} />
            </a>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ClaudeAgents;
