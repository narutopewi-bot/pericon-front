"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import * as fonts from "@/components/fonts";
import { Circle } from "lucide-react"
import Image from "next/image";
import BeatLoader from "react-spinners/BeatLoader";

const MatchSingle = ({
  player,
  onDismiss,
}: any) => {
  return (
    <React.Fragment>
      <div className="flex flex-col justify-center items-center w-full relative">
        <div className={`
          w-[200px] mt-[-6px] h-[80px] 
          flex flex-col items-center justify-center p-4 z-20 
          relative
        `}>
          <div className={`text-white mt-2 ${fonts.bowlbyOneSC.className} text-shadow text-[18px]`}>
            Duelo
          </div>
          <div className="my-1 w-full" />
          <div className={`${fonts.bowlbyOneSC.className}`}>
            1 vs 1
          </div>
        </div>
      </div>

      <div className={`${fonts.angkor.className} flex flex-col items-center justify-center gap-3 px-6 pb-3`}>
        <div className="relative flex justify-center">
          <div className="w-[300px] flex justify-between items-center">
            {/*Player*/}
            <div>
              <div className="relative w-[100px] h-[90px] mt-8 flex justify-center items-center">
                {/*Avatar*/}
                <div className="absolute inset-0 bg-white z-0 w-[82px] h-[90px] ml-[10px]"></div>
                <img src={player?.avatar} alt="avatar" width={70} height={70} className="absolute z-10" />
                {/*\Avatar*/}

                {/*Overlay*/}
                <div className="absolute z-20">
                  <Image src="/overlay.png" alt="" width={120} height={120} />
                </div>
                {/*\Overlay*/}

                {/*Level bagde*/}
                {/*\Level badge*/}
              </div>

              {/*Username*/}
              <div className="text-center text-white truncate max-w-[100px]">
                @{player?.username}
              </div>
              {/*Username*/}
            </div>
            {/*\Player*/}

            {/* VS */}
            <div className={`
                absolute w-full h-[90px] mt-8 flex 
                justify-center items-center
               'filter grayscale'
              `}>
              <div className="flex justify-center items-center w-full h-full">
                <Image
                  width={68} height={121}
                  src="/vs.png" alt=""
                  className={`'opacity-100'`} />
              </div>
            </div>
            {/* \VS */}

            <div>
              <div className="relative w-[100px] h-[90px] mt-8 flex justify-center items-center"></div>
              <div className="mt-[-80px] ml-[15px]">
                <BeatLoader color="#ffffff" />
              </div>
            </div>
            {/*\Oponent*/}
          </div>
        </div>
      </div>

      <div className="relative flex flex-row gap-2 px-6 py-4 justify-center">
        <Button onClick={onDismiss} className="bg-[transparent] hover:bg-red-500">
          <div className="flex flex-row items-center">
            <Circle size="2x" className="text-white mr-1" />
            <span className={`${fonts.angkor.className} text-white mt-[3px]`}>Cancelar</span>
          </div>
        </Button>
      </div>
    </React.Fragment>
  );
};

export default MatchSingle;
