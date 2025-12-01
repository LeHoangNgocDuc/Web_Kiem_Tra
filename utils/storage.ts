import { UserSubmission } from '../types';

export const saveSubmission = (submission: UserSubmission) => {
  try {
    const key = `exam_submission_${submission.examId}`;
    localStorage.setItem(key, JSON.stringify(submission));
  } catch (e) {
    console.error("Failed to save submission", e);
  }
};

export const getSubmission = (examId: string): UserSubmission | null => {
  try {
    const key = `exam_submission_${examId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error("Failed to load submission", e);
    return null;
  }
};

export const clearSubmission = (examId: string) => {
  localStorage.removeItem(`exam_submission_${examId}`);
};