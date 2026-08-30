'use client';

import { QRCodeSVG } from 'qrcode.react';

export default function QRCodeComponent({ value }: { value: string }) {
  return (
    <QRCodeSVG value={value} size={80} level={"L"} />
  );
}
