import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllExams, deleteExam } from '../services/data';
import { ExamData } from '../types';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState<ExamData[]>([]);

  useEffect(() => {
    setExams(getAllExams());
  }, []);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Bạn có chắc chắn muốn xóa đề thi này?")) {
      deleteExam(id);
      setExams(getAllExams());
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-50 p-6">
      <div className="max-w-5xl w-full text-center mb-10 mt-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-blue-900 mb-4">
          Hệ Thống Thi Trực Tuyến
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Luyện thi THPT Quốc Gia, Đánh giá năng lực với hệ thống chấm điểm tự động và lời giải chi tiết.
        </p>
        
        <div className="flex justify-center gap-4">
           <button 
             onClick={() => navigate('/admin')}
             className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg flex items-center transition-all"
           >
             <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
             Tải đề / Tạo đề mới
           </button>
        </div>
      </div>

      <div className="w-full max-w-5xl grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.map((exam) => (
          <div key={exam.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-gray-100 relative group">
            <div className="h-40 bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center relative">
               <span className="text-white text-6xl opacity-20 font-serif">$\sum$</span>
               {exam.id !== 'math-test-01' && (
                 <button 
                   onClick={(e) => handleDelete(e, exam.id)}
                   className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                   title="Xóa đề"
                 >
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                 </button>
               )}
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2 h-14">{exam.title}</h2>
              <div className="flex items-center space-x-4 text-sm text-gray-500 mb-6">
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {exam.durationMinutes} phút
                </span>
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  {exam.questions.length} câu
                </span>
              </div>
              <button
                onClick={() => navigate(`/exam/${exam.id}`)}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                Làm bài ngay
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HomePage;