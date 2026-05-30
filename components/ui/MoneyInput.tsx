"use client";

import { useEffect, useState } from "react";
import { formatFcfa, parseMoneyInput } from "@/lib/format-money";
import { Input } from "@/components/ui/Field";

type MoneyInputProps = {
  value?: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  name?: string;
  placeholder?: string;
  className?: string;
};

export default function MoneyInput({
  value = 0,
  onChange,
  onBlur,
  name,
  placeholder = "Ex. 350 000",
  className,
}: MoneyInputProps) {
  const [text, setText] = useState(() => (value ? formatFcfa(value) : ""));

  useEffect(() => {
    setText(value ? formatFcfa(value) : "");
  }, [value]);

  return (
    <Input
      type="text"
      inputMode="numeric"
      name={name}
      value={text}
      placeholder={placeholder}
      className={className}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        onChange(parseMoneyInput(raw));
      }}
      onBlur={() => {
        setText(value ? formatFcfa(value) : "");
        onBlur?.();
      }}
    />
  );
}
