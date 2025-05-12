import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

function Dashboard() {
  const { user, logout } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (err) {
      console.error("Failed to logout", err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [quizzesRes, scoresRes] = await Promise.all([
          axios.get("/api/quizzes"),
          axios.get("/api/scores"),
        ]);

        let allQuizzes = quizzesRes.data;

        // Filter quizzes based on user role
        if (user?.role !== "admin") {
          allQuizzes = allQuizzes.filter((quiz) =>
            quiz.authorizedUsers.includes(user.username)
          );
        }

        setQuizzes(allQuizzes);
        setScores(scoresRes.data);
      } catch (err) {
        console.error("Failed to fetch data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div className="dashboard">
      <div className="header">
        <h1>Dashboard</h1>
        <button onClick={handleLogout} className="btn btn-secondary">
          Logout
        </button>
      </div>

      <div className="quizzes-section">
        <h2>Available Quizzes</h2>
        <div className="quiz-list">
          {quizzes.map((quiz) => (
            <div key={quiz._id} className="quiz-card">
              <h3>{quiz.title}</h3>
              <p>{quiz.questions.length} questions</p>
              <Link to={`/quiz/${quiz._id}`} className="btn btn-primary">
                Start Quiz
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div className="scores-section">
        <h2>Your Scores</h2>
        {scores.length > 0 ? (
          <table className="scores-table">
            <thead>
              <tr>
                <th>Quiz</th>
                <th>Score</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((score) => (
                <tr key={score._id}>
                  <td>{score.quiz.title}</td>
                  <td>
                    {score.score}/{score.total}
                  </td>
                  <td>{new Date(score.date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No quiz results yet. Take a quiz to see your scores here!</p>
        )}
      </div>

      {user?.role === "admin" && (
        <div className="admin-section">
          <h2>Admin Actions</h2>
          <Link to="/quiz/new" className="btn btn-primary">
            Create New Quiz
          </Link>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
