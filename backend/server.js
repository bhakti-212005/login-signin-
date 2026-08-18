require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to Neon PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Test database connection
pool
  .connect()
  .then((client) => {
    console.log("Connected to Neon PostgreSQL");
    client.release();
  })
  .catch((error) => {
    console.error("Database connection error:", error.message);
  });

// Temporary OTP storage
const otpStore = {};

// Test backend route
app.get("/", (req, res) => {
  res.send("Backend server is running!");
});

// ===============================
// SIGNUP API
// ===============================
app.post("/api/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Check password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // Check if email already exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Store signup information temporarily
    otpStore[email] = {
      name: name,
      email: email,
      password: hashedPassword,
      otp: otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
    };

    // Show OTP in backend console
    console.log("");
    console.log("================================");
    console.log("EMAIL VERIFICATION OTP");
    console.log("Email:", email);
    console.log("OTP:", otp);
    console.log("OTP expires in 5 minutes");
    console.log("================================");
    console.log("");

    res.status(200).json({
      success: true,
      message: "OTP generated. Check console.",
      otp: otp,
    });
  } catch (error) {
    console.error("Signup error:", error.message);

    res.status(500).json({
      success: false,
      message: "Something went wrong during signup",
    });
  }
});

// ===============================
// VERIFY OTP API
// ===============================
app.post("/api/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Check fields
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    // Check whether OTP exists
    const storedData = otpStore[email];

    if (!storedData) {
      return res.status(400).json({
        success: false,
        message: "OTP not found. Please signup again.",
        otp:otp,
      });
    }

    // Check OTP expiration
    if (Date.now() > storedData.expiresAt) {
      delete otpStore[email];

      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please signup again.",
      });
    }

    // Check OTP
    if (storedData.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Insert verified user into Neon
    const result = await pool.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [storedData.name, storedData.email, storedData.password]
    );

    // Remove OTP after successful verification
    delete otpStore[email];

    console.log("Email verified successfully:", email);

    res.status(200).json({
      success: true,
      message: "Email verified successfully!",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("OTP verification error:", error.message);

    res.status(500).json({
      success: false,
      message: "Something went wrong during OTP verification",
    });
  }
});

// ===============================
// LOGIN API
// ===============================
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user
    const result = await pool.query(
      "SELECT id, name, email, password, created_at FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = result.rows[0];

    // Compare password with hashed password
    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Don't send password to frontend
    delete user.password;

    res.status(200).json({
      success: true,
      message: "Login successful!",
      user: user,
    });
  } catch (error) {
    console.error("Login error:", error.message);

    res.status(500).json({
      success: false,
      message: "Something went wrong during login",
    });
  }
});

// ===============================
// START SERVER
// ===============================
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});