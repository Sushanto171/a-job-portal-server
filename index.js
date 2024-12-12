require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PROT || 5000;
// middleware

app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.0zizn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const run = async () => {
  try {
    const usersCollection = client.db("Job-hunter").collection("users");
    const jobsCollection = client.db("Job-hunter").collection("jobs");

    app.get("/jobs?:id", async (req, res) => {
      try {
        const id = req.query.id;
        if (id) {
          const query = { _id: new ObjectId(id) };
          const result = await jobsCollection.findOne(query);
          res.status(200).send({
            success: true,
            message: "Job data fetching successfully",
            data: result,
          });
          return;
        }
        const result = await jobsCollection.find({}).toArray();
        res.status(200).send({
          success: true,
          message: "All Jobs fetching success",
          data: result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "An error occurred while fetching Jobs",
          error: error.message,
        });
      }
    });

    app.post("/jobs", async (req, res) => {
      try {
        const jobsData = req.body;
        const result = await jobsCollection.insertMany(jobsData);
        res.status(201).send({
          success: true,
          message: "jobs created successfully",
          data: result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "An error occurred while jobs created",
        });
      }
    });

    app.get("/users/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const result = await usersCollection.findOne({ email: email });
        console.log(result, email);
        res.status(200).send({
          success: true,
          message: "user fetching success",
          data: result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "An error occurred while fetching user",
          error: error.message,
        });
      }
    });

    app.post("/users", async (req, res) => {
      try {
        const userData = req.body;
        // user validation
        const existingUser = await usersCollection.findOne({
          email: userData.email,
        });
        if (existingUser) {
          return res.status(409).send({
            success: false,
            message: "User with this email already exists",
          });
        }

        const result = await usersCollection.insertOne(userData);
        res.status(201).send({
          success: true,
          message: "User created successfully",
          data: result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "An error occurred while created user",
          error: error.message,
        });
      }
    });

    app.patch("/users", async (req, res) => {
      try {
        const data = req.body;
        const filter = { email: data.email };
        const option = { upsert: true };
        const doc = { $set: data };
        const result = await usersCollection.updateOne(filter, doc, option);

        if (result.modifiedCount > 0)
          res.status(200).send({
            success: true,
            message: "User information updated successfully",
            data: result,
          });
        else if (result.upsertedCount > 0) {
          res.status(201).send({
            success: true,
            message: "User created successfully",
            data: result,
          });
        } else {
          res.status(200).send({
            success: true,
            message: "User Log in successfully",
            data: result,
          });
        }
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "An error occurred while updating user information ",
          error: error.message,
        });
      }
    });

    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
};
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("a-job-portal server is running on...");
});

app.listen(port, () => {
  console.log(`a-job-portal is running on port: ${port}`);
});
