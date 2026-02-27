import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, ExternalLink, CheckCircle2, Users, AlertCircle, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/dashboard/ThemeToggle';
import { useClaudeSkills } from '@/hooks/useClaudeSkills';
import type { ClaudeSkill } from '@/data/claudeSkills';

const statusConfig = {
  verified: { label: 'Verified', icon: CheckCircle2, className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25' },
  community: { label: 'Community', icon: Users, className: 'bg-blue-500/15 text-blue-600 border-blue-500/25' },
  needed: { label: 'Needed', icon: AlertCircle, className: 'bg-amber-500/15 text-amber-600 border-amber-500/25' },
};

const ClaudeSkills = () => {
  const navigate = useNavigate();
  const { skills, categories, stats, searchSkills, getCategoryInfo } = useClaudeSkills();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const filteredSkills = useMemo(() => {
    return searchSkills(search, selectedCategory, selectedStatus);
  }, [search, selectedCategory, selectedStatus, searchSkills]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
              <h1 className="text-xl font-bold text-foreground tracking-tight leading-none">
                Claude Skills
              </h1>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-[0.25em] mt-1.5">
                Awesome Collection
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
              href="https://github.com/karanb192/awesome-claude-skills"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="rounded-xl gap-2 text-xs">
                <ExternalLink size={14} />
                GitHub
              </Button>
            </a>
            <ThemeToggle />
          </motion.div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {/* Stats */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {[
            { label: 'Total Skills', value: stats.total, color: 'text-foreground' },
            { label: 'Verified', value: stats.verified, color: 'text-emerald-500' },
            { label: 'Community', value: stats.community, color: 'text-blue-500' },
            { label: 'Needed', value: stats.needed, color: 'text-amber-500' },
          ].map((stat) => (
            <Card key={stat.label} className="border-border/30 bg-card/50">
              <CardContent className="p-4 text-center">
                <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
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
              placeholder="Search skills by name or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl border-border/30 bg-card/50"
            />
          </div>

          {/* Category filters */}
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

          {/* Status filters */}
          <div className="flex gap-2">
            <Button
              variant={selectedStatus === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStatus(null)}
              className="rounded-xl text-xs"
            >
              All Status
            </Button>
            {Object.entries(statusConfig).map(([key, config]) => (
              <Button
                key={key}
                variant={selectedStatus === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus(selectedStatus === key ? null : key)}
                className="rounded-xl text-xs gap-1.5"
              >
                <config.icon size={12} />
                {config.label}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground mb-4">
          Showing {filteredSkills.length} of {skills.length} skills
        </p>

        {/* Skills Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredSkills.map((skill, index) => (
              <SkillCard key={skill.id} skill={skill} index={index} getCategoryInfo={getCategoryInfo} />
            ))}
          </AnimatePresence>
        </div>

        {filteredSkills.length === 0 && (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-muted-foreground text-lg">No skills found matching your filters.</p>
            <Button
              variant="outline"
              className="mt-4 rounded-xl"
              onClick={() => {
                setSearch('');
                setSelectedCategory(null);
                setSelectedStatus(null);
              }}
            >
              Clear filters
            </Button>
          </motion.div>
        )}
      </main>
    </div>
  );
};

interface SkillCardProps {
  skill: ClaudeSkill;
  index: number;
  getCategoryInfo: (id: string) => { id: string; label: string; icon: string; description: string } | undefined;
}

const SkillCard = ({ skill, index, getCategoryInfo }: SkillCardProps) => {
  const status = statusConfig[skill.status];
  const category = getCategoryInfo(skill.category);
  const StatusIcon = status.icon;

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
            <CardTitle className="text-sm font-mono font-bold text-foreground group-hover:text-primary transition-colors">
              {skill.name}
            </CardTitle>
            <Badge variant="outline" className={`shrink-0 text-[10px] ${status.className}`}>
              <StatusIcon size={10} className="mr-1" />
              {status.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">{skill.description}</p>
          <div className="flex items-center justify-between">
            {category && (
              <span className="text-[10px] text-muted-foreground/70">
                {category.icon} {category.label}
              </span>
            )}
            <a
              href={skill.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-primary/60 hover:text-primary flex items-center gap-1 transition-colors"
            >
              {skill.source}
              <ExternalLink size={10} />
            </a>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ClaudeSkills;
