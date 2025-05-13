// client/src/pages/QuizNew.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

function QuizNew() {
  const [jsonInput, setJsonInput] = useState("");
  const [error, setError] = useState("");
  const [isValidJson, setIsValidJson] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [quizzes, setQuizzes] = useState([]); // State to store quizzes
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const response = await axios.get("/api/quizzes");
        setQuizzes(response.data);
      } catch (err) {
        console.error("Failed to fetch quizzes", err);
      }
    };

    fetchQuizzes();
  }, []);

  const validateJson = (jsonString) => {
    try {
      const data = JSON.parse(jsonString);

      // Basic validation
      if (!data.title || !data.category) {
        throw new Error("Title and category are required");
      }

      if (
        !data.questions ||
        !Array.isArray(data.questions) ||
        data.questions.length === 0
      ) {
        throw new Error("At least one question is required");
      }

      for (const question of data.questions) {
        if (!question.questionText) {
          throw new Error("All questions must have questionText");
        }
        if (
          !question.options ||
          !Array.isArray(question.options) ||
          question.options.length < 2
        ) {
          throw new Error("Each question needs at least 2 options");
        }
        if (
          !question.correctAnswer ||
          !question.options.includes(question.correctAnswer)
        ) {
          throw new Error("correctAnswer must match one of the options");
        }
      }

      setParsedData(data);
      setIsValidJson(true);
      setError("");
    } catch (err) {
      setIsValidJson(false);
      setError(`Invalid JSON: ${err.message}`);
      setParsedData(null);
    }
  };

  const handleJsonChange = (e) => {
    const value = e.target.value;
    setJsonInput(value);
    if (value.trim()) {
      validateJson(value);
    } else {
      setIsValidJson(false);
      setError("");
      setParsedData(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValidJson) return;

    console.log("Parsed Data:", parsedData);

    try {
      // Check if a quiz with the same title already exists
      const existingQuiz = quizzes.find(
        (quiz) => quiz.title === parsedData.title
      );

      if (existingQuiz) {
        // If the quiz exists, append new questions to the existing quiz
        const response = await axios.put(`/api/quizzes/${existingQuiz._id}`, {
          questions: [...existingQuiz.questions, ...parsedData.questions],
        });
        console.log("Quiz updated:", response.data);
        alert("Questions appended to the existing quiz.");
      } else {
        // If the quiz does not exist, create a new quiz
        const response = await axios.post("/api/quizzes", {
          ...parsedData,
          createdBy: user._id,
        });
        console.log("Quiz created:", response.data);
        alert("New quiz created successfully.");
      }

      // Refresh the quizzes list and navigate back to the dashboard
      const updatedQuizzes = await axios.get("/api/quizzes");
      setQuizzes(updatedQuizzes.data);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create or update quiz");
    }
  };

  return (
    <div className="quiz-form">
      <h2>Create or Update Quiz (JSON Input)</h2>

      <div className="form-group">
        <label>Paste your quiz JSON:</label>
        <textarea
          value={jsonInput}
          onChange={handleJsonChange}
          placeholder={`Paste your quiz data in this format:
{
  "title": "Quiz Title",
  "description": "Optional description",
  "category": "Quiz Category",
  "questions": [
    {
      "questionText": "Your question",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswer": "Must match one option exactly",
      "points": 1
    }
  ]
}`}
          rows={20}
          style={{ fontFamily: "monospace", whiteSpace: "pre" }}
        />
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {isValidJson && (
        <div className="preview-section">
          <h3>Preview</h3>
          <div className="preview-content">
            <h4>{parsedData.title}</h4>
            <p>
              <strong>Category:</strong> {parsedData.category}
            </p>
            {parsedData.description && <p>{parsedData.description}</p>}

            <h5>Questions:</h5>
            <ul>
              {parsedData.questions.map((q, i) => (
                <li key={i}>
                  <p>
                    <strong>Q{i + 1}:</strong> {q.questionText} ({q.points || 1}{" "}
                    point{q.points !== 1 ? "s" : ""})
                  </p>
                  <ul>
                    {q.options.map((opt, j) => (
                      <li
                        key={j}
                        style={{
                          fontWeight:
                            opt === q.correctAnswer ? "bold" : "normal",
                          color: opt === q.correctAnswer ? "green" : "inherit",
                        }}
                      >
                        {opt}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!isValidJson}
        className="btn btn-primary"
      >
        {parsedData?._id ? "Update Quiz" : "Create Quiz"}
      </button>
      {/* Table of Quizzes */}
      <div className="quiz-table-section">
        <h3>Existing Quizzes</h3>
        {quizzes.length > 0 ? (
          <table className="quiz-table">
            <thead>
              <tr>
                <th>Quiz ID</th>
                <th>Name</th>
                <th>Created Date</th>
              </tr>
            </thead>
            <tbody>
              {quizzes.map((quiz) => (
                <tr key={quiz._id}>
                  <td>{quiz._id}</td>
                  <td>{quiz.title}</td>
                  <td>{new Date(quiz.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No quizzes available.</p>
        )}
      </div>
    </div>
  );
}

export default QuizNew;
