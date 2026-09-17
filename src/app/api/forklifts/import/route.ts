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
    
    // Table header is at row 5 (index 4), data starts at row 6 (index 5)
    if (rawData.length <= 5) {
      return NextResponse.json({ error: 'File is empty or invalid format' }, { status: 400 });
    }
    
    let imported = 0;
    let skipped = 0;

    for (let i = 5; i < rawData.length; i++) {
      const row = rawData[i];

      // Col A (0) = blank
      // Col B (1) = NO (pic.#)
      // Col C (2) = MAKER
      // Col D (3) = MODEL
      // Col E (4) = SERI NO.
      // Col F (5) = NĂM SẢN XUẤT
      // Col G (6) = GIỜ HOẠT ĐỘNG
      // Col H (7) = TÌNH TRẠNG XE (BÌNH ẮC QUY)
      // Col I (8) = LOẠI NHIÊN LIỆU
      // Col J (9) = CHỦNG LOẠI XE
      // Col K (10) = CHIỀU DÀI CÀNG NÂNG
      // Col L (11) = PHỤ KIỆN
      // Col M (12) = CHIỀU CAO NÂNG TỐI ĐA
      // Col N (13) = TẢI TRỌNG NÂNG TỐI ĐA
      // Col O (14) = ĐỊA ĐIỂM
      // Col P (15) = GIÁ BÁN
      // Col Q (16) = GIÁ NHẬP
      // Col R (17) = CHI PHÍ PHÁT SINH

      const maker = row[2];
      const model = row[3];
      
      if (!maker || !model) {
        skipped++;
        continue;
      }

      const costPrice = row[16] ? parseFloat(String(row[16]).replace(/[^0-9.-]/g, '')) : null;
      const expensesRaw = row[17] ? String(row[17]) : '';
      
      const parsedExpenses: { title: string; amount: number }[] = [];
      if (expensesRaw) {
        const lines = expensesRaw.split(/\r?\n/);
        for (const line of lines) {
          const colonIdx = line.indexOf(':');
          if (colonIdx > 0) {
            const title = line.substring(0, colonIdx).trim();
            const amountStr = line.substring(colonIdx + 1).trim();
            const amount = parseFloat(amountStr.replace(/[^0-9.-]/g, ''));
            if (title && !isNaN(amount)) {
              parsedExpenses.push({ title, amount });
            }
          }
        }
      }

      await prisma.forklift.create({
        data: {
          serialNo:     row[4]  ? String(row[4])                                    : null,
          maker:        String(maker),
          model:        String(model),
          year:         row[5]  ? parseInt(String(row[5]).replace(/[^0-9]/g, ''))   : null,
          hour:         row[6]  ? parseInt(String(row[6]).replace(/[^0-9]/g, ''))   : null,
          condition:    row[7]  ? String(row[7])                                    : null,
          powerType:    row[8]  ? String(row[8])                                    : null,
          category:     row[9]  ? String(row[9])                                    : null,
          forkLength:   row[10] ? String(row[10])                                   : null,
          attachment:   row[11] ? String(row[11])                                   : null,
          liftHeight:   row[12] ? String(row[12])                                   : null,
          loadCapacity: row[13] ? String(row[13])                                   : null,
          location:     row[14] ? String(row[14])                                   : null,
          price:        row[15] ? parseFloat(String(row[15]).replace(/[^0-9.-]/g, '')) : null,
          status:       'Published',
          costPrice:    costPrice,
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
