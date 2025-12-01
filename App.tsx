import React, { useState, useEffect, useRef } from 'react';
import { parseDocx } from './utils/docxParser'; // Đảm bảo đường dẫn đúng
import { ExamData, Question, AnswerKey } from './types'; // Đảm bảo đường dẫn đúng

// --- COMPONENT CON: HIỂN THỊ TỪNG CÂU HỎI ---
interface QuestionItemProps {
  question: Question;
  userAnswer: string;
  onSelectAnswer: (qId: string, optId: string) => void;
  isSubmitted: boolean;
  answerKey?: AnswerKey; // Chỉ truyền vào khi đã nộp bài
}

const QuestionItem: React.FC<QuestionItemProps> = ({ 
  question, userAnswer, onSelectAnswer, isSubmitted, answerKey 
}) => {
  const [showSolution, setShowSolution] = useState(false);

  // Xác định trạng thái đúng sai để tô màu
  const getOptionColor = (optId: string) => {
    if (!isSubmitted) {
      // Khi đang làm: Chọn thì màu xanh dương, chưa chọn thì màu trắng
      return userAnswer === optId ? '#e6f7ff' : 'white';
    } else {
      // Khi đã nộp:
      if (optId === answerKey?.correctOptionId) return '#d4edda'; // Đáp án đúng -> Xanh lá nhạt
      if (optId === userAnswer && optId !== answerKey?.correctOptionId) return '#f8d7da'; // Chọn sai -> Đỏ nhạt
      return 'white';
    }
  };

  return (
    <div style={{ 
      background: '#fff', padding: '20px', marginBottom: '20px', borderRadius: '8px', 
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: '1px solid #eee' 
    }}>
      {/* 1. NỘI DUNG CÂU HỎI */}
      <div style={{ marginBottom: '15px', fontSize: '16px', lineHeight: '1.6' }}>
        <strong style={{ color: '#007bff' }}>Câu {question.number}: </strong>
        <span dangerouslySetInnerHTML={{ __html: question.text }} />
      </div>

      {/* 2. DANH SÁCH ĐÁP ÁN */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {question.options.map(opt => (
          <div 
            key={opt.id}
            onClick={() => !isSubmitted && onSelectAnswer(question.id, opt.id)}
            style={{
              padding: '10px 15px',
              border: `1px solid ${userAnswer === opt.id ? '#1890ff' : '#ddd'}`,
              borderRadius: '6px',
              cursor: isSubmitted ? 'default' : 'pointer',
              background: getOptionColor(opt.id),
              transition: 'all 0.2s'
            }}
          >
            <strong>{opt.id}.</strong> <span dangerouslySetInnerHTML={{ __html: opt.text }} />
          </div>
        ))}
      </div>

      {/* 3. PHẦN HIỂN THỊ SAU KHI NỘP BÀI */}
      {isSubmitted && answerKey && (
        <div style={{ marginTop: '15px', borderTop: '1px dashed #ccc', paddingTop: '15px' }}>
          {/* Thông báo kết quả câu này */}
          <div style={{ marginBottom: '10px', fontWeight: 'bold', color: userAnswer === answerKey.correctOptionId ? 'green' : 'red' }}>
            {userAnswer === answerKey.correctOptionId ? '✓ Làm đúng' : `✗ Làm sai (Đáp án đúng: ${answerKey.correctOptionId})`}
          </div>

          {/* Nút xem lời giải (Giống Azota) */}
          <button 
            onClick={() => setShowSolution(!showSolution)}
            style={{
              background: showSolution ? '#6c757d' : '#17a2b8',
              color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px'
            }}
          >
            {showSolution ? 'Ẩn lời giải' : 'Xem lời giải chi tiết'}
          </button>
          
          {/* Nội dung lời giải */}
          {showSolution && (
            <div 
              style={{ marginTop: '10px', background: '#f8f9fa', padding: '15px', borderRadius: '5px', borderLeft: '4px solid #17a2b8' }}
            >
              <strong>Hướng dẫn giải:</strong><br/>
              <div dangerouslySetInnerHTML={{ __html: answerKey.solutionText || "Chưa có lời giải chi tiết." }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- COMPONENT CHÍNH ---
const App: React.FC = () => {
  const [exam, setExam] = useState<ExamData | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0); // Thời gian tính bằng giây
  const [isLoading, setIsLoading] = useState(false);

  // Xử lý Upload file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsLoading(true);
      try {
        const file = e.target.files[0];
        const data = await parseDocx(file);
        
        // Ép kiểu về ExamData (vì parseDocx trả về Partial)
        if (data.questions && data.answers) {
           const fullData: ExamData = {
               id: Date.now().toString(),
               title: data.title || file.name,
               duration: data.duration || 45, // Mặc định 45 phút nếu không tìm thấy
               questions: data.questions,
               answers: data.answers,
               createdAt: Date.now()
           };
           setExam(fullData);
           setTimeLeft(fullData.duration * 60); // Cài đặt đồng hồ
           setIsSubmitted(false);
           setUserAnswers({});
           setScore(0);
        }
      } catch (error) {
        alert("Lỗi đọc file: " + error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Đồng hồ đếm ngược
  useEffect(() => {
    if (!exam || isSubmitted || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit(); // Hết giờ tự động nộp
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [exam, isSubmitted, timeLeft]);

  // Format thời gian MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Xử lý chọn đáp án
  const handleSelectAnswer = (qId: string, optId: string) => {
    setUserAnswers(prev => ({ ...prev, [qId]: optId }));
  };

  // Xử lý nộp bài
  const handleSubmit = () => {
    if (!exam) return;
    
    // Tính điểm
    let correctCount = 0;
    exam.answers.forEach(ans => {
      if (userAnswers[ans.questionId] === ans.correctOptionId) {
        correctCount++;
      }
    });
    
    // Giả sử thang điểm 10
    const finalScore = (correctCount / exam.questions.length) * 10;
    setScore(parseFloat(finalScore.toFixed(2)));
    setIsSubmitted(true);
    alert(`Đã nộp bài! Điểm của bạn: ${parseFloat(finalScore.toFixed(2))}`);
    window.scrollTo(0, 0); // Cuộn lên đầu xem kết quả
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', background: '#f0f2f5', minHeight: '100vh', paddingBottom: '50px' }}>
      
      {/* HEADER & UPLOAD */}
      <div style={{ background: '#fff', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', textAlign: 'center' }}>
        <h1 style={{ color: '#007bff', margin: '0 0 10px 0' }}>Hệ Thống Thi Trắc Nghiệm Online</h1>
        {!exam && (
          <div style={{ marginTop: '20px' }}>
            <label style={{ 
              background: '#28a745', color: '#fff', padding: '10px 20px', 
              borderRadius: '5px', cursor: 'pointer', fontSize: '16px' 
            }}>
              📂 Tải lên đề thi (.docx)
              <input type="file" accept=".docx" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
            {isLoading && <p>Đang xử lý đề thi...</p>}
          </div>
        )}
      </div>

      {/* GIAO DIỆN LÀM BÀI */}
      {exam && (
        <div style={{ maxWidth: '800px', margin: '20px auto', padding: '0 15px' }}>
          
          {/* INFO BAR & CLOCK */}
          <div style={{ 
            background: '#fff', padding: '15px', borderRadius: '8px', marginBottom: '20px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            position: 'sticky', top: '10px', zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '1px solid #007bff'
          }}>
            <div>
              <h3 style={{ margin: 0 }}>{exam.title}</h3>
              <small>Số câu: {exam.questions.length} | Thời gian: {exam.duration} phút</small>
            </div>
            
            {!isSubmitted ? (
               <div style={{ textAlign: 'center' }}>
                 <div style={{ fontSize: '12px', color: '#666' }}>Thời gian còn lại</div>
                 <div style={{ fontSize: '24px', fontWeight: 'bold', color: timeLeft < 300 ? 'red' : '#007bff' }}>
                   {formatTime(timeLeft)}
                 </div>
               </div>
            ) : (
               <div style={{ textAlign: 'right' }}>
                 <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'red' }}>ĐIỂM SỐ</div>
                 <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#28a745' }}>{score}</div>
               </div>
            )}
          </div>

          {/* DANH SÁCH CÂU HỎI */}
          {exam.questions.map((q) => (
            <QuestionItem 
              key={q.id}
              question={q}
              userAnswer={userAnswers[q.id]}
              onSelectAnswer={handleSelectAnswer}
              isSubmitted={isSubmitted}
              answerKey={exam.answers.find(a => a.questionId === q.id)}
            />
          ))}

          {/* FOOTER BUTTONS */}
          {!isSubmitted ? (
            <button 
              onClick={() => {
                 if(window.confirm("Bạn có chắc chắn muốn nộp bài?")) handleSubmit();
              }}
              style={{ 
                width: '100%', padding: '15px', background: '#007bff', color: '#fff', 
                border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' 
              }}
            >
              NỘP BÀI
            </button>
          ) : (
            <button 
              onClick={() => { setExam(null); setIsSubmitted(false); }}
              style={{ 
                width: '100%', padding: '15px', background: '#6c757d', color: '#fff', 
                border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' 
              }}
            >
              LÀM ĐỀ KHÁC
            </button>
          )}

        </div>
      )}
    </div>
  );
};

export default App;
