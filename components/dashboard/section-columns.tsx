import React from "react";

import { Card, CardContent } from "@/components/ui/card";

interface SectionColumnsType {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function SectionColumns({
  title,
  description,
  children,
}: SectionColumnsType) {
  return (
    <Card className="shadow-sm">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:items-start">
          <div className="space-y-2 md:col-span-5">
            <h2 className="font-heading text-lg font-semibold leading-tight text-foreground">
              {title}
            </h2>
            {description ? (
              <p className="text-balance text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          <div className="md:col-span-7">{children}</div>
        </div>
      </CardContent>
    </Card>
  );
}
