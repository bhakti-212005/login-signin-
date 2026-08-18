import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

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

        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
    </div>
  );
}

export default Dashboard;