'use client';

import { useState } from 'react';
import { FaCalculator, FaBolt, FaGasPump } from 'react-icons/fa';

interface RoiCalculatorProps {
  lang: string;
  capacityKg?: number | null;
  isElectric?: boolean;
  forkliftPrice?: number | null;
}

// Mức tiêu hao tham khảo theo tải trọng (xe dầu: lít/giờ, xe điện: kWh/giờ đã gồm hao hụt sạc)
function defaultConsumption(capacityKg?: number | null) {
  const kg = capacityKg || 2500;
  if (kg <= 1500) return { diesel: 2.2, kwh: 3.2 };
  if (kg <= 2500) return { diesel: 3.0, kwh: 4.2 };
  if (kg <= 3500) return { diesel: 3.8, kwh: 5.5 };
  return { diesel: 4.8, kwh: 7.0 };
}

const vnd = (n: number) => Math.round(n).toLocaleString('vi-VN');

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}

function Slider({ label, value, min, max, step, unit, onChange }: SliderProps) {
  return (
    <div style={{ marginBottom: '0.9rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.85rem', marginBottom: '0.3rem', gap: '0.25rem 0.5rem' }}>
        <span style={{ color: '#475569', fontWeight: 600 }}>{label}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#0f172a', fontWeight: 700, marginLeft: 'auto' }}>
          <input
            type="number"
            value={value}
            min={min}
            step={step}
            onChange={e => onChange(Math.max(0, Number(e.target.value) || 0))}
            style={{ width: '84px', padding: '0.15rem 0.35rem', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'right', fontWeight: 700 }}
          />
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(value, max)}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#0284c7' }}
      />
    </div>
  );
}

