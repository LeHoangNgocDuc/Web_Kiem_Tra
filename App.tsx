import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { parseDocx } from './utils/docxParser';
import { ExamData, Question, AnswerKey } from './types';

// --- COMPONENT HIỂN THỊ MATHJAX ---
const MathContent = ({ html, id }: { html: string, id: string }) => {
  useLayoutEffect(() => {
    try {
      if ((window as any).MathJax && (window as any).MathJax.typesetPromise) {
        const element = document.getElementById(id);
        if (element) {
          (window as any).MathJax.typesetPromise([element]).catch(() => {});
        }
      }
    } catch (e) { console.error(e); }
  }, [html, id]);

  return <div id={id} className="math-content" dangerouslySetInnerHTML={{ __html: html }} />;
};

// --- APP CHÍNH ---
export default function App() {
  const [exam, setExam] = useState<ExamData | null>(() => {
    try {
      const saved = localStorage.getItem('EXAM_DATA');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [manualDuration, setManualDuration] = useState(45);
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState("0");
  const [showSolutionId, setShowSolutionId] = useState<string | null>(null);

  // Đồng hồ đếm ngược
  useEffect(() => {
    if (!isExamStarted || isSubmitted || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { handleSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isExamStarted, isSubmitted, timeLeft]);

  // Upload file
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      try {
        const data = await parseDocx(e.target.files[0]);
        if (data.questions && data.answers) {
          const newExam: ExamData = {
            id: Date.now().toString(),
            title: data.title || "Đề thi trắc nghiệm",
            duration: manualDuration, // Ưu tiên số phút admin nhập
            questions: data.questions as Question[],
            answers: data.answers as AnswerKey[],
            isActive: true
          };
          setExam(newExam);
          localStorage.setItem('EXAM_DATA', JSON.stringify(newExam));
          alert('Tải đề thành công!');
          setIsAdminMode(false);
        }
      } catch (err: any) { alert('Lỗi: ' + err?.message || "Lỗi file"); }
    }
  };

  const handleStart = () => {
    if (!exam) return;
    setUserAnswers({});
    setIsSubmitted(false);
    setScore("0");
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
    setScore(((correct / exam.questions.length) * 10).toFixed(2));
    setIsSubmitted(true);
    alert('Đã nộp bài!');
    window.scrollTo(0, 0);
  };

  const scrollToQuestion = (id: string) => {
    const element = document.getElementById(`q-box-${id}`);
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
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800 pb-20">
      
      {/* HEADER */}
      <div className="bg-white shadow px-4 py-3 flex justify-between items-center sticky top-0 z-50 h-16">
        <div className="flex items-center gap-2">
           <span className="text-2xl">📝</span>
           <h1 className="text-lg font-bold text-gray-800 hidden sm:block">Thi Trắc Nghiệm Online</h1>
        </div>
        
        {isExamStarted && !isSubmitted && (
           <div className="flex items-center gap-2 bg-red-50 px-4 py-1 rounded border border-red-200">
              <span className="text-xs text-red-500 font-bold uppercase hidden sm:inline">Thời gian</span>
              <span className="text-xl font-mono font-bold text-red-600">{fmtTime(timeLeft)}</span>
           </div>
        )}

        {!isExamStarted && (
           <button onClick={() => setIsAdminMode(!isAdminMode)} className="text-xs text-gray-500 hover:text-blue-600 underline">
             Giáo viên
           </button>
        )}
      </div>

      {/* ADMIN PANEL */}
      {isAdminMode && !isExamStarted && (
        <div className="max-w-md mx-auto mt-8 bg-white p-6 rounded shadow border-t-4 border-blue-600">
          <h2 className="font-bold text-center mb-4">Admin Upload</h2>
          <input type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} className="w-full border p-2 mb-3 rounded" placeholder="Mật khẩu..." />
          {adminPass === 'anphuc01' && (
             <div className="space-y-3 bg-blue-50 p-4 rounded">
               <div>
                 <label className="block text-sm font-bold mb-1">Thời gian (phút):</label>
                 <input type="number" value={manualDuration} onChange={e => setManualDuration(Number(e.target.value))} className="w-full border p-2 rounded text-center font-bold"/>
               </div>
               <div>
                 <label className="block text-sm font-bold mb-1">File đề (.docx):</label>
                 <input type="file" accept=".docx" onChange={handleUpload} className="block w-full text-sm"/>
               </div>
             </div>
          )}
        </div>
      )}

      {/* START SCREEN */}
      {!isExamStarted && !isAdminMode && (
        <div className="max-w-2xl mx-auto mt-16 px-4 text-center">
          {exam ? (
            <div className="bg-white p-8 rounded-xl shadow-lg">
              <h2 className="text-2xl font-bold text-blue-800 mb-6">{exam.title}</h2>
              <div className="flex justify-center gap-8 mb-8 text-gray-600">
                <div><strong>{exam.questions.length}</strong> Câu hỏi</div>
                <div><strong>{exam.duration}</strong> Phút</div>
              </div>
              <button onClick={handleStart} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-10 rounded-full shadow-lg transition transform hover:scale-105">
                BẮT ĐẦU LÀM BÀI
              </button>
            </div>
          ) : <div className="text-gray-400 py-10">Chưa có đề thi.</div>}
        </div>
      )}

      {/* EXAM INTERFACE */}
      {isExamStarted && exam && (
        <div className="max-w-[1400px] mx-auto mt-6 px-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: QUESTIONS */}
          <div className="lg:col-span-9 order-2 lg:order-1">
            {isSubmitted && (
              <div className="bg-white border-l-4 border-green-500 p-6 mb-6 rounded shadow flex justify-between items-center">
                 <div>
                   <h2 className="text-2xl font-bold text-gray-800">Kết quả: <span className="text-green-600">{score}</span> điểm</h2>
                   <p className="text-sm text-gray-500">Đúng {exam.answers.filter(a => userAnswers[a.questionId] === a.correctOptionId).length}/{exam.questions.length} câu</p>
                 </div>
                 <button onClick={() => {setIsExamStarted(false); setExam(null); localStorage.removeItem('EXAM_DATA')}} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 font-bold">Thoát</button>
              </div>
            )}

            {exam.questions.map((q, idx) => {
              const ansKey = exam.answers.find(a => a.questionId === q.id);
              return (
                <div key={q.id} id={`q-box-${q.id}`} className="bg-white p-5 rounded shadow-sm border border-gray-200 mb-6 scroll-mt-24">
                  <div className="mb-4">
                    <span className="bg-blue-100 text-blue-800 font-bold px-2 py-1 rounded text-sm mr-2">Câu {idx + 1}</span>
                    <MathContent id={`math-q-${q.id}`} html={q.text} />
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {q.options.map(opt => {
                      let bg = "bg-white border-gray-200 hover:bg-gray-50";
                      if (!isSubmitted) {
                        if (userAnswers[q.id] === opt.id) bg = "bg-blue-50 border-blue-500 ring-1 ring-blue-500";
                      } else {
                        if (opt.id === ansKey?.correctOptionId) bg = "bg-green-50 border-green-500 ring-1 ring-green-500";
                        else if (userAnswers[q.id] === opt.id) bg = "bg-red-50 border-red-500";
                        else bg = "bg-white opacity-50";
                      }
                      return (
                        <div key={opt.id} onClick={() => !isSubmitted && setUserAnswers({...userAnswers, [q.id]: opt.id})} className={`border p-3 rounded cursor-pointer transition flex items-center gap-3 ${bg}`}>
                          <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold border ${userAnswers[q.id]===opt.id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-100 border-gray-300'}`}>{opt.id}</span>
                          <MathContent id={`math-opt-${q.id}-${opt.id}`} html={opt.text} />
                        </div>
                      )
                    })}
                  </div>

                  {isSubmitted && ansKey && (
                    <div className="mt-4 pt-4 border-t border-dashed">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm">
                          {userAnswers[q.id] === ansKey.correctOptionId ? <span className="text-green-600">Đúng!</span> : <span className="text-red-500">Sai. Đáp án: {ansKey.correctOptionId}</span>}
                        </span>
                        <button onClick={() => setShowSolutionId(showSolutionId === q.id ? null : q.id)} className="text-blue-600 text-sm underline font-bold">
                          {showSolutionId === q.id ? 'Ẩn lời giải' : 'Xem lời giải'}
                        </button>
                      </div>
                      {showSolutionId === q.id && (
                        <div className="mt-3 bg-gray-50 p-4 rounded border-l-4 border-blue-500 text-sm animate-fade-in">
                          <MathContent id={`math-sol-${q.id}`} html={ansKey.solutionText} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* RIGHT: SIDEBAR */}
          <div className="lg:col-span-3 sticky top-20 order-1 lg:order-2 mb-6 lg:mb-0">
            <div className="bg-white p-4 rounded shadow border border-gray-200">
              <h3 className="font-bold text-center text-gray-700 mb-3 border-b pb-2 text-sm uppercase">Danh sách câu hỏi</h3>
              <div className="grid grid-cols-5 gap-2 max-h-[60vh] overflow-y-auto no-scrollbar">
                {exam.questions.map((q, idx) => {
                  let color = "bg-white border-gray-300 text-gray-600";
                  if (!isSubmitted) {
                    if (userAnswers[q.id]) color = "bg-blue-600 text-white border-blue-600";
                  } else {
                    const ansKey = exam.answers.find(a => a.questionId === q.id);
                    if (ansKey && userAnswers[q.id] === ansKey.correctOptionId) color = "bg-green-500 text-white border-green-500";
                    else if (userAnswers[q.id]) color = "bg-red-500 text-white border-red-500";
                  }
                  return (
                    <button key={q.id} onClick={() => scrollToQuestion(q.id)} className={`w-full aspect-square flex items-center justify-center text-xs font-bold rounded border transition ${color}`}>
                      {idx + 1}
                    </button>
                  )
                })}
              </div>
              {!isSubmitted && (
                <button onClick={() => { if(confirm("Nộp bài?")) handleSubmit() }} className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded shadow">
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
