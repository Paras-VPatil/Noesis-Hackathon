import { useMemo, useState } from "react";
import type { SourceFormat } from "../types/document";

interface HeatCell {
  id: string;
  label: string;
  format: SourceFormat;
  coverage: number;
}

const mockCells: HeatCell[] = [
  { id: "c1", label: "PDF • Page 43", format: "PDF", coverage: 88 },
  { id: "c2", label: "PDF • Page 45", format: "PDF", coverage: 62 },
  { id: "c3", label: "PPTX • Slide 12", format: "PPTX", coverage: 23 },
  { id: "c4", label: "DOCX • Section 2.3", format: "DOCX", coverage: 47 },
  { id: "c5", label: "XLSX • Sheet Reactions", format: "XLSX", coverage: 14 },
  { id: "c6", label: "IMAGE • diagram_p3.jpg", format: "IMAGE", coverage: 6 }
];

const filters: Array<SourceFormat | "ALL"> = [
  "ALL",
  "PDF",
  "DOCX",
  "PPTX",
  "XLSX",
  "TXT",
  "IMAGE",
  "GDOC"
];

const cellClassForCoverage = (coverage: number) => {
  if (coverage >= 65) {
    return "heat-cell hot";
  }
  if (coverage >= 35) {
    return "heat-cell warm";
  }
  if (coverage >= 15) {
    return "heat-cell cool";
  }
  return "heat-cell cold";
};

const Heatmap = () => {
  const [filter, setFilter] = useState<SourceFormat | "ALL">("ALL");

  const cells = useMemo(() => {
    if (filter === "ALL") {
      return mockCells;
    }
    return mockCells.filter((cell) => cell.format === filter);
  }, [filter]);

  return (
    <section className="panel heatmap-panel">
      <div className="panel-title-row">
        <h2>Coverage heatmap</h2>
        <span className="pill">Realtime</span>
      </div>
      <div className="format-filters">
        {filters.map((option) => (
          <button
            key={option}
            type="button"
            className={option === filter ? "active" : ""}
            onClick={() => setFilter(option)}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="heat-grid">
        {cells.map((cell) => (
          <article key={cell.id} className={cellClassForCoverage(cell.coverage)}>
            <h4>{cell.label}</h4>
            <p>{cell.coverage}% covered</p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default Heatmap;
