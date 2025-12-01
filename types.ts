export interface QuestionOption {
  id: string;   // "A", "B", "C", "D"
  text: string; // Nội dung đáp án (HTML/LaTeX)
}

export interface Question {
  id: string;
  number: number;
  text: string; // Nội dung câu hỏi
  options: QuestionOption[];
}

export interface AnswerKey {
  questionId: string;
  correctOptionId: string;
  solutionText: string;
}

export interface ExamData {
  id: string;
  title: string;
  duration: number; // Thời gian (phút)
  questions: Question[];
  answers: AnswerKey[];
  createdAt: number;
}
