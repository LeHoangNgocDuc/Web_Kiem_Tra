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
          // QUAN TRỌNG: Giải mã các ký tự HTML entity để LaTeX hiển thị đúng
          // Ví dụ: chuyển &lt; về <, &gt; về >
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
  let parsingSolution = false; 

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
              correctOptionId: "A", 
              solutionText: ""
          });
          
          questionCounter++; 
          currentBuffer = []; 
      }
  };

  elements.forEach((el) => {
    let text = el.textContent?.trim() || "";
    let innerHTML = el.innerHTML;
    
    if (text.match(/^(Lời giải|Hướng dẫn|Bảng đáp án|HẾT)/i)) {
        parsingSolution = true;
        return;
    }
    if (parsingSolution) return;

    // Logic tìm đáp án (A. B. C. D.)
    const isOptionLine = (text.match(/^[A-D]\./) || (text.includes("A.") && text.includes("B.")));

    if (isOptionLine) {
        const extractedOptions: {id: string, text: string}[] = [];
        const matches = [...text.matchAll(/([A-D])\./g)];
        
        if (matches.length > 0) {
            matches.forEach((m, idx) => {
                 const optId = m[1];
                 const nextMatch = matches[idx + 1];
                 const startIndex = m.index! + 2; 
                 const endIndex = nextMatch ? nextMatch.index : text.length;
                 // Cố gắng giữ lại LaTeX trong đáp án
                 let optContent = text.substring(startIndex, endIndex).trim();
                 extractedOptions.push({ id: optId, text: optContent });
            });
        }
        createQuestion(extractedOptions);
    } 
    else {
        // Xóa các chữ "Câu 1:" thừa
        let cleanContent = innerHTML.replace(/^(?:<b>|<strong>)?(?:Câu|Bài|Question)?\s*\d+[:.]\s*(?:<\/b>|<\/strong>)?/i, '');
        currentBuffer.push(cleanContent);
    }
  });

  return { questions, answers };
};
