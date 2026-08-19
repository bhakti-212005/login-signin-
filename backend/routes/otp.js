const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");
const {
  cookieOptions,
} = require("../utils/cookieOptions");

const router = express.Router();

// ======================================================
// VERIFY OTP API
// ======================================================

router.post("/verify-otp", async (req, res, otpStore) => {
  try {
    const { email, otp } = req.body;

    // Required fields
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message:
          "Email and OTP are required",
      });
    }

    // Normalize email
    const normalizedEmail = email
      .trim()
      .toLowerCase();

    // Find OTP (otpStore passed from middleware)
    if (
      !res.locals.otpStore ||
      !res.locals.otpStore[normalizedEmail]
    ) {
      return res.status(400).json({
        success: false,
        message: "OTP expired or invalid",
      });
    }

    const storedOtp =
      res.locals.otpStore[normalizedEmail];

    // Check expiry
    if (Date.now() > storedOtp.expiresAt) {
      delete res.locals.otpStore[
        normalizedEmail
      ];

      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    // Compare OTP
    if (storedOtp.otp !== otp.toString()) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Insert user into database
    const result = await pool.query(
      `INSERT INTO users
       (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [
        storedOtp.name,
        storedOtp.email,
        storedOtp.password,
      ]
    );

    const user = result.rows[0];
    console.log(
      "✅ User registered:",
      user
    );

    // JWT secret check
    if (!process.env.JWT_SECRET) {
      console.error(
        "❌ JWT_SECRET is missing"
      );

      return res.status(500).json({
        success: false,
        message:
          "JWT secret is not configured",
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

    // Store JWT cookie
    res.cookie(
      "token",
      token,
      cookieOptions
    );

    // Remove OTP
    delete res.locals.otpStore[
      normalizedEmail
    ];

    return res.status(200).json({
      success: true,
      message:
        "Email verified successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(
      "❌ OTP verification error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Something went wrong during verification",
    });
  }
});

module.exports = router;
