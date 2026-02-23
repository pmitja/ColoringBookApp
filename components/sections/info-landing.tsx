import Image from "next/image";
import { InfoLdg } from "@/types";

import { cn } from "@/lib/utils";
import { Icons } from "@/components/shared/icons";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

interface InfoLandingProps {
  data: InfoLdg;
  reverse?: boolean;
}

export default function InfoLanding({
  data,
  reverse = false,
}: InfoLandingProps) {
  return (
    <section className="py-10 sm:py-16">
      <MaxWidthWrapper className="grid gap-10 px-2.5 lg:grid-cols-2 lg:items-center lg:px-7">
        <div className={cn(reverse ? "lg:order-2" : "lg:order-1")}>
          <h2 className="font-heading text-balance text-3xl text-foreground md:text-4xl lg:text-[42px]">
            {data.title}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            {data.description}
          </p>
          <dl className="mt-6 space-y-3 leading-7">
            {data.list.map((item, index) => {
              const Icon = Icons[item.icon || "arrowRight"];

              return (
                <div className="surface-glass rounded-2xl p-4" key={index}>
                  <dt className="relative pl-8 font-semibold">
                    <Icon className="absolute left-0 top-1 size-5 stroke-primary" />
                    <span>{item.title}</span>
                  </dt>
                  <dd className="mt-1 text-sm text-muted-foreground">
                    {item.description}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>

        <div
          className={cn(
            "playful-card overflow-hidden p-3 lg:-m-4",
            reverse ? "order-1" : "order-2",
          )}
        >
          <div className="border-border/70 aspect-video overflow-hidden rounded-[20px] border">
            <Image
              className="size-full object-cover object-center"
              src={data.image}
              alt={data.title}
              width={1000}
              height={500}
              priority={true}
            />
          </div>
        </div>
      </MaxWidthWrapper>
    </section>
  );
}
