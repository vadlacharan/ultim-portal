"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatINR } from "@/lib/format";

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function RevenueChart({
  data,
}: {
  data: { date: string; label: string; revenue: number }[];
}) {
  return (
    <ChartContainer config={chartConfig} className="h-56 w-full">
      <BarChart data={data} margin={{ left: 4, right: 4, top: 8 }}>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval={Math.max(0, Math.floor(data.length / 6) - 1)}
          tick={{ fontSize: 10, fill: "rgba(255,255,255,0.45)" }}
        />
        <YAxis
          width={44}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10, fill: "rgba(255,255,255,0.45)" }}
          tickFormatter={(value: number) =>
            value >= 1000 ? `${Math.round(value / 1000)}k` : String(value)
          }
        />
        <ChartTooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value) => (
                <span className="flex w-full items-center justify-between gap-3">
                  <span className="text-muted-foreground">Revenue</span>
                  <span className="font-mono font-medium">{formatINR(Number(value))}</span>
                </span>
              )}
            />
          }
        />
        <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ChartContainer>
  );
}
