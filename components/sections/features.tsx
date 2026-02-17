import { features } from "@/config/landing";
import { HeaderSection } from "@/components/shared/header-section";
import { Icons } from "@/components/shared/icons";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

export default function Features() {
  return (
    <section id="features">
      <div className="pb-10 pt-20 sm:pt-24">
        <MaxWidthWrapper>
          <HeaderSection
            label="Helpful Tools"
            title="Designed for little artists and busy grownups"
            subtitle="Every feature keeps the process quick, safe, and fun from first upload to final print."
          />

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = Icons[feature.icon || "nextjs"];
              return (
                <div
                  className="border-border/80 bg-card/95 group relative overflow-hidden rounded-3xl border p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg md:p-7"
                  key={feature.title}
                >
                  <div
                    aria-hidden="true"
                    className="bg-secondary/70 absolute right-0 top-0 size-28 -translate-y-8 translate-x-8 rounded-full blur-2xl duration-300 group-hover:scale-110"
                  />
                  <div className="relative">
                    <div className="bg-accent/70 relative flex size-12 rounded-2xl text-primary *:relative *:m-auto *:size-6">
                      <Icon />
                    </div>
                    <h3 className="font-heading mt-5 text-xl">
                      {feature.title}
                    </h3>

                    <p className="mt-2 text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </MaxWidthWrapper>
      </div>
    </section>
  );
}
