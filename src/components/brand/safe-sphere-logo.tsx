import Link from "next/link";

type LogoProps = {
  compact?: boolean;
  href?: string;
  size?: "sm" | "md" | "lg";
};

export function SafeSphereMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const pixelSize = size === "sm" ? 32 : size === "lg" ? 48 : 40;
  return (
    <span
      className={`brand-mark brand-mark-${size}`}
      style={{ width: pixelSize, height: pixelSize }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 40 40"
        width={pixelSize}
        height={pixelSize}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="safe-sphere-icon"
      >
        {/* High-contrast geometric shield & protective orbital sphere */}
        <rect width="40" height="40" rx="10" fill="#000000" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <circle cx="20" cy="20" r="14" stroke="#00FF66" strokeWidth="1.75" strokeDasharray="3 3" opacity="0.8" />
        {/* Inner Shield / Hex Core */}
        <path
          d="M20 9L29 13.5V20.5C29 25.8 25.2 30.2 20 31.5C14.8 30.2 11 25.8 11 20.5V13.5L20 9Z"
          fill="rgba(0, 255, 102, 0.12)"
          stroke="#00FF66"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
        {/* Core Protection Pulse */}
        <circle cx="20" cy="19" r="3.5" fill="#00FF66" />
        <circle cx="20" cy="19" r="6" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.6" />
      </svg>
    </span>
  );
}

export function SafeSphereLogo({ compact = false, href = "/", size = "md" }: LogoProps) {
  return (
    <Link href={href} className="brand-lockup" aria-label="Safe Sphere home">
      <SafeSphereMark size={size} />
      {!compact && (
        <span className="brand-copy">
          <strong className="brand-title">
            Safe<span className="brand-highlight">Sphere</span>
          </strong>
          <small className="brand-subtitle">Emergency & Disaster Coordination</small>
        </span>
      )}
    </Link>
  );
}
