"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { ChevronUp, ChevronDown } from "lucide-react";

interface SelectOptionProps {
  value: string;
  active: boolean;
  updateValue: (value: string) => void;
  className?: string;
  icon?: React.ReactNode;
}

interface SelectProps {
  name?: string;
  value?: string;
  options: string[];
  updateValue: (value: string) => void;
  onToggleOptions?: (isOpen: boolean) => void;
  className?: string;
  icon?: React.ReactNode;
}

const SelectOption: React.FC<SelectOptionProps> = ({
  value = "",
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
        <Image src="/coin.png" alt="" width={20} height={20} />
      </div>
    );
  }

  return (
    <li
      className={`
        z-10 cursor-pointer
        hover:text-[#d2bf58] 
        select-none relative py-2 pr-10
        ${className}
      `}
      onClick={handleChange}
    >
      <div className="flex items-center">
        <span className="ml-3 block font-normal truncate">{value}</span>
      </div>
      <span className="absolute inset-y-0 right-0 flex items-center pr-4">
        {icon}
      </span>
    </li>
  );
};

const SelectBet: React.FC<SelectProps> = ({
  name = "customSelect",
  value = "-- Select Option --",
  options = [],
  updateValue,
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
    setState((prevState) => ({ ...prevState, showOptions: !prevState.showOptions }));
  };

  const handleChange = (value: string) => {
    setState((prevState) => ({
      ...prevState,
      showOptions: false,
      value,
      buttonText: value,
    }));
    updateValue(value);
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      setState((prevState) => ({ ...prevState, showOptions: false }));
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
      <div className="flex flex-row">
        <div>
          <Image src="/coin.png" alt="" width={20} height={20} className="mt-[3px]" />
        </div>

        <div className="pl-[4px]">
          {state.showOptions ?
            <ChevronUp />
            :
            <ChevronDown />
          }
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="mt-1 relative z-10">
      <input type="hidden" name={name} value={state.value} />
      <button
        type="button"
        className={cn(
          "relative min-w-[80px] pl-2 pr-[50px] py-1 text-left cursor-pointer",
          state.showOptions ? "outline-none rounded-t-md" : "rounded-md",
          className,
        )}
        onClick={handleClick}
      >
        <span className="flex items-center pr-[4px]">
          <span className="ml-3 block truncate">{state.buttonText}</span>
        </span>
        <span className="ml-3 absolute inset-y-0 right-0 flex items-center pr-2">
          {icon}
        </span>
      </button>
      {state.showOptions && (
        <div className={`
            absolute mt-0 w-full z-20 
            flex justify-center items-center
        `}
          style={{
            minWidth: '100%',
            zIndex: '10'
          }}
        >
          <ul
            className={`
              max-h-56 py-1 overflow-auto w-full
              focus:outline-none ${className} 
              flex flex-col items-center justify-center
              ${state.showOptions ? "rounded-b-md" : "rounded-md"}
          `}>
            {options.map((option, idx) => (
              <SelectOption
                key={idx}
                value={option}
                active={state.value === option}
                updateValue={handleChange}
                className="text-center"
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SelectBet;
