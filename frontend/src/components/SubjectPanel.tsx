import { EllipsisVertical, Layers3 } from "lucide-react";

interface SubjectPanelProps {
  title: string;
  cards: number;
  author: string;
  onOpen: () => void;
  onMenu: () => void;
}

const SubjectPanel = ({ title, cards, author, onOpen, onMenu }: SubjectPanelProps) => {
  return (
    <article className="flashcard-set" onClick={onOpen} role="button" tabIndex={0}>
      <div className="flashcard-set__icon">
        <Layers3 size={22} />
      </div>
      <h3>{title}</h3>
      <div className="flashcard-set__meta">
        <span>
          {cards} cards • by {author}
        </span>
        <button
          type="button"
          aria-label={`Actions for ${title}`}
          onClick={(event) => {
            event.stopPropagation();
            onMenu();
          }}
        >
          <EllipsisVertical size={16} />
        </button>
      </div>
    </article>
  );
};

export default SubjectPanel;
