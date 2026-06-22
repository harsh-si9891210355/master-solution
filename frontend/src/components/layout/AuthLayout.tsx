import { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
  /** Width of the right-hand form panel in pixels. */
  panelWidth?: number;
}

/**
 * Shared two-panel authentication frame: a patterned white left panel, a thin
 * blue divider, a beige-tinted form panel on the right, and the HCLTech footer.
 * Matches the login / sign-up design.
 */
export const AuthLayout = ({ children, panelWidth = 420 }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#FFFFFF" }}>
      <div className="flex flex-1">
        {/* LEFT PANEL */}
        <div
          className="flex-1 relative"
          style={{
            background: `
          radial-gradient(ellipse at 20% 50%, rgba(255,255,255,0.08) 0%, transparent 60%),
          radial-gradient(ellipse at 80% 20%, rgba(0,0,0,0.06) 0%, transparent 50%),
          repeating-linear-gradient(
            45deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.015) 2px,
            rgba(0,0,0,0.015) 4px
          ),
          #FFFFFF
        `,
          }}
        />

        {/* Divider */}
        <div className="w-px bg-blue-600 opacity-40" />

        {/* RIGHT PANEL */}
        <div
          className="flex flex-col justify-center px-14 py-16"
          style={{ width: panelWidth, background: "rgba(251,243,210,0.18)" }}
        >
          {children}
        </div>
      </div>

      {/* Footer */}
      <div
        className="px-8 py-3 border-t border-blue-600 border-opacity-30"
        style={{ background: "rgba(0,0,0,0.06)" }}
      >
        <p className="text-xs text-gray-700">
          Copyright © {new Date().getFullYear()}{" "}
          <strong>HCLTECH</strong> and its related entities. All Rights Reserved.
        </p>
      </div>
    </div>
  );
};
