import Image from "next/image";

import { testimonials } from "@/config/landing";
import { Icons } from "@/components/shared/icons";

export default function Testimonials() {
  return (
    <section className="bg-slate-50 py-20 lg:py-32 relative overflow-hidden">
      
      {/* Decorative background elements */}
      <div className="absolute top-10 right-20 text-blue-200 opacity-50">
        <Icons.star className="size-16" />
      </div>
      <div className="absolute bottom-20 left-10 text-pink-200 opacity-50 transform -rotate-12">
        <Icons.sparkles className="size-20" />
      </div>

      <div className="container mx-auto px-4 z-10 relative">
        <div className="text-center mb-16">
          <div className="inline-block rounded-full bg-pink-100 px-4 py-1.5 text-sm font-bold text-pink-600 mb-4 border-2 border-pink-200">
            Happy Families
          </div>
          <h2 className="font-heading text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight max-w-2xl mx-auto">
            What Guardians Say About Us
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 mt-12">
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
                <div className={`relative ${color} p-8 rounded-[2rem] shadow-[4px_4px_0px_0px_rgba(15,23,42,0.1)] border-2 border-slate-900 mb-8 w-full`}>
                   <div className="text-6xl opacity-30 font-serif leading-none absolute top-4 left-4">
                     &ldquo;
                   </div>
                   <p className="relative z-10 font-bold leading-relaxed">
                     {item.review}
                   </p>
                   {/* Bubble tail */}
                   <div className={`absolute -bottom-[10px] left-1/2 transform -translate-x-1/2 w-6 h-6 ${tailColor} border-slate-900 rotate-45`} />
                </div>

                {/* Author info */}
                <div className="flex items-center gap-4 mt-2">
                  <div className={`w-16 h-16 rounded-full ${avatarColor} overflow-hidden border-4 border-slate-900 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]`}>
                    <Image
                      width={100}
                      height={100}
                      className="size-full object-cover"
                      src={item.image}
                      alt={item.name}
                    />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-lg">{item.name}</h4>
                    <p className="text-sm text-slate-500 font-bold">{item.job}</p>
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
