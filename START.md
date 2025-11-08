# Quick Start Guide

## Starting the Backend Server

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies (if not already done):**
   ```bash
   npm install
   ```

3. **Create .env file (if not exists):**
   - Copy `env.example` to `.env` or create `.env` with your MongoDB connection string
   - Your `.env` should contain:
     ```
     PORT=5000
     MONGODB_URI=your_mongodb_atlas_connection_string
     JWT_SECRET=your_jwt_secret
     NODE_ENV=development
     ```

4. **Start the backend server:**
   ```bash
   npm run dev
   ```
   
   The backend will run on `http://localhost:5000`

## Starting the Frontend Server

1. **Open a NEW terminal window** (keep backend running in the first terminal)

2. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

3. **Install dependencies (if not already done):**
   ```bash
   npm install
   ```

4. **Create .env file:**
   - Create a `.env` file in the frontend directory with:
     ```
     VITE_API_URL=http://localhost:5000/api
     ```

5. **Start the frontend server:**
   ```bash
   npm run dev
   ```
   
   The frontend will run on `http://localhost:3000`

## Access the Application

- **Frontend:** Open your browser and go to `http://localhost:3000`
- **Backend API:** Available at `http://localhost:5000/api`

## Notes

- Keep both terminals open - one for backend, one for frontend
- The backend must be running for the frontend to work properly
- Make sure MongoDB Atlas is accessible and your connection string is correct

