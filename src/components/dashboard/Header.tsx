import { Zap, Activity, Upload, Settings2, LayoutDashboard, TrendingUp, LogOut, User } from 'lucide-react';
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
    <header className="glass-card sticky top-0 z-50 border-b border-border/50 backdrop-blur-2xl">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground shadow-xl rotate-3 hover:rotate-0 transition-transform cursor-default">
            <Zap size={22} fill="currentColor" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight leading-none uppercase">
              Insight Finance
            </h1>
            <p className="text-[10px] text-primary font-bold uppercase tracking-[0.25em] mt-1.5">
              Strategic Intelligence
            </p>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-1.5 p-1.5 bg-muted/50 rounded-2xl border border-border/50">
          {tabs.map((t) => (
            <Button
              key={t.id}
              variant={tab === t.id ? "default" : "ghost"}
              size="sm"
              onClick={() => !t.disabled && setTab(t.id)}
              disabled={t.disabled}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-bold flex items-center gap-2 ${
                tab === t.id 
                  ? 'bg-card text-primary shadow-lg' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon size={14} /> {t.label.toUpperCase()}
            </Button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          
          {user ? (
            <>
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                  Logado como
                </span>
                <span className="text-xs font-bold text-foreground truncate max-w-[120px]">
                  {user.email?.split('@')[0]}
                </span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors cursor-pointer">
                    <User size={18} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-xs font-medium text-foreground truncate">{user.email}</p>
                    <p className="text-[10px] text-muted-foreground">Conta ativa</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                    <LogOut size={14} className="mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate('/auth')}
              className="rounded-xl px-4"
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
