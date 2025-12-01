export interface QuestionOption {
  id: string;   // Ví dụ: "A", "B", "C", "D"
  text: string; // Nội dung HTML của đáp án
}

export interface Question {
  id: string;
  number: number;
  text: string; // Nội dung HTML của câu hỏi
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
  duration: number; // Phút
  questions: Question[];
  answers: AnswerKey[];
  isActive: boolean;
}
