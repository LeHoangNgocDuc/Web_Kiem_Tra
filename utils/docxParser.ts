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
          // Giải mã ký tự HTML để LaTeX hiển thị đúng (ví dụ < thành &lt;)
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
  
  // Lọc các dòng trống
  const elements = Array.from(doc.body.children).filter(el => {
      const text = el.textContent?.trim();
      const hasImg = el.querySelector('img');
      return text || hasImg;
  });
  
  let currentBuffer: string[] = []; 
  let questionCounter = 1; 
  let parsingSolution = false; // Cờ đánh dấu đang đọc phần lời giải

  const createQuestion = (optionsArr: {id: string, text: string}[]) => {
      if (currentBuffer.length > 0) {
          const qId = `q_auto_${Date.now()}_${questionCounter}`;
          const qText = currentBuffer.join("<br/>");
          
          questions.push({
              id: qId,
              number: questionCounter,
              text: qText,
              options: optionsArr
          });
          
          answers.push({
              questionId: qId,
              correctOptionId: "A", // Mặc định A
              solutionText: ""
          });
          
          questionCounter++; 
          currentBuffer = []; 
      }
  };

  elements.forEach((el) => {
    let text = el.textContent?.trim() || "";
    let innerHTML = el.innerHTML;
    
    // --- 1. SỬA LỖI QUAN TRỌNG TẠI ĐÂY ---
    // Nếu dòng này bắt đầu bằng "Câu X", "Bài X" -> Chắc chắn là câu hỏi mới.
    // -> Bắt buộc TẮT chế độ đọc lời giải ngay lập tức.
    if (text.match(/^(Câu|Bài|Question)\s*\d+[:.]/i)) {
        parsingSolution = false;
    }

    // 2. Nếu gặp từ khóa bắt đầu phần lời giải -> Bật chế độ bỏ qua
    if (text.match(/^(Lời giải|Hướng dẫn|Bảng đáp án|HẾT)/i)) {
        parsingSolution = true;
        return;
    }

    // 3. Nếu đang trong chế độ đọc lời giải thì bỏ qua dòng này
    if (parsingSolution) return;

    // 4. Logic tìm đáp án (A. B. C. D.) để ngắt câu
    // Tìm dòng chứa "A." hoặc bắt đầu bằng A. B. C. D.
    const isOptionLine = (text.match(/^[A-D]\./) || (text.includes("A.") && text.includes("B.")));

    if (isOptionLine) {
        // Tách các đáp án A, B, C, D từ dòng này
        const extractedOptions: {id: string, text: string}[] = [];
        // Regex này lấy cả nội dung LaTeX bên trong
        const matches = [...text.matchAll(/([A-D])\./g)];
        
        if (matches.length > 0) {
            matches.forEach((m, idx) => {
                 const optId = m[1];
                 const nextMatch = matches[idx + 1];
                 const startIndex = m.index! + 2; 
                 const endIndex = nextMatch ? nextMatch.index : text.length;
                 
                 let optContent = text.substring(startIndex, endIndex).trim();
                 extractedOptions.push({ id: optId, text: optContent });
            });
        }
        createQuestion(extractedOptions);
    } 
    else {
        // Đây là nội dung câu hỏi
        // Xóa chữ "Câu 1:" thừa ở đầu dòng cho đẹp
        let cleanContent = innerHTML.replace(/^(?:<b>|<strong>)?(?:Câu|Bài|Question)\s*\d+[:.]\s*(?:<\/b>|<\/strong>)?/i, '');
        currentBuffer.push(cleanContent);
    }
  });

  return { questions, answers };
};
