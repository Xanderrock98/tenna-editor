import { NumberInput } from './NumberInput';
import { FieldWrapper } from './FieldWrapper';

interface NumberFieldProps {
  id?: string;
  className?: string;
  title: string;
  description?: string;
  flag?: number;
  value: number;
  placeholder?: string;
  min?: number;
  max?: number;
  fullWidth?: boolean;
  onChange: (value: number) => void;
}

export function NumberField({
  id,
  className,
  title,
  description,
  flag,
  value,
  placeholder,
  min,
  max,
  fullWidth,
  onChange,
}: NumberFieldProps) {
  return (
    <FieldWrapper
      id={id}
      className={className}
      title={title}
      description={description}
      flag={flag}
      label
    >
      <NumberInput
        value={value}
        placeholder={placeholder}
        min={min}
        max={max}
        onChange={onChange}
        fullWidth={fullWidth}
      />
    </FieldWrapper>
  );
}
