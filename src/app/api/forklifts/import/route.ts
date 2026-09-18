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

      // Col A (0) = Nguồn nhập
      // Col B (1) = Mã Nội Bộ
      // Col C (2) = NO (pic.#)
      // Col D (3) = MAKER
      // Col E (4) = MODEL
      // Col F (5) = SERI NO.
      // Col G (6) = NĂM SẢN XUẤT
      // Col H (7) = GIỜ HOẠT ĐỘNG
      // Col I (8) = TÌNH TRẠNG XE (BÌNH ẮC QUY)
      // Col J (9) = LOẠI NHIÊN LIỆU
      // Col K (10) = CHỦNG LOẠI XE
      // Col L (11) = CHIỀU DÀI CÀNG NÂNG
      // Col M (12) = PHỤ KIỆN
      // Col N (13) = CHIỀU CAO NÂNG TỐI ĐA
      // Col O (14) = TẢI TRỌNG NÂNG TỐI ĐA
      // Col P (15) = ĐỊA ĐIỂM
      // Col Q (16) = GIÁ BÁN
      // Col R (17) = GIÁ NHẬP
      // Col S (18) = CHI PHÍ PHÁT SINH

      const purchaseSource = row[0];
      const internalCode = row[1];
      const maker = row[3];
      const model = row[4];
      
      if (!maker || !model) {
        skipped++;
        continue;
      }

      const costPrice = row[17] ? parseFloat(String(row[17]).replace(/[^0-9.-]/g, '')) : null;
      const expensesRaw = row[18] ? String(row[18]) : '';
      
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
          purchaseSource: purchaseSource ? String(purchaseSource) : null,
          internalCode: internalCode ? String(internalCode) : null,
          serialNo:     row[5]  ? String(row[5])                                    : null,
          maker:        String(maker),
          model:        String(model),
          year:         row[6]  ? parseInt(String(row[6]).replace(/[^0-9]/g, ''))   : null,
          hour:         row[7]  ? parseInt(String(row[7]).replace(/[^0-9]/g, ''))   : null,
          condition:    row[8]  ? String(row[8])                                    : null,
          powerType:    row[9]  ? String(row[9])                                    : null,
          category:     row[10]  ? String(row[10])                                    : null,
          forkLength:   row[11] ? String(row[11])                                   : null,
          attachment:   row[12] ? String(row[12])                                   : null,
          liftHeight:   row[13] ? String(row[13])                                   : null,
          loadCapacity: row[14] ? String(row[14])                                   : null,
          location:     row[15] ? String(row[15])                                   : null,
          price:        row[16] ? parseFloat(String(row[16]).replace(/[^0-9.-]/g, '')) : null,
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
