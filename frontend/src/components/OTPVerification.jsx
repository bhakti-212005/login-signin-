import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/OTPVerification.css";

function OTPVerification() {
  const navigate = useNavigate();

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  const email = localStorage.getItem("verificationEmail");

  useEffect(() => {
    const generatedOTP = localStorage.getItem("generatedOTP");
    console.log("Retrieved OTP from localStorage:", generatedOTP);
    console.log("All localStorage items:", { ...localStorage });
    
    if (generatedOTP) {
      console.log("🔐 OTP for verification:", generatedOTP);
    } else {
      console.warn("⚠️ No OTP found in localStorage!");
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!otp) {
      setError("Please enter the OTP");
      return;
    }

    if (otp.length !== 6) {
      setError("OTP must be 6 digits");
      return;
    }

    try {
      const response = await fetch(
        "https://login-signin-jtq4.vercel.app/api/verify-otp",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email,
            otp: otp,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert(data.message);

        // Save verified user for Dashboard
        localStorage.setItem(
          "user",
          JSON.stringify(data.user)
        );

        // Remove temporary verification email
        localStorage.removeItem("verificationEmail");

        // Go to Dashboard
        navigate("/dashboard");
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      setError("Unable to connect to the server");
    }
  };

  return (
    <div className="otp-container">
      <div className="otp-box">
        <h1>Verify Your Email</h1>

        <p>
          Enter the 6-digit OTP shown in the backend console.
        </p>

        <p>
          Email: <strong>{email}</strong>
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter OTP"
            maxLength="6"
          />

          {error && <span>{error}</span>}

          <button type="submit">
            Verify Email
          </button>
        </form>
      </div>
    </div>
  );
}

export default OTPVerification;