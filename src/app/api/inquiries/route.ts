import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where = status && status !== 'All' ? { status } : {};

    const inquiries = await prisma.inquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        forklift: {
          select: {
            maker: true,
            model: true,
            internalCode: true,
            stockNo: true,
          }
        }
      }
    });

    return NextResponse.json(inquiries);
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inquiries' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerName, phone, email, company, message, forkliftId } = body;

    if (!customerName || (!phone && !email)) {
      return NextResponse.json(
        { error: 'Customer name and contact info are required' },
        { status: 400 }
      );
    }

    const newInquiry = await prisma.inquiry.create({
      data: {
        customerName,
        phone,
        email,
        company,
        message,
        forkliftId: forkliftId || null,
        status: 'New',
      },
    });

    return NextResponse.json(newInquiry, { status: 201 });
  } catch (error) {
    console.error('Error creating inquiry:', error);
    return NextResponse.json(
      { error: 'Failed to create inquiry' },
      { status: 500 }
    );
  }
}
