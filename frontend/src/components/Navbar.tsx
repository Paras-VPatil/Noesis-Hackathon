import { ChevronDown, Plus, Search } from "lucide-react";
import { useState } from "react";

interface NavbarProps {
  searchValue: string;
  searchPlaceholder: string;
  avatarUrl?: string;
  onSearchChange: (value: string) => void;
  onOpenPracticeModal: () => void;
  onOpenStudyGuidesModal: () => void;
  onUpgradeClick: () => void;
}

const Navbar = ({
  searchValue,
  searchPlaceholder,
  avatarUrl,
  onSearchChange,
  onOpenPracticeModal,
  onOpenStudyGuidesModal,
  onUpgradeClick
}: NavbarProps) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="topbar">
      <div className="search-shell">
        <Search size={26} />
        <input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label="Search"
        />
      </div>

      <div className="topbar-actions">
        <div className="action-menu-wrap">
          <button
            className="icon-circle"
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            aria-label="Open quick actions"
          >
            <Plus size={28} />
          </button>

          {menuOpen ? (
            <div className="action-menu">
              <button
                type="button"
                onClick={() => {
                  onOpenPracticeModal();
                  setMenuOpen(false);
                }}
              >
                Generate practice tests
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenStudyGuidesModal();
                  setMenuOpen(false);
                }}
              >
                Generate study guides
              </button>
            </div>
          ) : null}
        </div>

        <button className="trial-button" type="button" onClick={onUpgradeClick}>
          Upgrade: Free 7-day trial
        </button>

        <button className="profile-button" type="button">
          <img src={avatarUrl} alt="Profile avatar" />
          <ChevronDown size={15} />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
