import paypal from "@paypal/checkout-server-sdk";
import ENV from "../config/env.js";

let environment;

if (ENV.PAYPAL_ENV === "live") {
  environment = new paypal.core.LiveEnvironment(
    ENV.PAYPAL_LIVE_CLIENT_ID,
    ENV.PAYPAL_LIVE_CLIENT_SECRET,
  );
} else {
  environment = new paypal.core.SandboxEnvironment(
    ENV.PAYPAL_CLIENT_ID,
    ENV.PAYPAL_CLIENT_SECRET,
  );
}

const client = new paypal.core.PayPalHttpClient(environment);

export default client;
