export enum ShippingOptions {
  FLAT_RATE = 'FLAT_RATE',
  LOCAL_PICKUP = 'LOCAL_PICKUP',
  TODAY_DELIVERY = 'TODAY_DELIVERY',
  SEVEN_DAYS_DELIVERY = 'SEVEN_DAYS_DELIVERY',
}

export const ShippingCosts = {
  [ShippingOptions.FLAT_RATE]: 20.0,
  [ShippingOptions.LOCAL_PICKUP]: 20.0,
  [ShippingOptions.TODAY_DELIVERY]: 60.0,
  [ShippingOptions.SEVEN_DAYS_DELIVERY]: 7.0,
};
