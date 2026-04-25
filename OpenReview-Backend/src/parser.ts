import * as fs from 'fs';
import * as path from 'path';
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import * as xlsx from 'xlsx';
import AdmZip from 'adm-zip';

export async function parseFile(filePath: string): Promise<string[]> {
    const ext = path.extname(filePath).toLowerCase();
    const baseName = path.basename(filePath);

    try {
        if (ext === '.pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdfParse(dataBuffer);
            const titleMatch = data.text.split('\n').find(line => line.trim().length > 0);
            return [titleMatch || baseName];
        }
        if (ext === '.docx') {
            const result = await mammoth.extractRawText({ path: filePath });
            const titleMatch = result.value.split('\n').find(line => line.trim().length > 0);
            return [titleMatch || baseName];
        }
        if (ext === '.csv' || ext === '.xlsx' || ext === '.xls') {
            const workbook = xlsx.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const sheet = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
            return Object.keys(sheet[0] || {}).length > 0 ? Object.keys(sheet[0] as object) : [baseName];
        }
        if (ext === '.zip') {
            const zip = new AdmZip(filePath);
            return zip.getEntries().map(entry => entry.name);
        }
        
        return [baseName];
    } catch (error) {
        return [baseName];
    }
}
