'use client';

interface Props {
  value: string;
  options: { key: string; label: string }[];
}

export function LogsFilterSelect({ value, options }: Props) {
  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const url = new URL(window.location.href);
    url.searchParams.set('action', e.target.value);
    url.searchParams.set('page', '1');
    window.location.href = url.toString();
  }

  return (
    <select
      defaultValue={value}
      onChange={handleChange}
      className="input w-auto"
    >
      <option value="">Todas as ações</option>
      {options.map(({ key, label }) => (
        <option key={key} value={key}>{label}</option>
      ))}
    </select>
  );
}
