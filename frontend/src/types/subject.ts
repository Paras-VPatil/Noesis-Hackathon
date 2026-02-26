export interface Subject {
  id: string;
  name: string;
  examLabel: string;
  documentCount: number;
  coverage: number;
}

export interface FlashcardSet {
  id: string;
  title: string;
  cards: number;
  author: string;
}
