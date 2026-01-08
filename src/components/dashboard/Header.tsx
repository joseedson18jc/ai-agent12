import { Zap, Upload, Settings2, LayoutDashboard, TrendingUp, LogOut, User, Crown } from 'lucide-react';
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
    <header className="sticky top-0 z-50 backdrop-blur-2xl bg-background/80 border-b border-border/30">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo with premium glow effect */}
        <div className="flex items-center gap-4 group cursor-default">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/25 rotate-3 group-hover:rotate-0 group-hover:scale-110 transition-all duration-300">
              <Zap size={24} fill="currentColor" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight leading-none flex items-center gap-2">
              Insight Finance
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full text-[9px] font-bold text-primary uppercase tracking-wider border border-primary/20">
                <Crown size={10} /> Pro
              </span>
            </h1>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-[0.2em] mt-1">
              Strategic Intelligence
            </p>
          </div>
        </div>

        {/* Premium Navigation */}
        <nav className="hidden lg:flex items-center gap-1 p-1.5 bg-muted/30 rounded-2xl border border-border/30 backdrop-blur-sm">
          {tabs.map((t, index) => (
            <Button
              key={t.id}
              variant="ghost"
              size="sm"
              onClick={() => !t.disabled && setTab(t.id)}
              disabled={t.disabled}
              className={`relative px-5 py-2.5 rounded-xl text-[10px] font-bold flex items-center gap-2 transition-all duration-300 ${
                tab === t.id 
                  ? 'bg-card text-primary shadow-lg shadow-primary/10' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
              }`}
            >
              {tab === t.id && (
                <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 to-secondary/5 animate-pulse" />
              )}
              <t.icon size={14} className={tab === t.id ? 'text-primary' : ''} /> 
              <span className="relative">{t.label.toUpperCase()}</span>
            </Button>
          ))}
        </nav>

        {/* User Section */}
        <div className="flex items-center gap-3">
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
                  <button className="relative w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 flex items-center justify-center text-primary hover:from-primary/30 hover:to-secondary/30 transition-all duration-300 cursor-pointer group">
                    <div className="absolute inset-0 rounded-full bg-primary/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                    <User size={18} className="relative" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-2xl border-border/50 shadow-xl">
                  <div className="px-3 py-2">
                    <p className="text-sm font-semibold text-foreground truncate">{user.email}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      Conta ativa
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer rounded-xl mx-1 mb-1">
                    <LogOut size={14} className="mr-2" />
                    Sair da conta
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate('/auth')}
              className="rounded-xl px-5 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow"
            >
              <User size={14} className="mr-2" />
              Entrar
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
