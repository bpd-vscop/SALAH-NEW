"use client";

import Link from "next/link";
import { api } from "../../lib/api";

export function TopPromoBar() {
  const { data: banners = [] } = api.public.banners.getActive.useQuery({ position: "TOP" as any });
  const banner = banners[0];
  if (!banner) return null;

  return (
    <div className="bg-gradient-to-r from-[#f6b210] to-[#a00b0b] text-white text-center py-2">
      <div className="text-sm font-semibold">
        {banner.title}
        {banner.buttonText && banner.buttonUrl && (
          <>
            {" "}
            <Link href={banner.buttonUrl} className="underline">
              {banner.buttonText}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}



