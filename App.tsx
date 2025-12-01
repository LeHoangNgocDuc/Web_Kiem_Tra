// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { parseDocx } from './utils/docxParser';
import { ExamData, Question, AnswerKey } from './types';

// --- COMPONENT HIỂN THỊ MATHJAX ---
// Tự động render lại công thức khi nội dung thay đổi
const MathContent = ({ html, className = "" }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([ref.current]).catch(err => console.log(err));
    }
  }, [html]);

  return <div ref={ref} className={`math-content ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
};

// --- COMPONENT CÂU HỎI ---
const QuestionItem = ({ q, userAnswer, onSelect, isSubmitted, answerKey }) => {
  const [showSolution, setShowSolution] = useState(false);

  // Style cho từng đáp án
  const getOptionStyle = (optId) => {
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
    <div id={`question-${q.id}`} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8 scroll-mt-32">
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
                  : <span className="text-red-500 flex items-center gap-1">✗ Sai rồi. Đáp án: <span className="w-8 h-8 flex items-center justify-center bg-green-100 text-green-700 border border-green-300 rounded-full mx-2">{answerKey.correctOptionId}</span></span>
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
            <div className="bg-gray-50 p-5 rounded-lg border-l-4 border-blue-500 text-gray-700 mt-3 animate-fade-in">
              <strong className="block mb-2 text-blue-700 uppercase text-xs tracking-wider">Hướng dẫn giải:</strong>
              <MathContent html={answerKey.solutionText} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- APP CHÍNH ---
export default function App() {
  const [exam, setExam] = useState(() => {
    const saved = localStorage.getItem('EXAM_DATA');
    return saved ? JSON.parse(saved) : null;
  });

  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [manualDuration, setManualDuration] = useState(45);
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  // Đồng hồ
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

  const handleUpload = async (e) => {
    if (e.target.files?.[0]) {
      try {
        const data = await parseDocx(e.target.files[0]);
        if (data.questions && data.answers) {
          const newExam = {
            id: Date.now().toString(),
            title: data.title || "Đề thi trắc nghiệm",
            duration: manualDuration,
            questions: data.questions,
            answers: data.answers,
            isActive: true
          };
          setExam(newExam);
          localStorage.setItem('EXAM_DATA', JSON.stringify(newExam));
          alert('Tải đề thành công!');
          setIsAdminMode(false);
        }
      } catch (err) { alert('Lỗi: ' + err); }
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
    alert('Đã nộp bài!');
    window.scrollTo(0, 0);
  };

  const scrollToQuestion = (id) => {
    const element = document.getElementById(`question-${id}`);
    if (element) {
      const headerOffset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  };

  const fmtTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800 pb-20">
      
      {/* HEADER STICKY */}
      <div className="bg-white shadow-md px-4 py-3 flex justify-between items-center sticky top-0 z-50 border-b border-gray-200">
        <div className="flex items-center gap-3">
           <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white">📝</div>
           <h1 className="text-lg font-bold text-gray-800 hidden md:block">{exam ? exam.title : "Thi Trắc Nghiệm"}</h1>
        </div>
        
        {isExamStarted && !isSubmitted && (
           <div className="flex items-center gap-3 bg-red-50 px-4 py-2 rounded-lg border border-red-200 shadow-sm animate-pulse">
              <span className="text-xs text-red-500 font-bold uppercase hidden md:block">Thời gian</span>
              <span className="text-xl font-mono font-bold text-red-600 leading-none">{fmtTime(timeLeft)}</span>
           </div>
        )}

        {!isExamStarted && (
           <button onClick={() => setIsAdminMode(!isAdminMode)} className="text-xs font-medium text-gray-500 hover:text-blue-600 underline">
             Giáo viên
           </button>
        )}
      </div>

      {/* ADMIN UPLOAD */}
      {isAdminMode && !isExamStarted && (
        <div className="max-w-md mx-auto mt-8 bg-white p-6 rounded-xl shadow-lg border-t-4 border-blue-600">
          <h2 className="font-bold text-xl mb-4 text-center">Khu vực Giáo Viên</h2>
          <input 
             type="password" 
             className="w-full px-4 py-2 mb-4 rounded border focus:ring-2 focus:ring-blue-500 outline-none"
             value={adminPass}
             onChange={e => setAdminPass(e.target.value)}
             placeholder="Nhập mật khẩu (anphuc01)..."
           />
           {adminPass === 'anphuc01' && (
              <div className="bg-blue-50 p-4 rounded border border-blue-100 space-y-4">
                <div>
                  <label className="block font-bold text-sm mb-1">Thời gian (phút)</label>
                  <input 
                    type="number" 
                    value={manualDuration}
                    onChange={e => setManualDuration(Number(e.target.value))}
                    className="w-full px-4 py-2 border rounded text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-sm mb-1">File đề thi (.docx)</label>
                  <input type="file" accept=".docx" onChange={handleUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"/>
                </div>
              </div>
           )}
        </div>
      )}

      {/* MÀN HÌNH CHỜ */}
      {!isExamStarted && !isAdminMode && (
        <div className="max-w-3xl mx-auto mt-16 px-6 text-center">
          {exam ? (
            <div className="bg-white p-10 rounded-2xl shadow-xl border border-gray-100">
              <div className="text-6xl mb-4">🎓</div>
              <h2 className="text-3xl font-bold mb-2 text-gray-900">{exam.title}</h2>
              <div className="flex justify-center gap-6 text-gray-600 my-8">
                <div className="bg-gray-50 px-5 py-2 rounded border">Câu hỏi: <strong>{exam.questions.length}</strong></div>
                <div className="bg-gray-50 px-5 py-2 rounded border">Thời gian: <strong>{exam.duration} phút</strong></div>
              </div>
              <button 
                onClick={handleStart}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-10 rounded-full text-lg shadow-lg transform transition hover:scale-105"
              >
                BẮT ĐẦU LÀM BÀI
              </button>
            </div>
          ) : (
            <div className="text-gray-400 py-20">Hiện chưa có đề thi nào.</div>
          )}
        </div>
      )}

      {/* GIAO DIỆN LÀM BÀI */}
      {isExamStarted && exam && (
        <div className="max-w-[1600px] mx-auto mt-6 px-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* CỘT TRÁI (9 phần): CÂU HỎI */}
          <div className="lg:col-span-9 order-2 lg:order-1">
            {isSubmitted && (
              <div className="bg-white border-l-4 border-green-500 p-6 mb-6 rounded shadow flex justify-between items-center">
                 <div>
                   <h2 className="text-2xl font-bold text-gray-800">Kết quả: <span className="text-green-600">{score}</span> điểm</h2>
                   <p className="text-gray-500 text-sm">Đúng: {exam.answers.filter(a => userAnswers[a.questionId] === a.correctOptionId).length}/{exam.questions.length} câu</p>
                 </div>
                 <button onClick={() => {setIsExamStarted(false); setExam(null); localStorage.removeItem('EXAM_DATA');}} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 font-bold">Làm đề khác</button>
              </div>
            )}

            {exam.questions.map((q) => (
              <QuestionItem 
                key={q.id}
                q={q}
                userAnswer={userAnswers[q.id]}
                onSelect={(qId, optId) => setUserAnswers(prev => ({...prev, [qId]: optId}))}
                isSubmitted={isSubmitted}
                answerKey={exam.answers.find(a => a.questionId === q.id)}
              />
            ))}
          </div>

          {/* CỘT PHẢI (3 phần): SIDEBAR */}
          <div className="lg:col-span-3 sticky top-20 order-1 lg:order-2 mb-6 lg:mb-0">
            <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200 max-h-[85vh] overflow-y-auto custom-scrollbar">
               <h3 className="font-bold text-gray-700 mb-4 text-center border-b pb-2 text-sm uppercase">Danh sách câu hỏi</h3>
               
               <div className="grid grid-cols-5 gap-2">
                 {exam.questions.map((q) => {
                   let btnClass = "bg-white border-gray-200 text-gray-600 hover:bg-gray-100";
                   
                   if (!isSubmitted) {
                      if (userAnswers[q.id]) btnClass = "bg-blue-600 text-white border-blue-600 shadow-md";
                   } else {
                      const ansKey = exam.answers.find(a => a.questionId === q.id);
                      if (ansKey && userAnswers[q.id] === ansKey.correctOptionId) {
                         btnClass = "bg-green-500 text-white border-green-500"; 
                      } else if (userAnswers[q.id]) {
                         btnClass = "bg-red-500 text-white border-red-500"; 
                      }
                   }

                   return (
                     <button
                       key={q.id}
                       onClick={() => scrollToQuestion(q.id)}
                       className={`w-full aspect-square flex items-center justify-center text-xs font-bold rounded border transition ${btnClass}`}
                     >
                       {q.number}
                     </button>
                   )
                 })}
               </div>

               {!isSubmitted && (
                 <button 
                   onClick={() => { if(confirm('Nộp bài ngay?')) handleSubmit() }}
                   className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow transition"
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
