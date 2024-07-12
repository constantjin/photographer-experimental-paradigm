export function reportAPIResponse(response: APIResponse) {
  if (response.status === "error") {
    response.detailed?.forEach((detail) => {
      console.error(detail);
    });
  } else {
    response.detailed?.forEach((detail) => {
      console.info(detail);
    });
  }
}
