# CampusFix Backend API

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the backend directory:
```
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_super_secret_jwt_key_here
NODE_ENV=development
```

3. Run the server:
```bash
npm run dev
```

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

