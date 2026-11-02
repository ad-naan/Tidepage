import "dotenv/config";
import { readGatewayConfig } from "./config";
import { createGateway } from "./gateway";
const gateway = await createGateway(readGatewayConfig());
await gateway.listen();
console.info("realtime.listening");
let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    if (stopping) return;
    stopping = true;
    const deadline = setTimeout(() => process.exit(1), 8000).unref();
    void gateway.close().then(() => {
      clearTimeout(deadline);
      process.exit(0);
    });
  });
