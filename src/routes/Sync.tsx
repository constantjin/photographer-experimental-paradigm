import React, { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAtomValue } from "jotai";

import { dataDirPathsAtom } from "@/stores/experiment";
import { reportAPIResponse } from "@/utils/api";

export function Sync() {
  const divRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const dataDirPaths = useAtomValue(dataDirPathsAtom);

  // const handleSyncInput = async (
  //   event: React.KeyboardEvent<HTMLDivElement>
  // ) => {
  //   if (event.code === "KeyS") {
  //     const etimeResponse = await window.api.invoke(
  //       "write-etime",
  //       dataDirPaths.participantRunDataDirPath,
  //       "sync"
  //     );
  //     reportAPIResponse(etimeResponse);
  //     navigate("/instruction");
  //   }
  // };

  const handleSyncInputInDocument = async (
    event: KeyboardEvent
  ) => {
    if (event.code === "KeyS") {
      const etimeResponse = await window.api.invoke(
        "write-etime",
        dataDirPaths.participantRunDataDirPath,
        "sync"
      );
      reportAPIResponse(etimeResponse);
      navigate("/instruction");
    }
  };

  useEffect(() => {
    divRef.current?.focus();
    document.addEventListener("keydown", handleSyncInputInDocument);

    return () => {
      document.removeEventListener("keydown", handleSyncInputInDocument);
    }
  }, []);

  return (
    <div
      className="flex items-center text-white max-w-lg border-none focus:ring-0 outline-none focus:outline-none"
      tabIndex={0}
      // onKeyDown={handleSyncInput}
      ref={divRef}
    >
      <p className="font-bold text-3xl">Waiting for sync...</p>
    </div>
  );
}
