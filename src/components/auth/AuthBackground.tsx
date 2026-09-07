import React from "react";

export function AuthBackground() {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center select-none"
      aria-hidden="true"
    >
      <div className="relative w-full max-w-[1000px] h-[750px]">
        <svg
          viewBox="0 0 1000 750"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Top-Right Mint / Cyan Organic Blob */}
          <path
            d="M580 140 C670 100 780 90 850 170 C920 250 960 380 930 480 C900 580 810 650 710 640 C620 630 570 540 540 450 C510 360 490 180 580 140 Z"
            fill="#6FE3D4"
            className="transition-all duration-700"
          />

          {/* Center-Right Royal / Electric Blue Organic Blob */}
          <path
            d="M420 180 C500 130 610 170 690 260 C770 350 790 480 730 580 C670 680 570 730 480 730 C400 730 350 670 370 600 C390 530 340 230 420 180 Z"
            fill="#1D5BFE"
            className="transition-all duration-700"
          />

          {/* Delicate Gold / Yellow Flowing Contour Loop */}
          <path
            d="M560 360 C640 350 760 380 820 460 C880 540 850 640 780 690 C710 740 600 730 550 670 C500 610 540 480 600 440 C660 400 750 430 790 480"
            stroke="#F59E0B"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity="0.9"
          />
        </svg>
      </div>
    </div>
  );
}
