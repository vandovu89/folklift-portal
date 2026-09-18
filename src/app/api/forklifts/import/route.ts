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
    
    if (rawData.length <= 5) {
      return NextResponse.json({ error: 'File is empty or invalid format' }, { status: 400 });
    }
    
    let imported = 0;
    let skipped = 0;

    // Cache các nguồn nhập hiện có
    const sources = await prisma.purchaseSource.findMany();
    const sourceMap = new Map();
    sources.forEach(s => {
      sourceMap.set(s.name.toLowerCase().trim(), s);
    });

    for (let i = 5; i < rawData.length; i++) {
      const row = rawData[i];

      // Col A (0) = NGUỒN NHẬP
      // Col B (1) = MAKER
      // Col C (2) = MODEL
      // Col D (3) = SERI NO.
      // Col E (4) = NĂM SẢN XUẤT
      // Col F (5) = GIỜ HOẠT ĐỘNG
      // Col G (6) = TÌNH TRẠNG XE (BÌNH ẮC QUY)
      // Col H (7) = LOẠI NHIÊN LIỆU
      // Col I (8) = CHỦNG LOẠI XE
      // Col J (9) = CHIỀU DÀI CÀNG NÂNG
      // Col K (10) = PHỤ KIỆN
      // Col L (11) = CHIỀU CAO NÂNG TỐI ĐA
      // Col M (12) = TẢI TRỌNG NÂNG TỐI ĐA
      // Col N (13) = ĐỊA ĐIỂM
      // Col O (14) = GIÁ BÁN
      // Col P (15) = GIÁ NHẬP
      // Col Q (16) = CHI PHÍ PHÁT SINH

      const purchaseSourceRaw = row[0] ? String(row[0]).trim() : '';
      const maker = row[1];
      const model = row[2];
      
      if (!maker || !model || !purchaseSourceRaw) {
        skipped++;
        continue;
      }

      const sourceKey = purchaseSourceRaw.toLowerCase();
      const source = sourceMap.get(sourceKey);

      if (!source) {
        // Nguồn nhập chưa có trong bảng PurchaseSource -> Lỗi, bỏ qua (như user chọn cách 1)
        return NextResponse.json({ error: `Nguồn nhập "${purchaseSourceRaw}" ở dòng ${i + 1} chưa được khai báo mã viết tắt. Vui lòng vào Cài đặt Nguồn Nhập để thêm.` }, { status: 400 });
      }

      // Generate mã nội bộ
      const nextSeq = source.currentSeq + 1;
      const internalCode = `${source.abbreviation}-${nextSeq}`;
      
      // Update memory & DB cho seq
      source.currentSeq = nextSeq;
      sourceMap.set(sourceKey, source);
      await prisma.purchaseSource.update({
        where: { id: source.id },
        data: { currentSeq: nextSeq }
      });

      const costPrice = row[15] ? parseFloat(String(row[15]).replace(/[^0-9.-]/g, '')) : null;
      const expensesRaw = row[16] ? String(row[16]) : '';
      
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
          purchaseSource: purchaseSourceRaw,
          internalCode: internalCode,
          serialNo:     row[3]  ? String(row[3])                                    : null,
          maker:        String(maker),
          model:        String(model),
          year:         row[4]  ? parseInt(String(row[4]).replace(/[^0-9]/g, ''))   : null,
          hour:         row[5]  ? parseInt(String(row[5]).replace(/[^0-9]/g, ''))   : null,
          condition:    row[6]  ? String(row[6])                                    : null,
          powerType:    row[7]  ? String(row[7])                                    : null,
          category:     row[8]  ? String(row[8])                                    : null,
          forkLength:   row[9] ? String(row[9])                                   : null,
          attachment:   row[10] ? String(row[10])                                   : null,
          liftHeight:   row[11] ? String(row[11])                                   : null,
          loadCapacity: row[12] ? String(row[12])                                   : null,
          location:     row[13] ? String(row[13])                                   : null,
          price:        row[14] ? parseFloat(String(row[14]).replace(/[^0-9.-]/g, '')) : null,
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
