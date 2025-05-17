import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

function Dashboard() {
  const { user, logout } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
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

      // Extract unique categories
      const uniqueCategories = [
        "All",
        ...new Set(allQuizzes.map((quiz) => quiz.category)),
      ];

      setQuizzes(allQuizzes);
      setFilteredQuizzes(allQuizzes);
      setCategories(uniqueCategories);
      setScores(scoresRes.data);
    } catch (err) {
      console.error("Failed to fetch data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleDeleteQuiz = async (quizId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this quiz and its related scores?"
      )
    ) {
      try {
        await axios.delete(`/api/quizzes/${quizId}`);
        alert("Quiz and related scores deleted successfully.");
        fetchData(); // Refresh the data after deletion
      } catch (err) {
        console.error("Failed to delete quiz", err);
        alert("Failed to delete quiz. Please try again.");
      }
    }
  };

  const handleClearResults = async () => {
    if (
      window.confirm("Are you sure you want to clear all your saved results?")
    ) {
      try {
        await axios.delete("/api/scores"); // Assuming this endpoint clears all scores for the logged-in user
        alert("All saved results have been cleared.");
        fetchData(); // Refresh the data after clearing results
      } catch (err) {
        console.error("Failed to clear results", err);
        alert("Failed to clear results. Please try again.");
      }
    }
  };

  const handleCategoryChange = (e) => {
    const category = e.target.value;
    setSelectedCategory(category);

    if (category === "All") {
      setFilteredQuizzes(quizzes);
    } else {
      setFilteredQuizzes(quizzes.filter((quiz) => quiz.category === category));
    }
  };

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div>
      <Navbar />
      <div className="dashboard">
        <div className="header">
          <h1>Dashboard</h1>
          <button onClick={handleLogout} className="btn btn-secondary">
            Logout
          </button>
        </div>

        <div className="quizzes-section">
          <h2>Available Quizzes</h2>

          {/* Category Filter Dropdown */}
          <div className="filter-section">
            <label htmlFor="categoryFilter">Filter by Category: </label>
            <select
              id="categoryFilter"
              value={selectedCategory}
              onChange={handleCategoryChange}
            >
              {categories.map((category, index) => (
                <option key={index} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Quizzes Table */}
          <table className="quiz-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Questions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuizzes.map((quiz) => (
                <tr key={quiz._id}>
                  <td>{quiz.title}</td>
                  <td>{quiz.category}</td>
                  <td>{quiz.questions.length}</td>
                  <td>
                    <Link
                      to={`/quiz/${quiz._id}`}
                      className="btn btn-primary"
                      style={{ marginRight: "10px" }}
                    >
                      Start Quiz
                    </Link>
                    {user?.role === "admin" && (
                      <button
                        onClick={() => handleDeleteQuiz(quiz._id)}
                        className="btn btn-danger"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="scores-section">
          <h2>Your Scores</h2>
          {scores.length > 0 ? (
            <>
              <button
                onClick={handleClearResults}
                className="btn btn-danger"
                style={{ marginBottom: "10px" }}
              >
                Clear All Results
              </button>
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
                      <td>{new Date(score.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
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
    </div>
  );
}

export default Dashboard;
