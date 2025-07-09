import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import ReactMarkdown from "react-markdown";

const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

function Quiz() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [quizList, setQuizList] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState({});

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const response = await axios.get(`/api/quizzes/${id}`);
        const quizData = response.data;

        // Shuffle all questions
        if (quizData.questions && quizData.questions.length > 0) {
          quizData.questions = shuffleArray(quizData.questions);
        }

        // If there are more than 30 questions, select 30 random ones
        if (quizData.questions && quizData.questions.length > 30) {
          quizData.questions = quizData.questions.slice(0, 30);
        }

        // Shuffle options for each question
        quizData.questions.forEach((question) => {
          question.options = shuffleArray(question.options);
        });

        setQuiz(quizData);
        setFilteredQuestions(quizData.questions);
        setCurrentQuestion(0);
        setSelectedAnswers([]);
        setScore(0);
        setCompleted(false);
      } catch (err) {
        console.error("Failed to fetch quiz", err);
      }
    };

    const fetchQuizList = async () => {
      try {
        const response = await axios.get("/api/quizzes");
        setQuizList(response.data);
      } catch (err) {
        console.error("Failed to fetch quiz list", err);
      }
    };

    fetchQuiz();
    fetchQuizList();
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
      // Do not navigate here, let the user choose what to do next
    } catch (err) {
      console.error("Failed to submit quiz", err);
    }
  };

  if (!quiz) return <div>Loading quiz...</div>;

  if (completed) {
    // Find the next quiz in the list
    const currentQuizIndex = quizList.findIndex((q) => q._id === quiz._id);
    const nextQuiz =
      currentQuizIndex !== -1 && currentQuizIndex + 1 < quizList.length
        ? quizList[currentQuizIndex + 1]
        : null;

    // Calculate percentage
    const percent = (score / filteredQuestions.length) * 100;
    const resultText = percent >= 80 ? "Passed" : "Failed";
    const resultClass = percent >= 80 ? "passed" : "failed";

    return (
      <div className="quiz-results">
        <h2>Quiz Completed!</h2>
        <p>
          Your score: {score}/{filteredQuestions.length} ({percent.toFixed(1)}%)
        </p>
        <p
          className={resultClass}
          style={{ fontWeight: "bold", fontSize: "1.2em" }}
        >
          {resultText}
        </p>
        <button
          onClick={async () => {
            await submitQuiz();
            navigate("/dashboard");
          }}
          className="btn btn-primary"
        >
          Save Results
        </button>
        <button
          onClick={async () => {
            // Save the current quiz results before resetting
            await submitQuiz();

            // Find failed questions
            let failedQuestions = filteredQuestions.filter(
              (question, idx) => selectedAnswers[idx] !== question.correctAnswer
            );
            // If all correct, just reset as usual
            let questionsToRetake =
              failedQuestions.length > 0 ? failedQuestions : filteredQuestions;

            // Shuffle failed questions before repeating
            questionsToRetake = shuffleArray(questionsToRetake);

            // Repeat each failed question 4 times and shuffle options for each repeat
            let repeatedQuestions = [];
            questionsToRetake.forEach((q) => {
              for (let i = 0; i < 4; i++) {
                repeatedQuestions.push({
                  ...q,
                  options: shuffleArray([...q.options]),
                });
              }
            });

            // Shuffle the repeated questions again for extra randomness
            repeatedQuestions = shuffleArray(repeatedQuestions);

            setFilteredQuestions(repeatedQuestions);
            setCurrentQuestion(0);
            setSelectedAnswers([]);
            setScore(0);
            setCompleted(false);
          }}
          className="btn btn-secondary"
          style={{ marginLeft: "10px" }}
        >
          Retake Quiz
        </button>
        {nextQuiz && (
          <div style={{ marginTop: "20px" }}>
            <h3>Suggested Next Quiz:</h3>
            <p>{nextQuiz.title}</p>
            <button
              onClick={async () => {
                try {
                  await submitQuiz();
                  navigate(`/quiz/${nextQuiz._id}`);
                } catch (err) {
                  console.error("Failed to save quiz results", err);
                  alert("Failed to save the current quiz. Please try again.");
                }
              }}
              className="btn btn-success"
            >
              Take Next Quiz
            </button>
          </div>
        )}
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
        {quiz.questions.length > 30 && (
          <div className="quiz-notice">
            (Showing 30 random questions out of {quiz.questions.length})
          </div>
        )}
        <div className="quiz-progress">
          Question {currentQuestion + 1} of {filteredQuestions.length}
        </div>
        <div className="question">
          <hr style={{ margin: "10px 0" }} />
          {question.originalQuestionSource && (
            <div
              style={{
                marginBottom: "8px",
                fontSize: "0.98em",
                color: "#1976d2",
                fontWeight: "bold",
              }}
            >
              <ReactMarkdown>{question.originalQuestionSource}</ReactMarkdown>
            </div>
          )}
          <hr style={{ margin: "10px 0" }} />

          {/* Edit Mode */}
          {editing ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                let parsed;
                try {
                  parsed = JSON.parse(editContent.json);
                } catch (err) {
                  alert("Invalid JSON");
                  return;
                }
                // Call backend API to update question
                await axios.put(
                  `/api/quizzes/${quiz._id}/questions/${question._id}`,
                  parsed
                );
                // Refresh quiz data
                const response = await axios.get(`/api/quizzes/${quiz._id}`);

                // Shuffle options for each question
                response.data.questions.forEach((q) => {
                  q.options = shuffleArray(q.options);
                });

                setQuiz(response.data);
                setFilteredQuestions(response.data.questions);
                setEditing(false);
              }}
              style={{ marginBottom: "10px" }}
            >
              <div>
                <label>Edit Question JSON:</label>
                <textarea
                  value={editContent.json}
                  onChange={(e) =>
                    setEditContent({ ...editContent, json: e.target.value })
                  }
                  rows={10}
                  style={{ width: "100%", fontFamily: "monospace" }}
                />
              </div>
              <button
                type="submit"
                className="btn btn-success"
                style={{ marginTop: 8 }}
              >
                Save
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginLeft: 8, marginTop: 8 }}
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
            </form>
          ) : (
            <>
              <div
                style={{
                  marginBottom: "8px",
                  fontSize: "0.98em",
                  color: "#1976d2",
                  fontWeight: "bold",
                }}
              >
                <ReactMarkdown>{question.questionText}</ReactMarkdown>
              </div>
              <button
                className="btn btn-warning"
                style={{ marginBottom: 8 }}
                onClick={() => {
                  setEditContent({
                    json: JSON.stringify(
                      {
                        questionText: question.questionText,
                        originalQuestionSource:
                          question.originalQuestionSource || "",
                        options: question.options,
                        correctAnswer: question.correctAnswer,
                        explanation: question.explanation || "",
                        points: question.points || 1,
                      },
                      null,
                      2
                    ),
                  });
                  setEditing(true);
                }}
              >
                Edit Question
              </button>
            </>
          )}
          <hr style={{ margin: "10px 0" }} />
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
            <p>
              <ReactMarkdown>
                {question.explanation || "No explanation provided."}
              </ReactMarkdown>
            </p>
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
