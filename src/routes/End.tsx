import { useEffect } from "react";
import { useAtomValue } from "jotai";

import { dataDirPathsAtom } from "@/stores/experiment";
import { reportAPIResponse } from "@/utils/api";

export function End() {
  const dataDirPaths = useAtomValue(dataDirPathsAtom);

  useEffect(() => {
    const initInstruction = async () => {
      const etimeResponse = await window.api.invoke(
        "write-etime",
        dataDirPaths.participantRunDataDirPath,
        "end",
      );
      reportAPIResponse(etimeResponse);
    };

    initInstruction();
  }, [dataDirPaths.participantRunDataDirPath]);

  return (
    <div className="flex flex-col justify-center text-center text-white">
      <h1 className="text-4xl">End</h1>
    </div>
  );
}
