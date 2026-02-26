import { ArrowLeftRight, Play, RotateCcw, Shield, Sparkles, Swords, Trophy, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface HomeProps {
  onOpenPracticeModal: () => void;
  onShowMessage: (message: string) => void;
}

type IslandKey = "kind" | "reality" | "mindful" | "treasure";
type ArenaMode = "test" | "quiz";

interface IslandData {
  key: IslandKey;
  title: string;
  subtitle: string;
  description: string;
  color: string;
}

interface QuizRound {
  prompt: string;
  choices: string[];
  answer: number;
}

const islands: IslandData[] = [
  {
    key: "kind",
    title: "Kind Kingdom",
    subtitle: "It's cool to be kind",
    description: "Block troublemakers and spread good vibes to climb the kingdom.",
    color: "kind"
  },
  {
    key: "reality",
    title: "Reality River",
    subtitle: "Don't fall for fake",
    description: "Spot scams and phishers before they trick your crew.",
    color: "reality"
  },
  {
    key: "mindful",
    title: "Mindful Mountain",
    subtitle: "Share with care",
    description: "Route every post to the right audience and avoid oversharing.",
    color: "mindful"
  },
  {
    key: "treasure",
    title: "Tower of Treasure",
    subtitle: "Secure your secrets",
    description: "Collect private data and defend it with strong passwords.",
    color: "treasure"
  }
];

const rounds: Record<IslandKey, QuizRound[]> = {
  kind: [
    {
      prompt: "Someone is being rude in comments. What is the best first move?",
      choices: ["Reply with worse language", "Block/report and inform an adult", "Share their profile publicly"],
      answer: 1
    },
    {
      prompt: "What helps make online communities healthier?",
      choices: ["Positive and respectful replies", "Sharing rumors", "Ignoring every message"],
      answer: 0
    }
  ],
  reality: [
    {
      prompt: "A popup says 'You won a free phone'. What should you do?",
      choices: ["Click now", "Ignore and close", "Enter email to verify"],
      answer: 1
    },
    {
      prompt: "Best way to validate a surprising claim?",
      choices: ["Forward immediately", "Check two trusted sources", "Trust only comments"],
      answer: 1
    }
  ],
  mindful: [
    {
      prompt: "A post includes your address. Best action?",
      choices: ["Post publicly", "Share with everyone", "Send to lockbox/trash"],
      answer: 2
    },
    {
      prompt: "Before posting, you should:",
      choices: ["Pause and verify audience", "Post first, think later", "Tag everyone"],
      answer: 0
    }
  ],
  treasure: [
    {
      prompt: "Which password is strongest?",
      choices: ["banana123", "S7#p!mR2q@", "myname2008"],
      answer: 1
    },
    {
      prompt: "Best account protection habit?",
      choices: ["Use one password everywhere", "Share password with friends", "Unique passwords + private"],
      answer: 2
    }
  ]
};

const Home = ({ onOpenPracticeModal, onShowMessage }: HomeProps) => {
  const [selectedIsland, setSelectedIsland] = useState<IslandData | null>(null);
  const [arenaMode, setArenaMode] = useState<ArenaMode>("test");
  const [roundIndex, setRoundIndex] = useState(0);
  const [focusIndex, setFocusIndex] = useState(0);
  const [xp, setXp] = useState(90);
  const [streak, setStreak] = useState(3);
  const [completed, setCompleted] = useState<Record<IslandKey, boolean>>({
    kind: false,
    reality: false,
    mindful: false,
    treasure: false
  });

  const activeKey = selectedIsland?.key ?? "kind";
  const currentRounds = rounds[activeKey];
  const currentRound = currentRounds[roundIndex];

  const progress = useMemo(() => {
    const total = Object.values(completed).filter(Boolean).length;
    return Math.round((total / islands.length) * 100);
  }, [completed]);

  const onChoice = (choiceIndex: number) => {
    if (!selectedIsland) {
      return;
    }

    if (choiceIndex === currentRound.answer) {
      onShowMessage("Correct move. +20 XP");
      setXp((value) => value + 20);
      if (roundIndex === currentRounds.length - 1) {
        setCompleted((prev) => ({ ...prev, [selectedIsland.key]: true }));
        setSelectedIsland(null);
        setRoundIndex(0);
        setFocusIndex(0);
        setStreak((value) => value + 1);
        return;
      }
      setRoundIndex((value) => value + 1);
      setFocusIndex(0);
      return;
    }

    onShowMessage("Not quite. Try again.");
  };

  useEffect(() => {
    if (!selectedIsland) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        setFocusIndex((value) => (value - 1 + currentRound.choices.length) % currentRound.choices.length);
      }
      if (event.key === "ArrowRight") {
        setFocusIndex((value) => (value + 1) % currentRound.choices.length);
      }
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        onChoice(focusIndex);
      }
      if (event.key === "Escape") {
        setSelectedIsland(null);
        setRoundIndex(0);
        setFocusIndex(0);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentRound.choices.length, focusIndex, selectedIsland]);

  return (
    <div className="interland-shell">
      <header className="interland-header">
        <div>
          <p>Be Internet Awesome</p>
          <h1>Interland-inspired Game Map</h1>
          <span>Play your way to safer, smarter online behavior</span>
        </div>
        <div className="interland-hud">
          <article>
            <Sparkles size={16} />
            <div>
              <strong>{xp}</strong>
              <span>XP</span>
            </div>
          </article>
          <article>
            <Trophy size={16} />
            <div>
              <strong>{progress}%</strong>
              <span>World Progress</span>
            </div>
          </article>
          <article>
            <Swords size={16} />
            <div>
              <strong>{streak}</strong>
              <span>Streak</span>
            </div>
          </article>
        </div>
      </header>

      <section className="interland-map">
        <div className="sky-layer cloud-a"></div>
        <div className="sky-layer cloud-b"></div>
        <div className="sky-layer cloud-c"></div>

        {islands.map((island) => (
          <article className={`island-card island-${island.color}`} key={island.key}>
            <div className="island-top">
              <span>{island.subtitle}</span>
              {completed[island.key] ? <Shield size={16} /> : null}
            </div>
            <h3>{island.title}</h3>
            <p>{island.description}</p>
            <div className="island-actions">
              <button
                type="button"
                onClick={() => {
                  setSelectedIsland(island);
                  setRoundIndex(0);
                  setFocusIndex(0);
                }}
              >
                <Play size={15} />
                Play
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setCompleted((prev) => ({ ...prev, [island.key]: false }));
                  onShowMessage(`${island.title} progress reset.`);
                }}
              >
                <RotateCcw size={15} />
                Replay
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className="arena-section">
        <div className="arena-head">
          <h2>Game Modes</h2>
          <div className="arena-toggle">
            <button
              type="button"
              className={arenaMode === "test" ? "active" : ""}
              onClick={() => setArenaMode("test")}
            >
              Test Arena
            </button>
            <button
              type="button"
              className={arenaMode === "quiz" ? "active" : ""}
              onClick={() => setArenaMode("quiz")}
            >
              General Quiz
            </button>
          </div>
        </div>

        {arenaMode === "test" ? (
          <article className="arena-card interland-panel">
            <h3>Test Arena Mission</h3>
            <p>Timed challenge with stricter scoring and subject-scoped practice flow.</p>
            <ul>
              <li>5 MCQ + 3 short answers</li>
              <li>Confidence-tagged feedback</li>
              <li>Source-citation review</li>
            </ul>
            <button type="button" onClick={onOpenPracticeModal}>
              Launch Test Arena
            </button>
          </article>
        ) : (
          <article className="arena-card interland-panel">
            <h3>General Quiz Arena</h3>
            <p>Fast arcade mode with rotating micro-questions and combo streaks.</p>
            <ul>
              <li>Short rounds with instant feedback</li>
              <li>XP rewards per correct choice</li>
              <li>Keyboard or touch controls</li>
            </ul>
            <button
              type="button"
              onClick={() => {
                setSelectedIsland(islands[1]);
                setRoundIndex(0);
                setFocusIndex(0);
              }}
            >
              Play Quick Quiz
            </button>
          </article>
        )}
      </section>

      {selectedIsland ? (
        <div className="interland-overlay">
          <div className="interland-modal">
            <header>
              <div>
                <p>{selectedIsland.subtitle}</p>
                <h3>{selectedIsland.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedIsland(null);
                  setRoundIndex(0);
                  setFocusIndex(0);
                }}
                aria-label="Close challenge"
              >
                <X size={18} />
              </button>
            </header>

            <div className="challenge-hud">
              <span>
                Round {roundIndex + 1}/{currentRounds.length}
              </span>
              <span>
                <ArrowLeftRight size={14} /> Use arrow keys
              </span>
              <span>Press Enter/Space to select</span>
            </div>

            <div className="challenge-card">
              <h4>{currentRound.prompt}</h4>
              <div className="challenge-choices">
                {currentRound.choices.map((choice, idx) => (
                  <button
                    key={choice}
                    type="button"
                    className={focusIndex === idx ? "focused" : ""}
                    onMouseEnter={() => setFocusIndex(idx)}
                    onClick={() => onChoice(idx)}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Home;
