import * as React from 'react';
import { Button } from "@/components/ui/button"
import Image from "next/image"

export default function LobbyUI({ className }: any) {
  return (
    <React.Fragment>
      <div className={`flex justify-center w-full ${className}`}>
        <div className="flex flex-row">
          <div>
            <Button size="icon" className="rounded-[50%] bg-primary w-[60px] h-[60px]">
              <Image src="/account.svg" alt="" width={34} height={34} />
            </Button>
          </div>
          <div className="mt-[-20px]">
            <Button size="icon" className="rounded-[50%] ml-2 bg-primary w-[70px] h-[70px]">
              <Image src="/home.svg" alt="" width={34} height={34} />
            </Button>
          </div>
          <div>
            <Button size="icon" className="rounded-[50%] ml-2 bg-primary w-[60px] h-[60px]">
              <Image src="/settings.svg" alt="" width={34} height={34} />
            </Button>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}
