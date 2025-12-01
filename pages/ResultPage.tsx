import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExamById } from '../services/data';
import { getSubmission } from '../utils/storage';
import MathText from '../components/MathText';
import { UserSubmission, ExamData } from '../types';

const ResultPage: React.FC = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<UserSubmission | null>(null);
  const [exam, setExam] = useState<ExamData | undefined>(undefined);

  useEffect(() => {
    if (examId) {
      const examData = getExamById(examId);
      if (examData) {
        setExam(examData);
        const sub = getSubmission(examId);
        if (sub) {
          setSubmission(sub);
        } else {
          // If no submission found, redirect home
          navigate('/');
        }
      } else {
        navigate('/');
      }
    }
  }, [examId, navigate]);

  if (!submission || !exam) return <div className="p-10 text-center">Đang tải kết quả...</div>;

  // Calculate stats
  let correctCount = 0;
  let unAnsweredCount = 0;
  
  exam.questions.forEach(q => {
    const userAns = submission.answers[q.id];
    const correctAns = exam.answers.find(a => a.questionId === q.id)?.correctOptionId;
    if (!userAns) unAnsweredCount++;
    else if (userAns === correctAns) correctCount++;
  });

  const score = (correctCount / exam.questions.length) * 10;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow z-10 sticky top-0">
         <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <button onClick={() => navigate('/')} className="flex items-center text-gray-600 hover:text-blue-600">
               <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
               Về trang chủ
            </button>
            <h1 className="font-bold text-lg hidden md:block">{exam.title} - Kết quả</h1>
            <div className="w-4"></div>
         </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Summary Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24">
            <div className="text-center mb-6">
               <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-blue-50 border-4 border-blue-500 mb-4">
                  <span className="text-4xl font-extrabold text-blue-700">{score.toFixed(1)}</span>
               </div>
               <p className="text-gray-500 font-medium">Điểm số của bạn</p>
            </div>
            
            <div className="space-y-4">
               <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-100">
                  <span className="text-green-800 font-medium">Số câu đúng</span>
                  <span className="font-bold text-green-700">{correctCount} / {exam.questions.length}</span>
               </div>
               <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                  <span className="text-red-800 font-medium">Số câu sai</span>
                  <span className="font-bold text-red-700">{exam.questions.length - correctCount - unAnsweredCount}</span>
               </div>
               <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-gray-600 font-medium">Chưa làm</span>
                  <span className="font-bold text-gray-700">{unAnsweredCount}</span>
               </div>
            </div>
          </div>
        </div>

        {/* Detailed Solutions */}
        <div className="lg:col-span-2 space-y-6">
          {exam.questions.map((q) => {
            const userAns = submission.answers[q.id];
            const answerKey = exam.answers.find(a => a.questionId === q.id);
            const correctAns = answerKey?.correctOptionId;
            const isCorrect = userAns === correctAns;
            const isSkipped = !userAns;

            let borderColor = isCorrect ? 'border-green-200' : (isSkipped ? 'border-gray-200' : 'border-red-200');
            let headerBg = isCorrect ? 'bg-green-50' : (isSkipped ? 'bg-gray-50' : 'bg-red-50');

            return (
              <div key={q.id} className={`bg-white rounded-xl shadow-sm border ${borderColor} overflow-hidden`}>
                <div className={`px-5 py-3 border-b ${borderColor} ${headerBg} flex justify-between items-center`}>
                  <span className={`font-bold ${isCorrect ? 'text-green-700' : (isSkipped ? 'text-gray-600' : 'text-red-700')}`}>
                     Câu {q.number}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded bg-white border opacity-70">
                     {isCorrect ? 'Đúng' : (isSkipped ? 'Chưa làm' : 'Sai')}
                  </span>
                </div>

                <div className="p-5">
                  {/* Question Text */}
                  <div className="mb-4">
                     <MathText content={q.text} className="text-gray-800 text-lg" />
                     {q.imageUrl && <img src={q.imageUrl} alt="" className="mt-2 max-h-48 border rounded" />}
                  </div>
                  
                  {/* Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                    {q.options.map((opt) => {
                      const isSelected = userAns === opt.id;
                      const isTargetCorrect = correctAns === opt.id;
                      
                      let optClass = "border-gray-200 bg-white";
                      if (isSelected && isTargetCorrect) optClass = "border-green-500 bg-green-50 ring-1 ring-green-500";
                      else if (isSelected && !isTargetCorrect) optClass = "border-red-500 bg-red-50 ring-1 ring-red-500";
                      else if (!isSelected && isTargetCorrect) optClass = "border-green-500 bg-white ring-1 ring-green-500 border-dashed"; // Show correct answer if user missed it
                      
                      return (
                        <div key={opt.id} className={`flex items-center p-3 rounded-lg border ${optClass} transition-colors`}>
                           <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 border 
                              ${isTargetCorrect ? 'bg-green-600 text-white border-green-600' : 
                               (isSelected ? 'bg-red-500 text-white border-red-500' : 'bg-gray-100 text-gray-500')}
                           `}>
                              {opt.id}
                           </span>
                           <MathText content={opt.text} className="text-sm" />
                        </div>
                      );
                    })}
                  </div>

                  {/* Solution Explanation */}
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                     <h4 className="text-sm font-bold text-blue-800 uppercase mb-2 flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Lời giải chi tiết
                     </h4>
                     <div className="text-gray-700 text-sm leading-relaxed">
                        <MathText content={answerKey?.solutionText || "Chưa có lời giải chi tiết."} block />
                        {answerKey?.solutionImageUrl && <img src={answerKey.solutionImageUrl} alt="" className="mt-2" />}
                     </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default ResultPage;