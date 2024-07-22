import React from "react";

type RequirementDetailProps = {
  summary: React.ReactNode;
  detailed: React.ReactNode;
};

export function RequirementDetail({
  summary,
  detailed,
}: RequirementDetailProps) {
  return (
    <details className="open:border open:border-gray-300 open:rounded-md mb-3">
      <summary
        className="bg-inherit flex justify-between w-full font-bold text-left text-white marker:text-white 
        px-2 py-2 cursor-pointer hover:text-yellow-300"
      >
        {summary}
      </summary>
      <div className="px-2 py-2 text-white">{detailed}</div>
    </details>
  );
}
