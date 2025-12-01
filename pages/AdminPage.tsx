import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseDocx } from '../utils/docxParser';
import { saveExam } from '../services/data';
import { ExamData, Question, AnswerKey } from '../types';
import MathText from '../components/MathText';

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  
  // Form State
  const [title, setTitle] = useState("Đề thi mới");
  const [duration, setDuration] = useState(45);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<AnswerKey[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setShowEditor(false);

    try {
      if (file.name.endsWith('.docx')) {
        const parsed = await parseDocx(file);
        
        // Khởi tạo state dù có câu hỏi hay không để người dùng có thể sửa
        const loadedQuestions = (parsed.questions as Question[]) || [];
        const loadedAnswers = (parsed.answers as AnswerKey[]) || [];
        
        setQuestions(loadedQuestions);
        setAnswers(loadedAnswers);
        setTitle(file.name.replace('.docx', ''));
        setShowEditor(true);
        
        if (loadedQuestions.length > 0) {
           alert(`Đã phân tích file thành công!\nTìm thấy: ${loadedQuestions.length} câu hỏi.`);
        } else {
           alert(`Đã tải file nhưng không tìm thấy câu hỏi nào theo định dạng tự động.\nBạn vui lòng kiểm tra lại file hoặc nhập thủ công bên dưới.`);
        }

      } else {
        setError("Vui lòng chọn file .docx");
      }
    } catch (err: any) {
      setError("Lỗi khi đọc file: " + (err.message || err));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualCreate = () => {
      setTitle("Đề thi thủ công");
      setQuestions([]);
      setAnswers([]);
      setShowEditor(true);
      setError(null);
  };

  const addQuestion = () => {
      const newId = `q_manual_${Date.now()}`;
      const newQuestion: Question = {
          id: newId,
          number: questions.length + 1,
          text: "Nhập nội dung câu hỏi...",
          options: [
              { id: 'A', text: 'Đáp án A' },
              { id: 'B', text: 'Đáp án B' },
              { id: 'C', text: 'Đáp án C' },
              { id: 'D', text: 'Đáp án D' }
          ]
      };
      const newAnswer: AnswerKey = {
          questionId: newId,
          correctOptionId: 'A',
          solutionText: 'Lời giải chi tiết...'
      };
      
      setQuestions([...questions, newQuestion]);
      setAnswers([...answers, newAnswer]);
      
      // Scroll to bottom
      setTimeout(() => {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 100);
  };

  const removeQuestion = (index: number) => {
      if (window.confirm("Bạn có chắc muốn xóa câu hỏi này?")) {
          const newQs = [...questions];
          const newAns = [...answers];
          newQs.splice(index, 1);
          newAns.splice(index, 1);
          
          // Re-index numbers
          newQs.forEach((q, i) => q.number = i + 1);
          
          setQuestions(newQs);
          setAnswers(newAns);
      }
  };

  const handleSave = () => {
    if (questions.length === 0) {
      setError("Đề thi chưa có câu hỏi nào!");
      return;
    }

    const isConfirmed = window.confirm(
      `LƯU ĐỀ THI?\n\n` +
      `Tên đề: ${title}\n` +
      `Số câu: ${questions.length}\n` +
      `Thời gian: ${duration} phút`
    );

    if (!isConfirmed) return;

    const newExam: ExamData = {
      id: `exam_${Date.now()}`,
      title,
      durationMinutes: duration,
      questions,
      answers,
      createdAt: Date.now()
    };

    saveExam(newExam);
    navigate('/');
  };

  const updateQuestion = (index: number, field: string, value: string) => {
    const newQs = [...questions];
    (newQs[index] as any)[field] = value;
    setQuestions(newQs);
  };
  
  const updateOption = (qIndex: number, optIndex: number, value: string) => {
      const newQs = [...questions];
      newQs[qIndex].options[optIndex].text = value;
      setQuestions(newQs);
  };

  const updateAnswer = (qId: string, field: string, value: string) => {
    const newAns = [...answers];
    const target = newAns.find(a => a.questionId === qId);
    if (target) {
      (target as any)[field] = value;
      setAnswers(newAns);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 p-6 flex justify-between items-center text-white">
          <h1 className="text-2xl font-bold">Quản lý Đề Thi</h1>
          <button onClick={() => navigate('/')} className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded text-sm font-medium transition-colors">
            Thoát
          </button>
        </div>

        <div className="p-8">
            {/* Upload Area */}
            {!showEditor && (
                <div className="text-center py-10 space-y-6">
                    <div className="bg-blue-50 border-2 border-dashed border-blue-300 rounded-xl p-10 max-w-2xl mx-auto hover:bg-blue-100 transition-colors">
                        <svg className="w-16 h-16 text-blue-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">Tải lên đề thi từ Word</h3>
                        <p className="text-gray-500 mb-6">Hỗ trợ định dạng .docx với công thức MathType và hình ảnh.</p>
                        
                        <input 
                          type="file" 
                          accept=".docx"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="file-upload"
                        />
                        <label 
                          htmlFor="file-upload"
                          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full cursor-pointer shadow-lg transform hover:scale-105 transition-all"
                        >
                          {loading ? "Đang xử lý..." : "Chọn File .docx"}
                        </label>
                    </div>
                    
                    <div className="relative flex py-5 items-center max-w-2xl mx-auto">
                        <div className="flex-grow border-t border-gray-300"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-400">Hoặc</span>
                        <div className="flex-grow border-t border-gray-300"></div>
                    </div>
                    
                    <button 
                        onClick={handleManualCreate}
                        className="text-blue-600 font-bold hover:underline"
                    >
                        Tạo đề thi thủ công từ trang trắng
                    </button>
                    
                    {error && (
                        <div className="bg-red-50 text-red-700 p-4 rounded-lg mt-4 max-w-2xl mx-auto border border-red-200">
                            <strong>Lỗi:</strong> {error}
                        </div>
                    )}
                </div>
            )}

            {/* Editor Area */}
            {showEditor && (
                <div className="animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Tên Đề Thi</label>
                            <input 
                                type="text" 
                                value={title} 
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full border-gray-300 rounded-lg shadow-sm p-3 border focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="Nhập tên đề thi..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Thời gian làm bài (phút)</label>
                            <input 
                                type="number" 
                                value={duration} 
                                onChange={(e) => setDuration(Number(e.target.value))}
                                className="w-full border-gray-300 rounded-lg shadow-sm p-3 border focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex justify-between items-center border-b pb-4">
                            <h2 className="text-xl font-bold text-gray-800">Danh sách câu hỏi ({questions.length})</h2>
                            <button onClick={addQuestion} className="flex items-center text-sm bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 font-bold">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                Thêm câu hỏi
                            </button>
                        </div>
                        
                        {questions.length === 0 && (
                            <div className="text-center py-10 text-gray-400 italic border-2 border-dashed rounded-lg">
                                Chưa có câu hỏi nào. Hãy nhấn "Thêm câu hỏi" hoặc tải lại file khác.
                            </div>
                        )}

                        {questions.map((q, idx) => {
                            const ans = answers.find(a => a.questionId === q.id);
                            return (
                                <div key={q.id} className="border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow bg-white">
                                    <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                                        <div className="flex items-center space-x-2">
                                            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">Câu {idx + 1}</span>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <div className="flex items-center">
                                                <span className="text-sm mr-2 text-gray-600">Đáp án đúng:</span>
                                                <select 
                                                    value={ans?.correctOptionId || 'A'} 
                                                    onChange={(e) => updateAnswer(q.id, 'correctOptionId', e.target.value)}
                                                    className="border border-gray-300 rounded px-2 py-1 text-sm font-bold text-green-700 bg-green-50"
                                                >
                                                    {['A','B','C','D'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                </select>
                                            </div>
                                            <button 
                                                onClick={() => removeQuestion(idx)}
                                                className="text-red-400 hover:text-red-600"
                                                title="Xóa câu hỏi này"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Left Col: Question & Solution */}
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nội dung câu hỏi (HTML/LaTeX)</label>
                                                <textarea 
                                                    className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                                    rows={4}
                                                    value={q.text}
                                                    onChange={(e) => updateQuestion(idx, 'text', e.target.value)}
                                                    placeholder="Nhập nội dung câu hỏi..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Lời giải chi tiết</label>
                                                <textarea 
                                                    className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none bg-blue-50"
                                                    rows={3}
                                                    value={ans?.solutionText || ''}
                                                    onChange={(e) => updateAnswer(q.id, 'solutionText', e.target.value)}
                                                    placeholder="Nhập lời giải..."
                                                />
                                            </div>
                                        </div>

                                        {/* Right Col: Preview & Options */}
                                        <div className="space-y-4">
                                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 min-h-[100px]">
                                                <span className="text-xs text-gray-400 block mb-1">Xem trước:</span>
                                                <MathText content={q.text} />
                                            </div>
                                            
                                            <div className="space-y-2">
                                                {q.options.map((opt, oIdx) => (
                                                    <div key={opt.id} className="flex items-center space-x-2">
                                                        <span className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold ${ans?.correctOptionId === opt.id ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                                            {opt.id}
                                                        </span>
                                                        <input 
                                                            type="text"
                                                            className="flex-1 text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-blue-400"
                                                            value={opt.text}
                                                            onChange={(e) => updateOption(idx, oIdx, e.target.value)}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Action Bar */}
                    <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 mt-8 flex justify-end space-x-4 shadow-lg z-10">
                        <button 
                            onClick={() => setShowEditor(false)}
                            className="px-6 py-2 rounded-lg text-gray-600 font-bold hover:bg-gray-100 transition-colors"
                        >
                            Hủy bỏ
                        </button>
                        <button 
                            onClick={handleSave}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-8 rounded-lg shadow-md transition-all transform active:scale-95"
                        >
                            LƯU ĐỀ THI
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;