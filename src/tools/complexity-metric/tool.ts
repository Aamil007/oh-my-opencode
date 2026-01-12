import type { ToolDefinition } from "@opencode-ai/plugin"
import { z } from "zod"
import { calculateCodebaseEnergy, scanFileEnergy } from "../../neural-forge/physics/entropy-scanner"
import { readFile, stat } from "node:fs/promises"
import { join } from "node:path"

export const complexity_metric: ToolDefinition = {
  name: "complexity_metric",
  description:
    "Calculates the 'Hamiltonian Energy' (Complexity + Coupling) of code. Use this to measure technical debt and structural entropy. High energy = High risk. 'path' can be a file or directory.",
  inputSchema: z.object({
    path: z.string().describe("File or directory path to analyze. Defaults to current directory '.'.")
  }),
  execute: async ({ path }, { directory }) => {
    const targetPath = join(directory, path || ".")

    try {
      const stats = await stat(targetPath)

      if (stats.isFile()) {
        const content = await readFile(targetPath, "utf-8")
        const energy = scanFileEnergy(targetPath, content)
        return {
          message: `Physics Analysis for ${path}:

Hamiltonian Energy (H): ${energy.energy.toFixed(2)}
- Complexity (V_c): ${energy.complexity}
- Coupling (V_k): ${energy.coupling}

Interpretation:
H < 10: Stable (Solid State)
H < 50: Active (Liquid State)
H > 50: Volatile (Gaseous State) - REFACTOR RECOMMENDED`
        }
      } else if (stats.isDirectory()) {
        const metrics = await calculateCodebaseEnergy(targetPath)
        const topRisks = metrics.modules.slice(0, 5)

        return {
          message: `Physics Analysis for Directory ${path}:

Total System Energy (H): ${metrics.totalEnergy.toFixed(2)}

Top 5 High-Entropy Zones (Risk Hotspots):
${topRisks.map(m => `- ${m.path.replace(directory, "")}: H=${m.energy.toFixed(2)} (Cpx:${m.complexity}, Cpl:${m.coupling})`).join("\n")}

Recommendation: Apply refactoring force to high-entropy zones to minimize system Hamiltonian.`
        }
      }

      return { message: "Invalid path: Must be file or directory" }

    } catch (error) {
      return { message: `Physics Engine Error: ${String(error)}` }
    }
  },
}
