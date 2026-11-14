/**
 * Cloud Harvesters - MarketEconomy Core Simulation
 * Dynamic harbor commodity pricing, 2%/week evaporation, and supply/demand price feedback.
 */

export type ResourceType = 'frost' | 'skywater' | 'storm';

export interface MarketRate {
  resource: ResourceType;
  basePrice: number;
  currentPrice: number;
  priceHistory: number[];
}

export class MarketEconomy {
  public static readonly EVAPORATION_RATE = 0.02; // 2% per week

  private rates: Record<ResourceType, MarketRate> = {
    frost: { resource: 'frost', basePrice: 25, currentPrice: 25, priceHistory: [25] },
    skywater: { resource: 'skywater', basePrice: 10, currentPrice: 10, priceHistory: [10] },
    storm: { resource: 'storm', basePrice: 18, currentPrice: 18, priceHistory: [18] },
  };

  public getRate(resource: ResourceType): MarketRate {
    return this.rates[resource];
  }

  public getPrice(resource: ResourceType): number {
    return this.rates[resource].currentPrice;
  }

  public getBasePrice(resource: ResourceType): number {
    return this.rates[resource].basePrice;
  }

  public getAllRates(): Record<ResourceType, MarketRate> {
    return { ...this.rates };
  }

  /**
   * Applies weekly evaporation to stored inventory (2% per week)
   */
  public applyEvaporation(storedAmount: number): number {
    return storedAmount * (1 - MarketEconomy.EVAPORATION_RATE);
  }

  /**
   * Market feedback: Selling a batch of 10 units temporarily lowers price by 2%
   */
  public executeSale(resource: ResourceType, units: number): number {
    if (units <= 0) return 0;
    const rate = this.rates[resource];
    const earnings = units * rate.currentPrice;
    const batches = Math.floor(units / 10);
    const priceDropFactor = Math.pow(0.98, batches);

    rate.currentPrice = Math.max(rate.basePrice * 0.4, rate.currentPrice * priceDropFactor);
    rate.priceHistory.push(rate.currentPrice);

    return earnings;
  }

  /**
   * Weekly market recovery: Prices recover 5% towards base price
   */
  public stepWeeklyRecovery(): void {
    Object.values(this.rates).forEach((rate) => {
      const diff = rate.basePrice - rate.currentPrice;
      rate.currentPrice += diff * 0.05;
      rate.priceHistory.push(rate.currentPrice);
    });
  }

  public resetRates(): void {
    this.rates.frost.currentPrice = 25;
    this.rates.frost.priceHistory = [25];
    this.rates.skywater.currentPrice = 10;
    this.rates.skywater.priceHistory = [10];
    this.rates.storm.currentPrice = 18;
    this.rates.storm.priceHistory = [18];
  }
}
