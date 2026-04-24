import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, googleLoginUser } from "../api/authApi";
import { useAuth } from "../context/AuthContext";
import { Box, Button, TextField, Typography, Stack, Paper, Divider } from "@mui/material";
import { GoogleLogin } from '@react-oauth/google';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const data = await loginUser(email, password);

    if (data.access_token) {
      login(data.access_token, data.user_id);
      navigate("/dashboard");
    } else {
      setError(data.message || "Login failed");
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
        <Typography variant="h5" mb={2}>Login</Typography>
        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
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
            <Button type="submit" variant="contained" fullWidth>
              Login
            </Button>
            <Button variant="text" fullWidth onClick={() => navigate("/register")}>
              Need an account? Register
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