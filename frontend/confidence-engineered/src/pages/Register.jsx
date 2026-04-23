import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../api/authApi";
import { Box, Button, TextField, Typography, Stack, Paper } from "@mui/material";

export default function Register() {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

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
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}