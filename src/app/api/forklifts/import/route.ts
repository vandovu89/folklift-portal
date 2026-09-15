import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    
    if (rawData.length <= 4) {
      return NextResponse.json({ error: 'File is empty or invalid format' }, { status: 400 });
    }
    
    let imported = 0;
    let skipped = 0;

    const parseExcelDate = (excelDate: any) => {
      if (!excelDate) return null;
      if (typeof excelDate === 'number') {
         return new Date((excelDate - 25569) * 86400 * 1000);
      }
      return null;
    };
    
    for (let i = 4; i < rawData.length; i++) {
      const row = rawData[i];
      const maker = row[1];
      const model = row[2];
      
      if (!maker || !model) continue;

      const costPrice = row[16] ? parseFloat(String(row[16]).replace(/,/g, '')) : null;
      const expensesRaw = row[17] ? String(row[17]) : "";
      
      const parsedExpenses = [];
      if (expensesRaw) {
        const lines = expensesRaw.split(/\r?\n/);
        for (const line of lines) {
          const parts = line.split(':');
          if (parts.length >= 2) {
            const title = parts[0].trim();
            const amountStr = parts.slice(1).join(':').trim();
            const amount = parseFloat(amountStr.replace(/,/g, ''));
            if (title && !isNaN(amount)) {
              parsedExpenses.push({
                title,
                amount
              });
            }
          }
        }
      }

      await prisma.forklift.create({
        data: {
          maker: String(maker),
          model: String(model),
          year: row[3] ? parseInt(String(row[3])) : null,
          hour: row[4] ? parseInt(String(row[4])) : null,
          engineCondition: row[5] ? String(row[5]) : null,
          condition: row[6] ? String(row[6]) : null,
          powerType: row[7] ? String(row[7]) : null,
          category: row[8] ? String(row[8]) : null,
          mast: row[9] ? String(row[9]) : null,
          attachment: row[10] ? String(row[10]) : null,
          liftHeight: row[11] ? String(row[11]) : null,
          loadCapacity: row[12] ? String(row[12]) : null,
          location: row[13] ? String(row[13]) : null,
          price: row[14] ? parseFloat(String(row[14])) : null,
          sourceUrl: row[15] ? String(row[15]) : null,
          offerDeadline: parseExcelDate(row[18]),
          status: 'Published',
          costPrice: costPrice,
          expenses: parsedExpenses.length > 0 ? {
            create: parsedExpenses
          } : undefined,
        }
      });
      imported++;
    }
    
    return NextResponse.json({ success: true, imported, skipped }, { status: 200 });

  } catch (error: any) {
    console.error('Import Error:', error);
    return NextResponse.json({ error: 'Failed to import file' }, { status: 500 });
  }
}
