# CampusFix - Campus Reporting System

A full-stack MERN web application for reporting and tracking maintenance and safety issues on campus.

## Features

- **User Authentication**: JWT-based authentication with role-based access control
- **Three User Roles**: Student, Staff, and Admin with different permissions
- **Complaint Management**: Create, view, update, and track complaints
- **Image Upload**: Upload up to 5 images per complaint using Multer
- **Status Tracking**: Track complaint status (pending, assigned, in-progress, resolved, closed)
- **Admin Dashboard**: Analytics and statistics with charts
- **Staff Assignment**: Admins can assign complaints to staff members
- **Responsive Design**: Modern UI built with React and Tailwind CSS

## Tech Stack

### Backend
- Node.js + Express
- MongoDB Atlas
- JWT Authentication
- Bcrypt for password hashing
- Multer for file uploads
- Express Validator

### Frontend
- React 18
- React Router DOM
- Tailwind CSS
- Axios
- Recharts for analytics
- React Hot Toast for notifications

## Project Structure

```
campusfix/
├── backend/
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── middleware/      # Auth and upload middleware
│   ├── utils/           # Utility functions
│   └── server.js        # Express server
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── context/     # React context (Auth)
│   │   ├── pages/       # Page components
│   │   └── App.jsx      # Main app component
│   └── package.json
└── README.md
```

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_super_secret_jwt_key_here
NODE_ENV=development
```

4. Run the server:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```
VITE_API_URL=http://localhost:5000/api
```

4. Run the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Complaints
- `GET /api/complaints` - Get all complaints (with filters)
- `GET /api/complaints/:id` - Get single complaint
- `POST /api/complaints` - Create complaint
- `PUT /api/complaints/:id` - Update complaint
- `DELETE /api/complaints/:id` - Delete complaint
- `PUT /api/complaints/:id/assign` - Assign complaint to staff
- `PUT /api/complaints/:id/resolve` - Resolve complaint
- `GET /api/complaints/stats/overview` - Get statistics (Admin only)

### Users
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/staff` - Get all staff (Admin only)
- `GET /api/users/:id` - Get single user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (Admin only)

## Deployment

### Backend (Render)

1. Push your code to GitHub
2. Connect your repository to Render
3. Create a new Web Service
4. Set the following:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment Variables:
     - `MONGODB_URI`: Your MongoDB Atlas connection string
     - `JWT_SECRET`: Your JWT secret key
     - `NODE_ENV`: `production`
     - `PORT`: `5000` (or let Render assign it)

### Frontend (Vercel)

1. Push your code to GitHub
2. Import your repository to Vercel
3. Set the root directory to `frontend`
4. Add environment variable:
   - `VITE_API_URL`: Your Render backend URL (e.g., `https://your-backend.onrender.com/api`)
5. Deploy

## User Roles

### Student
- Register and login
- Create complaints
- View own complaints
- Update own complaints (limited fields)

### Staff
- All student permissions
- View assigned complaints
- Update assigned complaints
- Mark complaints as in-progress
- Resolve complaints

### Admin
- All permissions
- View all complaints
- Assign complaints to staff
- View analytics and statistics
- Manage users

## License

ISC

