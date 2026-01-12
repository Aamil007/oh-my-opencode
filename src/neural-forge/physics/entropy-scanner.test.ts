import { describe, it, expect } from "bun:test"
import { scanFileEnergy } from "./entropy-scanner"

describe("EntropyScanner (Physics Engine)", () => {
  it("should calculate low energy for simple code", () => {
    const simpleCode = `
      function add(a: number, b: number) {
        return a + b;
      }
    `
    // Complexity: 1 (function)
    // Coupling: 0
    // H = 1.0 * 1 + 0.5 * 0^2 = 1.0
    const energy = scanFileEnergy("simple.ts", simpleCode)
    expect(energy.complexity).toBe(1)
    expect(energy.coupling).toBe(0)
    expect(energy.energy).toBe(1.0)
  })

  it("should calculate higher energy for complex code", () => {
    const complexCode = `
      import { x } from "y";

      function complex(n: number) {
        if (n > 0) {
          return n;
        } else {
          return 0;
        }
      }
    `
    // Complexity: 2 (function + if)
    // Coupling: 1 (import)
    // H = 1.0 * 2 + 0.5 * 1^2 = 2.5
    const energy = scanFileEnergy("complex.ts", complexCode)
    expect(energy.complexity).toBe(2)
    expect(energy.coupling).toBe(1)
    expect(energy.energy).toBe(2.5)
  })

  it("should penalize coupling quadratically", () => {
    const highCouplingCode = `
      import { a } from "a";
      import { b } from "b";
      import { c } from "c";

      function main() {}
    `
    // Complexity: 1
    // Coupling: 3
    // H = 1.0 * 1 + 0.5 * 3^2 = 1 + 4.5 = 5.5
    const energy = scanFileEnergy("coupling.ts", highCouplingCode)
    expect(energy.coupling).toBe(3)
    expect(energy.energy).toBe(5.5)
  })

  it("should handle invalid/empty files gracefully", () => {
    const energy = scanFileEnergy("unknown.txt", "some text")
    expect(energy.energy).toBe(0)
  })
})
