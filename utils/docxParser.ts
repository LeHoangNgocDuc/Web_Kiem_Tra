import { ExamData, Question, AnswerKey } from '../types';

export const parseDocx = async (file: File): Promise<Partial<ExamData>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = function(event) {
      const arrayBuffer = event.target?.result;
      
      // SỬA LỖI Ở ĐÂY: Dùng (window as any) để tránh lỗi TypeScript
      const mammoth = (window as any).mammoth;

      if (!mammoth) {
        reject("Lỗi: Thư viện Mammoth chưa tải được. Vui lòng F5 lại trang.");
        return;
      }

      mammoth.convertToHtml({ arrayBuffer: arrayBuffer })
        .then(function(result: any) {
          let rawHtml = result.value;
          // Giải mã ký tự HTML
          rawHtml = rawHtml.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
          // Chuyển đổi MathType block sang inline để không bị vỡ dòng
          rawHtml = rawHtml.replace(/\\\[/g, '$').replace(/\\\]/g, '$');

          const parsedData = parseHtmlToExam(rawHtml, file.name);
          resolve(parsedData);
        })
        .catch(function(error: any) {
          reject(error);
        });
    };
    reader.readAsArrayBuffer(file);
  });
};

const parseHtmlToExam = (html: string, fileName: string): Partial<ExamData> => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // 1. TỰ ĐỘNG TÌM THỜI GIAN
  const fullText = doc.body.textContent || "";
  const timeMatch = fullText.match(/Thời gian(?: làm bài)?\s*[:.]?\s*(\d+)\s*(?:phút|'|phut)/i);
  let detectedDuration = 45; 
  if (timeMatch && timeMatch[1]) {
      detectedDuration = parseInt(timeMatch[1]);
  }

  // 2. XỬ LÝ CÂU HỎI
  const questions: Question[] = [];
  const answers: AnswerKey[] = [];
  
  const elements = Array.from(doc.body.children).filter(el => {
      const text = el.textContent?.trim();
      const hasImg = el.querySelector('img');
      return text || hasImg;
  });
  
  let currentQBuffer: string[] = []; 
  let currentSBuffer: string[] = []; 
  let questionCounter = 1; 
  let isScanningSolution = false; 
  let tempOptions: {id: string, text: string}[] = [];

  const saveQuestion = () => {
      if (currentQBuffer.length > 0) {
          const qId = `q_${Date.now()}_${questionCounter}`;
          
          const qText = currentQBuffer.reduce((acc, curr, idx) => {
              if (idx === 0) return curr;
              if (curr.includes("<img")) return acc + "<br/>" + curr;
              return acc + " " + curr;
          }, "");

          let sText = "";
          if (currentSBuffer.length > 0) {
              sText = currentSBuffer.reduce((acc, curr, idx) => {
                  if (idx === 0) return curr;
                  if (curr.includes("<img")) return acc + "<br/>" + curr;
                  return acc + " " + curr;
              }, "");
          }

          const detectedAns = detectCorrectAnswer(sText);

          questions.push({
              id: qId,
              number: questionCounter,
              text: qText,
              options: tempOptions.length > 0 ? tempOptions : generateEmptyOptions()
          });

          answers.push({
              questionId: qId,
              correctOptionId: detectedAns || "A", 
              solutionText: sText 
          });
          
          questionCounter++;
      }
  };

  elements.forEach((el) => {
    let text = el.textContent?.trim() || "";
    let innerHTML = el.innerHTML;
    
    const newQuestionMatch = text.match(/^(Câu|Bài|Question)\s*\d+[:.]/i);
    
    if (newQuestionMatch) {
        saveQuestion();
        isScanningSolution = false;
        currentQBuffer = [];
        currentSBuffer = [];
        tempOptions = [];
        let cleanContent = innerHTML.replace(/^(?:<b>|<strong>)?(?:Câu|Bài|Question)\s*\d+[:.]\s*(?:<\/b>|<\/strong>)?\s*/i, '');
        currentQBuffer.push(cleanContent);
        return;
    }

    if (text.match(/^(Lời giải|Hướng dẫn|Bảng đáp án|HẾT)/i)) {
        isScanningSolution = true;
        return; 
    }

    if (isScanningSolution) {
        currentSBuffer.push(innerHTML);
    } else {
        const extracted = extractOptions(text);
        if (extracted) {
            tempOptions = extracted;
        } else {
            currentQBuffer.push(innerHTML);
        }
    }
  });

  saveQuestion();

  return { 
      title: fileName.replace('.docx', ''), 
      duration: detectedDuration, 
      questions, 
      answers 
  };
};

const generateEmptyOptions = () => [
    {id: 'A', text: '...'}, {id: 'B', text: '...'}, {id: 'C', text: '...'}, {id: 'D', text: '...'}
];

const extractOptions = (text: string): {id: string, text: string}[] | null => {
    const hasOption = text.match(/^[A-D]\./) || (text.includes("A.") && text.includes("B."));
    if (!hasOption) return null;

    const options: {id: string, text: string}[] = [];
    const matches = [...text.matchAll(/([A-D])\./g)];
    
    if (matches.length > 0) {
        matches.forEach((m, idx) => {
             const optId = m[1];
             const nextMatch = matches[idx + 1];
             const startIndex = m.index! + 2; 
             const endIndex = nextMatch ? nextMatch.index : text.length;
             let optContent = text.substring(startIndex, endIndex).trim();
             options.push({ id: optId, text: optContent });
        });
        return options;
    }
    return null;
};

const detectCorrectAnswer = (fullText: string): string | null => {
    const match = fullText.match(/(?:Chọn|Đáp án)\s*([A-D])/i);
    return match ? match[1].toUpperCase() : null;
};
