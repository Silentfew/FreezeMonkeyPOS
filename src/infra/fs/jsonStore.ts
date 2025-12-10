cat > src/infra/fs/jsonStore.ts << 'EOF'
import { promises as fs } from "fs";
import path from "path";

const dataRoot = path.join(process.cwd(), "data");

function resolveDataPath(relativePath: string): string {
  return path.join(dataRoot, relativePath);
}

export async function readJSON<T>(
  relativePath: string,
  defaultValue: T
): Promise<T> {
  const filePath = resolveDataPath(relativePath);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return defaultValue;
    }
    throw error;
  }
}

export async function writeJSON(
  relativePath: string,
  data: unknown
): Promise<void> {
  const filePath = resolveDataPath(relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}
EOF
