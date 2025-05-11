import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Home() {
  const { user } = useAuth();

  return (
    <div className="home-page">
      <h1>Welcome to Quiz App</h1>
      {user ? (
        <div className="auth-links">
          <Link to="/dashboard" className="btn btn-primary">
            Go to Dashboard
          </Link>
          <Link to="/quiz/general" className="btn btn-secondary">
            Take a Quiz
          </Link>
        </div>
      ) : (
        <div className="auth-links">
          <Link to="/login" className="btn btn-primary">
            Login
          </Link>
          <Link to="/register" className="btn btn-secondary">
            Register
          </Link>
        </div>
      )}
    </div>
  );
}

export default Home;
