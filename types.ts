export interface QuestionOption {
  id: string;   
  text: string; 
}

export interface Question {
  id: string;
  number: number;
  text: string; 
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
