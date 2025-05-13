import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";

function Quiz() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const response = await axios.get(`/api/quizzes/${id}`);
        const quizData = response.data;

        // If there are more than 20 questions, select 20 random ones
        if (quizData.questions && quizData.questions.length > 20) {
          const shuffled = [...quizData.questions].sort(
            () => 0.5 - Math.random()
          );
          quizData.questions = shuffled.slice(0, 20);
        }

        setQuiz(quizData);
        setFilteredQuestions(quizData.questions);
      } catch (err) {
        console.error("Failed to fetch quiz", err);
      }
    };
    fetchQuiz();
  }, [id]);

  const handleAnswerSelect = (answer) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = answer;
    setSelectedAnswers(newAnswers);

    // Show feedback immediately
    const isCorrect =
      answer === filteredQuestions[currentQuestion].correctAnswer;
    setLastAnswerCorrect(isCorrect);
    setShowFeedback(true);
  };

  const handleNext = () => {
    setShowFeedback(false);
    if (currentQuestion < filteredQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      calculateScore();
      setCompleted(true);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    filteredQuestions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correctAnswer) {
        correct++;
      }
    });
    setScore(correct);
  };

  const submitQuiz = async () => {
    try {
      await axios.post("/api/scores", {
        quizId: quiz._id,
        score,
        total: filteredQuestions.length,
        answers: selectedAnswers,
      });
      navigate("/dashboard");
    } catch (err) {
      console.error("Failed to submit quiz", err);
    }
  };

  if (!quiz) return <div>Loading quiz...</div>;

  if (completed) {
    return (
      <div className="quiz-results">
        <h2>Quiz Completed!</h2>
        <p>
          Your score: {score}/{filteredQuestions.length}
        </p>
        <button onClick={submitQuiz} className="btn btn-primary">
          Save Results
        </button>
      </div>
    );
  }

  const question = filteredQuestions[currentQuestion];
  const hasSelectedAnswer = selectedAnswers[currentQuestion] !== undefined;
  const selectedAnswer = selectedAnswers[currentQuestion];
  const correctAnswer = question.correctAnswer;

  return (
    <div>
      <Navbar />
      <div className="quiz-container">
        <h2>{quiz.title}</h2>
        {quiz.questions.length > 20 && (
          <div className="quiz-notice">
            (Showing 20 random questions out of {quiz.questions.length})
          </div>
        )}
        <div className="quiz-progress">
          Question {currentQuestion + 1} of {filteredQuestions.length}
        </div>
        <div className="question">
          <h3>{question.questionText}</h3>
          <div className="options">
            {question.options.map((option, index) => (
              <div
                key={index}
                className={`option ${
                  selectedAnswer === option ? "selected" : ""
                } ${
                  selectedAnswer === option
                    ? option === correctAnswer
                      ? "correct"
                      : "incorrect"
                    : ""
                } ${
                  showFeedback && option === correctAnswer ? "show-correct" : ""
                }`}
                onClick={() => !hasSelectedAnswer && handleAnswerSelect(option)}
              >
                {option}
                {showFeedback && option === correctAnswer && (
                  <span className="correct-marker"> (Correct Answer)</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {showFeedback && (
          <div
            className={`feedback ${
              lastAnswerCorrect ? "correct" : "incorrect"
            }`}
          >
            <p>{lastAnswerCorrect ? "✓ Correct!" : "✗ Incorrect"}</p>
            {!lastAnswerCorrect && (
              <p>
                The correct answer is: <strong>{correctAnswer}</strong>
              </p>
            )}
            <p>{question.explanation || "No explanation provided."}</p>
          </div>
        )}

        {hasSelectedAnswer && (
          <button onClick={handleNext} className="btn btn-primary">
            {currentQuestion === filteredQuestions.length - 1
              ? "Finish Quiz"
              : "Next Question"}
          </button>
        )}
      </div>
    </div>
  );
}

export default Quiz;
