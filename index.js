const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PROT || 5000;
// middleware

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("a-job-portal server is running on...");
});

app.listen(port, () => {
  console.log(`a-job-portal is running on port: ${port}`);
});
