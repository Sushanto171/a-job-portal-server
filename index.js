require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PROT || 5000;
// middleware

app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(cookieParser());

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ message: "unAuthorized access" });
  }
  jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
    if (error) {
      return res
        .status(403)
        .json({ message: "Forbidden: invalid or expired token" });
    }
    req.user = decoded;
  });
  next();
};
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
    const recruitsCollection = client.db("Job-hunter").collection("recruits");

    // generate jwt token
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const secret = process.env.JWT_SECRET;
      const token = jwt.sign(user, secret, { expiresIn: "1hr" });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .status(201)
        .json({ message: "token generate success", token });
    });

    // status update
    app.patch("/status/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { action } = req.body;
        const query = { _id: new ObjectId(id) };
        const update = { $set: { status: action } };
        const result = await recruitsCollection.updateOne(query, update);
        res.status(200).send({
          success: true,
          message: "updated success",
          data: result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "sever error",
          error: error.message,
        });
      }
    });

    // applied jobs filter by job id
    app.get("/applications/:job_id", async (req, res) => {
      try {
        const job_id = req.params.job_id;
        const filter = { job_id: job_id };

        const result = await recruitsCollection.find(filter).toArray();
        res.status(200).send({
          success: true,
          message: "Application fetching success",
          data: result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "sever error",
          error: error.message,
        });
      }
    });

    app.get("/job-apply/:email", verifyToken, async (req, res) => {
      try {
        const email = req.params.email;
        const filter = { "applicantInfo.email": email };
        if (req.user.email !== email) {
          return res
            .status(403)
            .json({ message: "Forbidden: unAuthorized access" });
        }
        const result = await recruitsCollection.find(filter).toArray();
        res.status(200).send({
          success: true,
          message: "Job applied fetching success",
          data: result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "An error occurred fetching job applied lists",
          error: error.message,
        });
      }
    });

    app.post("/job-apply", async (req, res) => {
      try {
        const data = req.body;
        const result = await recruitsCollection.insertOne(data);
        const query = { _id: new ObjectId(data.job_id) };
        const job = await jobsCollection.findOne(query);

        let count;

        if (job.applicationCount > 0) {
          count = job.applicationCount + 1;
        } else {
          count = 1;
        }
        // console.log(count);
        const updateDoc = {
          $set: { applicationCount: count },
        };
        const updateJob = await jobsCollection.updateOne(query, updateDoc);
        console.log(updateJob);
        res.status(201).send({
          success: true,
          message: "Job apply success",
          data: result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "An error occurred apply failed",
          error: error.message,
        });
      }
    });

    app.get("/jobs-applied", async (req, res) => {
      try {
        const { email, id } = req.query;
        if (email && id) {
          const query = { email: email };
          const user = await usersCollection.findOne(query);

          const query2 = { _id: new ObjectId(id) };
          const job = await jobsCollection.findOne(query2);
          job.appliedName = user.name;
          job.appliedEmail = user.email;
          job.appliedPhoto = user.photo;
          res.status(200).send({
            success: true,
            message: "Applied job data fetching success",
            data: job,
          });
        }
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "An error occurred while applied.",
          error: error.message,
        });
      }
    });

    // job delete by id\
    app.delete("/jobs/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await jobsCollection.deleteOne(query);
        if (!result) {
          return res
            .status(404)
            .send({ success: false, message: "Content not found" });
        }
        res.status(200).send({});
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "An error occurred while deleted Jobs",
          error: error.message,
        });
      }
    });

    // job update
    app.put("/job/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updateData = req.body;
        // console.log(id, updateData);
        const filter = { _id: new ObjectId(id) };
        const update = {
          $set: updateData,
        };
        const result = await jobsCollection.updateOne(filter, update);
        res.status(200).send({
          success: true,
          message: "Job info update success",
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

    app.get("/jobs", async (req, res) => {
      try {
        const { id, hr_email } = req.query;
        if (hr_email) {
          const query = { hr_email: hr_email };
          const result = await jobsCollection.find(query).toArray();
          res.status(200).send({
            success: true,
            message: "Job data fetching successfully",
            data: result,
          });
          return;
        }
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

    // a job post by user
    app.post("/jobs", async (req, res) => {
      try {
        const jobsData = req.body;
        const result = await jobsCollection.insertOne(jobsData);
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

    // await client.connect();
    // await client.db("admin").command({ ping: 1 });
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
