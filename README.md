# Bank PDF to Excel Converter

A web application that converts bank statements from PDF format to Excel/CSV format. Built with React, TypeScript, and Node.js.

## Features

- Upload PDF bank statements
- Extract transactions automatically
- Convert to Excel or CSV format
- Preview transactions before download
- Clean and modern UI
- Support for multiple bank statement formats

## Tech Stack

- Frontend: React + TypeScript + Vite + TailwindCSS
- Backend: Node.js + Express + TypeScript
- PDF Processing: pdf-parse
- Excel Generation: xlsx

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   cd backend
   npm install
   ```
3. Start the development servers:
   ```bash
   # Start frontend
   npm run dev
   
   # Start backend
   cd backend
   npm run dev
   ```

## Environment Variables

Create a `.env` file in the backend directory with:
```
PORT=3000
```

## License

MIT
