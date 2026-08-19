require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

// ======================================================
// IMPORT MODULES
// ======================================================

const pool = require("./config/database");
const corsConfig = require("./config/cors");
const {
  isProduction,
} = require("./utils/cookieOptions");
const { router: authRouter, otpStore } =
  require("./routes/auth");
const otpRouter = require("./routes/otp");
const userRouter = require("./routes/user");

// ======================================================
// EXPRESS SETUP
// ======================================================

const app = express();
const PORT = process.env.PORT || 5000;

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(cors(corsConfig));
app.options(/.*/, cors(corsConfig));
app.use(express.json());
app.use(cookieParser());
// ======================================================
// OTP STORE MIDDLEWARE
// ======================================================

// Make otpStore available to routes
app.use((req, res, next) => {
  res.locals.otpStore = otpStore;
  next();
});

// ======================================================
// HEALTH CHECK ROUTE
// ======================================================

app.get("/", (req, res) => {
  res.status(200).send(
    "Backend server is running!"
  );
});

// ======================================================
// API ROUTES
// ======================================================

app.use("/api", authRouter);
app.use("/api", otpRouter);
app.use("/api", userRouter);

// ======================================================
// SERVER STARTUP
// ======================================================

// Vercel will use the exported Express app.
// Local development will use app.listen().

if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(
      `\n✅ Server running on http://localhost:${PORT}`
    );
    console.log(
      `Environment: ${
        isProduction
          ? "🔒 PRODUCTION"
          : "🔓 DEVELOPMENT"
      }\n`
    );
  });
}

// IMPORTANT FOR VERCEL
module.exports = app;