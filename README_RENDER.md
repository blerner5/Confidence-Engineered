# Confidence, Engineered - Render Deployment Guide 🚀

This guide provides step-by-step instructions for deploying your application to Render using the provided Blueprint configuration (`render.yaml`).

Deploying to Render via Blueprints automatically configures:
1. **Managed PostgreSQL Database**: Stores user registration, sessions, and AI feedback.
2. **Flask Backend (Python)**: Handles API endpoints, OpenAI logic, and database operations.
3. **React/Vite Frontend (Static Site)**: The user interface.

---

## Phase 1: Prerequisites 📋

Before you deploy:
1. **GitHub Repository**: Make sure your codebase (including `render.yaml` at the root) is pushed to a GitHub repository.
2. **OpenAI API Key**: You will need a live OpenAI API key (`sk-proj-...`) for the interviewer features.
3. **Render Account**: Sign up for a free account at [Render](https://render.com/).

---

## Phase 2: Deploying via Blueprint 🛠️

Render Blueprints let you deploy all components of your application with a single configuration file.

1. Log in to the [Render Dashboard](https://dashboard.render.com/).
2. Click the **New +** button in the top right and select **Blueprint**.
3. Connect your GitHub repository containing this project.
4. Render will detect the `render.yaml` file automatically and prompt you for the following environment variables:
   - **`OPENAI_API_KEY`**: Paste your OpenAI API key.
   - **`GOOGLE_CLIENT_ID`**: (Optional) Paste your Google OAuth Client ID if you want Google login support.
   - **`FRONTEND_URL`**: Set this to:
     `https://confidence-engineered-frontend.onrender.com`
   - **`VITE_API_BASE_URL`**: Set this to:
     `https://confidence-engineered-backend.onrender.com`
5. Click **Apply**. Render will start provisioning the database, backend web service, and frontend static site.

---

## Phase 3: Dynamic URL Synchronization (If custom names are used) 🔗

Render automatically generates default URLs based on service names:
- Backend: `https://confidence-engineered-backend.onrender.com`
- Frontend: `https://confidence-engineered-frontend.onrender.com`

If Render modifies these names (e.g., adding suffixes due to name collisions like `-1234`), do the following:

### Step 1: Update the Frontend with the real Backend URL
1. Go to the **confidence-engineered-frontend** Static Site in your Render Dashboard.
2. Go to **Settings** -> **Environment Variables**.
3. Update the `VITE_API_BASE_URL` variable to match the real backend URL (e.g., `https://confidence-engineered-backend-xyz.onrender.com`).
4. **Important**: Scroll down and click **Save Changes**. Since Vite builds environment variables at compilation time, Render will automatically trigger a new deploy.

### Step 2: Update the Backend with the real Frontend URL
1. Go to the **confidence-engineered-backend** Web Service in your Render Dashboard.
2. Go to **Environment**.
3. Update `FRONTEND_URL` to match the real frontend URL (e.g., `https://confidence-engineered-frontend-xyz.onrender.com`).
4. Click **Save Changes**. The backend will automatically restart to apply the updated CORS configuration.

---

## 🎉 Verification and Testing

Once both services show a green **Live** status:
1. Open your frontend URL in the browser.
2. Create a test account or log in.
3. Start an interview session and answer questions to verify connection to the backend and OpenAI.
4. Verify that data persists properly by logging out, logging back in, and checking the analytics page.
