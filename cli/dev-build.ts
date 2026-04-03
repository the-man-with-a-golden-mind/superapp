import { run as gen } from "./gen";

export async function run(mode: "dev" | "build") {
  await gen([]);

  const cmd = mode === "dev" ? ["npx", "vite"] : ["npx", "vite", "build"];

  const proc = Bun.spawn(cmd, {
    stdio: ["inherit", "inherit", "inherit"],
  });
  await proc.exited;
}
