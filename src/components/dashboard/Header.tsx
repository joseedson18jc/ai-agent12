import { Zap, Activity, Upload, Settings2, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';

type TabType = 'upload' | 'mapping' | 'analytics';

interface HeaderProps {
  tab: TabType;
  setTab: (tab: TabType) => void;
  hasEntries: boolean;
  hasMappings: boolean;
}

export const Header = ({ tab, setTab, hasEntries, hasMappings }: HeaderProps) => {
  const tabs = [
    { id: 'upload' as const, icon: Upload, label: 'Importar', disabled: false },
    { id: 'mapping' as const, icon: Settings2, label: 'Mapeamento', disabled: !hasEntries },
    { id: 'analytics' as const, icon: LayoutDashboard, label: 'Dashboard', disabled: !hasMappings },
  ];

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
              className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 ${
                tab === t.id 
                  ? 'bg-card text-primary shadow-lg' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon size={15} /> {t.label.toUpperCase()}
            </Button>
          ))}
        </nav>

        <div className="flex items-center gap-5">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
              Workspace
            </span>
            <span className="text-xs font-bold text-foreground">PRO LEVEL</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-primary transition-colors cursor-pointer">
            <Activity size={18} />
          </div>
        </div>
      </div>
    </header>
  );
};
