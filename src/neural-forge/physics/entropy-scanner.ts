import { parse, Lang } from "@ast-grep/napi"
import { readdir, readFile, stat } from "node:fs/promises"
import { join } from "node:path"

/**
 * Hamiltonian Constants
 * V = alpha * Complexity + beta * Coupling^2
 */
const ALPHA = 1.0 // Complexity weight
const BETA = 0.5  // Coupling weight

export interface EnergyMetrics {
  totalEnergy: number
  potentialEnergy: number // Structural Complexity
  kineticEnergy: number   // Rate of Change (placeholder for Phase 1)
  modules: ModuleEnergy[]
}

export interface ModuleEnergy {
  path: string
  complexity: number // Approximate Cyclomatic Complexity (node count)
  coupling: number   // Import count
  energy: number     // Local Hamiltonian
}

// Map file extensions to NAPI Lang
const LANG_MAP: Record<string, Lang> = {
  ".ts": Lang.TypeScript,
  ".tsx": Lang.Tsx,
  ".js": Lang.JavaScript,
  ".jsx": Lang.JavaScript,
  ".html": Lang.Html,
  ".css": Lang.Css,
}

function getLangForFile(filePath: string): Lang | null {
  const ext = Object.keys(LANG_MAP).find(ext => filePath.endsWith(ext))
  return ext ? LANG_MAP[ext] : null
}

/**
 * Scans a file to calculate its Local Hamiltonian (Energy).
 * Energy = alpha * Complexity + beta * Coupling^2
 */
export function scanFileEnergy(filePath: string, content: string): ModuleEnergy {
  const lang = getLangForFile(filePath)

  // Default to 0 energy for unsupported files (they are "massless" in our physics)
  if (!lang) {
    return { path: filePath, complexity: 0, coupling: 0, energy: 0 }
  }

  try {
    const root = parse(lang, content).root()

    // 1. Complexity Proxy: Count branching/control-flow nodes
    // Using ast-grep rule object syntax which is robust
    const complexityNodes = root.findAll({
      rule: {
        any: [
          { kind: "if_statement" },
          { kind: "for_statement" },
          { kind: "while_statement" },
          { kind: "function_declaration" },
          { kind: "arrow_function" },
          { kind: "method_definition" },
          { kind: "ternary_expression" },
          { kind: "switch_statement" },
          { kind: "catch_clause" }
        ]
      }
    })
    const complexity = complexityNodes.length

    // 2. Coupling Proxy: Count import statements
    // Fixed: 'import_declaration' is not valid in some grammars, 'import_statement' covers most JS/TS imports
    // For JS/TS, 'import_statement' is the standard kind.
    const importNodes = root.findAll({
      rule: {
        kind: "import_statement"
      }
    })
    const coupling = importNodes.length

    // 3. Hamiltonian Calculation
    // V = alpha * Complexity + beta * Coupling^2
    const energy = (ALPHA * complexity) + (BETA * Math.pow(coupling, 2))

    return {
      path: filePath,
      complexity,
      coupling,
      energy
    }
  } catch (error) {
    console.error(`Physics Engine Scan Error [${filePath}]:`, error)
    // If parsing fails, treat as high entropy (broken code has high energy)
    return { path: filePath, complexity: 100, coupling: 100, energy: 1000 }
  }
}

/**
 * recursively walks directory (async)
 */
async function walkDir(dir: string): Promise<string[]> {
  const results: string[] = []
  try {
    const list = await readdir(dir)
    for (const file of list) {
      if (file === "node_modules" || file === ".git" || file === "dist") continue

      const filePath = join(dir, file)
      try {
        const stats = await stat(filePath)
        if (stats && stats.isDirectory()) {
          const subResults = await walkDir(filePath)
          results.push(...subResults)
        } else {
          results.push(filePath)
        }
      } catch (e) {
        // Ignore stat errors (e.g. permission denied)
      }
    }
  } catch (e) {
    // Ignore readdir errors
  }
  return results
}

/**
 * Calculates the Total Codebase Energy (Hamiltonian).
 */
export async function calculateCodebaseEnergy(rootPath: string): Promise<EnergyMetrics> {
  const files = await walkDir(rootPath)
  const modules: ModuleEnergy[] = []

  // Parallel processing for file scanning
  const scanPromises = files
    .filter(file => file.match(/\.(ts|tsx|js|jsx)$/))
    .map(async (file) => {
      try {
        const content = await readFile(file, "utf-8")
        return scanFileEnergy(file, content)
      } catch (e) {
        return null
      }
    })

  const results = await Promise.all(scanPromises)
  modules.push(...results.filter((m): m is ModuleEnergy => m !== null))

  const potentialEnergy = modules.reduce((sum, m) => sum + m.energy, 0)

  // Phase 1: Kinetic Energy is 0 (we assume static observation)
  const kineticEnergy = 0

  const totalEnergy = potentialEnergy + kineticEnergy

  return {
    totalEnergy,
    potentialEnergy,
    kineticEnergy,
    modules: modules.sort((a, b) => b.energy - a.energy) // Sort by highest energy (highest risk)
  }
}
