const express = require("express");
const pool = require("../config/database");
const authenticateToken = require(
  "../middleware/authenticate"
);

const router = express.Router();

// ======================================================
// GET CURRENT USER
// ======================================================

router.get(
  "/me",
  authenticateToken,
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT
          id,
          name,
          email,
          created_at
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
        "❌ Get user error:",
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

module.exports = router;
