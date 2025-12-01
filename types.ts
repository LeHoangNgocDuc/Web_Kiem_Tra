export interface Question {
  id: string;
  number: number;
  text: string; // Contains LaTeX
  imageUrl?: string;
  options: {
    id: string; // 'A', 'B', 'C', 'D'
    text: string; // Contains LaTeX
  }[];
}

export interface AnswerKey {
  questionId: string;
  correctOptionId: string;
  solutionText: string; // Contains LaTeX
  solutionImageUrl?: string;
}

export interface ExamData {
  id: string;
  title: string;
  durationMinutes: number;
  questions: Question[];
  answers: AnswerKey[]; 
  createdAt?: number;
}

export interface UserSubmission {
  examId: string;
  answers: Record<string, string>; // questionId -> optionId
  startTime: number;
  submitTime: number;
  score?: number;
}