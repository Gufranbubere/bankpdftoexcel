import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import dotenv from 'dotenv';
import { processFile } from './pdfProcessor';

// Load environment variables
dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3001;

// Initialize directories
const initializeDirectories = async () => {
  try {
    const uploadDir = path.join(__dirname, '../uploads');
    const downloadDir = path.join(__dirname, '../downloads');

    // Ensure directories exist
    await fs.ensureDir(uploadDir);
    await fs.ensureDir(downloadDir);

    // Clean up old files
    await fs.emptyDir(uploadDir);
    await fs.emptyDir(downloadDir);

    console.log('Directories initialized successfully:', {
      uploadDir,
      downloadDir
    });
  } catch (error) {
    console.error('Directory initialization failed:', error);
    throw error;
  }
};

// Configure CORS
app.use(cors({
  origin: ['http://localhost:3013', 'http://localhost:3012', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Disposition', 'Content-Type']
}));

// Enable pre-flight requests for all routes
app.options('*', cors());

// Basic logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const uploadDir = path.join(__dirname, '../uploads');
      await fs.ensureDir(uploadDir);
      console.log('Upload directory ready:', uploadDir);
      cb(null, uploadDir);
    } catch (error) {
      console.error('Error preparing upload directory:', error);
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const filename = `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`;
    console.log('Generated filename:', filename);
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    console.log('Received file:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only PDF files are allowed`));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Serve static files from the downloads directory
app.use('/downloads', express.static(path.join(__dirname, '../downloads')));

// Preview endpoint
app.post('/preview', upload.single('file'), async (req, res) => {
  console.log('Received preview request:', {
    body: req.body,
    file: req.file
  });

  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No file uploaded'
    });
  }

  try {
    const format = (req.body.format || 'xlsx') as 'xlsx' | 'csv';
    const result = await processFile(req.file.path, format);
    
    // Return both the preview data and the download URL
    res.json({
      success: true,
      data: result.data,
      downloadUrl: `/downloads/${result.fileName}`
    });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

// Convert endpoint (now just processes the file without preview)
app.post('/convert', upload.single('file'), async (req, res) => {
  console.log('Received conversion request:', {
    body: req.body,
    file: req.file
  });

  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No file uploaded'
    });
  }

  try {
    const format = req.body.format || 'xlsx';
    const result = await processFile(req.file.path, format);
    res.json({
      success: true,
      downloadUrl: `/downloads/${result.fileName}`
    });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    code: err.code
  });
  
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Start server function
const startServer = async () => {
  try {
    await initializeDirectories();
    
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`Server is running at http://localhost:${port}`);
      console.log('Upload directory:', path.join(__dirname, '../uploads'));
      console.log('Download directory:', path.join(__dirname, '../downloads'));
    });

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Please try a different port or kill the process using this port.`);
        process.exit(1);
      } else {
        console.error('Server error:', error);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer().catch(error => {
  console.error('Server startup failed:', error);
  process.exit(1);
}); 