import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { getBaseUrl } from '@/lib/url';
import { parseCapacityKg, parseLiftHeightMm } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { scope, ids, filters, columns } = body;

    const whereClause: any = {};
    
    if (scope === 'selected' && ids && ids.length > 0) {
      whereClause.id = { in: ids };
    } else if (scope === 'filtered' && filters) {
      if (filters.q) {
        whereClause.OR = [
          { maker: { contains: filters.q, mode: 'insensitive' } },
          { model: { contains: filters.q, mode: 'insensitive' } },
          { internalCode: { contains: filters.q, mode: 'insensitive' } },
          { serialNo: { contains: filters.q, mode: 'insensitive' } },
          { id: { contains: filters.q } }
        ];
      }
      if (filters.status) whereClause.status = filters.status;
      if (filters.category) whereClause.category = filters.category;
      if (filters.price) {
        const price = filters.price;
        if (price.startsWith('<')) {
          whereClause.price = { lt: Number(price.replace('<', '')) };
        } else if (price.startsWith('>')) {
          whereClause.price = { gt: Number(price.replace('>', '')) };
        } else if (price.includes('-')) {
          const [min, max] = price.split('-');
          whereClause.price = { gte: Number(min), lte: Number(max) };
        }
      }
    }

    let forklifts = await prisma.forklift.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: { expenses: { orderBy: { createdAt: 'asc' } } }
    });

    if (scope === 'filtered' && filters) {
      if (filters.capacity) {
        const capacity = filters.capacity;
        let minCap = 0, maxCap = Infinity;
        if (capacity.startsWith('<')) maxCap = Number(capacity.replace('<', ''));
        else if (capacity.startsWith('>')) minCap = Number(capacity.replace('>', ''));
        else if (capacity.includes('-')) {
          const [min, max] = capacity.split('-');
          minCap = Number(min);
          maxCap = Number(max);
        }
        forklifts = forklifts.filter(f => {
          const cap = parseCapacityKg(f.loadCapacity);
          if (cap === null) return false;
          return cap >= minCap && cap <= maxCap;
        });
      }

      if (filters.height) {
        const height = filters.height;
        let minHeight = 0, maxHeight = Infinity;
        if (height.startsWith('<')) maxHeight = Number(height.replace('<', ''));
        else if (height.startsWith('>')) minHeight = Number(height.replace('>', ''));
        else if (height.includes('-')) {
          const [min, max] = height.split('-');
          minHeight = Number(min);
          maxHeight = Number(max);
        }
        forklifts = forklifts.filter(f => {
          const h = parseLiftHeightMm(f.liftHeight);
          if (h === null) return false;
          return h >= minHeight && h <= maxHeight;
        });
      }
    }

    // MAP COLUMNS
    const columnDefinitions: Record<string, { header: string, getValue: (fl: any) => any }> = {
      internalCode: { header: 'Mã nội bộ', getValue: (fl) => fl.internalCode || '' },
      link: { header: 'Link Web', getValue: (fl) => `${getBaseUrl()}/vi/machine/${fl.id}` },
      maker: { header: 'Hãng (Maker)', getValue: (fl) => fl.maker || '' },
      model: { header: 'Model', getValue: (fl) => fl.model || '' },
      serialNo: { header: 'Số khung (Serial)', getValue: (fl) => fl.serialNo || '' },
      year: { header: 'Năm SX', getValue: (fl) => fl.year || '' },
      hour: { header: 'Giờ hoạt động', getValue: (fl) => fl.hour || '' },
      condition: { header: 'Tình trạng', getValue: (fl) => fl.condition || '' },
      powerType: { header: 'Nhiên liệu', getValue: (fl) => fl.powerType || '' },
      category: { header: 'Chủng loại', getValue: (fl) => fl.category || '' },
      forkLength: { header: 'Chiều dài càng', getValue: (fl) => fl.forkLength || '' },
      attachment: { header: 'Phụ kiện', getValue: (fl) => fl.attachment || '' },
      liftHeight: { header: 'Chiều cao nâng', getValue: (fl) => fl.liftHeight || '' },
      loadCapacity: { header: 'Tải trọng', getValue: (fl) => fl.loadCapacity || '' },
      weight: { header: 'Trọng lượng xe', getValue: (fl) => fl.weight || '' },
      location: { header: 'Địa điểm', getValue: (fl) => fl.location || '' },
      price: { header: 'Giá bán', getValue: (fl) => fl.price || '' },
      costPrice: { header: 'Giá vốn', getValue: (fl) => fl.costPrice || '' },
      expenses: { header: 'Chi phí phát sinh', getValue: (fl) => fl.expenses && fl.expenses.length > 0 ? fl.expenses.map((e: any) => `${e.title}: ${e.amount}`).join('\n') : '' },
      purchaseSource: { header: 'Nguồn nhập', getValue: (fl) => fl.purchaseSource || '' },
      status: { header: 'Trạng thái', getValue: (fl) => fl.status || '' }
    };

    const selectedDefs = (columns || [])
      .map((col: string) => columnDefinitions[col])
      .filter(Boolean);

    if (selectedDefs.length === 0) {
      return NextResponse.json({ error: 'No valid columns selected' }, { status: 400 });
    }

    const headerRow = selectedDefs.map((def: { header: string }) => def.header);

    const data: any[][] = [
      [], [], [], [], // 4 empty rows for logo/decoration if needed
      headerRow
    ];

    forklifts.forEach((fl) => {
      const row = selectedDefs.map((def: { getValue: (fl: any) => any }) => def.getValue(fl));
      data.push(row);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Forklifts");

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="forklifts_export.xlsx"',
      },
    });

  } catch (error) {
    console.error('Export Error:', error);
    return NextResponse.json({ error: 'Failed to export file' }, { status: 500 });
  }
}
