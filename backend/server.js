require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();

// ======================================================
// CONFIGURATION
// ======================================================

const PORT = process.env.PORT || 5000;

// Frontend URLs allowed to communicate with this backend
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://login-signin-lqqn.vercel.app",
];

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests such as Postman/server-to-server
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("Blocked CORS origin:", origin);

      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// ======================================================
// DATABASE CONNECTION - NEON POSTGRESQL
// ======================================================

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

// ======================================================
// COOKIE CONFIGURATION
// ======================================================

const isProduction = process.env.NODE_ENV === "production";

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// ======================================================
// TEST BACKEND ROUTE
// ======================================================

app.get("/", (req, res) => {
  res.status(200).send("Backend server is running!");
});

// ======================================================
// TEMPORARY OTP STORAGE
// ======================================================

const otpStore = {};

// ======================================================
// SIGNUP API
// ======================================================

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

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate 6-digit OTP
    const otp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    // Store signup information temporarily
    otpStore[normalizedEmail] = {
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      otp: otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
    };

    // Log OTP for development
    console.log("\n==============================");
    console.log("OTP GENERATED");
    console.log("Email:", normalizedEmail);
    console.log("OTP:", otp);
    console.log("Expires in: 5 minutes");
    console.log("==============================\n");

    return res.status(200).json({
      success: true,
      message:
        "OTP sent to your email. Please verify to complete signup.",

      // Development only
      otp: otp,
    });
  } catch (error) {
    console.error("Signup error:", error.message);

    return res.status(500).json({
      success: false,
      message:
        "Something went wrong while creating the account",
    });
  }
});

// ======================================================
// VERIFY OTP API
// ======================================================

app.post("/api/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Check required fields
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Check OTP exists
    if (!otpStore[normalizedEmail]) {
      return res.status(400).json({
        success: false,
        message: "OTP expired or invalid",
      });
    }

    const storedOtp = otpStore[normalizedEmail];

    // Check expiration
    if (Date.now() > storedOtp.expiresAt) {
      delete otpStore[normalizedEmail];

      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    // Verify OTP
    if (storedOtp.otp !== otp.toString()) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // ==================================================
    // INSERT USER INTO DATABASE
    // ==================================================

    const result = await pool.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [
        storedOtp.name,
        storedOtp.email,
        storedOtp.password,
      ]
    );

    const user = result.rows[0];

    console.log("User registered:", user);

    // ==================================================
    // CHECK JWT SECRET
    // ==================================================

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing");

      return res.status(500).json({
        success: false,
        message: "JWT secret is not configured",
      });
    }

    // ==================================================
    // CREATE JWT
    // ==================================================

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // ==================================================
    // STORE JWT IN HTTPONLY COOKIE
    // ==================================================

    res.cookie("token", token, cookieOptions);

    // Remove OTP from temporary storage
    delete otpStore[normalizedEmail];

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(
      "OTP verification error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Something went wrong during verification",
    });
  }
});

// ======================================================
// LOGIN API
// ======================================================

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

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Find user
    const result = await pool.query(
      `SELECT id, name, email, password, created_at
       FROM users
       WHERE email = $1`,
      [normalizedEmail]
    );

    // User not found
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = result.rows[0];

    // Compare password
    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // ==================================================
    // CHECK JWT SECRET
    // ==================================================

    if (!process.env.JWT_SECRET) {
      console.error(
        "JWT_SECRET is missing from environment variables"
      );

      return res.status(500).json({
        success: false,
        message:
          "Server authentication configuration error",
      });
    }

    // ==================================================
    // CREATE JWT
    // ==================================================

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // Remove password
    delete user.password;

    // ==================================================
    // STORE JWT IN HTTPONLY COOKIE
    // ==================================================

    res.cookie("token", token, cookieOptions);

    console.log("User logged in:", user.email);

    return res.status(200).json({
      success: true,
      message: "Login successful!",
      user: user,
    });
  } catch (error) {
    console.error(
      "Login error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Something went wrong during login",
    });
  }
});

// ======================================================
// AUTHENTICATION MIDDLEWARE
// ======================================================

function authenticateToken(req, res, next) {
  try {
    const token = req.cookies.token;

    // No token
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    // Check JWT secret
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message:
          "JWT secret is not configured",
      });
    }

    // Verify JWT
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // Store user information
    req.user = decoded;

    next();
  } catch (error) {
    console.error(
      "Authentication error:",
      error.message
    );

    return res.status(401).json({
      success: false,
      message: "Invalid or expired session",
    });
  }
}

// ======================================================
// GET CURRENT LOGGED-IN USER
// ======================================================

app.get(
  "/api/me",
  authenticateToken,
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, name, email, created_at
         FROM users
         WHERE id = $1`,
        [req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.status(200).json({
        success: true,
        user: result.rows[0],
      });
    } catch (error) {
      console.error(
        "Get user error:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to get user information",
      });
    }
  }
);

// ======================================================
// LOGOUT API
// ======================================================

app.post("/api/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction
      ? "none"
      : "lax",
  });

  return res.status(200).json({
    success: true,
    message: "Logout successful",
  });
});

// ======================================================
// START SERVER
// ======================================================

app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  );

  console.log(
    `Environment: ${
      isProduction
        ? "PRODUCTION"
        : "DEVELOPMENT"
    }`
  );
});