import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { getStaffUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { role } = await getStaffUser(request);
    if (role !== 'ADMIN') return NextResponse.json({ error: 'Chỉ Admin được nhập Excel' }, { status: 403 });

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

    // Chuẩn hóa tên cột (bỏ khoảng trắng thừa, chuẩn hóa dấu ngoặc)
    const normalizeHeader = (s: string) => {
      return String(s || '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\s*\(\s*/g, '(')
        .replace(/\s*\)\s*/g, ')');
    };

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
            colMap.set(normalizeHeader(h), idx);
          }
        });
        break;
      }
    }

    const isDynamic = headerRowIdx !== -1 && (
      colMap.has('mã nội bộ') || 
      colMap.has('maker') || 
      colMap.has('model') || 
      colMap.has('hãng (maker)') || 
      colMap.has('hãng(maker)') || 
      colMap.has('nguồn nhập')
    );
    const startIdx = isDynamic ? headerRowIdx + 1 : 5;

    const getVal = (row: any[], possibleNames: string[]) => {
      if (isDynamic) {
        for (const name of possibleNames) {
          const norm = normalizeHeader(name);
          let idx = colMap.get(norm);
          if (idx === undefined) {
            idx = colMap.get(name.toLowerCase().trim());
          }
          if (idx !== undefined && row[idx] !== undefined && row[idx] !== '') {
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
        purchaseSourceAbbr = String(getVal(row, ['nguồn nhập', 'purchase source', 'nguồn', 'nguon nhap']) || '').trim();
        statusRaw = String(getVal(row, ['trạng thái', 'status', 'tình trạng kho']) || '').trim();
        maker = getVal(row, ['hãng (maker)', 'maker', 'hãng', 'nhà sản xuất', 'brand']);
        model = getVal(row, ['model', 'mã model', 'model xe']);
        internalCodeInput = String(getVal(row, ['mã nội bộ', 'internal code', 'mã xe', 'code']) || '').trim();
        serialNo = getVal(row, [
          'seri no.', 'seri no', 'seri', 'số seri', 'số serie', 'serie no.', 'serie no', 'serie',
          'số khung (serial)', 'số khung (seri)', 'số khung / seri', 'số khung/seri', 'số khung',
          'serial no.', 'serial no', 'serial number', 'serial',
          'chassis no.', 'chassis no', 'chassis', 'vin'
        ]);
        // Fallback: Nếu không tìm thấy theo tên cột, thử lấy theo index vị trí truyền thống (cột 4 nếu file không chèn cột mã nội bộ)
        if (!serialNo && !colMap.has('mã nội bộ') && row[4]) {
          serialNo = row[4];
        }
        year = getVal(row, ['năm sx', 'năm sản xuất', 'year', 'năm']);
        hour = getVal(row, ['giờ hoạt động', 'hour', 'hours', 'số giờ', 'giờ']);
        condition = getVal(row, ['tình trạng', 'tình trạng xe (bình ắc quy)', 'tình trạng xe', 'tình trạng ắc quy', 'tình trạng ac quy', 'condition']);
        powerType = getVal(row, ['nhiên liệu', 'loại nhiên liệu', 'power type', 'động cơ']);
        category = getVal(row, ['chủng loại', 'chủng loại xe', 'category', 'kiểu xe', 'loại xe']);
        forkLength = getVal(row, ['chiều dài càng', 'chiều dài càng nâng', 'fork length', 'càng nâng']);
        attachment = getVal(row, ['phụ kiện', 'attachment', 'option', 'bộ công tác']);
        liftHeight = getVal(row, ['chiều cao nâng', 'chiều cao nâng tối đa', 'lift height', 'chiều cao']);
        loadCapacity = getVal(row, ['tải trọng', 'tải trọng nâng tối đa', 'load capacity', 'tải trọng nâng']);
        weight = getVal(row, ['trọng lượng xe', 'trọng lượng', 'weight', 'khối lượng']);
        location = getVal(row, ['địa điểm', 'location', 'kho', 'vị trí']);
        priceRaw = getVal(row, ['giá bán', 'price', 'giá']);
        costPriceRaw = getVal(row, ['giá vốn', 'giá nhập', 'cost price', 'giá mua']);
        expensesRaw = getVal(row, ['chi phí phát sinh', 'expenses', 'chi phí']);
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

      let source = null;
      let sourceKey = '';
      if (purchaseSourceAbbr) {
        sourceKey = purchaseSourceAbbr.toLowerCase().trim();
        source = sourceMap.get(sourceKey);
      }

      // Safeguard: Nếu người dùng gõ mã viết tắt nguồn nhập (VD: TU, YS, MCK, NK) vào cột Mã nội bộ
      if (internalCodeInput && !internalCodeInput.includes('-') && sourceMap.has(internalCodeInput.toLowerCase())) {
        if (!source) {
          source = sourceMap.get(internalCodeInput.toLowerCase());
          sourceKey = internalCodeInput.toLowerCase();
        }
        // Xóa internalCodeInput để hệ thống tự động sinh số thứ tự (TU-x, YS-x...), tránh các dòng ghi đè lẫn nhau
        internalCodeInput = '';
      }

      // Kiểm tra xe đã tồn tại theo mã nội bộ chưa
      let existingForklift = null;
      if (internalCodeInput) {
        existingForklift = await prisma.forklift.findFirst({
          where: { internalCode: internalCodeInput }
        });
      }

      // Nếu không có mã nội bộ nhưng có số seri (serialNo), kiểm tra theo số seri để tránh tạo xe trùng lặp
      if (!existingForklift && serialNo) {
        const cleanSerial = String(serialNo).trim();
        if (cleanSerial) {
          existingForklift = await prisma.forklift.findFirst({
            where: { serialNo: cleanSerial }
          });
        }
      }

      // Fallback 1: Trích xuất nguồn nhập từ tiền tố của Mã nội bộ (VD: TU-11 -> TU, MCK-3 -> MCK)
      if (!source && internalCodeInput && internalCodeInput.includes('-')) {
        const prefix = internalCodeInput.split('-')[0].trim().toLowerCase();
        if (sourceMap.has(prefix)) {
          source = sourceMap.get(prefix);
          sourceKey = prefix;
        }
      }

      // Fallback 2: Nếu xe đã tồn tại thì lấy lại nguồn nhập cũ của xe
      if (!source && existingForklift && existingForklift.purchaseSource) {
        const oldKey = existingForklift.purchaseSource.toLowerCase().trim();
        source = sourceMap.get(oldKey) || (sources.length > 0 ? sources[0] : null);
      }

      // Fallback 3: Nếu là xe mới và file Excel không có cột nguồn nhập, gán nguồn đầu tiên trong hệ thống
      if (!source && sources.length > 0) {
        source = sources[0];
        sourceKey = source.abbreviation.toLowerCase();
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
        serialNo:     serialNo  ? String(serialNo).trim()                             : null,
        maker:        String(maker),
        model:        String(model),
        year:         year  ? parseInt(String(year).replace(/[^0-9]/g, ''))   : null,
        hour:         hour !== undefined && hour !== null && hour !== '' ? parseInt(String(hour).replace(/[^0-9]/g, ''))   : null,
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
        // UPDATE (Ghi đè - bảo toàn các trường nếu file để trống)
        await prisma.forklift.update({
          where: { id: existingForklift.id },
          data: {
            maker: String(maker),
            model: String(model),
            serialNo: serialNo ? String(serialNo).trim() : existingForklift.serialNo,
            year: year ? parseInt(String(year).replace(/[^0-9]/g, '')) : existingForklift.year,
            hour: hour !== undefined && hour !== null && hour !== '' ? parseInt(String(hour).replace(/[^0-9]/g, '')) : existingForklift.hour,
            condition: condition ? String(condition) : existingForklift.condition,
            powerType: powerType ? String(powerType) : existingForklift.powerType,
            category: category ? String(category) : existingForklift.category,
            forkLength: forkLength ? String(forkLength) : existingForklift.forkLength,
            attachment: attachment ? String(attachment) : existingForklift.attachment,
            liftHeight: liftHeight ? String(liftHeight) : existingForklift.liftHeight,
            loadCapacity: loadCapacity ? String(loadCapacity) : existingForklift.loadCapacity,
            weight: weight ? String(weight) : existingForklift.weight,
            location: location ? String(location) : existingForklift.location,
            price: priceRaw ? parseFloat(String(priceRaw).replace(/[^0-9-]/g, '')) : existingForklift.price,
            status: finalStatus,
            costPrice: costPrice !== null && !isNaN(costPrice) ? costPrice : existingForklift.costPrice,
            purchaseSource: source ? source.name : existingForklift.purchaseSource,
            expenses: parsedExpenses.length > 0 ? {
              deleteMany: {}, // Xóa chi phí cũ
              create: parsedExpenses // Tạo mới
            } : undefined
          }
        });
        imported++;
      } else {
        // CREATE (Thêm mới)
        if (!source) {
          return NextResponse.json({ error: `Lỗi không tìm thấy nguồn nhập ở dòng ${i + 1}` }, { status: 400 });
        }

        let internalCode = '';
        // Ưu tiên dùng mã nội bộ user đã nhập trong Excel (VD: TU-11, TU-18) nếu chưa tồn tại
        if (internalCodeInput) {
          const codeTaken = await prisma.forklift.findFirst({
            where: { internalCode: internalCodeInput }
          });
          if (!codeTaken) {
            internalCode = internalCodeInput;
            // Đồng bộ currentSeq nếu số thứ tự lớn hơn
            const match = internalCodeInput.match(/-(\d+)$/);
            if (match && source) {
              const num = parseInt(match[1], 10);
              if (!isNaN(num) && num > source.currentSeq) {
                source.currentSeq = num;
                sourceMap.set(source.abbreviation.toLowerCase(), source);
                await prisma.purchaseSource.update({
                  where: { id: source.id },
                  data: { currentSeq: num }
                });
              }
            }
          }
        }

        // Nếu chưa có mã nội bộ hoặc mã bị trùng thì tự động sinh theo chuỗi
        if (!internalCode) {
          const nextSeq = source.currentSeq + 1;
          internalCode = `${source.abbreviation}-${nextSeq}`;
          source.currentSeq = nextSeq;
          sourceMap.set(source.abbreviation.toLowerCase(), source);
          await prisma.purchaseSource.update({
            where: { id: source.id },
            data: { currentSeq: nextSeq }
          });
        }

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
