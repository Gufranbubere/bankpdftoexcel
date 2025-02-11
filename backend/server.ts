import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import { processFile } from './pdfProcessor';
import { ConversionResponse } from './types';

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use('/downloads', express.static('downloads'));

app.post<{}, ConversionResponse>('/convert', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    const outputFormat = req.body.format as 'xlsx' | 'csv';
    const result = await processFile(req.file.path, outputFormat);
    
    // Generate download URL
    const downloadUrl = `http://localhost:3001/downloads/${result.filename}`;
    
    res.json({
      success: true,
      message: 'File converted successfully',
      downloadUrl
    });
  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Error processing file'
    });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 