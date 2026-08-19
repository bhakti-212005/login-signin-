module.exports = {
  origin: function (origin, callback) {
    // Allow requests without an Origin header
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://login-signin-lgqn.vercel.app",
      "https://login-signin-ten.vercel.app",
    ];

    // Allow any Vercel deployment
    if (
      origin.includes("vercel.app") ||
      allowedOrigins.includes(origin)
    ) {
      return callback(null, true);
    }

    console.log("🚫 CORS blocked:", origin);
    return callback(null, false);
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],
};
