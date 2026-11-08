import { HarborView } from "./HarborView";

export function CoastalSpaceView({
  guideEnabled = false,
}: {
  guideEnabled?: boolean;
}) {
  return <HarborView guideEnabled={guideEnabled} />;
}
