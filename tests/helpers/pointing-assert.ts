import { expect } from 'vitest';

function check(actual: number, expected: number, tol: number, label: string): void {
  expect(
    Math.abs(actual - expected) <= tol,
    `${label}expected ${actual} to be within ${tol} of ${expected}`,
  ).toBe(true);
}

export function expectClose(actual: number, expected: number, tol: number): void {
  check(actual, expected, tol, '');
}

export function expectVec(
  actual: { readonly x: number; readonly y: number; readonly z: number },
  expected: [number, number, number],
  tol: number,
): void {
  check(actual.x, expected[0], tol, 'component x: ');
  check(actual.y, expected[1], tol, 'component y: ');
  check(actual.z, expected[2], tol, 'component z: ');
}
