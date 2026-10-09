const express = require("express");

const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const dotenv = require("dotenv");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
dotenv.config();

const uri = process.env.MONGODB_URI;
const app = express();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
);

const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized access" });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized access" });
  }
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const database = client.db("godrive");
    const carsCollection = database.collection("cars");
    const bookingsCollection = database.collection("bookings");

    app.get("/cars", async (req, res) => {
      const result = await carsCollection.find({});
      const cars = await result.toArray();
      res.json(cars);
    });

    app.post("/cars", async (req, res) => {
      const carData = req.body;
      const result = await carsCollection.insertOne(carData);
      res.json(result);
    });

    app.get("/cars/:id", verifyToken, async (req, res) => {
      const { id } = req.params;
      const result = await carsCollection.findOne({ _id: new ObjectId(id) });
      res.json(result);
    });

    app.get("/bookings/:userId", async (req, res) => {
      const { userId } = req.params;
      const result = await bookingsCollection.find({ userId }).toArray();
      res.json(result);
    });

    app.delete("/bookings/:userId", async (req, res) => {
      const { userId } = req.params;
      const result = await bookingsCollection.deleteOne({ userId });
      res.json(result);
    });

    app.post("/bookings", verifyToken, async (req, res) => {
      const bookingData = req.body;
      const result = await bookingsCollection.insertOne(bookingData);
      res.json(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
