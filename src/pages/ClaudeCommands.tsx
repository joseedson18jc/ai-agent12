import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, ExternalLink, Filter, Terminal, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/dashboard/ThemeToggle';
import { useClaudeCommands } from '@/hooks/useClaudeCommands';
import type { ClaudeCommand, CommandCategory } from '@/data/claudeCommands';

const ClaudeCommands = () => {
  const navigate = useNavigate();
  const { commands, categories, stats, searchCommands, getCategoryInfo } = useClaudeCommands();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CommandCategory | null>(null);

  const filteredCommands = useMemo(() => {
    return searchCommands(search, selectedCategory);
  }, [search, selectedCategory, searchCommands]);

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
                <Terminal size={22} className="text-primary" />
                Slash Commands
              </h1>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-[0.25em] mt-1.5">
                Quick Actions
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
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="border-border/30 bg-card/50">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Commands</p>
            </CardContent>
          </Card>
          {categories.slice(0, 4).map((cat) => (
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
              placeholder="Search commands by name or description..."
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
          Showing {filteredCommands.length} of {commands.length} commands
        </p>

        {/* Commands Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredCommands.map((cmd, index) => (
              <CommandCard key={cmd.id} command={cmd} index={index} getCategoryInfo={getCategoryInfo} />
            ))}
          </AnimatePresence>
        </div>

        {filteredCommands.length === 0 && (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-muted-foreground text-lg">No commands found matching your filters.</p>
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
          <Button variant="outline" className="rounded-xl text-xs gap-2" onClick={() => navigate('/claude-agents')}>
            View Agents
          </Button>
        </motion.div>
      </main>
    </div>
  );
};

interface CommandCardProps {
  command: ClaudeCommand;
  index: number;
  getCategoryInfo: (id: CommandCategory) => { id: string; label: string; icon: string; description: string } | undefined;
}

const CommandCard = ({ command, index, getCategoryInfo }: CommandCardProps) => {
  const category = getCategoryInfo(command.category);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(command.name);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
    >
      <Card className="h-full border-border/30 bg-card/50 hover:bg-card/80 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-mono font-bold text-emerald-500 group-hover:text-emerald-400 transition-colors">
                {command.name}
              </CardTitle>
              <button
                onClick={handleCopy}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
              >
                {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              </button>
            </div>
            {category && (
              <Badge variant="outline" className="shrink-0 text-[10px] bg-muted/30 text-muted-foreground border-border/30">
                {category.icon} {category.label.split(' ')[0]}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">{command.description}</p>
          <div className="bg-muted/30 rounded-lg px-3 py-2 font-mono text-[11px] text-primary/80">
            {command.usage}
          </div>
          <div className="flex items-center justify-end">
            <a
              href={command.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-primary/60 hover:text-primary flex items-center gap-1 transition-colors"
            >
              {command.source}
              <ExternalLink size={10} />
            </a>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ClaudeCommands;
