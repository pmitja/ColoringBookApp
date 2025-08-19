export interface ShapeProps {
  width: number;
  height: number;
  stroke: string;
  strokeWidth: number;
  fill: string;
  clipId?: string;
}

export default function Chat2LineShape(props: ShapeProps) {
  const { width, height, stroke, strokeWidth, fill, clipId } = props;
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
    >
      {clipId ? (
        <defs>
          <clipPath id={clipId} clipPathUnits="objectBoundingBox">
            <path
              d="M12 19c5.523 0 10-3.582 10-8s-4.477-8-10-8S2 6.582 2 11c0 2.157 1.067 4.114 2.801 5.553C4.271 18.65 3 20 2 21c3 0 4.527-.979 6.32-2.559 1.14.36 2.38.559 3.68.559z"
              transform="scale(0.0416667)"
            />
          </clipPath>
        </defs>
      ) : null}
      <path
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
        d="M12 19c5.523 0 10-3.582 10-8s-4.477-8-10-8S2 6.582 2 11c0 2.157 1.067 4.114 2.801 5.553C4.271 18.65 3 20 2 21c3 0 4.527-.979 6.32-2.559 1.14.36 2.38.559 3.68.559z"
        fill={fill}
      />
    </svg>
  );
}
