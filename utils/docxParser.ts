import { ExamData, Question, AnswerKey } from '../types';

declare const mammoth: any;

export const parseDocx = async (file: File): Promise<Partial<ExamData>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = function(event) {
      const arrayBuffer = event.target?.result;
      if (typeof mammoth === 'undefined') {
        reject("Lỗi: Thư viện Mammoth chưa tải được.");
        return;
      }
      mammoth.convertToHtml({ arrayBuffer: arrayBuffer })
        .then(function(result: any) {
          // 1. Giải mã HTML entities cho LaTeX (<, >, &)
          let rawHtml = result.value;
          rawHtml = rawHtml.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
          
          const parsedData = parseHtmlToExam(rawHtml);
          resolve(parsedData);
        })
        .catch(function(error: any) {
          reject(error);
        });
    };
    reader.readAsArrayBuffer(file);
  });
};

const parseHtmlToExam = (html: string): Partial<ExamData> => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const questions: Question[] = [];
  const answers: AnswerKey[] = [];
  
  // Lấy danh sách thẻ, giữ nguyên cả ảnh và text
  const elements = Array.from(doc.body.children).filter(el => {
      const text = el.textContent?.trim();
      const hasImg = el.querySelector('img');
      return text || hasImg;
  });
  
  let currentQBuffer: string[] = []; // Chứa nội dung câu hỏi
  let currentSBuffer: string[] = []; // Chứa nội dung lời giải
  let questionCounter = 1; 
  let isScanningSolution = false; // Cờ: Đang đọc lời giải hay đọc câu hỏi?

  // Hàm lưu câu hỏi cũ trước khi sang câu mới
  const savePreviousQuestion = () => {
      if (currentQBuffer.length > 0) {
          const qId = `q_auto_${Date.now()}_${questionCounter}`;
          
          // Xử lý nối chuỗi thông minh cho câu hỏi
          // Nếu dòng chỉ là công thức ngắn, nối bằng dấu cách, ngược lại nối bằng <br>
          const qText = joinSmart(currentQBuffer);
          
          // Xử lý nối chuỗi cho lời giải
          const sText = currentSBuffer.length > 0 ? joinSmart(currentSBuffer) : "Chưa có lời giải chi tiết.";

          // Tạo options rỗng nếu chưa parse được (sẽ được cập nhật ở logic dưới)
          // Lưu ý: Logic parse Options ở version này được tích hợp thẳng vào luồng đọc
          
          // Ở đây ta push tạm, logic options sẽ được xử lý tách biệt trong luồng chính
          // Tuy nhiên để đơn giản hoá, ta sẽ lưu Question object tại thời điểm này
          // Các option đã được tách ra khỏi buffer trước khi vào đây rồi.
      }
  };

  // Helper: Nối chuỗi thông minh để tránh vỡ dòng LaTeX
  const joinSmart = (buffer: string[]) => {
      return buffer.reduce((acc, curr, idx) => {
          if (idx === 0) return curr;
          // Nếu dòng hiện tại ngắn (dưới 50 ký tự) HOẶC bắt đầu bằng công thức toán -> Nối liền (space)
          // Ngược lại -> Xuống dòng (<br>)
          const isShort = curr.length < 50 && !curr.includes("<br");
          const isMathStart = curr.trim().startsWith("$") || curr.trim().startsWith("\\[");
          
          if (isShort || isMathStart) {
              return acc + " " + curr; 
          }
          return acc + "<br/>" + curr;
      }, "");
  };

  // --- LOGIC CHÍNH ---
  // Chúng ta sẽ gom nhóm câu hỏi và đáp án ngay trong vòng lặp
  
  let tempOptions: {id: string, text: string}[] = [];

  elements.forEach((el) => {
    let text = el.textContent?.trim() || "";
    let innerHTML = el.innerHTML;
    
    // 1. Phát hiện bắt đầu câu mới (Câu 1:, Bài 1:...)
    const newQuestionMatch = text.match(/^(Câu|Bài|Question)\s*\d+[:.]/i);
    
    if (newQuestionMatch) {
        // ==> LƯU CÂU CŨ (Nếu có)
        if (currentQBuffer.length > 0) {
            const qId = `q_auto_${questionCounter}`;
            questions.push({
                id: qId,
                number: questionCounter,
                text: joinSmart(currentQBuffer),
                options: tempOptions.length > 0 ? tempOptions : generateEmptyOptions()
            });
            answers.push({
                questionId: qId,
                correctOptionId: detectCorrectAnswer(currentSBuffer) || "A", // Tự tìm đáp án đúng trong lời giải
                solutionText: currentSBuffer.length > 0 ? joinSmart(currentSBuffer) : ""
            });
            questionCounter++;
        }

        // ==> RESET CHO CÂU MỚI
        isScanningSolution = false;
        currentQBuffer = [];
        currentSBuffer = [];
        tempOptions = [];

        // Xóa chữ "Câu X:" đi lấy nội dung sạch
        let cleanContent = innerHTML.replace(/^(?:<b>|<strong>)?(?:Câu|Bài|Question)\s*\d+[:.]\s*(?:<\/b>|<\/strong>)?/i, '');
        currentQBuffer.push(cleanContent);
        return;
    }

    // 2. Phát hiện bắt đầu Lời giải
    if (text.match(/^(Lời giải|Hướng dẫn|Bảng đáp án|HẾT)/i)) {
        isScanningSolution = true;
        // Không return, để nó có thể lấy nội dung dòng này nếu muốn (thường là bỏ qua dòng tiêu đề)
        return; 
    }

    // 3. Xử lý nội dung
    if (isScanningSolution) {
        // Đang ở phần lời giải -> Đẩy vào buffer Lời giải
        // Giữ nguyên hình ảnh trong lời giải
        currentSBuffer.push(innerHTML);
    } else {
        // Đang ở phần đề bài -> Kiểm tra xem có phải dòng Đáp án (A. B. C. D.) không
        const extracted = extractOptions(text, innerHTML);
        if (extracted) {
            tempOptions = extracted;
        } else {
            // Không phải đáp án -> Đẩy vào nội dung câu hỏi
            currentQBuffer.push(innerHTML);
        }
    }
  });

  // LƯU CÂU CUỐI CÙNG
  if (currentQBuffer.length > 0) {
      const qId = `q_auto_${questionCounter}`;
      questions.push({
          id: qId,
          number: questionCounter,
          text: joinSmart(currentQBuffer),
          options: tempOptions.length > 0 ? tempOptions : generateEmptyOptions()
      });
      answers.push({
          questionId: qId,
          correctOptionId: detectCorrectAnswer(currentSBuffer) || "A",
          solutionText: currentSBuffer.length > 0 ? joinSmart(currentSBuffer) : ""
      });
  }

  return { questions, answers };
};

