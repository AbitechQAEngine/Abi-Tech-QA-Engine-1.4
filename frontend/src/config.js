// Central place for the backend API base URL.
// Set REACT_APP_API_URL in Netlify/Vercel env vars (and in a local .env for dev).
// Falls back to localhost for local development.
export const API_BASE =
  (process.env.REACT_APP_API_URL || "http://localhost:8000/api").replace(/\/$/, "");
