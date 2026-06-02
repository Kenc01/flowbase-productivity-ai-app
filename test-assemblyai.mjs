// Quick test script to verify AssemblyAI key
const apiKey = "289c486642da40c88b06cbc840aa867b30192606e7148c";

const res = await fetch("https://streaming.assemblyai.com/v3/token?expires_in_seconds=600", {
  method: "GET",
  headers: {
    "Authorization": apiKey,
    "Content-Type": "application/json",
  },
});

console.log("Status:", res.status, res.statusText);
const body = await res.text();
console.log("Body:", body);
