import React from 'react';
import { Question } from '../types';

interface AnswerSheetProps {
  questions: Question[];
  selectedAnswers: Record<string, string>;
  onSelect: (questionId: string, optionId: string) => void;
  onSubmit: () => void;
  readOnly?: boolean;
  correctAnswers?: Record<string, string>; // For result view: questionId -> correctOptionId
}

const AnswerSheet: React.FC<AnswerSheetProps> = ({ 
  questions, 
  selectedAnswers, 
  onSelect, 
  onSubmit, 
  readOnly = false,
  correctAnswers 
}) => {
  
  const scrollToQuestion = (id: string) => {
    const el = document.getElementById(`question-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md h-full flex flex-col">
      <h3 className="text-lg font-bold mb-4 text-gray-700 uppercase border-b pb-2">Phiếu trả lời</h3>
      
      <div className="flex-1 overflow-y-auto mb-4 custom-scrollbar">
        <div className="grid grid-cols-5 gap-2">
          {questions.map((q) => {
            const isSelected = !!selectedAnswers[q.id];
            const userChoice = selectedAnswers[q.id];
            
            let statusClass = "bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200";
            
            if (readOnly && correctAnswers) {
              const correctChoice = correctAnswers[q.id];
              if (userChoice === correctChoice) {
                 statusClass = "bg-green-500 text-white border-green-600"; // Correct
              } else if (userChoice && userChoice !== correctChoice) {
                 statusClass = "bg-red-500 text-white border-red-600"; // Wrong
              } else {
                 statusClass = "bg-white border-gray-200 text-gray-400"; // Unanswered
              }
            } else {
              if (isSelected) {
                statusClass = "bg-blue-600 text-white border-blue-700 font-bold";
              }
            }

            return (
              <button
                key={q.id}
                onClick={() => scrollToQuestion(q.id)}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm border transition-all ${statusClass}`}
              >
                {q.number}
              </button>
            );
          })}
        </div>
      </div>

      {!readOnly && (
        <button
          onClick={onSubmit}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow transition-colors mt-auto"
        >
          NỘP BÀI
        </button>
      )}
    </div>
  );
};

export default AnswerSheet;