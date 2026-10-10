/**
 * Exact monetary representation using integer minor units (cents)
 * to prevent floating-point calculation errors per Section 75.
 */
export class Money {
  readonly minorUnits: number; // e.g. 2510 for $25.10
  readonly currency: string;

  constructor(minorUnits: number, currency: string = "USD") {
    if (!Number.isInteger(minorUnits)) {
      throw new TypeError(`Money minor units must be an integer, received: ${minorUnits}`);
    }
    this.minorUnits = minorUnits;
    this.currency = currency.toUpperCase();
  }

  static fromCents(cents: number, currency: string = "USD"): Money {
    return new Money(Math.round(cents), currency);
  }

  static fromMajor(major: number, currency: string = "USD"): Money {
    return new Money(Math.round(major * 100), currency);
  }

  static zero(currency: string = "USD"): Money {
    return new Money(0, currency);
  }

  get majorUnits(): number {
    return this.minorUnits / 100;
  }

  add(other: Money): Money {
    this.assertMatchingCurrency(other);
    return new Money(this.minorUnits + other.minorUnits, this.currency);
  }

  subtract(other: Money): Money {
    this.assertMatchingCurrency(other);
    return new Money(this.minorUnits - other.minorUnits, this.currency);
  }

  multiply(factor: number): Money {
    return new Money(Math.round(this.minorUnits * factor), this.currency);
  }

  divide(divisor: number): Money {
    if (divisor === 0) {
      throw new RangeError("Division by zero in Money.divide()");
    }
    return new Money(Math.round(this.minorUnits / divisor), this.currency);
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.minorUnits === other.minorUnits;
  }

  greaterThan(other: Money): boolean {
    this.assertMatchingCurrency(other);
    return this.minorUnits > other.minorUnits;
  }

  lessThan(other: Money): boolean {
    this.assertMatchingCurrency(other);
    return this.minorUnits < other.minorUnits;
  }

  isZero(): boolean {
    return this.minorUnits === 0;
  }

  isPositive(): boolean {
    return this.minorUnits > 0;
  }

  isNegative(): boolean {
    return this.minorUnits < 0;
  }

  format(locale: string = "en-US"): string {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: this.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(this.majorUnits);
  }

  toJSON(): { minorUnits: number; currency: string; formatted: string } {
    return {
      minorUnits: this.minorUnits,
      currency: this.currency,
      formatted: this.format(),
    };
  }

  private assertMatchingCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new TypeError(`Currency mismatch: cannot operate on ${this.currency} and ${other.currency}`);
    }
  }
}
