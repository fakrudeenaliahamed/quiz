import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Quiz from "./pages/Quiz";
import Dashboard from "./pages/Dashboard";
import QuizNew from "./pages/QuizNew";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/quiz/:id" element={<Quiz />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/quiz/new" element={<QuizNew />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
