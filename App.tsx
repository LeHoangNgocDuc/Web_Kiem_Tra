import React, { useState, useEffect, useRef } from 'react';
import { parseDocx } from './utils/docxParser';
import { ExamData, Question, AnswerKey } from './types';

// --- PHẦN 1: HÀM HỖ TRỢ MATHJAX (SỬA LỖI HIỂN THỊ) ---
// Component này bọc lấy nội dung có công thức Toán để ép nó hiển thị đúng
const MathContent = ({ html }: { html: string }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Mỗi khi html thay đổi, gọi MathJax vẽ lại công thức trong div này
    if (ref.current && (window as any).MathJax && (window as any).MathJax.typesetPromise) {
      (window as any).MathJax.typesetPromise([ref.current]);
    }
  }, [html]);

  return <div ref={ref} className="math-content" dangerouslySetInnerHTML={{ __html: html }} />;
};

// --- PHẦN 2: COMPONENT CÂU HỎI ---
const QuestionItem = ({ 
  q, userAnswer, onSelect, isSubmitted, answerKey 
}: { 
  q: Question, userAnswer: string, onSelect: any, isSubmitted: boolean, answerKey?: AnswerKey 
}) => {
  const [showSolution, setShowSolution] = useState(false);

  // Trigger lại MathJax khi bấm xem lời giải
  useEffect(() => {
    if (showSolution && (window as any).MathJax) {
      setTimeout(() => (window as any).MathJax.typesetPromise(), 100);
    }
  }, [showSolution]);

  // Logic màu sắc
  const getBg = (optId: string) => {
    if (!isSubmitted) return userAnswer === optId ? 'bg-blue-100 border-blue-500' : 'bg-white border-gray-200';
    if (optId === answerKey?.correctOptionId) return 'bg-green-100 border-green-500'; // Đáp án đúng
    if (userAnswer === optId) return 'bg-red-100 border-red-500'; // Trò chọn sai
    return 'bg-white border-gray-200 opacity-50';
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6 border">
      <div className="mb-4 text-lg">
        <strong className="text-blue-600">Câu {q.number}:</strong>
        <MathContent html={q.text} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {q.options.map(opt => (
          <div 
            key={opt.id} 
            onClick={() => !isSubmitted && onSelect(q.id, opt.id)}
            className={`border p-3 rounded cursor-pointer transition flex items-center gap-2 ${getBg(opt.id)}`}
          >
            <span className="font-bold w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 text-xs">{opt.id}</span>
            <MathContent html={opt.text} />
          </div>
        ))}
      </div>

      {isSubmitted && answerKey && (
        <div className="mt-4 pt-4 border-t">
          {userAnswer === answerKey.correctOptionId 
            ? <p className="text-green-600 font-bold mb-2">✓ Chính xác</p>
            : <p className="text-red-600 font-bold mb-2">✗ Sai rồi (Đáp án: {answerKey.correctOptionId})</p>
          }
          
          <button 
            onClick={() => setShowSolution(!showSolution)}
            className="text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
          >
            {showSolution ? 'Ẩn lời giải' : 'Xem lời giải chi tiết'}
          </button>
          
          {showSolution && (
            <div className="mt-3 p-4 bg-gray-50 border-l-4 border-green-500 rounded">
              <strong className="block mb-2 text-green-700">Hướng dẫn giải:</strong>
              <MathContent html={answerKey.solutionText} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- PHẦN 3: ỨNG DỤNG CHÍNH ---
export default function App() {
  // State quản lý dữ liệu
  const [exam, setExam] = useState<ExamData | null>(() => {
    const saved = localStorage.getItem('EXAM_DATA');
    return saved ? JSON.parse(saved) : null;
  });

  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [manualDuration, setManualDuration] = useState(45);
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  // Đồng hồ đếm ngược
  useEffect(() => {
    if (!isExamStarted || isSubmitted || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          handleSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isExamStarted, isSubmitted, timeLeft]);

  // Xử lý upload đề (ADMIN)
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      try {
        const data = await parseDocx(e.target.files[0]);
        if (data.questions && data.answers) {
          const newExam: ExamData = {
            id: Date.now().toString(),
            title: data.title || "Đề thi trắc nghiệm",
            duration: manualDuration, // Lấy thời gian admin nhập
            questions: data.questions as Question[],
            answers: data.answers as any[],
            isActive: true
          };
          setExam(newExam);
          localStorage.setItem('EXAM_DATA', JSON.stringify(newExam));
          alert('Tải đề thành công! Học sinh có thể vào thi ngay.');
          setIsAdminMode(false); // Thoát chế độ admin
        }
      } catch (err) { alert('Lỗi file: ' + err); }
    }
  };

  // Bắt đầu làm bài (HỌC SINH)
  const handleStart = () => {
    if (!exam) return;
    setUserAnswers({});
    setIsSubmitted(false);
    setScore(0);
    setTimeLeft(exam.duration * 60);
    setIsExamStarted(true);
    // Cuộn lên đầu
    window.scrollTo(0, 0);
  };

  // Nộp bài
  const handleSubmit = () => {
    if (!exam) return;
    let correct = 0;
    exam.answers.forEach(ans => {
      if (userAnswers[ans.questionId] === ans.correctOptionId) correct++;
    });
    setScore(parseFloat(((correct / exam.questions.length) * 10).toFixed(2)));
    setIsSubmitted(true);
    alert('Đã nộp bài!');
    window.scrollTo(0, 0);
  };

  // Format giờ
  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // --- GIAO DIỆN ---
  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800">
      
      {/* HEADER */}
      <div className="bg-white shadow p-4 flex justify-between items-center sticky top-0 z-50">
        <h1 className="text-xl font-bold text-blue-700">📚 Hệ Thống Thi Trắc Nghiệm</h1>
        
        {isExamStarted && !isSubmitted && (
          <div className="text-2xl font-mono font-bold text-red-600 bg-red-50 px-3 py-1 rounded">
            {fmtTime(timeLeft)}
          </div>
        )}

        {!isExamStarted && (
           <button onClick={() => setIsAdminMode(!isAdminMode)} className="text-sm text-gray-400 hover:text-gray-600">
             Admin Upload
           </button>
        )}
      </div>

      {/* ADMIN PANEL */}
      {isAdminMode && !isExamStarted && (
        <div className="max-w-2xl mx-auto mt-6 bg-white p-6 rounded shadow border-t-4 border-blue-500">
          <h2 className="font-bold text-lg mb-4">Khu vực Giáo viên (Admin)</h2>
          
          <div className="mb-4">
             <label className="block text-sm mb-1">Mật khẩu quản trị:</label>
             <input 
               type="password" 
               className="border p-2 rounded w-full"
               value={adminPass}
               onChange={e => setAdminPass(e.target.value)}
               placeholder="Nhập mật khẩu..."
             />
          </div>

          {adminPass === 'anphuc01' ? (
            <div className="bg-green-50 p-4 rounded border border-green-200">
              <div className="mb-4">
                <label className="block font-bold mb-1">1. Thời gian thi (phút):</label>
                <input 
                  type="number" 
                  value={manualDuration}
                  onChange={e => setManualDuration(Number(e.target.value))}
                  className="border p-2 rounded w-24 text-center font-bold"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">2. Chọn file đề (.docx):</label>
                <input type="file" accept=".docx" onChange={handleUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
              </div>
              <p className="text-xs text-gray-500 mt-2">* Lưu ý: File Word cần chuyển MathType sang LaTeX trước khi tải lên.</p>
            </div>
          ) : <p className="text-red-500 text-sm">Vui lòng nhập đúng mật khẩu để tải đề.</p>}
        </div>
      )}

      {/* MÀN HÌNH CHỜ (KHI CHƯA BẮT ĐẦU) */}
      {!isExamStarted && !isAdminMode && (
        <div className="max-w-3xl mx-auto mt-10 text-center px-4">
          {exam ? (
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <h2 className="text-2xl font-bold mb-2 text-blue-800">{exam.title}</h2>
              <div className="flex justify-center gap-6 text-gray-600 mb-8">
                <span>📝 Số câu: <strong>{exam.questions.length}</strong></span>
                <span>⏱ Thời gian: <strong>{exam.duration} phút</strong></span>
              </div>
              <button 
                onClick={handleStart}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full text-lg shadow-lg transform transition hover:scale-105"
              >
                BẮT ĐẦU LÀM BÀI 🚀
              </button>
            </div>
          ) : (
            <div className="bg-white p-10 rounded shadow">
              <p className="text-xl text-gray-500">Chưa có đề thi nào được tải lên.</p>
              <p className="text-sm text-gray-400 mt-2">Vui lòng liên hệ giáo viên.</p>
            </div>
          )}
        </div>
      )}

      {/* MÀN HÌNH THI & KẾT QUẢ */}
      {isExamStarted && exam && (
        <div className="max-w-4xl mx-auto mt-6 px-4 pb-20">
          
          {/* HIỆN ĐIỂM SỐ KHI NỘP XONG */}
          {isSubmitted && (
            <div className="bg-green-100 border-l-4 border-green-500 p-6 mb-6 rounded shadow animate-bounce-short">
              <h2 className="text-2xl font-bold text-green-800 text-center">
                Kết Quả: {score} / 10 Điểm
              </h2>
              <div className="text-center mt-4">
                <button onClick={() => {setIsExamStarted(false); setExam(null); localStorage.removeItem('EXAM_DATA');}} className="text-blue-600 underline text-sm">
                  Làm đề khác / Tải lại trang
                </button>
              </div>
            </div>
          )}

          {/* DANH SÁCH CÂU HỎI */}
          {exam.questions.map((q) => (
            <QuestionItem 
              key={q.id}
              q={q}
              userAnswer={userAnswers[q.id]}
              onSelect={(qId: string, optId: string) => setUserAnswers(prev => ({...prev, [qId]: optId}))}
              isSubmitted={isSubmitted}
              answerKey={exam.answers.find(a => a.questionId === q.id)}
            />
          ))}

          {/* NÚT NỘP BÀI */}
          {!isSubmitted && (
            <button 
              onClick={() => { if(confirm('Nộp bài ngay?')) handleSubmit() }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg shadow-lg text-xl"
            >
              NỘP BÀI THI
            </button>
          )}
        </div>
      )}
    </div>
  );
}
