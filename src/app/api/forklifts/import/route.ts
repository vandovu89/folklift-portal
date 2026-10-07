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
    
    if (rawData.length === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }
    
    let imported = 0;
    let skipped = 0;

    // Cache các nguồn nhập hiện có (map cả tên viết tắt và tên đầy đủ)
    const sources = await prisma.purchaseSource.findMany();
    const sourceMap = new Map();
    sources.forEach(s => {
      sourceMap.set(s.abbreviation.toLowerCase().trim(), s);
      sourceMap.set(s.name.toLowerCase().trim(), s);
    });

    // Scan for header row dynamically
    let headerRowIdx = -1;
    let colMap = new Map<string, number>();

    for (let r = 0; r < Math.min(10, rawData.length); r++) {
      const row = rawData[r];
      if (!row) continue;
      const rowStr = row.map(c => String(c || '').toLowerCase()).join(' ');
      if (rowStr.includes('maker') || rowStr.includes('model') || rowStr.includes('mã nội bộ') || rowStr.includes('nguồn nhập')) {
        headerRowIdx = r;
        row.forEach((h: any, idx: number) => {
          if (h && typeof h === 'string') {
            colMap.set(h.trim().toLowerCase(), idx);
          }
        });
        break;
      }
    }

    const isDynamic = headerRowIdx !== -1 && (colMap.has('mã nội bộ') || colMap.has('maker') || colMap.has('model') || colMap.has('hãng (maker)') || colMap.has('nguồn nhập'));
    const startIdx = isDynamic ? headerRowIdx + 1 : 5;

    const getVal = (row: any[], possibleNames: string[]) => {
      if (isDynamic) {
        for (const name of possibleNames) {
          const idx = colMap.get(name.toLowerCase());
          if (idx !== undefined && row[idx] !== undefined) {
            return row[idx];
          }
        }
        return undefined;
      }
      return undefined;
    };

    for (let i = startIdx; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0) continue; // Skip empty rows

      let purchaseSourceAbbr = '';
      let statusRaw = '';
      let maker: any = '';
      let model: any = '';
      let internalCodeInput = '';
      let serialNo, year, hour, condition, powerType, category, forkLength, attachment, liftHeight, loadCapacity, weight, location, priceRaw, costPriceRaw, expensesRaw;

      if (isDynamic) {
        purchaseSourceAbbr = String(getVal(row, ['nguồn nhập', 'purchase source']) || '').trim();
        statusRaw = String(getVal(row, ['trạng thái', 'status']) || '').trim();
        maker = getVal(row, ['hãng (maker)', 'maker', 'hãng']);
        model = getVal(row, ['model']);
        internalCodeInput = String(getVal(row, ['mã nội bộ', 'internal code']) || '').trim();
        serialNo = getVal(row, ['số khung (serial)', 'serial no.', 'số khung', 'serial']);
        year = getVal(row, ['năm sx', 'năm sản xuất', 'year']);
        hour = getVal(row, ['giờ hoạt động', 'hour']);
        condition = getVal(row, ['tình trạng', 'tình trạng xe (bình ắc quy)', 'condition']);
        powerType = getVal(row, ['nhiên liệu', 'loại nhiên liệu', 'power type']);
        category = getVal(row, ['chủng loại', 'chủng loại xe', 'category']);
        forkLength = getVal(row, ['chiều dài càng', 'chiều dài càng nâng', 'fork length']);
        attachment = getVal(row, ['phụ kiện', 'attachment']);
        liftHeight = getVal(row, ['chiều cao nâng', 'chiều cao nâng tối đa', 'lift height']);
        loadCapacity = getVal(row, ['tải trọng', 'tải trọng nâng tối đa', 'load capacity']);
        weight = getVal(row, ['trọng lượng xe', 'trọng lượng', 'weight']);
        location = getVal(row, ['địa điểm', 'location']);
        priceRaw = getVal(row, ['giá bán', 'price']);
        costPriceRaw = getVal(row, ['giá vốn', 'giá nhập', 'cost price']);
        expensesRaw = getVal(row, ['chi phí phát sinh', 'expenses']);
      } else {
        // Tương thích ngược với file mẫu cũ không có header rõ ràng
        purchaseSourceAbbr = row[0] ? String(row[0]).trim() : '';
        statusRaw = row[1] ? String(row[1]).trim() : '';
        maker = row[2];
        model = row[3];
        serialNo = row[4];
        year = row[5];
        hour = row[6];
        condition = row[7];
        powerType = row[8];
        category = row[9];
        forkLength = row[10];
        attachment = row[11];
        liftHeight = row[12];
        loadCapacity = row[13];
        weight = row[14];
        location = row[15];
        priceRaw = row[16];
        costPriceRaw = row[17];
        expensesRaw = row[18];
      }

      if (!maker || !model) {
        skipped++;
        continue;
      }

      const validStatuses = ['Draft', 'Incoming', 'Available', 'Reserved', 'Sold', 'Unpacking', 'InJapan'];
      let finalStatus = 'Available'; 
      if (validStatuses.includes(statusRaw)) {
        finalStatus = statusRaw;
      }

      // Kiểm tra xe đã tồn tại theo mã nội bộ chưa
      let existingForklift = null;
      if (internalCodeInput) {
        existingForklift = await prisma.forklift.findFirst({
          where: { internalCode: internalCodeInput }
        });
      }

      let source = null;
      let sourceKey = '';
      if (purchaseSourceAbbr) {
        sourceKey = purchaseSourceAbbr.toLowerCase();
        source = sourceMap.get(sourceKey);
      }

      if (!existingForklift && !source) {
        return NextResponse.json({ error: `Nguồn nhập "${purchaseSourceAbbr}" ở dòng ${i + 1} không hợp lệ hoặc chưa được khai báo.` }, { status: 400 });
      }

      const costPrice = costPriceRaw ? parseFloat(String(costPriceRaw).replace(/[^0-9-]/g, '')) : null;
      const expensesStr = expensesRaw ? String(expensesRaw) : '';
      
      const parsedExpenses: { title: string; amount: number }[] = [];
      if (expensesStr) {
        const lines = expensesStr.split(/\r?\n/);
        for (const line of lines) {
          const colonIdx = line.indexOf(':');
          if (colonIdx > 0) {
            const title = line.substring(0, colonIdx).trim();
            const amountStr = line.substring(colonIdx + 1).trim();
            const amount = parseFloat(amountStr.replace(/[^0-9-]/g, ''));
            if (title && !isNaN(amount)) {
              parsedExpenses.push({ title, amount });
            }
          }
        }
      }

      const dataObj = {
        serialNo:     serialNo  ? String(serialNo)                                    : null,
        maker:        String(maker),
        model:        String(model),
        year:         year  ? parseInt(String(year).replace(/[^0-9]/g, ''))   : null,
        hour:         hour  ? parseInt(String(hour).replace(/[^0-9]/g, ''))   : null,
        condition:    condition  ? String(condition)                                    : null,
        powerType:    powerType  ? String(powerType)                                    : null,
        category:     category  ? String(category)                                    : null,
        forkLength:   forkLength ? String(forkLength)                                   : null,
        attachment:   attachment ? String(attachment)                                   : null,
        liftHeight:   liftHeight ? String(liftHeight)                                   : null,
        loadCapacity: loadCapacity ? String(loadCapacity)                                   : null,
        weight:       weight ? String(weight)                                   : null,
        location:     location ? String(location)                                   : null,
        price:        priceRaw ? parseFloat(String(priceRaw).replace(/[^0-9-]/g, '')) : null,
        status:       finalStatus,
        costPrice:    costPrice,
      };

      if (existingForklift) {
        // UPDATE (Ghi đè)
        await prisma.forklift.update({
          where: { id: existingForklift.id },
          data: {
            ...dataObj,
            purchaseSource: source ? source.name : existingForklift.purchaseSource,
            expenses: {
              deleteMany: {}, // Xóa chi phí cũ
              create: parsedExpenses.length > 0 ? parsedExpenses : undefined // Tạo mới
            }
          }
        });
        imported++;
      } else {
        // CREATE (Thêm mới)
        if (!source) {
          // Double check
          return NextResponse.json({ error: `Lỗi không tìm thấy nguồn nhập ở dòng ${i + 1}` }, { status: 400 });
        }

        const nextSeq = source.currentSeq + 1;
        // Nếu user truyền internalCodeInput mà không trùng, vẫn ưu tiên sinh mới để đảm bảo tính tuần tự
        const internalCode = `${source.abbreviation}-${nextSeq}`;
        
        source.currentSeq = nextSeq;
        sourceMap.set(sourceKey, source);
        await prisma.purchaseSource.update({
          where: { id: source.id },
          data: { currentSeq: nextSeq }
        });

        await prisma.forklift.create({
          data: {
            ...dataObj,
            purchaseSource: source.name,
            internalCode: internalCode,
            expenses: parsedExpenses.length > 0 ? { create: parsedExpenses } : undefined,
          }
        });
        imported++;
      }
    }
    
    return NextResponse.json({ success: true, imported, skipped }, { status: 200 });

  } catch (error: any) {
    console.error('Import Error:', error);
    return NextResponse.json({ error: 'Failed to import file' }, { status: 500 });
  }
}
