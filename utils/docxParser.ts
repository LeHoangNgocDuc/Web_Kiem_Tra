import { ExamData, Question, AnswerKey } from '../types';

// Khai báo mammoth để tránh lỗi TypeScript nếu chưa có type def
declare const mammoth: any;

export const parseDocx = async (file: File): Promise<Partial<ExamData>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = function(event) {
      const arrayBuffer = event.target?.result;
      
      if (typeof mammoth === 'undefined') {
        reject("Thư viện Mammoth.js chưa được tải. Vui lòng kiểm tra lại index.html.");
        return;
      }

      // Sử dụng styleMap để giữ lại màu sắc hoặc highlight nếu cần (tùy chọn)
      mammoth.convertToHtml({ arrayBuffer: arrayBuffer })
        .then(function(result: any) {
          const html = result.value;
          // Có thể log html ra để debug xem mammoth đọc file word ra cái gì
          // console.log(html); 
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
  
  // Lấy tất cả các thẻ p, h1, h2,... (thường mammoth chuyển mỗi dòng thành 1 thẻ p)
  // Lọc bỏ các dòng hoàn toàn rỗng
  const elements = Array.from(doc.body.children).filter(el => {
      const text = el.textContent?.trim();
      const hasImg = el.querySelector('img');
      return text || hasImg;
  });
  
  let currentQuestion: Partial<Question> | null = null;
  let currentOptions: { id: string, text: string }[] = [];
  let currentSolution = "";
  let parsingSolution = false; // Cờ: Đang đọc phần lời giải/đáp án

  // Hàm lưu câu hỏi hiện tại vào danh sách trước khi sang câu mới
  const saveCurrentQuestion = () => {
    if (currentQuestion) {
        const qId = currentQuestion.id || `q_${Date.now()}_${questions.length}`;
        
        // Nếu không tìm thấy đáp án nào (file lỗi hoặc định dạng lạ), tạo 4 ô trống
        if (currentOptions.length === 0) {
            ['A', 'B', 'C', 'D'].forEach(opt => currentOptions.push({ id: opt, text: '' }));
        }

        questions.push({
            id: qId,
            number: currentQuestion.number || (questions.length + 1),
            text: currentQuestion.text || "Câu hỏi không có nội dung text (có thể là ảnh)",
            options: [...currentOptions]
        });

        answers.push({
            questionId: qId,
            correctOptionId: "A", // Mặc định A, người dùng tự sửa sau
            solutionText: currentSolution.trim() || ""
        });
    }
  };

  elements.forEach((el) => {
    let text = el.textContent?.trim() || "";
    let innerHTML = el.innerHTML;
    
    // --- 1. NHẬN DIỆN BẮT ĐẦU CÂU HỎI ---
    // Regex CẢI TIẾN: 
    // ^(?:...)? : Bắt đầu bằng nhóm không bắt buộc (Câu, Bài, Question...)
    // \s* : Khoảng trắng tùy ý
    // (\d+) : Bắt buộc phải có số
    // [:.] : Bắt buộc phải có dấu hai chấm hoặc dấu chấm sau số
    // Ví dụ khớp: "Câu 1:", "1.", "Bài 10.", "Question 5:"
    const questionMatch = text.match(/^(?:Câu|Bài|Question)?\s*(\d+)[:.]/i);
    
    // --- 2. NHẬN DIỆN PHẦN LỜI GIẢI / BẢNG ĐÁP ÁN ---
    const solutionMatch = text.match(/^(Lời giải|Hướng dẫn|Giải chi tiết|Bảng đáp án|Đáp án)/i);

    // Nếu gặp dòng bắt đầu câu hỏi mới (và không phải đang trong phần lời giải)
    if (questionMatch && !solutionMatch && !parsingSolution) {
      // Lưu câu trước đó lại
      saveCurrentQuestion();
      
      // Reset biến tạm
      currentSolution = "";
      currentOptions = [];
      
      const qNum = parseInt(questionMatch[1]); // Lấy số câu hỏi
      
      // Xóa chữ "Câu 1:" hoặc "1." ở đầu đi cho đẹp
      // Regex này tìm đoạn đầu giống questionMatch và thay thế bằng rỗng
      let content = innerHTML.replace(/^(?:<b>|<strong>)?(?:Câu|Bài|Question)?\s*\d+[:.]\s*(?:<\/b>|<\/strong>)?\s*/i, '');
      
      currentQuestion = {
          number: qNum,
          id: `q_import_${Date.now()}_${qNum}`,
          text: content
      };
      return; // Xong dòng này, sang dòng tiếp theo
    }

    // Nếu gặp dòng đánh dấu bắt đầu phần Lời giải
    if (solutionMatch) {
        parsingSolution = true;
        // Nếu trước đó đang dở 1 câu hỏi chưa lưu thì lưu lại
        if(currentQuestion) {
             saveCurrentQuestion();
             currentQuestion = null; // Đánh dấu là đã lưu xong hết câu hỏi
        }
        return;
    }

    // Nếu đang ở chế độ đọc lời giải (thường ở cuối file)
    if (parsingSolution) {
        // Bạn có thể xử lý logic đọc bảng đáp án ở đây nếu muốn
        return;
    }

    // --- 3. NHẬN DIỆN ĐÁP ÁN (A. B. C. D.) ---
    if (currentQuestion) {
        // Regex tìm A., B., C., D. (có thể in đậm hoặc không)
        // Lưu ý: Mammoth chuyển Docx sang HTML đôi khi làm mất định dạng dòng, 
        // nên ta ưu tiên tìm ký tự A. B. C. D.

        const optionRegex = /([A-D])\./g;
        const matches = [...text.matchAll(optionRegex)];

        if (matches.length > 0) {
            // Trường hợp 1: Các đáp án nằm trên cùng 1 dòng (A. ... B. ... C. ... D. ...)
            if (matches.length > 1) {
                 let lastIndex = 0;
                 matches.forEach((m, idx) => {
                     const optId = m[1];
                     const nextMatch = matches[idx + 1];
                     // Lấy nội dung từ sau chữ "A." đến trước chữ "B."
                     const startIndex = m.index! + 2; 
                     const endIndex = nextMatch ? nextMatch.index : text.length;
                     
                     let optContent = text.substring(startIndex, endIndex).trim();
                     currentOptions.push({ id: optId, text: optContent });
                 });
            } 
            // Trường hợp 2: Dòng này bắt đầu bằng đáp án (A. ...) nhưng chỉ có 1 đáp án
            else if (text.startsWith(matches[0][0])) {
                 currentOptions.push({
                     id: matches[0][1],
                     text: innerHTML.replace(/^([A-D])\.\s*/, '') // Giữ nguyên HTML để giữ công thức toán
                 });
            }
            // Trường hợp 3: Có chữ A. B. nhưng nằm giữa câu hỏi (bẫy), bỏ qua
        } else {
            // Dòng này không phải tiêu đề câu hỏi, không phải đáp án
            // => Nó là nội dung tiếp theo của câu hỏi (xuống dòng) hoặc công thức toán
            // Nối vào nội dung câu hỏi hiện tại
            if (currentOptions.length > 0) {
                // Nếu đã có đáp án rồi mà lại thấy text thường -> Có thể là nội dung dài của đáp án cuối
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
  });

  // Lưu câu hỏi cuối cùng
  saveCurrentQuestion();

  return {
    questions,
    answers
  };
};
