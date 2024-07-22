import React from "react";

type RequirementIndicatorProps = {
  label: React.ReactNode;
  requirementState: { status: string; message: string };
};

export function RequirementIndicator({
  label,
  requirementState,
}: RequirementIndicatorProps) {
  return (
    <div className="flex flex-row items-center justify-between">
      {label}
      <p
        className={`truncate ${
          requirementState.status === "success"
            ? "text-green-300"
            : "text-red-300"
        }`}
      >
        {requirementState.message}
      </p>
    </div>
  );
}
