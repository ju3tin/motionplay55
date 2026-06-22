"use client";

export function ShapeDisplay({ shape }: { shape: string }) {
  if (!shape) return null;

  return (
    <div style={{ fontSize: 40, fontWeight: "bold" }}>
      🎯 Target Shape: {shape}
    </div>
  );
}
