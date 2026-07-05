import type { Metadata } from "next";
import { Permanent_Marker, Patrick_Hand, Space_Mono } from "next/font/google";
import "./globals.css";

const permanentMarker = Permanent_Marker({
  variable: "--font-marker",
  subsets: ["latin"],
  weight: "400",
});

const patrickHand = Patrick_Hand({
  variable: "--font-hand",
  subsets: ["latin"],
  weight: "400",
});

const spaceMono = Space_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Chai aur Code Chat",
  description: "Talk to Hitesh Choudhary or Piyush Garg, sketched live.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${permanentMarker.variable} ${patrickHand.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <svg width="0" height="0" style={{ position: "absolute" }}>
          <defs>
            <filter id="roughen">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.012 0.025"
                numOctaves="2"
                seed="7"
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale="6"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>
        {children}
      </body>
    </html>
  );
}
