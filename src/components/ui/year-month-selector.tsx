import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';

interface YearMonthSelectorProps {
  value?: string; // formato YYYY-MM
  onChange: (value: string) => void;
  placeholder?: string;
  allowEmpty?: boolean;
}

export const YearMonthSelector: React.FC<YearMonthSelectorProps> = ({ 
  value, 
  onChange, 
  placeholder = "Selecione mês/ano",
  allowEmpty = false
}) => {
  // Gerar anos (2023-2026)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 4 }, (_, i) => currentYear - 1 + i);
  
  // Meses em português
  const months = [
    { value: '01', label: 'Janeiro' },
    { value: '02', label: 'Fevereiro' },
    { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Maio' },
    { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' },
  ];

  // Parsear valor atual
  const [selectedYear, selectedMonth] = value ? value.split('-') : ['', ''];

  const handleYearChange = (year: string) => {
    if (selectedMonth) {
      onChange(`${year}-${selectedMonth}`);
    }
  };

  const handleMonthChange = (month: string) => {
    if (selectedYear) {
      onChange(`${selectedYear}-${month}`);
    }
  };

  // Gerar opções de mês/ano para seleção direta
  const monthYearOptions: { value: string; label: string }[] = [];
  years.forEach(year => {
    months.forEach(month => {
      monthYearOptions.push({
        value: `${year}-${month.value}`,
        label: `${month.label} ${year}`
      });
    });
  });

  return (
    <div className="flex items-center space-x-2">
      <Calendar className="h-4 w-4 text-gray-500" />
      <Select value={value || 'all'} onValueChange={(val) => onChange(val === 'all' ? '' : val)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {allowEmpty && (
            <SelectItem value="all">
              {placeholder}
            </SelectItem>
          )}
          {monthYearOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
