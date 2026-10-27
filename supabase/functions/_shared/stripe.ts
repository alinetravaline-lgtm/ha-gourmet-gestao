import Stripe from "npm:stripe@23.0.1";

// SDK e versão da API fixados juntos: os campos lidos (invoice.parent, invoice.payments, line.pricing,
// subscription item current_period_*) são os desta versão. O endpoint de webhook deve usar a mesma versão.
export const STRIPE_API_VERSION = "2026-09-30.endive";

export function criarStripe(chave: string): Stripe {
  return new Stripe(chave, {
    apiVersion: STRIPE_API_VERSION,
    httpClient: Stripe.createFetchHttpClient(),
    maxNetworkRetries: 2,
    appInfo: { name: "ha-gourmet-clube" },
  });
}

export const cryptoProvider = Stripe.createSubtleCryptoProvider();

export { Stripe };
