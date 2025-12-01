import { ExamData } from '../types';

export const MOCK_EXAM: ExamData = {
  id: "math-test-01",
  title: "Đề thi thử THPT Quốc Gia - Môn Toán (Mẫu)",
  durationMinutes: 45,
  questions: [
    {
      id: "q1",
      number: 1,
      text: "Cho hàm số $y = f(x)$ có bảng biến thiên như sau. Hàm số đã cho đồng biến trên khoảng nào dưới đây?",
      imageUrl: "https://picsum.photos/600/200?random=1",
      options: [
        { id: "A", text: "$(1; +\\infty)$" },
        { id: "B", text: "$(-1; 0)$" },
        { id: "C", text: "$(-1; 1)$" },
        { id: "D", text: "$(0; 1)$" }
      ]
    },
    {
      id: "q2",
      number: 2,
      text: "Nghiệm của phương trình $\\log_3(2x-1) = 2$ là:",
      options: [
        { id: "A", text: "$x = 3$" },
        { id: "B", text: "$x = 5$" },
        { id: "C", text: "$x = \\frac{9}{2}$" },
        { id: "D", text: "$x = \\frac{7}{2}$" }
      ]
    },
    {
      id: "q3",
      number: 3,
      text: "Tính tích phân $I = \\int_{0}^{1} e^{2x} dx$.",
      options: [
        { id: "A", text: "$e^2 - 1$" },
        { id: "B", text: "$\\frac{e^2 - 1}{2}$" },
        { id: "C", text: "$2(e^2 - 1)$" },
        { id: "D", text: "$e^2$" }
      ]
    },
    {
      id: "q4",
      number: 4,
      text: "Trong không gian $Oxyz$, cho mặt cầu $(S): (x-1)^2 + (y+2)^2 + z^2 = 9$. Tâm $I$ và bán kính $R$ của $(S)$ là:",
      options: [
        { id: "A", text: "$I(1; -2; 0), R=3$" },
        { id: "B", text: "$I(-1; 2; 0), R=3$" },
        { id: "C", text: "$I(1; -2; 0), R=9$" },
        { id: "D", text: "$I(-1; 2; 0), R=9$" }
      ]
    },
    {
      id: "q5",
      number: 5,
      text: "Cho số phức $z = 3 - 4i$. Môđun của $z$ bằng:",
      options: [
        { id: "A", text: "$\\sqrt{7}$" },
        { id: "B", text: "$7$" },
        { id: "C", text: "$5$" },
        { id: "D", text: "$25$" }
      ]
    }
  ],
  answers: [
    {
      questionId: "q1",
      correctOptionId: "D",
      solutionText: "Dựa vào bảng biến thiên (giả định), hàm số đồng biến khi $y'$ mang dấu dương. Trong khoảng $(0; 1)$, đồ thị đi lên.",
    },
    {
      questionId: "q2",
      correctOptionId: "B",
      solutionText: "Điều kiện: $2x - 1 > 0 \\Leftrightarrow x > 1/2$. \nPT $\\Leftrightarrow 2x - 1 = 3^2 \\Leftrightarrow 2x - 1 = 9 \\Leftrightarrow 2x = 10 \\Leftrightarrow x = 5$ (TM).",
    },
    {
      questionId: "q3",
      correctOptionId: "B",
      solutionText: "$I = \\int_{0}^{1} e^{2x} dx = \\frac{1}{2} e^{2x} \\Big|_0^1 = \\frac{1}{2}(e^2 - e^0) = \\frac{e^2 - 1}{2}$.",
    },
    {
      questionId: "q4",
      correctOptionId: "A",
      solutionText: "Phương trình mặt cầu $(x-a)^2 + (y-b)^2 + (z-c)^2 = R^2$. \nTa có tâm $I(1; -2; 0)$ và $R = \\sqrt{9} = 3$.",
    },
    {
      questionId: "q5",
      correctOptionId: "C",
      solutionText: "$|z| = \\sqrt{3^2 + (-4)^2} = \\sqrt{9 + 16} = \\sqrt{25} = 5$.",
    }
  ]
};

// Key for LocalStorage
const STORAGE_KEY_EXAMS = 'math_pro_exams';

export const getAllExams = (): ExamData[] => {
  try {
    const localData = localStorage.getItem(STORAGE_KEY_EXAMS);
    const savedExams: ExamData[] = localData ? JSON.parse(localData) : [];
    // Ensure it's an array
    if (!Array.isArray(savedExams)) return [MOCK_EXAM];
    
    // Combine Mock exam with saved exams, sort by new
    return [MOCK_EXAM, ...savedExams];
  } catch (e) {
    console.error("Error loading exams", e);
    return [MOCK_EXAM];
  }
};

export const getExamById = (id: string): ExamData | undefined => {
  const allExams = getAllExams();
  return allExams.find(e => e.id === id);
};

export const saveExam = (exam: ExamData) => {
  try {
    const localData = localStorage.getItem(STORAGE_KEY_EXAMS);
    let savedExams: ExamData[] = localData ? JSON.parse(localData) : [];
    
    if (!Array.isArray(savedExams)) savedExams = [];
    
    // Update if exists or add new
    const index = savedExams.findIndex(e => e.id === exam.id);
    if (index >= 0) {
      savedExams[index] = exam;
    } else {
      savedExams.push(exam);
    }
    
    localStorage.setItem(STORAGE_KEY_EXAMS, JSON.stringify(savedExams));
  } catch (e) {
    console.error("Error saving exam", e);
    alert("Không thể lưu đề thi vào bộ nhớ trình duyệt (LocalStorage). Có thể bộ nhớ đã đầy.");
  }
};

export const deleteExam = (id: string) => {
  if (id === MOCK_EXAM.id) return; // Cannot delete mock
  try {
    const localData = localStorage.getItem(STORAGE_KEY_EXAMS);
    if (localData) {
      let savedExams: ExamData[] = JSON.parse(localData);
      if (Array.isArray(savedExams)) {
          const filtered = savedExams.filter(e => e.id !== id);
          localStorage.setItem(STORAGE_KEY_EXAMS, JSON.stringify(filtered));
      }
    }
  } catch (e) {
    console.error("Error deleting exam", e);
  }
}