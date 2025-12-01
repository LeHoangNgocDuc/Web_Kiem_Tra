import { ExamData, Question, AnswerKey } from '../types';

declare const mammoth: any;

export const parseDocx = async (file: File): Promise<Partial<ExamData>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = function(event) {
      const arrayBuffer = event.target?.result;
      
      if (typeof mammoth === 'undefined') {
        reject("Thư viện Mammoth.js chưa được tải. Vui lòng kiểm tra kết nối mạng hoặc file index.html.");
        return;
      }

      mammoth.convertToHtml({ arrayBuffer: arrayBuffer })
        .then(function(result: any) {
          const html = result.value;
          const parsedData = parseHtmlToExam(html);
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
  
  // Lọc bỏ các phần tử rỗng
  const elements = Array.from(doc.body.children).filter(el => {
      const text = el.textContent?.trim();
      const hasImg = el.querySelector('img');
      return text || hasImg;
  });
  
  let currentQuestion: Partial<Question> | null = null;
  let currentOptions: { id: string, text: string }[] = [];
  let currentSolution = "";
  let parsingSolution = false; // Cờ đánh dấu đang đọc phần lời giải

  const saveCurrentQuestion = () => {
    if (currentQuestion) {
        const qId = currentQuestion.id || `q_${Date.now()}_${questions.length}`;
        
        // Nếu không tìm thấy đáp án nào từ file, tạo 4 đáp án rỗng mặc định
        if (currentOptions.length === 0) {
            ['A', 'B', 'C', 'D'].forEach(opt => currentOptions.push({ id: opt, text: '...' }));
        }

        questions.push({
            id: qId,
            number: currentQuestion.number || (questions.length + 1),
            text: currentQuestion.text || "",
            options: [...currentOptions]
        });

        answers.push({
            questionId: qId,
            correctOptionId: "A", // Mặc định là A, người dùng cần sửa lại
            solutionText: currentSolution.trim() || "Chưa có lời giải chi tiết."
        });
    }
  };

  elements.forEach((el) => {
    let text = el.textContent?.trim() || "";
    let innerHTML = el.innerHTML;
    
    // 1. Nhận diện bắt đầu câu hỏi: "Câu 1:", "Câu 1.", "Bài 1", "Question 1"
    // Regex linh hoạt: chấp nhận chữ in hoa/thường, dấu chấm hoặc hai chấm
    const questionMatch = text.match(/^(Câu|Bài|Question)\s+(\d+)[:.]?/i);
    
    // 2. Nhận diện bắt đầu lời giải: "Lời giải", "Hướng dẫn giải"
    const solutionMatch = text.match(/^(Lời giải|Hướng dẫn|Giải chi tiết)/i);

    if (questionMatch && !solutionMatch) {
      saveCurrentQuestion();
      
      // Reset state cho câu mới
      parsingSolution = false;
      currentSolution = "";
      currentOptions = [];
      
      const qNum = parseInt(questionMatch[2]);
      
      // Loại bỏ phần prefix "Câu 1:" khỏi nội dung để đẹp hơn
      // Tuy nhiên giữ lại nếu muốn an toàn. Ở đây ta sẽ replace phần đầu đi.
      let content = innerHTML.replace(/^(<b>|<strong>)?(Câu|Bài|Question)\s+\d+[:.]?(<\/b>|<\/strong>)?\s*/i, '');
      
      currentQuestion = {
          number: qNum,
          id: `q_import_${Date.now()}_${qNum}`,
          text: content
      };
      return;
    }

    if (solutionMatch) {
        parsingSolution = true;
        // Bỏ chữ "Lời giải" đi
        currentSolution += innerHTML.replace(/^(<b>|<strong>)?(Lời giải|Hướng dẫn|Giải chi tiết)[:.]?(<\/b>|<\/strong>)?\s*/i, "") + "<br/>";
        return;
    }

    if (parsingSolution) {
        currentSolution += innerHTML + "<br/>";
        return;
    }

    // 3. Nhận diện đáp án
    if (currentQuestion) {
        // Kiểm tra xem dòng này có chứa các đáp án không (A. ... B. ... C. ... D. ...)
        // Regex tìm A., B., C., D. ở đầu dòng hoặc giữa dòng
        
        // Trường hợp 1: Đáp án nằm riêng lẻ ở đầu dòng: "A. Nội dung"
        const singleOptionMatch = text.match(/^([A-D])\./);
        
        // Trường hợp 2: Nhiều đáp án trên 1 dòng: "A. 5   B. 6   C. 7   D. 8"
        // Để xử lý trường hợp này, ta sẽ dùng split theo regex nhưng cần giữ lại phần delimiter
        
        if (singleOptionMatch && !text.includes("B.") && !text.includes("C.")) {
             // Chỉ có 1 đáp án trên dòng này
             currentOptions.push({
                 id: singleOptionMatch[1],
                 text: innerHTML.replace(/^([A-D])\.\s*/, '')
             });
        } else {
             // Có thể có nhiều đáp án hoặc là nội dung câu hỏi tiếp theo
             // Thử tách thủ công
             const optionPattern = /([A-D])\./g;
             const matches = [...text.matchAll(optionPattern)];
             
             if (matches.length > 1) {
                 // Có vẻ là dòng chứa nhiều đáp án. Ta sẽ xử lý text (chấp nhận mất format HTML phức tạp ở đáp án này để đổi lấy việc tách đúng)
                 // Hoặc cố gắng split innerHTML. Split innerHTML phức tạp hơn vì tag.
                 // Cách đơn giản: dùng textContent cho các đáp án ngắn kiểu này.
                 
                 let lastIndex = 0;
                 matches.forEach((m, idx) => {
                     const optId = m[1];
                     const nextMatch = matches[idx + 1];
                     const endIndex = nextMatch ? nextMatch.index : text.length;
                     
                     // Lấy nội dung giữa các đáp án
                     let optContent = text.substring(m.index! + 2, endIndex).trim(); // +2 bỏ qua "X."
                     currentOptions.push({
                         id: optId,
                         text: optContent
                     });
                 });
             } else if (matches.length === 1 && text.startsWith(matches[0][0])) {
                 // Giống trường hợp singleOptionMatch
                 currentOptions.push({
                     id: matches[0][1],
                     text: innerHTML.replace(/^([A-D])\.\s*/, '')
                 });
             } else {
                 // Không phải đáp án, nối vào nội dung câu hỏi
                 // Nếu đã có đáp án rồi mà gặp text thường -> có thể là đáp án nhiều dòng?
                 if (currentOptions.length > 0) {
                     currentOptions[currentOptions.length - 1].text += "<br/>" + innerHTML;
                 } else {
                     if (currentQuestion.text) {
                         currentQuestion.text += "<br/>" + innerHTML;
                     } else {
                         currentQuestion.text = innerHTML;
                     }
                 }
             }
        }
    }
  });

  saveCurrentQuestion();

  return {
    questions,
    answers
  };
};