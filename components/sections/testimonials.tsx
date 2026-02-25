import Image from "next/image";

import { testimonials } from "@/config/landing";
import { Icons } from "@/components/shared/icons";

export default function Testimonials() {
  return (
    <section className="relative overflow-hidden bg-slate-50 py-20 dark:bg-slate-900 lg:py-32">
      
      {/* Decorative background elements */}
      <div className="absolute right-20 top-10 text-blue-200 opacity-50 dark:text-blue-600 dark:opacity-30">
        <Icons.star className="size-16" />
      </div>
      <div className="absolute bottom-20 left-10 -rotate-12 text-pink-200 opacity-50 dark:text-pink-600 dark:opacity-30">
        <Icons.sparkles className="size-20" />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        <div className="mb-16 text-center">
          <div className="mb-4 inline-block rounded-full border-2 border-pink-200 bg-pink-100 px-4 py-1.5 text-sm font-bold text-pink-600 dark:border-pink-800 dark:bg-pink-900/50 dark:text-pink-400">
            Happy Families
          </div>
          <h2 className="mx-auto max-w-2xl font-heading text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 lg:text-5xl">
            What Guardians Say About Us
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-10">
          {testimonials.slice(0, 3).map((item, index) => {
            // Cycle through the colors from the image
            const colors = [
              "bg-pink-400 text-white border-pink-500",
              "bg-yellow-400 text-slate-900 border-yellow-500",
              "bg-blue-400 text-white border-blue-500"
            ];
            const tailColors = [
              "bg-pink-400 border-b-2 border-r-2 border-pink-500",
              "bg-yellow-400 border-b-2 border-r-2 border-yellow-500",
              "bg-blue-400 border-b-2 border-r-2 border-blue-500"
            ];
            const avatarColors = ["bg-pink-200", "bg-yellow-200", "bg-blue-200"];
            
            const color = colors[index % colors.length];
            const tailColor = tailColors[index % tailColors.length];
            const avatarColor = avatarColors[index % avatarColors.length];
            
            // Middle one slightly offset up like in the image
            const isCenter = index === 1;

            return (
              <div key={item.name} className={`flex flex-col items-center ${isCenter ? 'md:-translate-y-8' : ''}`}>
                
                {/* Speech bubble */}
                <div className={`relative ${color} mb-8 w-full rounded-[2rem] border-2 border-slate-900 p-8 shadow-[4px_4px_0px_0px_rgba(15,23,42,0.1)] dark:border-slate-700 dark:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]`}>
                   <div className="absolute left-4 top-4 font-serif text-6xl leading-none opacity-30">
                     &ldquo;
                   </div>
                   <p className="relative z-10 font-bold leading-relaxed">
                     {item.review}
                   </p>
                   {/* Bubble tail */}
                   <div className={`absolute -bottom-[10px] left-1/2 size-6 -translate-x-1/2 ${tailColor} rotate-45 border-slate-900 dark:border-slate-700`} />
                </div>

                {/* Author info */}
                <div className="mt-2 flex items-center gap-4">
                  <div className={`size-16 rounded-full ${avatarColor} flex items-center justify-center overflow-hidden border-4 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:border-slate-600 dark:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]`}>
                    <Image
                      width={100}
                      height={100}
                      className="size-full object-cover"
                      src={item.image}
                      alt={item.name}
                    />
                  </div>
                  <div>
                    <h4 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{item.name}</h4>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{item.job}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
