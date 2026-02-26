import { Brain, Flame, Gamepad2, ShieldCheck, Sparkles, Sword, Trophy, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

interface HomeProps {
  onOpenPracticeModal: () => void;
  onShowMessage: (message: string) => void;
}

type QuizMode = "test" | "general";

interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
}

const questions: Record<QuizMode, QuizQuestion[]> = {
  test: [
    {
      question: "In a confidence-gated system, what should happen below threshold?",
      options: ["Generate from memory", "Return Not Found", "Search internet", "Skip citation"],
      answer: "Return Not Found"
    },
    {
      question: "Which mode is best for exam-like pressure?",
      options: ["Arcade quiz", "Mock test arena", "Casual chat", "Folder view"],
      answer: "Mock test arena"
    }
  ],
  general: [
    {
      question: "Best quick session for revision bursts?",
      options: ["General quiz arena", "Full mock test", "Upload modal", "Heatmap tab"],
      answer: "General quiz arena"
    },
    {
      question: "What keeps engagement high in gamified UI?",
      options: ["No feedback", "Static colors", "Progress + rewards", "Hidden controls"],
      answer: "Progress + rewards"
    }
  ]
};

const Home = ({ onOpenPracticeModal, onShowMessage }: HomeProps) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<QuizMode>("test");
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const currentQuestion = useMemo(() => questions[mode][index], [index, mode]);

  const selectOption = (option: string) => {
    if (selected) {
      return;
    }
    setSelected(option);
    const isCorrect = option === currentQuestion.answer;
    if (isCorrect) {
      setScore((current) => current + 10);
      onShowMessage("Correct! +10 XP");
    } else {
      onShowMessage(`Incorrect. Correct answer: ${currentQuestion.answer}`);
    }
  };

  const nextQuestion = () => {
    const list = questions[mode];
    setSelected(null);
    setIndex((current) => (current + 1) % list.length);
  };

  return (
    <div className="home-shell">
      <section className="game-hero">
        <div className="game-hero__content">
          <span className="eyebrow">Gamified study cockpit</span>
          <h1>Level up your preparation with missions, XP and quiz battles</h1>
          <p>
            A clean skeleton to build on: fewer blocks, clearer actions, and fun-first learning flow for test
            prep + general practice.
          </p>
          <div className="hero-actions">
            <button type="button" onClick={onOpenPracticeModal}>
              <Sword size={18} />
              Launch Test Mission
            </button>
            <button
              type="button"
              className="button-ghost"
              onClick={() => navigate("/flashcards")}
            >
              <Brain size={18} />
              Open Quiz Workspace
            </button>
          </div>
        </div>

        <div className="game-scene" aria-hidden="true">
          <div className="scene-orb"></div>
          <div className="scene-ring"></div>
          <div className="scene-chip chip-a"></div>
          <div className="scene-chip chip-b"></div>
          <div className="scene-chip chip-c"></div>
        </div>
      </section>

      <section className="hud-strip">
        <article>
          <Flame size={18} />
          <strong>7 day streak</strong>
          <span>Keep it burning</span>
        </article>
        <article>
          <Zap size={18} />
          <strong>{score} XP</strong>
          <span>From quick rounds</span>
        </article>
        <article>
          <Trophy size={18} />
          <strong>Gold League</strong>
          <span>Top 12% this week</span>
        </article>
      </section>

      <section className="arena-grid">
        <article className="arena-card arena-card--test">
          <div className="arena-head">
            <ShieldCheck size={20} />
            <h3>Test Arena</h3>
          </div>
          <p>Timed mock tests with stricter scoring and confidence-aware hints.</p>
          <div className="tag-row">
            <span>Timed rounds</span>
            <span>Ranked mode</span>
            <span>Exam scope</span>
          </div>
          <button type="button" onClick={onOpenPracticeModal}>
            Start test arena
          </button>
        </article>

        <article className="arena-card arena-card--quiz">
          <div className="arena-head">
            <Gamepad2 size={20} />
            <h3>General Quiz Arena</h3>
          </div>
          <p>Fast and playful quizzes for memory, speed, and concept retention.</p>
          <div className="tag-row">
            <span>Quick play</span>
            <span>Bonus XP</span>
            <span>Topic shuffle</span>
          </div>
          <button type="button" onClick={() => navigate("/flashcards")}>
            Play quick quiz
          </button>
        </article>
      </section>

      <section className="quiz-play">
        <div className="quiz-play__header">
          <h2>Quiz play</h2>
          <div className="mode-switch">
            <button
              type="button"
              className={mode === "test" ? "active" : ""}
              onClick={() => {
                setMode("test");
                setIndex(0);
                setSelected(null);
              }}
            >
              Test mode
            </button>
            <button
              type="button"
              className={mode === "general" ? "active" : ""}
              onClick={() => {
                setMode("general");
                setIndex(0);
                setSelected(null);
              }}
            >
              General quiz
            </button>
          </div>
        </div>

        <article className="question-card">
          <span className="question-chip">
            <Sparkles size={14} />
            {mode === "test" ? "Mission challenge" : "Arcade challenge"}
          </span>
          <h3>{currentQuestion.question}</h3>
          <div className="option-grid">
            {currentQuestion.options.map((option) => {
              const isChosen = selected === option;
              const isAnswer = currentQuestion.answer === option;
              const stateClass = selected
                ? isAnswer
                  ? "correct"
                  : isChosen
                    ? "wrong"
                    : ""
                : "";

              return (
                <button
                  key={option}
                  type="button"
                  className={`option-button ${stateClass}`}
                  onClick={() => selectOption(option)}
                >
                  {option}
                </button>
              );
            })}
          </div>
          <div className="question-footer">
            <button type="button" onClick={nextQuestion}>
              Next question
            </button>
            <button type="button" className="button-ghost" onClick={() => navigate("/subject/jee-main")}>
              View exam dashboard
            </button>
          </div>
        </article>
      </section>
    </div>
  );
};

export default Home;
