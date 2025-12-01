import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExamById } from '../services/data';
import { saveSubmission, clearSubmission } from '../utils/storage';
import AnswerSheet from '../components/AnswerSheet';
import MathText from '../components/MathText';
import { UserSubmission, ExamData } from '../types';

const ExamPage: React.FC = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState<ExamData | null>(null);
  
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (examId) {
      const data = getExamById(examId);
      if (data) {
        setExam(data);
        setTimeLeft(data.durationMinutes * 60);
      }
    }
  }, [examId]);

  // Timer logic
  useEffect(() => {
    if (!exam || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam, timeLeft]); // Added exam dependency to start timer only when loaded

  const handleSelectAnswer = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  const handleSubmit = useCallback(() => {
    if (!exam) return;
    const submission: UserSubmission = {
      examId: exam.id,
      answers,
      startTime: Date.now() - (exam.durationMinutes * 60 - timeLeft) * 1000,
      submitTime: Date.now(),
    };
    saveSubmission(submission);
    navigate(`/result/${exam.id}`);
  }, [answers, exam, navigate, timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!exam) {
    return <div className="text-center p-10">Đang tải đề thi hoặc không tìm thấy đề...</div>;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm z-20 h-16 flex items-center justify-between px-4 lg:px-6">
        <h1 className="text-lg font-bold text-gray-800 truncate max-w-xs md:max-w-none">{exam.title}</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-gray-100 px-3 py-1 rounded-md">
            <svg className="w-5 h-5 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className={`text-xl font-mono font-bold ${timeLeft < 300 ? 'text-red-600' : 'text-blue-700'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
          <button 
            className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Questions Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 lg:pb-6 custom-scrollbar scroll-smooth">
          <div className="max-w-3xl mx-auto space-y-6">
            {exam.questions.map((q) => (
              <div key={q.id} id={`question-${q.id}`} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                <div className="flex items-start mb-4">
                  <span className="bg-blue-100 text-blue-800 text-sm font-bold px-2.5 py-0.5 rounded mr-2 mt-0.5">Câu {q.number}</span>
                  <div className="flex-1">
                    <MathText content={q.text} className="text-gray-800 font-medium text-lg leading-relaxed" />
                    {q.imageUrl && (
                      <div className="mt-3">
                         <img src={q.imageUrl} alt={`Question ${q.number}`} className="max-h-60 rounded border" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 ml-0 md:ml-12">
                  {q.options.map((opt) => (
                    <label 
                      key={opt.id} 
                      className={`
                        relative flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all
                        ${answers[q.id] === opt.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50'}
                      `}
                    >
                      <input 
                        type="radio" 
                        name={`q-${q.id}`} 
                        value={opt.id} 
                        checked={answers[q.id] === opt.id}
                        onChange={() => handleSelectAnswer(q.id, opt.id)}
                        className="sr-only"
                      />
                      <span className={`
                        w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0
                        ${answers[q.id] === opt.id ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-500 border-gray-300'}
                      `}>
                        {opt.id}
                      </span>
                      <MathText content={opt.text} className="text-gray-700" />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* Answer Sheet Sidebar (Desktop) */}
        <aside className="hidden lg:block w-80 p-4 border-l bg-gray-50 overflow-hidden">
          <AnswerSheet 
            questions={exam.questions} 
            selectedAnswers={answers} 
            onSelect={handleSelectAnswer}
            onSubmit={handleSubmit}
          />
        </aside>

        {/* Answer Sheet Overlay (Mobile) */}
        {isSidebarOpen && (
          <div className="absolute inset-0 z-30 lg:hidden">
            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsSidebarOpen(false)}></div>
            <div className="absolute right-0 top-0 bottom-0 w-3/4 max-w-sm bg-white shadow-xl transform transition-transform">
               <div className="h-full p-4">
                  <div className="flex justify-end mb-2">
                    <button onClick={() => setIsSidebarOpen(false)} className="text-gray-500">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <AnswerSheet 
                    questions={exam.questions} 
                    selectedAnswers={answers} 
                    onSelect={handleSelectAnswer}
                    onSubmit={handleSubmit}
                  />
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamPage;