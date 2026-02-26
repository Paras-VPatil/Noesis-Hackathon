import {
  Bell,
  BookOpenCheck,
  Folder,
  Home,
  Library,
  Menu,
  Plus,
  UsersRound
} from "lucide-react";
import type { FolderItem } from "../types/subject";

interface SidebarProps {
  activePath: string;
  folders: FolderItem[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate: (path: string) => void;
  onAddFolder: () => void;
}

const navItems = [
  { path: "/", label: "Home", icon: Home },
  { path: "/library", label: "Your library", icon: Library },
  { path: "/study-groups", label: "Study groups", icon: UsersRound, badge: "New" },
  { path: "/notifications", label: "Notifications", icon: Bell, alertCount: 1 }
];

const Sidebar = ({
  activePath,
  folders,
  collapsed,
  onToggleCollapse,
  onNavigate,
  onAddFolder
}: SidebarProps) => {
  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="brand-row">
        <button className="ghost-icon" type="button" onClick={onToggleCollapse} aria-label="Toggle sidebar">
          <Menu size={29} />
        </button>
        <button className="brand-icon" type="button" onClick={() => onNavigate("/")}>
          Q
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.path}
            className={activePath === item.path ? "active" : ""}
            type="button"
            onClick={() => onNavigate(item.path)}
          >
            <item.icon size={21} />
            <span>{item.label}</span>
            {item.badge ? <small>{item.badge}</small> : null}
            {item.alertCount ? <em>{item.alertCount}</em> : null}
          </button>
        ))}
      </nav>

      <section className="sidebar-section">
        <h4>Your folders</h4>
        <button type="button" onClick={onAddFolder}>
          <Plus size={22} />
          <span>New folder</span>
        </button>
        {folders.map((folder) => (
          <article key={folder.id}>
            <Folder size={18} />
            <span>{folder.name}</span>
          </article>
        ))}
      </section>

      <section className="sidebar-section">
        <h4>Exams</h4>
        <button type="button" onClick={() => onNavigate("/subject/jee-main")}>
          <BookOpenCheck size={18} />
          <span>JEE Main</span>
        </button>
        <button type="button" onClick={() => onNavigate("/subject/neet")}>
          <BookOpenCheck size={18} />
          <span>NEET</span>
        </button>
      </section>

      <section className="sidebar-section footer">
        <h4>Start here</h4>
        <button type="button" onClick={() => onNavigate("/flashcards")}>
          <BookOpenCheck size={18} />
          <span>Flashcards</span>
        </button>
      </section>
    </aside>
  );
};

export default Sidebar;
