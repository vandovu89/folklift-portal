import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { getBaseUrl } from '@/lib/url';

export async function GET(request: Request) {
  try {
    const forklifts = await prisma.forklift.findMany({
      orderBy: { createdAt: 'desc' },
      include: { expenses: { orderBy: { createdAt: 'asc' } } }
    });
    
    const data: any[][] = [
      // Rows 1-4: blank (decoration / logo area, row 5 = header)
      [],
      [],
      [],
      [],
      // Row 5: header
      [
        "Mã nội bộ",                    // A
        "LINK",                         // B
        "MAKER",                        // C
        "MODEL",                        // D
        "SERI NO.",                     // E
        "NĂM SẢN XUẤT",                // F
        "GIỜ HOẠT ĐỘNG",               // G
        "TÌNH TRẠNG XE ( BÌNH ẮC QUY )", // H
        "LOẠI NHIÊN LIỆU",             // I
        "CHỦNG LOẠI XE",               // J
        "CHIỀU DÀI CÀNG NÂNG",         // K
        "PHỤ KIỆN",                    // L
        "CHIỀU CAO NÂNG TỐI ĐA",      // M
        "TẢI TRỌNG NÂNG TỐI ĐA",      // N
        "TRỌNG LƯỢNG XE",             // O
        "ĐỊA ĐIỂM",                   // P
        "GIÁ BÁN"                     // Q
      ]
    ];
    
    forklifts.forEach((fl) => {
      data.push([
        fl.internalCode || "",   // A: Mã nội bộ
        `${getBaseUrl()}/vi/machine/${fl.id}`, // B: NO (pic.#) -> Link
        fl.maker,                // C: MAKER
        fl.model,                // D: MODEL
        fl.serialNo || "",       // E: SERI NO.
        fl.year || "",           // F: NĂM SẢN XUẤT
        fl.hour || "",           // G: GIỜ HOẠT ĐỘNG
        fl.condition || "",      // H: TÌNH TRẠNG XE
        fl.powerType || "",      // I: LOẠI NHIÊN LIỆU
        fl.category || "",       // J: CHỦNG LOẠI XE
        fl.forkLength || "",     // K: CHIỀU DÀI CÀNG NÂNG
        fl.attachment || "",     // L: PHỤ KIỆN
        fl.liftHeight || "",     // M: CHIỀU CAO NÂNG TỐI ĐA
        fl.loadCapacity || "",   // N: TẢI TRỌNG NÂNG TỐI ĐA
        fl.weight || "",         // O: TRỌNG LƯỢNG XE
        fl.location || "",       // P: ĐỊA ĐIỂM
        fl.price || ""           // Q: GIÁ BÁN
      ]);
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
