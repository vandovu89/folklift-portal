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
      const maker = row[2];
      const model = row[3];
      
      if (!maker || !model) continue;

      const stockNo = row[17] ? String(row[17]) : (row[1] ? String(row[1]) : null);
      
      if (stockNo) {
        const existing = await prisma.forklift.findFirst({
          where: { stockNo: stockNo }
        });
        if (existing) {
          skipped++;
          continue; // Bỏ qua xe trùng lặp
        }
      }

      await prisma.forklift.create({
        data: {
          internalCode: stockNo,
          stockNo: stockNo,
          maker: String(maker),
          model: String(model),
          year: row[4] ? parseInt(String(row[4])) : null,
          hour: row[5] ? parseInt(String(row[5])) : null,
          engineCondition: row[6] ? String(row[6]) : null,
          condition: row[7] ? String(row[7]) : null,
          powerType: row[8] ? String(row[8]) : null,
          category: row[9] ? String(row[9]) : null,
          mast: row[10] ? String(row[10]) : null,
          attachment: row[11] ? String(row[11]) : null,
          liftHeight: row[12] ? String(row[12]) : null,
          loadCapacity: row[13] ? String(row[13]) : null,
          location: row[14] ? String(row[14]) : null,
          price: row[15] ? parseFloat(String(row[15])) : null,
          sourceUrl: row[18] ? String(row[18]) : null,
          offerDeadline: parseExcelDate(row[19]),
          status: 'Published',
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
