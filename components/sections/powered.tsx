import { Icons } from "@/components/shared/icons";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

const highlights = [
  {
    title: "Classroom Friendly",
    description:
      "Simple flow for teachers and parents with clear controls and safe defaults.",
    icon: "bookOpen",
  },
  {
    title: "Fast Turnaround",
    description: "Most photos become printable line art in around two minutes.",
    icon: "lineChart",
  },
  {
    title: "Privacy First",
    description:
      "Original uploads are processed for generation and are not stored as files.",
    icon: "settings",
  },
  {
    title: "Print Anywhere",
    description:
      "Export crisp pages as PDF or PNG for home and school printers.",
    icon: "download",
  },
] as const;

export default function Powered() {
  return (
    <section className="py-8 sm:py-12">
      <MaxWidthWrapper>
        <div className="playful-card px-4 py-8 sm:px-8 sm:py-10">
          <div className="mx-auto max-w-2xl text-center">
            <p className="playful-pill mx-auto w-fit text-xs font-semibold uppercase tracking-[0.2em]">
              Built for Families
            </p>
            <h2 className="mt-3 text-balance font-heading text-3xl sm:text-4xl">
              Everything you need for happy coloring time
            </h2>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map((item) => {
              const Icon = Icons[item.icon];

              return (
                <article
                  key={item.title}
                  className="surface-glass rounded-3xl p-4 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary text-primary">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-4 font-heading text-xl leading-tight">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </MaxWidthWrapper>
    </section>
  );
}
