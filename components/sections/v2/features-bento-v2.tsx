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
    color: "from-blue-500/20 to-blue-600/20",
    animation: "rotateY",
  },
  {
    title: "Text to Page",
    description: "Describe any scene, character, or pattern, and watch it become a coloring page.",
    icon: Icons.post,
    color: "from-purple-500/20 to-pink-600/20",
    animation: "pulse",
  },
  {
    title: "Consistent Avatars",
    description: "Use your face as a reference to generate multiple pages starring YOU.",
    icon: Icons.user,
    color: "from-emerald-500/20 to-teal-600/20",
    animation: "bounce",
  },
  {
    title: "Whole Book Generation",
    description: "One prompt creates a full 10-page book with a custom cover.",
    icon: Icons.bookOpen,
    color: "from-amber-500/20 to-orange-600/20",
    animation: "scale",
  },
];

export function FeaturesBentoV2() {
  return (
    <section className="bg-muted/30 py-20 lg:py-32">
      <MaxWidthWrapper>
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl"
          >
            Endless Ways to Create
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-lg text-muted-foreground"
          >
            Combine our AI tools to craft the perfect coloring adventure.
          </motion.p>
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
                className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm hover:shadow-xl"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />
                
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
                  className="bg-primary/10 mb-6 flex size-12 items-center justify-center rounded-2xl text-primary"
                >
                  <Icon className="size-6" />
                </motion.div>

                <h3 className="mb-2 font-heading text-xl font-bold">{feature.title}</h3>
                <p className="relative z-10 text-sm leading-relaxed text-muted-foreground">
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
          className="mt-16 flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-lg md:flex-row"
        >
          <div className="flex flex-col justify-center p-8 md:w-1/2 md:p-12">
            <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
               <Icons.user className="size-3" /> Consistent Character
            </div>
            <h3 className="mb-4 font-heading text-3xl font-bold">Star in your own book</h3>
            <p className="mb-6 text-lg text-muted-foreground">
              Upload a single reference photo, and our AI will maintain your avatar&apos;s likeness across entirely new coloring pages.
            </p>
          </div>
          <div className="relative flex min-h-[300px] items-center justify-center bg-muted p-8 md:w-1/2">
             <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-200/50 via-background to-background dark:from-emerald-900/20" />
             
             {/* Animation: Avatar spreading to pages */}
             <div className="relative z-10 flex w-full items-center justify-center gap-4">
                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  className="z-20 size-20 shrink-0 overflow-hidden rounded-full border-4 border-white bg-background shadow-xl"
                >
                   <Image src="/avatars/avatar-01.svg" alt="Avatar" width={80} height={80} className="object-cover" />
                </motion.div>
                
                <div className="flex flex-1 justify-center -space-x-4">
                  {[1, 2, 3].map((i) => (
                     <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -40, rotate: -10 }}
                        whileInView={{ opacity: 1, x: 0, rotate: i * 10 - 20 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 + (i * 0.1), duration: 0.5 }}
                        className="z-10 flex h-32 w-24 items-center justify-center rounded-xl border-2 border-border bg-white shadow-2xl transition-transform hover:-translate-y-4"
                     >
                       <Icons.page className="text-muted-foreground/30 size-8" />
                     </motion.div>
                  ))}
                </div>
             </div>
          </div>
        </motion.div>

      </MaxWidthWrapper>
    </section>
  );
}
