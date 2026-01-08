import { Zap, Upload, Settings2, LayoutDashboard, TrendingUp, LogOut, User, Crown, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type TabType = 'upload' | 'preview' | 'mapping' | 'analytics' | 'forecast';

interface HeaderProps {
  tab: TabType;
  setTab: (tab: TabType) => void;
  hasEntries: boolean;
  hasMappings: boolean;
}

export const Header = ({ tab, setTab, hasEntries, hasMappings }: HeaderProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const tabs = [
    { id: 'upload' as const, icon: Upload, label: 'Importar', disabled: false },
    { id: 'mapping' as const, icon: Settings2, label: 'Mapeamento', disabled: !hasEntries },
    { id: 'analytics' as const, icon: LayoutDashboard, label: 'Dashboard', disabled: !hasMappings },
    { id: 'forecast' as const, icon: TrendingUp, label: 'Projeção', disabled: !hasMappings },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-2xl bg-background/70 border-b border-border/20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Logo with premium glow effect */}
        <motion.div 
          className="flex items-center gap-4 group cursor-default"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative w-12 h-12 bg-gradient-to-br from-primary via-primary to-secondary rounded-2xl flex items-center justify-center text-primary-foreground shadow-xl shadow-primary/30 rotate-3 group-hover:rotate-0 group-hover:scale-110 transition-all duration-500">
              <Zap size={24} fill="currentColor" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight leading-none flex items-center gap-2.5">
              Insight Finance
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-primary/15 to-secondary/15 rounded-full text-[9px] font-bold text-primary uppercase tracking-wider border border-primary/25 shadow-sm">
                <Crown size={10} /> Pro
              </span>
            </h1>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-[0.25em] mt-1.5">
              Strategic Intelligence
            </p>
          </div>
        </motion.div>

        {/* Premium Navigation */}
        <motion.nav 
          className="hidden lg:flex items-center gap-1 p-1.5 bg-card/50 rounded-2xl border border-border/20 backdrop-blur-xl shadow-lg"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {tabs.map((t) => (
            <motion.div key={t.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => !t.disabled && setTab(t.id)}
                disabled={t.disabled}
                className={`relative px-5 py-2.5 rounded-xl text-[10px] font-bold flex items-center gap-2.5 transition-all duration-300 ${
                  tab === t.id 
                    ? 'bg-gradient-to-r from-primary/10 to-secondary/10 text-primary shadow-md border border-primary/20' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/80'
                }`}
              >
                {tab === t.id && (
                  <motion.span 
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 to-secondary/5"
                    layoutId="activeTab"
                    transition={{ duration: 0.3 }}
                  />
                )}
                <t.icon size={14} className={tab === t.id ? 'text-primary' : ''} /> 
                <span className="relative">{t.label.toUpperCase()}</span>
              </Button>
            </motion.div>
          ))}
        </motion.nav>

        {/* User Section */}
        <motion.div 
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/onboarding')}
                className="rounded-xl text-muted-foreground hover:text-primary"
              >
                <HelpCircle size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Ver tutorial</p>
            </TooltipContent>
          </Tooltip>
          
          <ThemeToggle />
          
          {user ? (
            <>
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-widest">
                  Logado como
                </span>
                <span className="text-xs font-bold text-foreground truncate max-w-[120px]">
                  {user.email?.split('@')[0]}
                </span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-secondary/15 border border-primary/25 flex items-center justify-center text-primary hover:from-primary/25 hover:to-secondary/25 transition-all duration-300 cursor-pointer group shadow-md">
                    <div className="absolute inset-0 rounded-xl bg-primary/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                    <User size={18} className="relative" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl border-border/30 shadow-2xl backdrop-blur-xl bg-card/95">
                  <div className="px-4 py-3">
                    <p className="text-sm font-bold text-foreground truncate">{user.email}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      Conta ativa
                    </p>
                  </div>
                  <DropdownMenuSeparator className="bg-border/30" />
                  <DropdownMenuItem 
                    onClick={handleSignOut} 
                    className="text-destructive cursor-pointer rounded-xl mx-2 mb-2 hover:bg-destructive/10"
                  >
                    <LogOut size={14} className="mr-2" />
                    Sair da conta
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button
              variant="premium"
              size="sm"
              onClick={() => navigate('/auth')}
              className="rounded-xl px-6"
            >
              <User size={14} className="mr-2" />
              Entrar
            </Button>
          )}
        </motion.div>
      </div>
    </header>
  );
};
