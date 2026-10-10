import test from "node:test";
import assert from "node:assert/strict";
import { Money } from "../src/models/money.ts";

test("Money handles integer minor units and major conversion", () => {
  const m1 = Money.fromCents(2510, "USD");
  assert.equal(m1.minorUnits, 2510);
  assert.equal(m1.majorUnits, 25.10);

  const m2 = Money.fromMajor(25.10, "USD");
  assert.equal(m2.minorUnits, 2510);
  assert.ok(m1.equals(m2));
});

test("Money operations: add, subtract, multiply", () => {
  const m1 = Money.fromCents(1000, "USD"); // $10.00
  const m2 = Money.fromCents(250, "USD");  // $2.50

  const sum = m1.add(m2);
  assert.equal(sum.minorUnits, 1250);

  const diff = m1.subtract(m2);
  assert.equal(diff.minorUnits, 750);

  const product = m2.multiply(1.5);
  assert.equal(product.minorUnits, 375); // $3.75
});

test("Money throws on mismatched currencies", () => {
  const usd = Money.fromCents(100, "USD");
  const eur = Money.fromCents(100, "EUR");
  assert.throws(() => usd.add(eur), /Currency mismatch/);
});
