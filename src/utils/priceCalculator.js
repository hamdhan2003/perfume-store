export function calculatePrices(prices) {
    if (!prices || !prices.base6ml) return null;
  
    const base = prices.base6ml;
  
    const sizePercentages = prices.sizePercentages || {
      size3: -30,
      size12: 35
    };
  
    const discountPercentages = prices.discountPercentages || {};
  
    const calc = (basePrice, percent) =>
      Math.round(basePrice + (basePrice * percent) / 100);
  
    const applyDiscount = (price, discount) =>
      discount != null
        ? Math.round(price - (price * discount) / 100)
        : null;
  
    const price3 = calc(base, sizePercentages.size3);
    const price12 = calc(base, sizePercentages.size12);
  
    return {
      "3": {
        original: price3,
        discounted: applyDiscount(price3, discountPercentages.size3)
      },
      "6": {
        original: base,
        discounted: applyDiscount(base, discountPercentages.base)
      },
      "12": {
        original: price12,
        discounted: applyDiscount(price12, discountPercentages.size12)
      }
    };
  }
  