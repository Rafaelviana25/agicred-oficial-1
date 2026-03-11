import fetch from "node-fetch";

async function test() {
  try {
    const res = await fetch("http://localhost:3000/api/create-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "test",
        email: "test@test.com",
        name: "Test",
        taxId: "12345678909",
        amount: 19.90
      })
    });
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
