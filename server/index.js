require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const e = require("express");

const app = express();

// Increase payload size limit
app.use(express.json({ limit: "10mb" })); // Adjust the limit as needed
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Middleware
console.log("FRONTEND_URL:", process.env.FRONTEND_URL);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Models
const User = mongoose.model(
  "User",
  new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    createdAt: { type: Date, default: Date.now },
    assignedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  })
);

const Quiz = mongoose.model(
  "Quiz",
  new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    category: { type: String, required: true },
    questions: [
      {
        questionText: { type: String, required: true },
        options: [{ type: String, required: true }],
        correctAnswer: { type: String, required: true },
        points: { type: Number, default: 1 },
        explanation: String,
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now },
    authorizedUsers: [{ type: String }], // Array of usernames
  })
);

const Score = mongoose.model(
  "Score",
  new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
    score: { type: Number, required: true },
    total: { type: Number, required: true },
    answers: [
      {
        questionId: mongoose.Schema.Types.ObjectId,
        selectedAnswer: String,
        isCorrect: Boolean,
      },
    ],
    createdAt: { type: Date, default: Date.now },
  })
);

// Authentication Middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ error: "Invalid token" });

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

// Routes

// Auth Routes
app.post("/api/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/me", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Quiz Routes
app.get("/api/quizzes", authenticate, async (req, res) => {
  try {
    const quizzes = await Quiz.find().populate("createdBy", "username");
    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/quizzes/:id", authenticate, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate(
      "createdBy",
      "username"
    );
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/quizzes", authenticate, isAdmin, async (req, res) => {
  try {
    const { title, description, category, questions } = req.body;

    if (!title || !category || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: "Invalid quiz data" });
    }

    const quiz = new Quiz({
      title,
      description,
      category,
      questions,
      createdBy: req.user._id,
      authorizedUsers: req.body.authorizedUsers || [],
    });

    await quiz.save();
    res.status(201).json(quiz);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/quizzes/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { questions } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: "Questions are required" });
    }

    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    // Append new questions to the existing quiz
    quiz.questions.push(...questions);
    await quiz.save();

    res.json(quiz);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/quizzes/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Delete the quiz
    const quiz = await Quiz.findByIdAndDelete(id);
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    // Delete related scores
    await Score.deleteMany({ quiz: id });

    res.json({ message: "Quiz and related scores deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Score Routes
app.get("/api/scores", authenticate, async (req, res) => {
  try {
    const scores = await Score.find({ user: req.user._id })
      .populate("quiz", "title category")
      .sort({ createdAt: -1 });
    res.json(scores);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/quizzes/:id/assign", authenticate, isAdmin, async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      { assignedUsers: req.body.userIds },
      { new: true }
    ).populate("assignedUsers", "username");
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/scores", authenticate, async (req, res) => {
  try {
    const { quizId, score, total, answers } = req.body;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const newScore = new Score({
      user: req.user._id,
      quiz: quiz._id,
      score,
      total: total,
      answers: answers.map((answer, index) => ({
        questionId: quiz.questions[index]._id,
        selectedAnswer: answer,
        isCorrect: answer === quiz.questions[index].correctAnswer,
      })),
    });

    await newScore.save();
    res.status(201).json(newScore);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Routes
app.get("/api/admin/users", authenticate, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Initialize Admin User
const initializeAdmin = async () => {
  try {
    const adminExists = await User.findOne({ username: "admin" });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      const admin = new User({
        username: "admin",
        password: hashedPassword,
        role: "admin",
      });
      await admin.save();
      console.log(
        "Default admin user created (username: admin, password: admin123)"
      );
    }
  } catch (err) {
    console.error("Error creating admin user:", err);
  }
};

// Create new quiz (admin only)
app.post("/api/quizzes", authenticate, isAdmin, async (req, res) => {
  try {
    const { title, description, category, questions } = req.body;

    // Validate input
    if (!title || !category || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: "Invalid quiz data" });
    }

    const quiz = new Quiz({
      title,
      description,
      category,
      questions,
      createdBy: req.user._id,
    });

    await quiz.save();
    res.status(201).json(quiz);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.post("/api/init-quizzes", async (req, res) => {
  try {
    const sampleQuizzes = [
      {
        title: "JavaScript Basics",
        category: "JavaScript",
        questions: [
          {
            questionText: "What is the output of 2 + '2' in JavaScript?",
            options: ["4", "22", "NaN", "Error"],
            correctAnswer: "22",
            points: 1,
          },
          {
            questionText: "Which keyword declares a variable in JavaScript?",
            options: ["var", "let", "const", "All of the above"],
            correctAnswer: "All of the above",
            points: 1,
          },
        ],
        createdBy: req.user?._id || new mongoose.Types.ObjectId(), // Use admin user ID if available
      },
      {
        title: "Node.js Fundamentals",
        category: "Node.js",
        questions: [
          {
            questionText: "What is the default port for Express.js?",
            options: ["3000", "8080", "5000", "No default"],
            correctAnswer: "No default",
            points: 1,
          },
        ],
        createdBy: req.user?._id || new mongoose.Types.ObjectId(),
      },
    ];

    await Quiz.deleteMany({}); // Clear existing quizzes
    const result = await Quiz.insertMany(sampleQuizzes);
    res.json({ message: `${result.length} quizzes added`, quizzes: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.use(
  cors({
    origin: true, // Allow all origins during development
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await initializeAdmin();
});
