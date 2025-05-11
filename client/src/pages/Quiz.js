import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

function Quiz() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
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
        setQuiz(response.data);
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
    const isCorrect = answer === quiz.questions[currentQuestion].correctAnswer;
    setLastAnswerCorrect(isCorrect);
    setShowFeedback(true);
  };

  const handleNext = () => {
    setShowFeedback(false);
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      calculateScore();
      setCompleted(true);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    quiz.questions.forEach((question, index) => {
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
        total: quiz.questions.length,
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
          Your score: {score}/{quiz.questions.length}
        </p>
        <button onClick={submitQuiz} className="btn btn-primary">
          Save Results
        </button>
      </div>
    );
  }

  const question = quiz.questions[currentQuestion];
  const hasSelectedAnswer = selectedAnswers[currentQuestion] !== undefined;

  return (
    <div className="quiz-container">
      <h2>{quiz.title}</h2>
      <div className="quiz-progress">
        Question {currentQuestion + 1} of {quiz.questions.length}
      </div>
      <div className="question">
        <h3>{question.questionText}</h3>
        <div className="options">
          {question.options.map((option, index) => (
            <div
              key={index}
              className={`option ${
                selectedAnswers[currentQuestion] === option ? "selected" : ""
              } ${
                selectedAnswers[currentQuestion] === option
                  ? option === question.correctAnswer
                    ? "correct"
                    : "incorrect"
                  : ""
              } ${
                showFeedback && option === question.correctAnswer
                  ? "show-correct"
                  : ""
              }`}
              onClick={() => !hasSelectedAnswer && handleAnswerSelect(option)}
            >
              {option}
            </div>
          ))}
        </div>
      </div>

      {showFeedback && (
        <div
          className={`feedback ${lastAnswerCorrect ? "correct" : "incorrect"}`}
        >
          <p>{lastAnswerCorrect ? "✓ Correct!" : "✗ Incorrect"}</p>
          <p>{question.explanation || "No explanation provided."}</p>
        </div>
      )}

      {hasSelectedAnswer && (
        <button onClick={handleNext} className="btn btn-primary">
          {currentQuestion === quiz.questions.length - 1
            ? "Finish Quiz"
            : "Next Question"}
        </button>
      )}
    </div>
  );
}

export default Quiz;
