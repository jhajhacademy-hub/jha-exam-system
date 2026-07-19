"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

interface CategoryScore {
  category: string;
  accuracy: number;
}

export function CategoryRadarChart({ data }: { data: CategoryScore[] }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <RadarChart data={data} outerRadius="70%">
        <PolarGrid stroke="#e4e3dd" />
        <PolarAngleAxis
          dataKey="category"
          tick={{ fill: "#4a4a46", fontSize: 11 }}
        />
        <PolarRadiusAxis
          domain={[0, 100]}
          tick={{ fill: "#9a9c76", fontSize: 10 }}
          tickCount={5}
        />
        <Radar
          dataKey="accuracy"
          stroke="#6b6d46"
          fill="#6b6d46"
          fillOpacity={0.25}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
