// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { parseDocx } from './utils/docxParser';
import { ExamData, Question, AnswerKey } from './types';

// --- COMPONENT HIỂN THỊ CÔNG THỨC TOÁN (Đã Fix lỗi không hiện) ---
const MathContent = ({ html }) => {
  const ref = useRef(null);

  useEffect(() => {
    // Kỹ thuật: Delay nhẹ 50ms để đảm bảo DOM đã có trước khi MathJax chạy
    const timer = setTimeout(() => {
      if (ref.current && window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetClear([ref.current]); // Xóa render cũ
        window.MathJax.typesetPromise([ref.current]); // Render mới
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [html]);

  // Thêm key={html} để React reset component khi nội dung thay đổi -> MathJax sẽ chạy lại
  return <div ref={ref} key={html} className="math-content" dangerouslySetInnerHTML={{ __html: html }} />;
};

// --- COMPONENT CÂU HỎI ---
const QuestionItem = ({ q, userAnswer, onSelect, isSubmitted, answerKey }) => {
  const [showSolution, setShowSolution] = useState(false);

  return (
    <div id={`q-${q.id}`} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6 scroll-mt-28">
      {/* Đề bài */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-[#005a8d] text-white text-sm font-bold px-2 py-1 rounded">Câu {q.number}</span>
        </div>
        <MathContent html={q.text} />
      </div>

      {/* Đáp án */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {q.options.map(opt => {
          let style = "border p-3 rounded cursor-pointer transition flex items-center gap-3 hover:bg-gray-50";
          if (!isSubmitted) {
             if (userAnswer === opt.id) style += " bg-[#e3f2fd] border-[#2196f3] ring-1 ring-[#2196f3]";
             else style += " bg-white border-gray-300";
          } else {
             if (opt.id === answerKey?.correctOptionId) style += " bg-green-100 border-green-600 ring-1 ring-green-600";
             else if (userAnswer === opt.id) style += " bg-red-100 border-red-500";
             else style += " bg-white opacity-50";
          }

          return (
            <div key={opt.id} onClick={() => !isSubmitted && onSelect(q.id, opt.id)} className={style}>
              <span className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold border ${userAnswer === opt.id ? 'bg-[#2196f3] text-white border-[#2196f3]' : 'bg-gray-100 text-gray-600 border-gray-300'}`}>
                {opt.id}
              </span>
              <MathContent html={opt.text} />
            </div>
          )
        })}
      </div>

      {/* Lời giải */}
      {isSubmitted && answerKey && (
        <div className="mt-4 pt-4 border-t border-dashed border-gray-300">
          <div className="flex justify-between items-center">
            <div className="font-bold text-sm">
              {userAnswer === answerKey.correctOptionId ? <span className="text-green-600">Đúng rồi! 👏</span> : <span className="text-red-500">Sai rồi. Đáp án là {answerKey.correctOptionId}</span>}
            </div>
            <button onClick={() => setShowSolution(!showSolution)} className="text-[#005a8d] text-sm font-bold underline">
              {showSolution ? 'Ẩn lời giải' : 'Xem lời giải chi tiết'}
            </button>
          </div>
          {showSolution && (
            <div className="mt-3 bg-gray-50 p-4 rounded border-l-4 border-[#005a8d]">
              <strong className="block text-[#005a8d] text-sm mb-2 uppercase">Hướng dẫn giải</strong>
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
        if (t <= 1) { handleSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isExamStarted, isSubmitted, timeLeft]);

  // Upload
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

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const scrollToQuestion = (id) => {
    document.getElementById(`q-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-[#333]">
      
      {/* HEADER CỐ ĐỊNH */}
      <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-50 h-16 flex items-center justify-between px-4 lg:px-8">
        <h1 className="text-xl font-bold text-[#005a8d] flex items-center gap-2">
          <span>📚</span> <span className="hidden md:block">Hệ Thống Thi Trắc Nghiệm</span>
        </h1>
        
        {isExamStarted && !isSubmitted && (
          <div className="flex items-center gap-2 bg-[#fff2f2] px-4 py-1 rounded border border-[#ffcccc]">
            <span className="text-red-500 font-bold">⏱ {formatTime(timeLeft)}</span>
          </div>
        )}

        {!isExamStarted && (
          <button onClick={() => setIsAdminMode(!isAdminMode)} className="text-sm text-gray-500 hover:text-[#005a8d]">
            Admin
          </button>
        )}
      </div>

      {/* NỘI DUNG CHÍNH */}
      <div className="pt-24 px-4 lg:px-8 max-w-[1400px] mx-auto pb-10">
        
        {/* MÀN HÌNH ADMIN UPLOAD */}
        {isAdminMode && !isExamStarted && (
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md mx-auto border-t-4 border-[#005a8d]">
            <h2 className="font-bold text-lg mb-4 text-center">Tải Đề Thi Mới</h2>
            <input type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} className="w-full border p-2 rounded mb-3" placeholder="Mật khẩu..." />
            {adminPass === 'anphuc01' && (
              <div className="space-y-3">
                <input type="number" value={manualDuration} onChange={e => setManualDuration(Number(e.target.value))} className="w-full border p-2 rounded text-center font-bold" placeholder="Phút" />
                <input type="file" accept=".docx" onChange={handleUpload} className="w-full text-sm" />
              </div>
            )}
          </div>
        )}

        {/* MÀN HÌNH CHỜ (ENTRY SCREEN) */}
        {!isExamStarted && !isAdminMode && (
          <div className="text-center mt-10">
            {exam ? (
              <div className="bg-white p-10 rounded-2xl shadow-xl max-w-2xl mx-auto">
                <h2 className="text-3xl font-bold text-[#005a8d] mb-4">{exam.title}</h2>
                <div className="flex justify-center gap-8 mb-8 text-gray-600">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{exam.questions.length}</div>
                    <div className="text-sm uppercase">Câu hỏi</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{exam.duration}</div>
                    <div className="text-sm uppercase">Phút</div>
                  </div>
                </div>
                <button onClick={handleStart} className="bg-[#005a8d] hover:bg-[#004a75] text-white text-xl font-bold py-3 px-10 rounded-full shadow-lg transition transform hover:scale-105">
                  Bắt Đầu Làm Bài
                </button>
              </div>
            ) : (
              <p className="text-gray-500">Chưa có đề thi.</p>
            )}
          </div>
        )}

        {/* MÀN HÌNH LÀM BÀI (GRID LAYOUT) */}
        {isExamStarted && exam && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* CỘT TRÁI (8 phần): DANH SÁCH CÂU HỎI */}
            <div className="lg:col-span-9">
              {isSubmitted && (
                <div className="bg-white p-6 rounded-lg shadow border-l-8 border-green-500 mb-6 flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Kết quả: {score} điểm</h2>
                    <p className="text-gray-600">Đúng {exam.answers.filter(a => userAnswers[a.questionId] === a.correctOptionId).length} trên {exam.questions.length} câu</p>
                  </div>
                  <button onClick={() => {setIsExamStarted(false); setExam(null); localStorage.removeItem('EXAM_DATA')}} className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded font-bold">Làm đề khác</button>
                </div>
              )}

              {exam.questions.map(q => (
                <QuestionItem 
                  key={q.id} q={q} userAnswer={userAnswers[q.id]} 
                  onSelect={(qId, optId) => setUserAnswers(prev => ({...prev, [qId]: optId}))}
                  isSubmitted={isSubmitted} answerKey={exam.answers.find(a => a.questionId === q.id)}
                />
              ))}
            </div>

            {/* CỘT PHẢI (4 phần): BẢNG TRẢ LỜI (SIDEBAR) */}
            <div className="lg:col-span-3">
              <div className="bg-white p-4 rounded-lg shadow sticky top-20 border border-gray-200">
                <h3 className="font-bold text-center text-gray-700 mb-4 border-b pb-2">DANH SÁCH CÂU HỎI</h3>
                
                {/* Lưới đáp án */}
                <div className="grid grid-cols-5 gap-2 max-h-[60vh] overflow-y-auto no-scrollbar">
                  {exam.questions.map((q, idx) => {
                    let color = "bg-white border-gray-300 text-gray-600";
                    if (!isSubmitted) {
                      if (userAnswers[q.id]) color = "bg-[#005a8d] text-white border-[#005a8d]";
                    } else {
                      const ans = exam.answers.find(a => a.questionId === q.id);
                      if (ans && userAnswers[q.id] === ans.correctOptionId) color = "bg-green-500 text-white border-green-500";
                      else if (userAnswers[q.id]) color = "bg-red-500 text-white border-red-500";
                    }
                    return (
                      <button 
                        key={q.id} 
                        onClick={() => scrollToQuestion(q.id)}
                        className={`w-full aspect-square rounded text-xs font-bold border flex items-center justify-center transition ${color}`}
                      >
                        {idx + 1}
                      </button>
                    )
                  })}
                </div>

                {!isSubmitted && (
                  <button onClick={() => { if(confirm("Nộp bài nhé?")) handleSubmit() }} className="w-full mt-6 bg-[#005a8d] hover:bg-[#004a75] text-white font-bold py-3 rounded shadow">
                    NỘP BÀI
                  </button>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
