const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");
const {
  cookieOptions,
  clearCookieOptions,
} = require("../utils/cookieOptions");

const router = express.Router();

// Temporary OTP storage
const otpStore = {};

// ======================================================
// SIGNUP API
// ======================================================

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } =
      req.body;

    // Required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "All fields are required",
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters",
      });
    }

    // Normalize email
    const normalizedEmail = email
      .trim()
      .toLowerCase();

    // Check existing user
    const existingUser =
      await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [normalizedEmail]
      );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Email already registered",
      });
    }

    // Hash password
    const hashedPassword =
      await bcrypt.hash(password, 10);

    // Generate OTP
    const otp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    // Store temporary signup information
    otpStore[normalizedEmail] = {
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      otp: otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
    };

    console.log(
      "\n=============================="
    );
    console.log("🔐 OTP GENERATED");
    console.log("Email:", normalizedEmail);
    console.log("OTP:", otp);
    console.log("Expires in: 5 minutes");
    console.log(
      "==============================\n"
    );

    return res.status(200).json({
      success: true,
      message:
        "OTP sent to your email. Please verify to complete signup.",
      otp: otp, // Development only
    });
  } catch (error) {
    console.error(
      "❌ Signup error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Something went wrong while creating the account",
    });
  }
});

// ======================================================
// LOGIN API
// ======================================================

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required",
      });
    }

    // Normalize email
    const normalizedEmail = email
      .trim()
      .toLowerCase();

    // Find user
    const result = await pool.query(
      `SELECT
        id,
        name,
        email,
        password,
        created_at
      FROM users
      WHERE email = $1`,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    const user = result.rows[0];

    // Compare password
    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    // JWT secret check
    if (!process.env.JWT_SECRET) {
      console.error(
        "❌ JWT_SECRET is missing"
      );

      return res.status(500).json({
        success: false,
        message:
          "Server authentication configuration error",
      });
    }

    // Create JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Remove password
    delete user.password;

    // Store JWT cookie
    res.cookie(
      "token",
      token,
      cookieOptions
    );

    console.log(
      "✅ User logged in:",
      user.email
    );

    return res.status(200).json({
      success: true,
      message: "Login successful!",
      user: user,
    });
  } catch (error) {
    console.error(
      "❌ Login error:",
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
// LOGOUT API
// ======================================================

router.post("/logout", (req, res) => {
  res.clearCookie(
    "token",
    clearCookieOptions
  );

  return res.status(200).json({
    success: true,
    message: "Logout successful",
  });
});

// Export router and otpStore for OTP verification
module.exports = { router, otpStore };
