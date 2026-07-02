import { LemonSqueezy } from "./src/config/lemon-squeezy";

async function main() {
  try {
    console.log("Creating checkout...");
    const result = await LemonSqueezy.createCheckout("1727361", {
      email: "test@example.com",
      custom: { userId: "test123", planType: "MONTHLY" },
      redirectUrl: "http://localhost:3000/payment/success",
    });
    console.log("Success:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
