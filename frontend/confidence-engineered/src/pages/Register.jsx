import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser, googleLoginUser } from "../api/authApi";
import { useAuth } from "../context/AuthContext";
import { Box, Button, TextField, Typography, Stack, Paper, Divider } from "@mui/material";
import { GoogleLogin } from '@react-oauth/google';

export default function Register() {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const data = await registerUser(email, password, name, role);

    if (data.message) {
      setSuccess("Registered successfully. You can now log in.");
      setTimeout(() => navigate("/login"), 1000);
    } else {
      setError(data.message || "Registration failed");
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    try {
      const data = await googleLoginUser(credentialResponse.credential);
      if (data.access_token) {
        login(data.access_token, data.user_id);
        navigate("/dashboard");
      } else {
        setError(data.message || "Google login failed");
      }
    } catch (err) {
      setError("Failed to connect to server");
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Paper sx={{ p: 4, width: 400 }}>
        <Typography variant="h5" mb={2}>Register</Typography>
        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
            />
            <TextField
              label="Profession / Role (e.g., Software Engineer)"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              fullWidth
            />
            <TextField
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
            />
            {error && <Typography color="error">{error}</Typography>}
            {success && <Typography color="primary">{success}</Typography>}
            <Button type="submit" variant="contained" fullWidth>
              Register
            </Button>
            <Button variant="text" fullWidth onClick={() => navigate("/login")}>
              Already have an account? Login
            </Button>
            <Divider>OR</Divider>
            <Box display="flex" justifyItems="center" justifyContent="center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Google Login Failed")}
              />
            </Box>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}