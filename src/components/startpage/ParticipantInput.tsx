import { useAtomValue } from "jotai";

import { experimentalSettingAtom } from "@/stores/experiment";

type ParticipantInputProps = {
  label: string;
  placeholder: string;
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export function ParticipantInput({
  label,
  placeholder,
  name,
  value,
  onChange,
}: ParticipantInputProps) {
  const experimentalSetting = useAtomValue(experimentalSettingAtom);

  return (
    <div className="flex items-center mb-6">
      <div className="w-1/3">
        <label className="block text-white font-bold text-left mb-1 mb-0 pr-4">
          {label}
        </label>
      </div>
      <div className="w-2/3">
        <input
          className="bg-gray-200 appearance-none border-2 border-gray-200 rounded w-full py-2 px-4 
          text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-yellow-500"
          type="text"
          placeholder={placeholder}
          name={name}
          onChange={onChange}
          value={value}
          disabled={!experimentalSetting}
        />
      </div>
    </div>
  );
}
