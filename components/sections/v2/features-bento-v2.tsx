"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { Icons } from "@/components/shared/icons";

const features = [
  {
    title: "Image to Lineart",
    description: "Upload a photo and instantly generate clean line art. Perfect for family moments.",
    icon: Icons.media,
    color: "bg-blue-100",
    iconColor: "text-blue-500",
    animation: "rotateY",
  },
  {
    title: "Text to Page",
    description: "Describe any scene, character, or pattern, and watch it become a coloring page.",
    icon: Icons.post,
    color: "bg-pink-100",
    iconColor: "text-pink-500",
    animation: "pulse",
  },
  {
    title: "Consistent Avatars",
    description: "Use your face as a reference to generate multiple pages starring YOU.",
    icon: Icons.user,
    color: "bg-emerald-100",
    iconColor: "text-emerald-500",
    animation: "bounce",
  },
  {
    title: "Whole Book Generation",
    description: "One prompt creates a full 10-page book with a custom cover.",
    icon: Icons.bookOpen,
    color: "bg-orange-100",
    iconColor: "text-orange-500",
    animation: "scale",
  },
];

export function FeaturesBentoV2() {
  return (
    <section className="bg-white py-20 lg:py-32 relative overflow-hidden">
      
      {/* Decorative Blob */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-100 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2" />
      
      <MaxWidthWrapper>
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <div className="inline-block rounded-full bg-pink-100 px-4 py-1.5 text-sm font-semibold text-pink-600 mb-4 border-2 border-pink-200">
            Endless Ways to Create
          </div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-heading text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl"
          >
            Combine our AI tools to craft the perfect coloring adventure.
          </motion.h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -5 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`group relative overflow-hidden rounded-3xl border-2 border-slate-900 ${feature.color} p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-all hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]`}
              >
                <motion.div
                  animate={
                    feature.animation === "rotateY" ? { rotateY: [0, 360] } :
                    feature.animation === "pulse" ? { scale: [1, 1.1, 1] } :
                    feature.animation === "bounce" ? { y: [0, -10, 0] } :
                    { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }
                  }
                  transition={{ 
                    duration: 3, 
                    repeat: Infinity, 
                    repeatType: "loop", 
                    ease: "easeInOut",
                    delay: index * 0.5 
                  }}
                  className="bg-white border-2 border-slate-900 shadow-sm mb-6 flex size-14 items-center justify-center rounded-2xl"
                >
                  <Icon className={`size-7 ${feature.iconColor}`} />
                </motion.div>

                <h3 className="mb-2 font-heading text-xl font-bold text-slate-900">{feature.title}</h3>
                <p className="relative z-10 text-sm font-medium leading-relaxed text-slate-700">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Feature Highlights with Avatar example */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 flex flex-col overflow-hidden rounded-[2.5rem] border-4 border-slate-900 bg-white shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] md:flex-row"
        >
          <div className="flex flex-col justify-center p-8 md:w-1/2 md:p-12">
            <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-600 border-2 border-emerald-200">
               <Icons.user className="size-3" /> Consistent Character
            </div>
            <h3 className="mb-4 font-heading text-3xl font-extrabold text-slate-900">Star in your own book</h3>
            <p className="mb-6 text-lg font-medium text-slate-600">
              Upload a single reference photo, and our AI will maintain your avatar&apos;s likeness across entirely new coloring pages.
            </p>
            <button className="w-fit rounded-full bg-yellow-400 px-8 py-3 font-bold text-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] border-2 border-slate-900 transition-all hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              Try It Out
            </button>
          </div>
          <div className="relative flex min-h-[300px] items-center justify-center bg-blue-50 p-8 md:w-1/2 border-t-4 border-slate-900 md:border-t-0 md:border-l-4">
             {/* Animation: Avatar spreading to pages */}
             <div className="relative z-10 flex w-full items-center justify-center gap-4">
                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  className="z-20 size-24 shrink-0 overflow-hidden rounded-full border-4 border-slate-900 bg-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
                >
                   <Image src="/avatars/avatar-01.svg" alt="Avatar" width={96} height={96} className="object-cover" />
                </motion.div>
                
                <div className="flex flex-1 justify-center -space-x-6">
                  {[1, 2, 3].map((i) => (
                     <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -40, rotate: -10 }}
                        whileInView={{ opacity: 1, x: 0, rotate: i * 12 - 24 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 + (i * 0.1), duration: 0.5 }}
                        className="z-10 flex h-36 w-28 items-center justify-center rounded-xl border-4 border-slate-900 bg-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-transform hover:-translate-y-4"
                     >
                       <Icons.page className="text-blue-200 size-10" />
                     </motion.div>
                  ))}
                </div>
             </div>
          </div>
        </motion.div>

      </MaxWidthWrapper>
      
      {/* Blue wave at the bottom */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none z-10 translate-y-px">
        <svg
          className="relative block w-full h-[60px]"
          data-name="Layer 1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V0C63.26,38.5,145.41,75.47,231.25,82.72c41.35,3.5,82.93-1.84,124.5-9.35z"
            className="fill-blue-500/10"
          ></path>
        </svg>
      </div>
    </section>
  );
}
