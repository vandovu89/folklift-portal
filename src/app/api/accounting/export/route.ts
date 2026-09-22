import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';
import { jwtVerify } from 'jose';
import { logActivity } from '@/lib/activity-logger';

async function getUser(request: Request) {
  const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
  if (!token) return { role: 'GUEST', id: null };
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'super_secret_jwt_key_forlift_portal_2026');
    const { payload } = await jwtVerify(token, secret);
    return { role: payload.role as string, id: payload.id as string };
  } catch (error) {
    return { role: 'GUEST', id: null };
  }
}

export async function POST(request: Request) {
  try {
    const { role, id: userId } = await getUser(request);
    // Tính năng này thường dành cho Kế toán / Admin
    if (role === 'GUEST') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { forkliftIds } = body;

    if (!Array.isArray(forkliftIds) || forkliftIds.length === 0) {
      return NextResponse.json({ error: 'Missing forkliftIds' }, { status: 400 });
    }

    const forklifts = await prisma.forklift.findMany({
      where: { id: { in: forkliftIds } },
      include: {
        expenses: true
      }
    });

    if (forklifts.length === 0) {
      return NextResponse.json({ error: 'No data found' }, { status: 404 });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Forlift Portal';
    workbook.created = new Date();

    // ============================================
    // Sheet 1: DOANH THU (Bảng kê các xe bán ra)
    // ============================================
    const revenueSheet = workbook.addWorksheet('Doanh thu');
    revenueSheet.columns = [
      { header: 'Ngày hạch toán', key: 'date', width: 15 },
      { header: 'Số chứng từ', key: 'docNo', width: 20 },
      { header: 'Mã khách hàng', key: 'customerId', width: 15 },
      { header: 'Tên xe (Diễn giải)', key: 'description', width: 40 },
      { header: 'Tài khoản Nợ', key: 'accDebit', width: 15 },
      { header: 'Tài khoản Có', key: 'accCredit', width: 15 },
      { header: 'Số tiền (Doanh thu)', key: 'amount', width: 20 },
      { header: 'Mã xe (Nội bộ)', key: 'internalCode', width: 15 },
    ];
    
    // Header style
    revenueSheet.getRow(1).font = { bold: true };
    revenueSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };

    // ============================================
    // Sheet 2: CHI PHÍ & GIÁ VỐN
    // ============================================
    const costSheet = workbook.addWorksheet('Chi phí và Giá vốn');
    costSheet.columns = [
      { header: 'Ngày hạch toán', key: 'date', width: 15 },
      { header: 'Số chứng từ', key: 'docNo', width: 20 },
      { header: 'Đối tượng/NCC', key: 'supplier', width: 25 },
      { header: 'Diễn giải', key: 'description', width: 40 },
      { header: 'Tài khoản Nợ', key: 'accDebit', width: 15 },
      { header: 'Tài khoản Có', key: 'accCredit', width: 15 },
      { header: 'Số tiền', key: 'amount', width: 20 },
      { header: 'Mã xe (Nội bộ)', key: 'internalCode', width: 15 },
    ];

    costSheet.getRow(1).font = { bold: true };
    costSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };

    // Điền dữ liệu
    for (const fl of forklifts) {
      // 1. Dữ liệu Doanh Thu
      if (fl.soldPrice) {
        revenueSheet.addRow({
          date: fl.soldDate ? new Date(fl.soldDate).toLocaleDateString('vi-VN') : '',
          docNo: '', // Kế toán tự điền
          customerId: fl.customerId || '',
          description: `Doanh thu bán xe nâng ${fl.maker} ${fl.model}`,
          accDebit: '', // Để trống cho Kế toán điền mã MISA
          accCredit: '', 
          amount: fl.soldPrice,
          internalCode: fl.internalCode || fl.id.substring(0,8)
        });
      }

      // 2. Dữ liệu Chi phí (Giá nhập ban đầu)
      if (fl.costPrice) {
        costSheet.addRow({
          date: fl.purchaseDate ? new Date(fl.purchaseDate).toLocaleDateString('vi-VN') : '',
          docNo: '',
          supplier: fl.supplier || '',
          description: `Giá vốn xe nâng ${fl.maker} ${fl.model}`,
          accDebit: '',
          accCredit: '',
          amount: fl.costPrice,
          internalCode: fl.internalCode || fl.id.substring(0,8)
        });
      }

      // 3. Dữ liệu Chi phí phát sinh (Expenses)
      if (fl.expenses && fl.expenses.length > 0) {
        for (const exp of fl.expenses) {
          costSheet.addRow({
            date: exp.date ? new Date(exp.date).toLocaleDateString('vi-VN') : '',
            docNo: '',
            supplier: '', // Có thể nâng cấp sau để thêm NCC vào expense
            description: `Chi phí: ${exp.title} - ${exp.note || ''}`,
            accDebit: '',
            accCredit: '',
            amount: exp.amount,
            internalCode: fl.internalCode || fl.id.substring(0,8)
          });
        }
      }
    }

    // Định dạng cột số tiền
    revenueSheet.getColumn('amount').numFmt = '#,##0';
    costSheet.getColumn('amount').numFmt = '#,##0';

    // Xuất ra buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Khóa sổ các xe này
    await prisma.forklift.updateMany({
      where: { id: { in: forkliftIds } },
      data: { lockedForAccounting: true }
    });

    // Ghi log
    if (userId) {
      await logActivity({
        action: 'LOCKED_ACCOUNTING',
        entityType: 'ACCOUNTING',
        entityId: 'BATCH',
        userId: userId,
        details: `Đã khóa sổ và xuất Excel cho ${forkliftIds.length} xe`
      });
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="MISA_Export_${new Date().getTime()}.xlsx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }
    });

  } catch (error: any) {
    console.error('[Accounting Export API Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to export' }, { status: 500 });
  }
}
