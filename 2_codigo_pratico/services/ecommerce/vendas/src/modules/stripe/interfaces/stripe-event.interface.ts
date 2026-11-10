export interface LocalStripeObject {
  [key: string]: any;
}

export interface LocalStripeEvent {
  id: string;
  type: string;
  data: {
    object: LocalStripeObject;
  };
}
