import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAtomValue } from "jotai";

import { dataDirPathsAtom, currentRunInfoAtom } from "@/stores/experiment";
import { delay } from "@/utils";
import { reportAPIResponse } from "@/utils/api";

export function Instruction() {
  // Page-specific constants
  const instructionDurationInMs = 5000; // ms

  const dataDirPaths = useAtomValue(dataDirPathsAtom);
  const currentRunInfo = useAtomValue(currentRunInfoAtom);

  const navigate = useNavigate();

  useEffect(() => {
    const initInstruction = async () => {
      const startTime = performance.now();
      const etimeResponse = await window.api.invoke(
        "write-etime",
        dataDirPaths.participantRunDataDirPath,
        "instruction",
      );
      reportAPIResponse(etimeResponse);
      const endTime = performance.now();

      const etimeDelay = endTime - startTime;
      if (etimeDelay < instructionDurationInMs) {
        await delay(instructionDurationInMs - etimeDelay);
      }
      navigate("/fixation_target");
    };

    initInstruction();
  }, [dataDirPaths.participantRunDataDirPath, navigate]);

  return (
    <div className="flex flex-col justify-center text-center text-white">
      <h1 className="text-2xl mb-2">
        Now you will visit to{" "}
        <span className="text-yellow-500">{currentRunInfo?.city}</span> as a
        photographer.
      </h1>
      <h2 className="text-xl">
        Explore, and take photos that can score{" "}
        <span className="text-yellow-500">higher points</span>.
      </h2>
    </div>
  );
}
