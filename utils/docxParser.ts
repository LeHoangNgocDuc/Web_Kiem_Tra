import { ExamData, Question, AnswerKey } from '../types';

export const parseDocx = async (file: File): Promise<Partial<ExamData>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = function(event) {
      const arrayBuffer = event.target?.result;
      const mammoth = window.mammoth;

      if (!mammoth) {
        reject("Lỗi: Thư viện Mammoth chưa tải. Vui lòng F5 lại trang.");
        return;
      }

      mammoth.convertToHtml({ arrayBuffer: arrayBuffer })
        .then(function(result: any) {
          let rawHtml = result.value;
          // Giải mã ký tự
          rawHtml = rawHtml.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
          // Chuyển khối MathType \[...\] thành dòng $...$
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
  
  // Tìm thời gian
  const fullText = doc.body.textContent || "";
  const timeMatch = fullText.match(/Thời gian(?: làm bài)?\s*[:.]?\s*(\d+)\s*(?:phút|'|phut)/i);
  let detectedDuration = 45; 
  if (timeMatch && timeMatch[1]) detectedDuration = parseInt(timeMatch[1]);

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
  let tempOptions: any[] = [];

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

          const match = sText.match(/(?:Chọn|Đáp án)\s*([A-D])/i);
          const correctOptionId = match ? match[1].toUpperCase() : "A";

          questions.push({
              id: qId,
              number: questionCounter,
              text: qText,
              options: tempOptions.length > 0 ? tempOptions : [{id:'A',text:'...'},{id:'B',text:'...'},{id:'C',text:'...'},{id:'D',text:'...'}]
          });

          answers.push({
              questionId: qId,
              correctOptionId, 
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
        const hasOption = text.match(/^[A-D]\./) || (text.includes("A.") && text.includes("B."));
        if (hasOption) {
            const matches = [...text.matchAll(/([A-D])\./g)];
            if (matches.length > 0) {
                matches.forEach((m, idx) => {
                     const optId = m[1];
                     const nextMatch = matches[idx + 1];
                     const startIndex = m.index! + 2; 
                     const endIndex = nextMatch ? nextMatch.index : text.length;
                     tempOptions.push({ id: optId, text: text.substring(startIndex, endIndex).trim() });
                });
            }
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
      answers,
      isActive: true
  };
};
