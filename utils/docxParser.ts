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
          const parsedData = parseHtmlToExam(result.value);
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
  
  // Lọc các dòng trống
  const elements = Array.from(doc.body.children).filter(el => {
      const text = el.textContent?.trim();
      const hasImg = el.querySelector('img');
      return text || hasImg;
  });
  
  let currentBuffer: string[] = []; // Bộ nhớ tạm chứa nội dung câu hỏi
  let questionCounter = 1; // Tự động đếm số câu (1, 2, 3...)
  let parsingSolution = false; // Cờ đánh dấu đang đọc phần lời giải

  const createQuestion = (optionsArr: {id: string, text: string}[]) => {
      // Nếu bộ nhớ tạm có nội dung -> Đó chính là câu hỏi
      if (currentBuffer.length > 0) {
          const qId = `q_auto_${Date.now()}_${questionCounter}`;
          const qText = currentBuffer.join("<br/>"); // Nối các dòng lại
          
          questions.push({
              id: qId,
              number: questionCounter,
              text: qText,
              options: optionsArr
          });
          
          answers.push({
              questionId: qId,
              correctOptionId: "A", 
              solutionText: ""
          });
          
          questionCounter++; // Tăng số thứ tự câu lên
          currentBuffer = []; // Xóa bộ nhớ để chờ câu tiếp theo
      }
  };

  elements.forEach((el) => {
    let text = el.textContent?.trim() || "";
    let innerHTML = el.innerHTML;
    
    // 1. Kiểm tra xem có phải bắt đầu phần Lời giải/Đáp án không để dừng lại
    if (text.match(/^(Lời giải|Hướng dẫn|Bảng đáp án|HẾT)/i)) {
        parsingSolution = true;
        return;
    }
    if (parsingSolution) return;

    // 2. Kiểm tra xem dòng này có phải là ĐÁP ÁN (A. B. C. D.) hay không
    // Logic: Nếu dòng chứa "A." VÀ "B." (hoặc bắt đầu bằng A.), ta coi nó là dòng đáp án
    const isOptionLine = (text.match(/^[A-D]\./) || (text.includes("A.") && text.includes("B.")));

    if (isOptionLine) {
        // ==> Tìm thấy đáp án! 
        // Vậy toàn bộ nội dung trong currentBuffer nãy giờ chính là Câu hỏi.
        
        // Tách các đáp án A, B, C, D từ dòng này
        const extractedOptions: {id: string, text: string}[] = [];
        const matches = [...text.matchAll(/([A-D])\./g)];
        
        if (matches.length > 0) {
            matches.forEach((m, idx) => {
                 const optId = m[1];
                 const nextMatch = matches[idx + 1];
                 const startIndex = m.index! + 2; 
                 const endIndex = nextMatch ? nextMatch.index : text.length;
                 // Cố gắng lấy HTML của đáp án để giữ công thức toán (nếu dòng đơn giản)
                 // Nhưng để an toàn dùng text trước
                 let optContent = text.substring(startIndex, endIndex).trim();
                 extractedOptions.push({ id: optId, text: optContent });
            });
        }
        
        // Tạo câu hỏi ngay lập tức
        createQuestion(extractedOptions);
    } 
    else {
        // 3. Nếu không phải dòng đáp án -> Thì nó là nội dung câu hỏi
        // (Hoặc là "Câu 1:", hoặc là đề bài, hoặc là hình ảnh)
        
        // Loại bỏ các chữ "Câu 1:", "Bài 1:" nếu có để cho đẹp
        let cleanContent = innerHTML.replace(/^(?:<b>|<strong>)?(?:Câu|Bài|Question)?\s*\d+[:.]\s*(?:<\/b>|<\/strong>)?/i, '');
        currentBuffer.push(cleanContent);
    }
  });

  return { questions, answers };
};
