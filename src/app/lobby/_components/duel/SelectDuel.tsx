"use client"

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Circle } from "lucide-react"

interface SelectOptionProps {
  value: string;
  active: boolean;
  updateValue: (value: string) => void;
  icon?: React.ReactNode;
  className?: string;
}

interface SelectProps {
  name?: string;
  value?: string;
  options: string[];
  updateValue: (value: string) => void;
  onToggleOptions?: (isOpen: boolean) => void;
  icon?: React.ReactNode;
  className?: string;
}

const SelectOption: React.FC<SelectOptionProps> = ({
  value = "",
  active = false,
  updateValue,
  icon,
  className = "",
}) => {
  const handleChange = (e: React.MouseEvent<HTMLLIElement, MouseEvent>) => {
    e.preventDefault();
    updateValue(value);
  };

  if (!icon) {
    icon = (
      <div>
        <Circle
          className={`h-5 w-5 ${active ? "text-[#a7753a]" : "text-[#a7753a]"}`}
        />
      </div>
    );
  }

  return (
    <li
      className={`
        hover:bg-[#d2bf58] hover:text-white text-[#a7753a]
        z-10 cursor-pointer 
        select-none relative pb-2 pt-2 pl-[22px] pr-9
        ${className}
      `}
      onClick={handleChange}
    >
      <div className="flex items-center">
        <span className="ml-[17px] block font-normal truncate">{value}</span>
      </div>
    </li>
  );
};

const SelectDuel: React.FC<SelectProps> = ({
  name = "customSelect",
  value = "-- Select Option --",
  options = [],
  updateValue,
  onToggleOptions,
  className = "",
  icon,
}) => {
  const [state, setState] = useState({
    value,
    showOptions: false,
    buttonText: value,
  });

  const ref = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();
    const newShowOptions = !state.showOptions;
    setState((prevState) => ({ ...prevState, showOptions: newShowOptions }));

    if (onToggleOptions) {
      onToggleOptions(newShowOptions);
    }
  };

  const handleChange = (value: string) => {
    setState((prevState) => ({
      ...prevState,
      showOptions: false,
      value,
      buttonText: value,
    }));
    updateValue(value);

    if (onToggleOptions) {
      onToggleOptions(false);
    }
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      setState((prevState) => ({ ...prevState, showOptions: false }));

      if (onToggleOptions) {
        onToggleOptions(false);
      }
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (!icon) {
    icon = (
      <div className="absolute ml-[-30px] mt-[-3px]">
        {state.showOptions ?
          <Image src="/duelmodeon.svg" width={28} height={28} alt="" />
          :
          <Image src="/duelmodeoff.svg" width={28} height={28} alt="" />
        }
      </div>
    );
  }

  return (
    <div ref={ref} className="mt-1 relative z-20">
      <input type="hidden" name={name} value={state.value} />
      <button
        type="button"
        className={cn(
          "relative w-[200px] rounded-md pl-8 pr-8 py-3 text-left cursor-pointer flex justify-center",
          state.showOptions ? "outline-none" : "",
          className,
        )}
        onClick={handleClick}
      >
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="block truncate">{state.buttonText}</span>
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2">
          {icon}
        </span>
      </button>
      {state.showOptions && (
        <div
          className={`
            absolute mt-0 pt-1 w-[200px] z-30 
            rounded-b-md             
            shadow-lg
            bg-[#d2bf58] flex justify-center items-center
          `}
          style={{
            minWidth: 'fit-content',
            zIndex: '10',
          }}
        >
          <ul
            className={`
            max-h-56 rounded-md py-1  
            overflow-auto
            focus:outline-none ${className} flex flex-col items-center
          `}>
            {options.map((option, idx) => (
              <SelectOption
                key={idx}
                value={option}
                active={state.value === option}
                updateValue={handleChange}
                className={className}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SelectDuel;
