# Enterprise CRM Demo Application

A modern, containerized Full-Stack CRM (Customer Relationship Management) application built with a decoupled architecture utilizing Vue.js 3 on the frontend and Express.js on the backend, backed by a robust PostgreSQL relational database.

This project showcases production-ready development practices, including multi-service orchestration via Docker, automated database seeding, secure JWT authentication, and automated environment provisioning.

## 🚀 Key Architectural Features

- 🔐 **Secure JWT Authentication** – Complete user authentication flow utilizing JSON Web Tokens for secure stateless session management and API endpoint protection.
- 👥 **Advanced Client Management** – Full CRUD functionality for managing enterprise client profiles with optimized query performance.
- 📝 **Contextual Client Logs** – Seamless relational mapping allowing dynamic creation, reading, and management of individual notes per client.
- 📊 **Dynamic Statistics Dashboard** – A real-time data aggregation dashboard showing high-level metrics for total clients, active entries, and operational notes.
- 🐳 **Dockerized Multi-Service Mesh** – Fully containerized local environment isolating the Frontend, Backend, and Database into high-performance virtual networks.
- 🛠️ **Automated Local DX** – Custom shell tooling provided to bypass manual environment variables setup, database migrations, and container initialization.

## 🛠️ Technology Stack

- **Frontend Core:** Vue.js 3 (Composition API), Vite (Next-Generation Frontend Tooling), Tailwind CSS (Utility-first styling), Axios (HTTP Client)
- **Backend Core:** Node.js, Express.js, CORS middleware, JWT Authentication
- **Database Engine:** PostgreSQL (Relational Database Management System)
- **DevOps & Containerization:** Docker, Docker Compose, Automated Bash Tooling

---

## 📦 Getting Started & Local Provisioning

Prerequisites: Ensure you have `git`, `docker`, and `docker-compose` installed on your machine.

### 🐳 Quick Deployment via Automated Shell Scripts

To ensure a seamless setup, the repository includes shell automation scripts to handle installation, permissions, database seeding, and service orchestration out of the box.

```bash
# 1. Clone the repository
git clone git@github.com:DenisSeko/crm-basic-app.git

# 2. Navigate to the project directory
cd crm-basic-app

# 3. Grant execution permissions to the core automation scripts
chmod +x setup.sh start.sh stop.sh

# 4. Initialize environment configuration and seed the PostgreSQL database
./setup.sh

# 5. Spin up the entire multi-container application mesh
./start.sh
