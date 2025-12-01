// @ts-nocheck
import React, { useState, useEffect, useLayoutEffect } from 'react';
import { parseDocx } from './utils/docxParser';
import { ExamData, Question, AnswerKey } from './types';

// --- COMPONENT HIỂN THỊ TOÁN (PHIÊN BẢN CƯỠNG CHẾ) ---
const MathContent = ({ html, id }) => {
  // Dùng useLayoutEffect để chạy ngay sau khi DOM được vẽ
  useLayoutEffect(() => {
    if (window.MathJax && window.MathJax.typesetPromise) {
      const element = document.getElementById(id);
      if (element) {
        window.MathJax.typesetPromise([element]).catch(() => {});
      }
    }
  }, [html, id]);

  return <div id={id} className="math-content" dangerouslySetInnerHTML={{ __html: html }} />;
};

// --- APP CHÍNH ---
export default function App() {
  const [exam, setExam] = useState(() => {
    try {
      const saved = localStorage.getItem('EXAM_DATA');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [isAdmin, setIsAdmin] = useState(false);
  const [pass, setPass] = useState('');
  const [duration, setDuration] = useState(45);
  const [isStarted, setIsStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [showSolutionId, setShowSolutionId] = useState(null); // ID câu hỏi đang mở lời giải

  // Đồng hồ
  useEffect(() => {
    if (!isStarted || submitted || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { handleSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isStarted, submitted, timeLeft]);

  const handleUpload = async (e) => {
    if (e.target.files?.[0]) {
      const data = await parseDocx(e.target.files[0]);
      if (data.questions) {
        const newExam = {
          id: Date.now().toString(),
          title: data.title || "Đề thi mới",
          duration: duration,
          questions: data.questions,
          answers: data.answers,
          isActive: true
        };
        setExam(newExam);
        localStorage.setItem('EXAM_DATA', JSON.stringify(newExam));
        setIsAdmin(false);
        alert("Upload thành công!");
      }
    }
  };

  const handleStart = () => {
    if (!exam) return;
    setAnswers({});
    setSubmitted(false);
    setScore(0);
    setTimeLeft(exam.duration * 60);
    setIsStarted(true);
    window.scrollTo(0,0);
  };

  const handleSubmit = () => {
    let correct = 0;
    exam.answers.forEach(a => {
      if (answers[a.questionId] === a.correctOptionId) correct++;
    });
    setScore(((correct / exam.questions.length) * 10).toFixed(2));
    setSubmitted(true);
    alert("Đã nộp bài!");
    window.scrollTo(0,0);
  };

  const fmtTime = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  const scrollToQ = (id) => {
    document.getElementById(`q-box-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 pb-20 font-sans">
      
      {/* HEADER */}
      <div className="bg-white shadow p-4 sticky top-0 z-50 flex justify-between items-center h-16">
        <h1 className="font-bold text-xl text-blue-700 flex items-center gap-2">
          📚 <span className="hidden sm:block">Thi Trắc Nghiệm</span>
        </h1>
        
        {isStarted && !submitted && (
          <div className="bg-red-50 text-red-600 font-mono font-bold text-xl px-4 py-1 rounded border border-red-200">
            {fmtTime(timeLeft)}
          </div>
        )}

        {!isStarted && (
          <button onClick={() => setIsAdmin(!isAdmin)} className="text-sm text-gray-500 hover:underline">
            Giáo viên
          </button>
        )}
      </div>

      {/* ADMIN */}
      {isAdmin && !isStarted && (
        <div className="max-w-md mx-auto mt-10 bg-white p-6 rounded shadow-lg border-t-4 border-blue-500">
          <h2 className="font-bold text-center mb-4">Admin Upload</h2>
          <input type="password" value={pass} onChange={e=>setPass(e.target.value)} className="w-full border p-2 mb-3 rounded" placeholder="Mật khẩu..." />
          {pass === 'anphuc01' && (
            <div className="space-y-3">
              <input type="number" value={duration} onChange={e=>setDuration(Number(e.target.value))} className="w-full border p-2 rounded text-center font-bold" />
              <input type="file" accept=".docx" onChange={handleUpload} className="w-full" />
            </div>
          )}
        </div>
      )}

      {/* MÀN HÌNH CHỜ */}
      {!isStarted && !isAdmin && (
        <div className="max-w-2xl mx-auto mt-20 text-center px-4">
          {exam ? (
            <div className="bg-white p-10 rounded-2xl shadow-xl">
              <h2 className="text-3xl font-bold text-blue-800 mb-6">{exam.title}</h2>
              <div className="flex justify-center gap-10 mb-8 text-gray-600">
                <div><strong>{exam.questions.length}</strong> Câu hỏi</div>
                <div><strong>{exam.duration}</strong> Phút</div>
              </div>
              <button onClick={handleStart} className="bg-blue-600 text-white font-bold py-3 px-10 rounded-full shadow-lg hover:bg-blue-700 transform hover:scale-105 transition">
                VÀO THI NGAY
              </button>
            </div>
          ) : <p className="text-gray-500">Chưa có đề thi.</p>}
        </div>
      )}

      {/* GIAO DIỆN LÀM BÀI */}
      {isStarted && exam && (
        <div className="max-w-[1440px] mx-auto mt-6 px-4 flex flex-col lg:flex-row gap-6 items-start">
          
          {/* CỘT TRÁI: CÂU HỎI (Chiếm phần lớn) */}
          <div className="flex-1 w-full lg:w-3/4">
            {submitted && (
              <div className="bg-white p-6 rounded shadow border-l-8 border-green-500 mb-6 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Kết quả: <span className="text-green-600">{score}</span> điểm</h2>
                  <p className="text-gray-500">Đúng {exam.answers.filter(a => answers[a.questionId] === a.correctOptionId).length}/{exam.questions.length} câu</p>
                </div>
                <button onClick={() => {setIsStarted(false); setExam(null); localStorage.removeItem('EXAM_DATA')}} className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded font-bold">Thoát</button>
              </div>
            )}

            {exam.questions.map((q, idx) => {
              const ansKey = exam.answers.find(a => a.questionId === q.id);
              return (
                <div key={q.id} id={`q-box-${q.id}`} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6 scroll-mt-24">
                  <div className="mb-4">
                    <span className="bg-blue-100 text-blue-800 font-bold px-2 py-1 rounded text-sm mr-2">Câu {idx + 1}</span>
                    {/* Render đề bài với ID duy nhất để MathJax tìm thấy */}
                    <MathContent id={`math-q-${q.id}`} html={q.text} />
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {q.options.map(opt => {
                      let bg = "bg-white border-gray-200 hover:bg-gray-50";
                      if (!submitted) {
                        if (answers[q.id] === opt.id) bg = "bg-blue-50 border-blue-500 ring-1 ring-blue-500";
                      } else {
                        if (opt.id === ansKey.correctOptionId) bg = "bg-green-50 border-green-500 ring-1 ring-green-500";
                        else if (answers[q.id] === opt.id) bg = "bg-red-50 border-red-500";
                        else bg = "bg-white opacity-60";
                      }
                      
                      return (
                        <div 
                          key={opt.id} 
                          onClick={() => !submitted && setAnswers({...answers, [q.id]: opt.id})}
                          className={`border p-3 rounded cursor-pointer transition flex items-center gap-3 ${bg}`}
                        >
                          <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold border ${answers[q.id]===opt.id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-100 border-gray-300'}`}>{opt.id}</span>
                          <MathContent id={`math-opt-${q.id}-${opt.id}`} html={opt.text} />
                        </div>
                      )
                    })}
                  </div>

                  {submitted && ansKey && (
                    <div className="mt-4 pt-4 border-t border-dashed">
                      <div className="flex justify-between">
                        <span className="font-bold text-sm">
                          {answers[q.id] === ansKey.correctOptionId ? <span className="text-green-600">Đúng!</span> : <span className="text-red-500">Sai. Đáp án: {ansKey.correctOptionId}</span>}
                        </span>
                        <button onClick={() => setShowSolutionId(showSolutionId === q.id ? null : q.id)} className="text-blue-600 text-sm underline font-bold">
                          {showSolutionId === q.id ? 'Ẩn lời giải' : 'Xem lời giải'}
                        </button>
                      </div>
                      {showSolutionId === q.id && (
                        <div className="mt-3 bg-gray-50 p-4 rounded border-l-4 border-blue-500 text-sm">
                          <MathContent id={`math-sol-${q.id}`} html={ansKey.solutionText} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* CỘT PHẢI: SIDEBAR (Sticky) */}
          <div className="w-full lg:w-1/4 sticky top-24">
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <h3 className="font-bold text-center text-gray-700 mb-4 border-b pb-2">DANH SÁCH CÂU HỎI</h3>
              <div className="grid grid-cols-5 gap-2 max-h-[60vh] overflow-y-auto no-scrollbar">
                {exam.questions.map((q, idx) => {
                  let color = "bg-white border-gray-300 text-gray-600";
                  if (!submitted) {
                    if (answers[q.id]) color = "bg-blue-600 text-white border-blue-600";
                  } else {
                    const ans = exam.answers.find(a => a.questionId === q.id);
                    if (ans && answers[q.id] === ans.correctOptionId) color = "bg-green-500 text-white border-green-500";
                    else if (answers[q.id]) color = "bg-red-500 text-white border-red-500";
                  }
                  return (
                    <button 
                      key={q.id} 
                      onClick={() => scrollToQ(q.id)}
                      className={`w-full aspect-square flex items-center justify-center text-xs font-bold rounded border transition ${color}`}
                    >
                      {idx + 1}
                    </button>
                  )
                })}
              </div>
              {!submitted && (
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
