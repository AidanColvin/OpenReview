import express, { Request, Response } from 'express';
import multer from 'multer';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import { parseFile } from './parser';

const app = express();
app.use(cors());

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const safeName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, `${Date.now()}-${safeName}`);
    }
});

const upload = multer({ storage });

app.post('/upload', upload.array('files'), async (req: Request, res: Response): Promise<void> => {
    const files = req.files as Express.Multer.File[];
    const results = [];

    if (!files || files.length === 0) {
        res.status(400).json({ error: 'No files uploaded' });
        return;
    }

    for (const file of files) {
        const titles = await parseFile(file.path);
        for (const title of titles) {
            results.push({
                title: title,
                filename: Buffer.from(file.originalname, 'latin1').toString('utf8')
            });
        }
    }

    res.json(results);
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
