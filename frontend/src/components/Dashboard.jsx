import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ======================================================
  // GET LOGGED-IN USER
  // ======================================================

  useEffect(() => {
    const getUser = async () => {
      try {
        const response = await fetch(
          "https://login-signin-jtq4.vercel.app/api/me",
          {
            method: "GET",
            credentials: "include",
          }
        );

        const data = await response.json();

        console.log("Current user response:", data);

        if (response.ok && data.success) {
          setUser(data.user);
        } else {
          console.log("Not authenticated");
          navigate("/login");
        }
      } catch (error) {
        console.error("Failed to get user:", error);
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    getUser();
  }, [navigate]);

  // ======================================================
  // LOGOUT
  // ======================================================

  const handleLogout = async () => {
    try {
      const response = await fetch(
        "https://login-signin-jtq4.vercel.app/api/logout",
        {
          method: "POST",
          credentials: "include",
        }
      );

      const data = await response.json();

      console.log("Logout response:", data);

      if (response.ok) {
        setUser(null);
        navigate("/login");
      } else {
        console.error("Logout failed:", data.message);
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-box">
          <h1>Loading...</h1>
        </div>
      </div>
    );
  }

  // ======================================================
  // DASHBOARD
  // ======================================================

  return (
    <div className="dashboard-container">
      <div className="dashboard-box">
        <h1>Welcome to Dashboard</h1>

        {user ? (
          <div className="user-info">
            <h2>Hello, {user.name}!</h2>

            <div className="info-item">
              <strong>Name:</strong>
              <span>{user.name}</span>
            </div>

            <div className="info-item">
              <strong>Email:</strong>
              <span>{user.email}</span>
            </div>

            {user.created_at && (
              <div className="info-item">
                <strong>Account Created:</strong>
                <span>
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        ) : (
          <p>No user information found.</p>
        )}

        <button
          onClick={handleLogout}
          className="logout-button"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default Dashboard;