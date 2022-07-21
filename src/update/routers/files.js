const router = require('express').Router();
const path = require('path');
const multer = require('multer');
const joi = require('joi');

const uploadDir = path.resolve(__dirname, '..', 'out', 'upload');

const storage = multer.diskStorage(
  {
    destination: uploadDir,
    filename: (req, file, cb) => {
      cb(null, file.originalname);
    },
  },
);

const upload = multer({ storage });

router.get('/files', async (req, res, next) => {
  // TODO return list of file
});

router.post('/files', upload.single('file'), async (req, res, next) => {
  if (!req?.file) return next('No file are send');
  return res.status(200).json({ message: 'file added' });
});

router.delete('/files/:file', async (req, res, next) => {
  // TODO delete file
});

module.exports = router;
