import { Bell, BookOpenCheck, Home, Library, Menu } from "lucide-react";
import type { Subject } from "../types/subject";

interface SidebarProps {
  activePath: string;
  subjects: Subject[];
  selectedSubjectId: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate: (path: string) => void;
  onSelectSubject: (subjectId: string) => void;
}

const navItems = [
  { path: "/", label: "Home", icon: Home },
  { path: "/flashcards", label: "Notes Q&A", icon: BookOpenCheck },
  { path: "/library", label: "Dashboard", icon: Library },
  { path: "/notifications", label: "Notifications", icon: Bell, alertCount: 1 }
];

const Sidebar = ({
  activePath,
  subjects,
  selectedSubjectId,
  collapsed,
  onToggleCollapse,
  onNavigate,
  onSelectSubject
}: SidebarProps) => {
  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="brand-row">
        <button className="ghost-icon" type="button" onClick={onToggleCollapse} aria-label="Toggle sidebar">
          <Menu size={29} />
        </button>
        <button className="brand-icon" type="button" onClick={() => onNavigate("/")}>
          A
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
            {item.alertCount ? <em>{item.alertCount}</em> : null}
          </button>
        ))}
      </nav>

      <section className="sidebar-section">
        <h4>Subjects (fixed: 3)</h4>
        {subjects.map((subject) => (
          <button
            key={subject.id}
            type="button"
            className={subject.id === selectedSubjectId ? "active" : ""}
            onClick={() => onSelectSubject(subject.id)}
          >
            <BookOpenCheck size={18} />
            <span>{subject.name}</span>
          </button>
        ))}
      </section>

      <section className="sidebar-section footer">
        <h4>Scope guard</h4>
        <article>
          <span>Q&A and mission are locked to the selected subject notes only.</span>
        </article>
      </section>
    </aside>
  );
};

export default Sidebar;
