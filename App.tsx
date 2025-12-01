import React, { useState, useEffect, useRef } from 'react';
import { parseDocx } from './utils/docxParser';
import { ExamData, Question, AnswerKey } from './types';

// --- 1. COMPONENT HIỂN THỊ MATHJAX (ĐÃ FIX LỖI BUILD) ---
const MathContent = ({ html, className = "" }: { html: string, className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Sử dụng (window as any) để tránh lỗi TypeScript khi Build
    const MathJax = (window as any).MathJax;
    if (ref.current && MathJax && MathJax.typesetPromise) {
      MathJax.typesetPromise([ref.current]).catch((err: any) => console.log(err));
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

  const getOptionStyle = (optId: string) => {
    const baseStyle = "border p-3 rounded-lg cursor-pointer transition flex items-center gap-3 hover:bg-gray-50 text-base";
    
    if (!isSubmitted) {
      return userAnswer === optId 
        ? `${baseStyle} bg-blue-50 border-blue-500 ring-1 ring-blue-500` 
        : `${baseStyle} bg-white border-gray-200`;
    } else {
      if (optId === answerKey?.correctOptionId) return `${baseStyle} bg-green-50 border-green-500 ring-1 ring-green-500`; 
      if (userAnswer === optId && optId !== answerKey?.correctOptionId) return `${baseStyle} bg-red-50 border-red-500`; 
      return `${baseStyle} bg-white opacity-50`; 
    }
  };

  return (
    <div id={`question-${q.id}`} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8 scroll-mt-28">
      <div className="mb-5">
        <div className="inline-block bg-blue-100 text-blue-800 text-sm font-bold px-3 py-1 rounded-full mb-3">
          Câu {q.number}
        </div>
        <MathContent html={q.text} className="text-lg text-gray-800 font-medium leading-relaxed" />
      </div>

      <div className="grid grid-cols-1 gap-3">
        {q.options.map(opt => (
          <div 
            key={opt.id} 
            onClick={() => !isSubmitted && onSelect(q.id, opt.id)}
            className={getOptionStyle(opt.id)}
          >
            <span className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full text-sm font-bold border ${userAnswer === opt.id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-600'}`}>
              {opt.id}
            </span>
            <MathContent html={opt.text} />
          </div>
        ))}
      </div>

      {isSubmitted && answerKey && (
        <div className="mt-5 pt-5 border-t border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
             <div className="font-bold text-lg">
                {userAnswer === answerKey.correctOptionId 
                  ? <span className="text-green-600 flex items-center gap-1">✓ Chính xác</span>
                  : <span className="text-red-500 flex items-center gap-1">✗ Sai rồi. Đáp án đúng: <span className="w-8 h-8 flex items-center justify-center bg-green-100 text-green-700 border border-green-300 rounded-full">{answerKey.correctOptionId}</span></span>
                }
             </div>
             <button 
                onClick={() => setShowSolution(!showSolution)}
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-semibold bg-blue-50 px-3 py-1 rounded"
             >
                {showSolution ? 'Ẩn lời giải' : 'Xem lời giải chi tiết'}
             </button>
          </div>
          
          {showSolution && (
            <div className="bg-gray-50 p-5 rounded-lg border-l-4 border-blue-500 text-gray-700 animate-fade-in mt-3">
              <strong className="block mb-2 text-blue-700 uppercase text-sm tracking-wider">Hướng dẫn giải:</strong>
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

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20">
      
      {/* HEADER */}
      <div className="bg-white shadow-md px-6 py-3 flex justify-between items-center sticky top-0 z-50 border-b border-gray-200">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xl">📝</div>
           <h1 className="text-xl font-bold text-gray-800 hidden md:block">Thi Trắc Nghiệm Online</h1>
        </div>
        
        {isExamStarted && !isSubmitted && (
           <div className="flex items-center gap-3 bg-red-50 px-5 py-2 rounded-full border border-red-100 shadow-sm animate-pulse">
              <span className="text-xs text-red-500 font-bold uppercase tracking-wider">Thời gian</span>
              <span className="text-2xl font-mono font-bold text-red-600 leading-none">{fmtTime(timeLeft)}</span>
           </div>
        )}

        {!isExamStarted && (
           <button onClick={() => setIsAdminMode(!isAdminMode)} className="text-sm font-medium text-gray-500 hover:text-blue-600 transition">
             Giáo viên (Admin)
           </button>
        )}
      </div>

      {/* ADMIN UPLOAD */}
      {isAdminMode && !isExamStarted && (
        <div className="max-w-xl mx-auto mt-8 bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
          <h2 className="font-bold text-2xl mb-6 text-gray-800 text-center">Khu vực Giáo Viên</h2>
          <div className="space-y-5">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">Mật khẩu quản trị</label>
               <input 
                 type="password" 
                 className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition outline-none"
                 value={adminPass}
                 onChange={e => setAdminPass(e.target.value)}
                 placeholder="Nhập mật khẩu..."
               />
             </div>
             
             {adminPass === 'anphuc01' && (
                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 animate-fade-in space-y-4">
                  <div>
                    <label className="block font-bold text-sm mb-2 text-gray-700">Thời gian làm bài (phút)</label>
                    <input 
                      type="number" 
                      value={manualDuration}
                      onChange={e => setManualDuration(Number(e.target.value))}
                      className="w-full px-4 py-2 border rounded-lg text-center font-bold text-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-sm mb-2 text-gray-700">Chọn file đề thi (.docx)</label>
                    <input type="file" accept=".docx" onChange={handleUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition cursor-pointer"/>
                  </div>
                </div>
             )}
          </div>
        </div>
      )}

      {/* MÀN HÌNH CHỜ */}
      {!isExamStarted && !isAdminMode && (
        <div className="max-w-4xl mx-auto mt-16 px-6 text-center">
          {exam ? (
            <div className="bg-white p-12 rounded-3xl shadow-2xl border border-gray-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-600"></div>
              <div className="text-7xl mb-6">🎓</div>
              <h2 className="text-4xl font-extrabold mb-4 text-gray-900">{exam.title}</h2>
              <p className="text-gray-500 mb-8 text-lg">Chúc các em làm bài thi thật tốt!</p>
              
              <div className="flex justify-center gap-6 text-gray-600 mb-10">
                <div className="flex flex-col items-center bg-gray-50 px-6 py-3 rounded-xl border">
                  <span className="text-sm font-medium uppercase tracking-wide text-gray-400">Số câu hỏi</span>
                  <strong className="text-2xl text-blue-600">{exam.questions.length}</strong>
                </div>
                <div className="flex flex-col items-center bg-gray-50 px-6 py-3 rounded-xl border">
                  <span className="text-sm font-medium uppercase tracking-wide text-gray-400">Thời gian</span>
                  <strong className="text-2xl text-blue-600">{exam.duration} phút</strong>
                </div>
              </div>

              <button 
                onClick={handleStart}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 px-12 rounded-full text-xl shadow-xl transform transition hover:scale-105 active:scale-95"
              >
                BẮT ĐẦU LÀM BÀI
              </button>
            </div>
          ) : (
            <div className="text-gray-400 py-20 bg-white rounded-2xl shadow-sm border border-dashed border-gray-300">
              <p className="text-xl">Chưa có đề thi nào được tải lên.</p>
              <p className="text-sm mt-2">Vui lòng chờ giáo viên cập nhật.</p>
            </div>
          )}
        </div>
      )}

      {/* GIAO DIỆN LÀM BÀI */}
      {isExamStarted && exam && (
        <div className="max-w-[1400px] mx-auto mt-8 px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* CỘT TRÁI: DANH SÁCH CÂU HỎI */}
          <div className="lg:col-span-9 order-2 lg:order-1">
            {isSubmitted && (
              <div className="bg-white border-l-8 border-green-500 p-8 mb-8 rounded-xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                 <div>
                   <h2 className="text-3xl font-bold text-gray-800 mb-1">Kết quả: <span className="text-green-600">{score}</span> điểm</h2>
                   <p className="text-gray-500">Số câu đúng: {exam.answers.filter(a => userAnswers[a.questionId] === a.correctOptionId).length} / {exam.questions.length}</p>
                 </div>
                 <button onClick={() => {setIsExamStarted(false); setExam(null); localStorage.removeItem('EXAM_DATA');}} className="px-8 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-bold transition">
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
          <div className="lg:col-span-3 sticky top-28 order-1 lg:order-2 mb-8 lg:mb-0">
            <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-100 max-h-[calc(100vh-140px)] overflow-y-auto">
               <h3 className="font-bold text-gray-700 mb-4 text-center border-b pb-3 uppercase text-sm tracking-wide">Danh sách câu hỏi</h3>
               
               <div className="grid grid-cols-5 gap-2">
                 {exam.questions.map((q) => {
                   let btnClass = "bg-white border-gray-200 text-gray-600 hover:bg-gray-50";
                   
                   if (!isSubmitted) {
                      if (userAnswers[q.id]) btnClass = "bg-blue-600 text-white border-blue-600 shadow-md";
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
                       className={`w-full aspect-square flex items-center justify-center text-sm font-bold rounded-lg border transition-all duration-200 ${btnClass}`}
                     >
                       {q.number}
                     </button>
                   )
                 })}
               </div>

               {!isSubmitted && (
                 <button 
                   onClick={() => { if(confirm('Bạn có chắc chắn muốn nộp bài?')) handleSubmit() }}
                   className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition transform active:scale-95"
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
