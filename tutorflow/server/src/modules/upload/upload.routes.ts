import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { requireAuth } from '../../middleware/auth';

export const uploadRouter = Router();

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Save files to the uploads directory we created in the root of server
    cb(null, path.join(__dirname, '../../../uploads'));
  },
  filename: (req, file, cb) => {
    // Generate a unique filename using timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// POST /api/upload
uploadRouter.post('/', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  // Construct the URL to access the uploaded file
  // Using the host from the request and the file filename
  const host = req.get('host');
  const protocol = req.protocol;
  const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

  res.json({ url: fileUrl });
});
