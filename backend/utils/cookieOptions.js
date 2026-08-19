const isProduction =
  process.env.NODE_ENV === "production" ||
  process.env.VERCEL === "1";

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  maxAge: 1 * 60 * 60 * 1000, // 1 hour
  path: "/",
};

const clearCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
};

module.exports = {
  cookieOptions,
  clearCookieOptions,
  isProduction,
};
