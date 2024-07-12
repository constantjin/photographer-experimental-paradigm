export function MapError() {
  return (
    <div className="flex flex-col justify-center text-center text-white">
      <h1 className="text-3xl mb-2">
        ⚠️ An error occurred when loading the map.
      </h1>
      <p className="text-2xl">
        Please check the <b>developer tools</b> (ctrl+shift+i) pannel &gt;{" "}
        <b>Console</b>.
      </p>
    </div>
  );
}