// --- CÁC HÀM BỔ TRỢ ---

const generateEmptyOptions = () => [
    {id: 'A', text: '...'}, {id: 'B', text: '...'}, {id: 'C', text: '...'}, {id: 'D', text: '...'}
];

// Hàm tách đáp án A. B. C. D.
const extractOptions = (text: string, fullHtml: string): {id: string, text: string}[] | null => {
    // Kiểm tra sơ bộ
    if (!text.match(/^[A-D]\./) && !(text.includes("A.") && text.includes("B."))) return null;

    const options: {id: string, text: string}[] = [];
    // Regex tìm A., B., C., D.
    const matches = [...text.matchAll(/([A-D])\./g)];
    
    if (matches.length > 0) {
        matches.forEach((m, idx) => {
             const optId = m[1];
             const nextMatch = matches[idx + 1];
             const startIndex = m.index! + 2; 
             const endIndex = nextMatch ? nextMatch.index : text.length;
             
             // Cắt chuỗi text. 
             // Lưu ý: Cắt theo text sẽ làm mất format LaTeX/Image trong đáp án nếu đáp án phức tạp.
             // Để an toàn, ở đây ta chấp nhận lấy text. Nếu muốn lấy HTML phải xử lý phức tạp hơn nhiều.
             // Với đề thi Toán thường đáp án ngắn nên text là ổn.
             let optContent = text.substring(startIndex, endIndex).trim();
             options.push({ id: optId, text: optContent });
        });
        return options;
    }
    return null;
};

// Hàm tìm đáp án đúng dựa vào lời giải (VD: "Chọn B", "Đáp án C")
const detectCorrectAnswer = (solutionBuffer: string[]): string | null => {
    const fullText = solutionBuffer.join(" ");
    const match = fullText.match(/(?:Chọn|Đáp án)\s*([A-D])/i);
    return match ? match[1].toUpperCase() : null;
};