export default function RoiCalculator({ lang, capacityKg, isElectric, forkliftPrice }: RoiCalculatorProps) {
  const t = (vi: string, en: string) => (lang === 'vi' ? vi : en);
  const consumption = defaultConsumption(capacityKg);

  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [daysPerMonth, setDaysPerMonth] = useState(26);
  const [dieselPrice, setDieselPrice] = useState(20000);
  const [dieselPerHour, setDieselPerHour] = useState(consumption.diesel);
  const [electricityPrice, setElectricityPrice] = useState(2500);
  const [kwhPerHour, setKwhPerHour] = useState(consumption.kwh);
  const [dieselMaintenance, setDieselMaintenance] = useState(2500000);
  const [electricMaintenance, setElectricMaintenance] = useState(1000000);
  const [priceDifference, setPriceDifference] = useState(0);
  const [years, setYears] = useState(5);

  const hoursPerMonth = hoursPerDay * daysPerMonth;
  const dieselMonthly = hoursPerMonth * dieselPerHour * dieselPrice + dieselMaintenance;
  const electricMonthly = hoursPerMonth * kwhPerHour * electricityPrice + electricMaintenance;
  const monthlySaving = dieselMonthly - electricMonthly;
  const totalSaving = monthlySaving * 12 * years - priceDifference;
  const paybackMonths = priceDifference > 0 && monthlySaving > 0 ? priceDifference / monthlySaving : null;
  const maxMonthly = Math.max(dieselMonthly, electricMonthly, 1);

  const bar = (value: number, color: string, label: string, icon: React.ReactNode) => (
    <div style={{ marginBottom: '0.8rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem', fontWeight: 600, color: '#334155' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>{icon} {label}</span>
        <span>{vnd(value)} đ/{t('tháng', 'month')}</span>
      </div>
      <div style={{ background: '#e2e8f0', borderRadius: '6px', height: '14px', overflow: 'hidden' }}>
        <div style={{ width: `${(value / maxMonthly) * 100}%`, background: color, height: '100%', borderRadius: '6px', transition: 'width 0.25s' }} />
      </div>
    </div>
  );

  return (
    <div className="glass-panel" style={{ marginTop: '2rem', padding: 'clamp(1.2rem, 3vw, 2rem)' }}>
      <h3 style={{ marginBottom: '0.4rem', fontSize: '1.4rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <FaCalculator color="#0284c7" /> {t('Tính toán Hiệu quả Đầu tư: Xe Điện vs Xe Dầu', 'ROI Calculator: Electric vs Diesel')}
      </h3>
      <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        {isElectric
          ? t('Kéo thanh trượt theo cường độ làm việc thực tế để xem chiếc xe điện này giúp bạn tiết kiệm bao nhiêu so với xe dầu cùng tải.', 'Drag the sliders to match your workload and see how much this electric forklift saves versus a diesel one.')
          : t('Kéo thanh trượt theo cường độ làm việc thực tế để so sánh chi phí vận hành xe dầu với xe điện cùng tải trọng.', 'Drag the sliders to match your workload and compare running costs of diesel versus electric.')}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '2rem' }}>
        <div>
          <h4 style={{ fontSize: '0.95rem', color: '#0f172a', marginBottom: '0.8rem' }}>{t('Cường độ làm việc', 'Workload')}</h4>
          <Slider label={t('Giờ chạy mỗi ngày', 'Hours per day')} value={hoursPerDay} min={1} max={24} step={1} unit={t('giờ', 'h')} onChange={setHoursPerDay} />
          <Slider label={t('Ngày làm việc mỗi tháng', 'Working days per month')} value={daysPerMonth} min={1} max={31} step={1} unit={t('ngày', 'days')} onChange={setDaysPerMonth} />
          <Slider label={t('Thời gian so sánh', 'Comparison period')} value={years} min={1} max={10} step={1} unit={t('năm', 'years')} onChange={setYears} />

          <h4 style={{ fontSize: '0.95rem', color: '#0f172a', margin: '1.2rem 0 0.8rem' }}>{t('Đơn giá & Tiêu hao', 'Prices & Consumption')}</h4>
          <Slider label={t('Giá dầu Diesel', 'Diesel price')} value={dieselPrice} min={10000} max={40000} step={500} unit="đ/L" onChange={setDieselPrice} />
          <Slider label={t('Xe dầu tiêu hao', 'Diesel consumption')} value={dieselPerHour} min={1} max={8} step={0.1} unit={t('L/giờ', 'L/h')} onChange={setDieselPerHour} />
          <Slider label={t('Giá điện kinh doanh', 'Electricity price')} value={electricityPrice} min={1000} max={5000} step={50} unit="đ/kWh" onChange={setElectricityPrice} />
          <Slider label={t('Xe điện tiêu thụ', 'Electric consumption')} value={kwhPerHour} min={1} max={12} step={0.1} unit={t('kWh/giờ', 'kWh/h')} onChange={setKwhPerHour} />
          <Slider label={t('Bảo dưỡng xe dầu', 'Diesel maintenance')} value={dieselMaintenance} min={0} max={10000000} step={100000} unit={t('đ/tháng', 'đ/mo')} onChange={setDieselMaintenance} />
          <Slider label={t('Bảo dưỡng xe điện', 'Electric maintenance')} value={electricMaintenance} min={0} max={10000000} step={100000} unit={t('đ/tháng', 'đ/mo')} onChange={setElectricMaintenance} />
          <Slider label={t('Xe điện đắt hơn xe dầu (giá mua)', 'Electric purchase premium')} value={priceDifference} min={0} max={Math.max(500000000, forkliftPrice || 0)} step={5000000} unit="đ" onChange={setPriceDifference} />
        </div>

        <div style={{ background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem', alignSelf: 'start' }}>
          <h4 style={{ fontSize: '0.95rem', color: '#0f172a', marginBottom: '1rem' }}>
            {t(`Chi phí vận hành (${hoursPerMonth} giờ/tháng)`, `Running cost (${hoursPerMonth} h/month)`)}
          </h4>
          {bar(dieselMonthly, '#f97316', t('Xe dầu', 'Diesel'), <FaGasPump color="#f97316" />)}
          {bar(electricMonthly, '#0284c7', t('Xe điện', 'Electric'), <FaBolt color="#0284c7" />)}

          <div style={{ borderTop: '1px dashed #cbd5e1', marginTop: '1.2rem', paddingTop: '1.2rem', display: 'grid', gap: '0.8rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{t('Xe điện tiết kiệm mỗi tháng', 'Electric saves per month')}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: monthlySaving >= 0 ? '#16a34a' : '#dc2626' }}>{vnd(monthlySaving)} đ</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {t(`Tổng tiết kiệm sau ${years} năm`, `Total saving after ${years} years`)}
                {priceDifference > 0 ? t(' (đã trừ chênh lệch giá mua)', ' (after purchase premium)') : ''}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: totalSaving >= 0 ? '#16a34a' : '#dc2626', letterSpacing: '-0.5px' }}>{vnd(totalSaving)} đ</div>
            </div>
            {paybackMonths !== null && (
              <div style={{ fontSize: '0.9rem', color: '#334155' }}>
                ⏱️ {t('Hoàn vốn phần chênh lệch sau', 'Premium paid back in')} <strong>{paybackMonths.toFixed(1)} {t('tháng', 'months')}</strong>
              </div>
            )}
          </div>

          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1.2rem', lineHeight: 1.5 }}>
            {t('* Số liệu mặc định là mức tham khảo theo tải trọng xe, chưa gồm chi phí thay bình ắc quy hoặc đại tu động cơ. Liên hệ MCK Japan để được tính chính xác theo kho của bạn.',
              '* Default figures are estimates by load capacity and exclude battery replacement or engine overhaul. Contact MCK Japan for an exact estimate for your site.')}
          </p>
        </div>
      </div>
    </div>
  );
}
