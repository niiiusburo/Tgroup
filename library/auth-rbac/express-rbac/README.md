# Role-Based Access Control (RBAC) System 💻
## Overview 🎥
This project implements a Role-Based Access Control (RBAC) system using Express.js, TypeORM, and RDS (Relational Database Service). The system is designed to manage users, roles, and permissions with a focus on providing secure and controlled access to resources.

## Prerequisites 📌
Node.js (version 14.x or later)
npm (Node Package Manager)
RDS (Relational Database Service) connection details
Secret key for JWT (JSON Web Token) generation



## Structure ⚙️
config.js: Configuration file for RDS connection and other environment-specific settings.
db/dataSource.js: Database initialization and connection setup.
routes/user.js: User-related routes.
routes/permission.js: Permission-related routes.
routes/role.js: Role-related routes.
middlewares/auth/authenticate.js: Authentication middleware for protecting routes.


## API Endpoints 🔥
* /user: User management routes (protected by authentication).
* /permission: Permission management routes (protected by authentication).
* /role: Role management routes (protected by authentication).

## User Functions 👩🏻‍💻
* login: Authenticate a user and generate a JWT token.
* createUser: Create a new user with associated profile and roles.
* getUser: Retrieve a user with roles and permissions.
* getUsers: Retrieve a paginated list of users based on the requesting user's permissions.
* editUser: Add a role to a user (requires appropriate permissions).
* deleteUser: Delete a user (requires appropriate permissions).

## Notes 📝
The application uses JWT for user authentication and authorization.
Role-based access control ensures that users have the necessary permissions for certain operations.
The system includes error handling and returns meaningful messages for different scenarios.
Feel free to explore and extend the functionality of the RBAC system based on your specific requirements. If you have any questions or encounter issues, please refer to the documentation or contact the project maintainers.

Happy coding!

![role](https://github.com/SarahAbuirmeileh/Express-RBAC/assets/127017088/8703c2e3-0666-4960-9e44-5909b5e71b2e)

<br><br>

![permission](https://github.com/SarahAbuirmeileh/Express-RBAC/assets/127017088/60dada22-f323-4968-ac17-f7f4dfbdec6b)
