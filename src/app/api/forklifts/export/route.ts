import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export async function GET(request: Request) {
  try {
    const forklifts = await prisma.forklift.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://folklift.hdsoft.io.vn';
    
    const data: any[][] = [
      ["NO (pic.#)", "LINK", "MAKER", "MODEL", "YEAR", "HOUR", "ENGINE CONDITION", "CONDITION", "TYPE", "TYPE2", "MAST", "ATTACHMENT", "MAX VIEW", "MAX LOAD", "LOADING PORT", "GOODS PRICE"]
    ];
    
    forklifts.forEach((fl, index) => {
      data.push([
        index + 1,
        `${baseUrl}/vi/machine/${fl.id}`,
        fl.maker,
        fl.model,
        fl.year || "",
        fl.hour || "",
        fl.engineCondition || "",
        fl.condition || "",
        fl.powerType || "",
        fl.category || "",
        fl.mast || "",
        fl.attachment || "",
        fl.liftHeight || "",
        fl.loadCapacity || "",
        fl.location || "",
        fl.price || ""
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
