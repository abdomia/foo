'use client';

export default function AccessTypeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: 'FREE' | 'SUBSCRIBER' | 'PREMIUM') => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium mb-2 block">مستوى الوصول</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as 'FREE' | 'SUBSCRIBER' | 'PREMIUM')}
        className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground"
      >
        <option value="FREE">مجاني (متاح للجميع)</option>
        <option value="SUBSCRIBER">للمشتركين (أي اشتراك)</option>
        <option value="PREMIUM">للمشتركين المميزين (فصل دراسي/سنوي)</option>
      </select>
    </div>
  );
}
