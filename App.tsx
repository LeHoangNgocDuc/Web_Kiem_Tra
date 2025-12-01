import React, { useState, useEffect, useRef } from 'react';
import { parseDocx } from './utils/docxParser';
import { ExamData, Question, AnswerKey } from './types';

// --- PHẦN SỬA LỖI QUAN TRỌNG ---
// Khai báo cho TypeScript biết MathJax là một biến toàn cục
declare global {
  interface Window {
    MathJax: any;
  }
}
// --------------------------------

// --- 1. COMPONENT HIỂN THỊ MATHJAX ---
const MathContent = ({ html, className = "" }: { html: string, className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Chỉ chạy khi MathJax đã tải xong
    if (ref.current && window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([ref.current])
        .catch((err: any) => console.log('MathJax error:', err));
    }
  }, [html]);

  return <div ref={ref} className={`math-content ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
};

// --- 2. COMPONENT CÂU HỎI ---
const QuestionItem = ({ 
  q, userAnswer, onSelect, isSubmitted, answerKey 
}: { 
  q: Question, userAnswer: string, onSelect: any, isSubmitted: boolean, answerKey?: AnswerKey 
}) => {
  const [showSolution, setShowSolution] = useState(false);

  // Màu sắc đáp án
  const getOptionStyle = (optId: string) => {
    const baseStyle = "border p-3 rounded cursor-pointer transition flex items-center gap-2 hover:bg-gray-50";
    
    if (!isSubmitted) {
      return userAnswer === optId 
        ? `${baseStyle} bg-blue-100 border-blue-500 ring-1 ring-blue-500` 
        : `${baseStyle} bg-white border-gray-300`;
    } else {
      if (optId === answerKey?.correctOptionId) return `${baseStyle} bg-green-100 border-green-600 ring-1 ring-green-600`; 
      if (userAnswer === optId && optId !== answerKey?.correctOptionId) return `${baseStyle} bg-red-100 border-red-500`; 
      return `${baseStyle} bg-white opacity-60`; 
    }
  };

  return (
    <div id={`question-${q.id}`} className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 mb-6 scroll-mt-24">
      <div className="mb-4 text-gray-800">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">Câu {q.number}</span>
        </div>
        <MathContent html={q.text} className="text-lg font-medium" />
      </div>

      <div className="grid grid-cols-1 gap-3">
        {q.options.map(opt => (
          <div 
            key={opt.id} 
            onClick={() => !isSubmitted && onSelect(q.id, opt.id)}
            className={getOptionStyle(opt.id)}
          >
            <span className={`font-bold w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full text-xs ${userAnswer === opt.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
              {opt.id}
            </span>
            <MathContent html={opt.text} />
          </div>
        ))}
      </div>

      {isSubmitted && answerKey && (
        <div className="mt-4 pt-4 border-t border-gray-100 bg-gray-50 -mx-5 -mb-5 px-5 pb-5 rounded-b-lg">
          <div className="flex items-center justify-between mb-3">
             <div className="font-bold">
                {userAnswer === answerKey.correctOptionId 
                  ? <span className="text-green-600">✓ Chính xác</span>
                  : <span className="text-red-600">✗ Sai rồi. Đáp án đúng: <span className="text-xl inline-block border border-green-500 px-2 rounded bg-white text-green-700 mx-2">{answerKey.correctOptionId}</span></span>
                }
             </div>
             <button 
                onClick={() => setShowSolution(!showSolution)}
                className="text-sm text-blue-600 hover:text-blue-800 underline font-semibold"
             >
                {showSolution ? 'Ẩn lời giải' : 'Xem lời giải chi tiết'}
             </button>
          </div>
          
          {showSolution && (
            <div className="bg-white p-4 border border-blue-200 rounded shadow-sm text-gray-700 animate-fade-in">
              <strong className="block mb-2 text-blue-700 border-b pb-1">Hướng dẫn giải:</strong>
              <MathContent html={answerKey.solutionText} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- 3. APP CHÍNH ---
export default function App() {
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

  // Upload đề
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      try {
        const data = await parseDocx(e.target.files[0]);
        if (data.questions && data.answers) {
          const newExam: ExamData = {
            id: Date.now().toString(),
            title: data.title || "Đề thi trắc nghiệm",
            duration: manualDuration,
            questions: data.questions as Question[],
            answers: data.answers as any[],
            isActive: true
          };
          setExam(newExam);
          localStorage.setItem('EXAM_DATA', JSON.stringify(newExam));
          alert('Tải đề thành công!');
          setIsAdminMode(false);
        }
      } catch (err: any) { alert('Lỗi: ' + err.message); }
    }
  };

  const handleStart = () => {
    if (!exam) return;
    setUserAnswers({});
    setIsSubmitted(false);
    setScore(0);
    setTimeLeft(exam.duration * 60);
    setIsExamStarted(true);
    window.scrollTo(0, 0);
  };

  const handleSubmit = () => {
    if (!exam) return;
    let correct = 0;
    exam.answers.forEach(ans => {
      if (userAnswers[ans.questionId] === ans.correctOptionId) correct++;
    });
    setScore(parseFloat(((correct / exam.questions.length) * 10).toFixed(2)));
    setIsSubmitted(true);
    alert('Đã nộp bài! Đang chuyển sang xem kết quả...');
    window.scrollTo(0, 0);
  };

  const scrollToQuestion = (id: string) => {
    const element = document.getElementById(`question-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  // --- GIAO DIỆN ---
  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800 pb-20">
      
      {/* HEADER */}
      <div className="bg-white shadow px-6 py-3 flex justify-between items-center sticky top-0 z-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
           <span className="text-2xl">📝</span>
           <h1 className="text-xl font-bold text-gray-800 hidden md:block">Thi Trắc Nghiệm Online</h1>
        </div>
        
        {isExamStarted && !isSubmitted && (
           <div className="flex flex-col items-center bg-red-50 px-4 py-1 rounded border border-red-100 shadow-sm">
              <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Thời gian còn lại</span>
              <span className="text-xl font-mono font-bold text-red-600">{fmtTime(timeLeft)}</span>
           </div>
        )}

        {!isExamStarted && (
           <button onClick={() => setIsAdminMode(!isAdminMode)} className="text-xs text-gray-400 hover:text-blue-600 underline">
             Giáo viên (Admin)
           </button>
        )}
      </div>

      {/* ADMIN UPLOAD */}
      {isAdminMode && !isExamStarted && (
        <div className="max-w-xl mx-auto mt-6 bg-white p-6 rounded shadow-lg border-t-4 border-blue-600">
          <h2 className="font-bold text-lg mb-4 text-gray-800">Khu vực tải đề thi</h2>
          <div className="space-y-4">
             <input 
               type="password" 
               className="border p-2 rounded w-full bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
               value={adminPass}
               onChange={e => setAdminPass(e.target.value)}
               placeholder="Nhập mật khẩu (anphuc01)..."
             />
             {adminPass === 'anphuc01' && (
                <div className="bg-blue-50 p-4 rounded border border-blue-100 animate-fade-in">
                  <div className="flex gap-4 mb-4">
                    <div className="w-1/3">
                      <label className="block font-bold text-sm mb-1 text-gray-600">Phút:</label>
                      <input 
                        type="number" 
                        value={manualDuration}
                        onChange={e => setManualDuration(Number(e.target.value))}
                        className="border p-2 rounded w-full text-center font-bold"
                      />
                    </div>
                    <div className="w-2/3">
                      <label className="block font-bold text-sm mb-1 text-gray-600">File (.docx):</label>
                      <input type="file" accept=".docx" onChange={handleUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"/>
                    </div>
                  </div>
                </div>
             )}
          </div>
        </div>
      )}

      {/* MÀN HÌNH CHỜ */}
      {!isExamStarted && !isAdminMode && (
        <div className="max-w-4xl mx-auto mt-12 px-4 text-center">
          {exam ? (
            <div className="bg-white p-10 rounded-xl shadow-xl border border-gray-100">
              <div className="text-6xl mb-4">🎓</div>
              <h2 className="text-3xl font-bold mb-2 text-gray-800">{exam.title}</h2>
              <div className="flex justify-center gap-8 text-gray-600 my-6">
                <div className="bg-gray-50 px-4 py-2 rounded border">📝 <strong>{exam.questions.length}</strong> câu hỏi</div>
                <div className="bg-gray-50 px-4 py-2 rounded border">⏱ <strong>{exam.duration}</strong> phút</div>
              </div>
              <button 
                onClick={handleStart}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-12 rounded-full text-xl shadow-lg transform transition hover:scale-105 active:scale-95"
              >
                BẮT ĐẦU LÀM BÀI
              </button>
            </div>
          ) : (
            <div className="text-gray-400 py-20">Hiện chưa có đề thi nào.</div>
          )}
        </div>
      )}

      {/* GIAO DIỆN LÀM BÀI (MAIN + SIDEBAR) */}
      {isExamStarted && exam && (
        <div className="max-w-7xl mx-auto mt-6 px-2 md:px-4 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* CỘT TRÁI: DANH SÁCH CÂU HỎI */}
          <div className="md:col-span-8 lg:col-span-9 order-2 md:order-1">
            {isSubmitted && (
              <div className="bg-green-50 border border-green-200 p-6 mb-6 rounded-lg flex flex-col md:flex-row items-center justify-between shadow-sm">
                 <div className="text-center md:text-left mb-4 md:mb-0">
                   <h2 className="text-2xl font-bold text-green-700">Kết quả: {score} điểm</h2>
                   <p className="text-green-600">Số câu đúng: {exam.answers.filter(a => userAnswers[a.questionId] === a.correctOptionId).length} / {exam.questions.length}</p>
                 </div>
                 <button onClick={() => {setIsExamStarted(false); setExam(null); localStorage.removeItem('EXAM_DATA');}} className="px-6 py-2 bg-white border border-green-500 text-green-700 rounded hover:bg-green-100 font-bold transition">
                   Làm đề khác
                 </button>
              </div>
            )}

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
          </div>

          {/* CỘT PHẢI: BẢNG TRẢ LỜI (SIDEBAR) */}
          <div className="md:col-span-4 lg:col-span-3 sticky top-24 order-1 md:order-2 mb-6 md:mb-0">
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200 max-h-[calc(100vh-120px)] overflow-y-auto">
               <h3 className="font-bold text-gray-700 mb-3 text-center border-b pb-2">Danh sách câu hỏi</h3>
               
               <div className="grid grid-cols-5 gap-2">
                 {exam.questions.map((q) => {
                   let btnClass = "bg-white border-gray-300 text-gray-600 hover:bg-gray-100";
                   
                   if (!isSubmitted) {
                      if (userAnswers[q.id]) btnClass = "bg-blue-600 text-white border-blue-600 shadow-md transform scale-105";
                   } else {
                      const ansKey = exam.answers.find(a => a.questionId === q.id);
                      if (ansKey && userAnswers[q.id] === ansKey.correctOptionId) {
                         btnClass = "bg-green-500 text-white border-green-500"; 
                      } else if (userAnswers[q.id]) {
                         btnClass = "bg-red-500 text-white border-red-500"; 
                      } else {
                         btnClass = "bg-gray-100 text-gray-400"; 
                      }
                   }

                   return (
                     <button
                       key={q.id}
                       onClick={() => scrollToQuestion(q.id)}
                       className={`w-full aspect-square flex items-center justify-center text-sm font-bold rounded border transition-all duration-200 ${btnClass}`}
                     >
                       {q.number}
                     </button>
                   )
                 })}
               </div>

               {!isSubmitted && (
                 <button 
                   onClick={() => { if(confirm('Bạn có chắc chắn muốn nộp bài?')) handleSubmit() }}
                   className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded shadow transition transform active:scale-95"
                 >
                   NỘP BÀI
                 </button>
               )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
