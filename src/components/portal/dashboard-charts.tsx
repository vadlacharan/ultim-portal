"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatINR, formatNumber } from "@/lib/format";

const bookingsConfig = {
  bookings: { label: "Bookings", color: "var(--chart-1)" },
} satisfies ChartConfig;

const paymentConfig = {
  amount: { label: "Collected" },
} satisfies ChartConfig;

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function ActivityBarChart({
  data,
}: {
  data: { activity: string; label: string; bookings: number }[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        No bookings in this range.
      </div>
    );
  }

  return (
    <ChartContainer config={bookingsConfig} className="h-64 w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 4, right: 16, top: 4 }}>
        <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.06)" />
        <XAxis type="number" hide />
        <YAxis
          dataKey="label"
          type="category"
          width={86}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10, fill: "rgba(255,255,255,0.55)" }}
        />
        <ChartTooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value, _name, item) => (
                <span className="flex w-full items-center justify-between gap-3">
                  <span className="text-muted-foreground">{item?.payload?.label}</span>
                  <span className="font-mono font-medium">
                    {formatNumber(Number(value))} bookings
                  </span>
                </span>
              )}
            />
          }
        />
        <Bar dataKey="bookings" fill="var(--color-bookings)" radius={[0, 4, 4, 0]} maxBarSize={18} />
      </BarChart>
    </ChartContainer>
  );
}

export function PeakHoursChart({
  data,
}: {
  data: { hour: number; label: string; bookings: number }[];
}) {
  const total = data.reduce((sum, item) => sum + item.bookings, 0);
  if (total === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        No timed sessions in this range.
      </div>
    );
  }

  return (
    <ChartContainer config={bookingsConfig} className="h-64 w-full">
      <BarChart data={data} margin={{ left: 0, right: 4, top: 8 }}>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval={1}
          tick={{ fontSize: 10, fill: "rgba(255,255,255,0.45)" }}
        />
        <YAxis
          width={30}
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10, fill: "rgba(255,255,255,0.45)" }}
        />
        <ChartTooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value, _name, item) => (
                <span className="flex w-full items-center justify-between gap-3">
                  <span className="text-muted-foreground">{item?.payload?.hour}:00</span>
                  <span className="font-mono font-medium">
                    {formatNumber(Number(value))} bookings
                  </span>
                </span>
              )}
            />
          }
        />
        <Bar dataKey="bookings" fill="var(--color-bookings)" radius={[4, 4, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ChartContainer>
  );
}

export function PaymentMixChart({
  data,
}: {
  data: { method: string; label: string; amount: number }[];
}) {
  const total = data.reduce((sum, item) => sum + item.amount, 0);
  if (total === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        No payments collected in this range.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ChartContainer config={paymentConfig} className="mx-auto h-48 w-full">
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(value, _name, item) => (
                  <span className="flex w-full items-center justify-between gap-3">
                    <span className="text-muted-foreground">{item?.payload?.label}</span>
                    <span className="font-mono font-medium">{formatINR(Number(value))}</span>
                  </span>
                )}
              />
            }
          />
          <Pie
            data={data}
            dataKey="amount"
            nameKey="label"
            innerRadius={48}
            outerRadius={78}
            paddingAngle={3}
            stroke="transparent"
          >
            {data.map((entry, index) => (
              <Cell key={entry.method} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {data.map((entry, index) => (
          <div key={entry.method} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
              />
              <span className="truncate">{entry.label}</span>
            </span>
            <span className="shrink-0 font-medium tabular-nums">{formatINR(entry.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
