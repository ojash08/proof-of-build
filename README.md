# Proof of Build 

**Proof of Build** is a platform for developers to verify their skills, showcase their projects, and earn trust in the community. It acts as a sci-fi terminal-themed dashboard where verified developers can submit repositories, build their skill tree, and share their public profile.


## 🛠️ Tech Stack

This project is built with a modern, robust, and type-safe stack:

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS 4, Radix UI, Framer Motion
- **Backend**: Node.js, Express, tRPC (for end-to-end type safety)
- **Database**: Drizzle ORM, MySQL
- **Styling**: Custom CSS, Glassmorphism effects, Next Themes (Dark/Light mode)

## ✨ Features

- **Sci-Fi Dashboard**: A retro, pixel-art styled terminal interface for developers.
- **Repository Verification**: Submit your GitHub repos and earn scores based on code quality and complexity.
- **Skill Tree & Badges**: Unlock skills and earn badges based on your verified builds.
- **Dark Mode**: Fully supports a sleek, eye-friendly dark mode.
- **Public Profile**: Share your "Proof of Build" with the world via a glassmorphism-styled public URL.

## 🚀 How to Use

### 1. Installation

First, clone the repository and install the dependencies using your package manager of choice (pnpm is recommended):

```bash
git clone https://github.com/ojash08/proof-of-build.git
cd proof-of-build
pnpm install
```

### 2. Environment Variables

Create a `.env` file in the root directory and configure your database and authentication variables.

```env
DATABASE_URL="mysql://username:password@host:port/database"
```

### 3. Database Setup

Push the schema to your database to make sure your tables are created:

```bash
pnpm db:push
```

### 4. Running the Development Server

Start both the frontend and backend in development mode:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

## 📸 Screenshots

### The Dashboard
Submit your repositories, track your daily quests, and level up your developer profile.

![Dashboard Screenshot](client/public/pixel-bg.png)

*(You can replace the image path above with actual screenshots of your dashboard and public profile!)*

## 💻 Code Snippets

Here's a quick example of how the repository submission interacts with the backend using tRPC:

```typescript
// client/src/pages/Dashboard.tsx
const submitRepoMutation = trpc.builds.submitRepository.useMutation();

const handleSubmit = async (repoUrl: string) => {
  try {
    await submitRepoMutation.mutateAsync({ repoUrl });
    toast.success("Repository submitted for verification!");
  } catch (error) {
    toast.error("Failed to submit repository");
  }
};
```
