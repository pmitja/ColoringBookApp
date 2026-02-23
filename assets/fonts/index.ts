import {
  Nunito as FontPlayfulBody,
  Baloo_2 as FontPlayfulHeading,
  Plus_Jakarta_Sans as FontSans,
  Urbanist,
} from "next/font/google";

export const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const fontUrban = Urbanist({
  subsets: ["latin"],
  variable: "--font-urban",
});

export const fontHeading = Urbanist({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const fontGeist = FontSans({
  subsets: ["latin"],
  variable: "--font-geist",
});

export const fontPlayfulHeading = FontPlayfulHeading({
  subsets: ["latin"],
  variable: "--font-playful-heading",
});

export const fontPlayfulBody = FontPlayfulBody({
  subsets: ["latin"],
  variable: "--font-playful-body",
});
