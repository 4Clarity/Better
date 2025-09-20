import { cn } from './ui/utils';
import { Button } from './ui/button';
import { type NavigationItem } from '../App';

interface SidebarProps {
  navigationItems: NavigationItem[];
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function Sidebar({ navigationItems, activeSection, onSectionChange }: SidebarProps) {
  return (
    <aside className="w-64 bg-card border-r border-border p-4">
      <div className="mb-8">
        <h1 className="text-xl font-semibold">Knowledge Curator</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage and curate product knowledge</p>
      </div>
      
      <nav className="space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.id}
              variant={activeSection === item.id ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start",
                activeSection === item.id && "bg-secondary"
              )}
              onClick={() => onSectionChange(item.id)}
            >
              <Icon className="mr-3 h-4 w-4" />
              {item.title}
            </Button>
          );
        })}
      </nav>
    </aside>
  );
}