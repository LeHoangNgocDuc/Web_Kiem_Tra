// types.ts

// 1. Định nghĩa một phương án lựa chọn (A, B, C, D)
export interface QuestionOption {
  id: string;   // Ví dụ: "A", "B", "C", "D"
  text: string; // Nội dung đáp án (chứa HTML/LaTeX)
}

// 2. Định nghĩa một câu hỏi
export interface Question {
  id: string;                 // ID duy nhất của câu hỏi (ví dụ: q_17001...)
  number: number;             // Số thứ tự câu (1, 2, 3...)
  text: string;               // Nội dung đề bài (chứa HTML/LaTeX/Hình ảnh)
  imageUrl?: string;          // (Tùy chọn) Đường dẫn ảnh nếu tách riêng
  options: QuestionOption[];  // Danh sách 4 phương án
}

// 3. Định nghĩa đáp án đúng và lời giải chi tiết
export interface AnswerKey {
  questionId: string;         // ID của câu hỏi tương ứng
  correctOptionId: string;    // Đáp án đúng: "A", "B", "C" hoặc "D"
  solutionText: string;       // Lời giải chi tiết (chứa HTML/LaTeX/Hình ảnh)
  solutionImageUrl?: string;  // (Tùy chọn) Ảnh lời giải nếu có
}

// 4. Định nghĩa cấu trúc một Đề thi hoàn chỉnh
export interface ExamData {
  id: string;                 // ID đề thi (thường dùng timestamp hoặc uuid)
  title: string;              // Tên đề thi (thường lấy từ tên file Word)
  duration: number;           // <--- QUAN TRỌNG: Thời gian làm bài (tính bằng phút)
  questions: Question[];      // Danh sách tất cả câu hỏi
  answers: AnswerKey[];       // Danh sách đáp án và lời giải
  createdAt: number;          // Thời điểm tạo đề (timestamp)
}

// 5. Định nghĩa dữ liệu bài làm của học sinh (Dùng để lưu trạng thái làm bài)
export interface UserSubmission {
  examId: string;                   // ID của đề đang làm
  answers: Record<string, string>;  // Lưu lựa chọn của HS. VD: { "q_1": "A", "q_2": "C" }
  startTime: number;                // Thời gian bắt đầu bấm "Làm bài"
  submitTime: number | null;        // Thời gian nộp bài (null nếu chưa nộp)
  score?: number;                   // Điểm số (sau khi nộp mới có)
  totalQuestions?: number;          // Tổng số câu hỏi
  correctCount?: number;            // Số câu đúng
}
