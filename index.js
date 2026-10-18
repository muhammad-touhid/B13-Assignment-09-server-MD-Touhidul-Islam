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
  const database = client.db("godrive");
  const carsCollection = database.collection("cars");
  const bookingsCollection = database.collection("bookings");

  app.get("/available-cars", async (req, res) => {
    try {
      const cars = await carsCollection
        .find({ availabilityStatus: "Available" })
        .limit(6)
        .toArray();

      res.json(cars);
    } catch (error) {
      console.error("Available cars error:", error);
      res.status(500).json({ message: "Failed to fetch available cars" });
    }
  });

  app.get("/cars", async (req, res) => {
    try {
      const cars = await carsCollection.find({}).toArray();
      res.json(cars);
    } catch (error) {
      console.error("Fetch cars error:", error);
      res.status(500).json({ message: "Failed to fetch cars" });
    }
  });

  app.post("/cars", async (req, res) => {
    try {
      const result = await carsCollection.insertOne(req.body);
      res.json(result);
    } catch (error) {
      console.error("Add car error:", error);
      res.status(500).json({ message: "Failed to add car" });
    }
  });

  app.get("/cars/:id", verifyToken, async (req, res) => {
    try {
      const car = await carsCollection.findOne({
        _id: new ObjectId(req.params.id),
      });

      if (!car) {
        return res.status(404).json({ message: "Car not found" });
      }

      res.json(car);
    } catch (error) {
      console.error("Car details error:", error);
      res.status(500).json({ message: "Failed to fetch car details" });
    }
  });

  app.get("/bookings/:userId", async (req, res) => {
    try {
      const bookings = await bookingsCollection
        .find({ userId: req.params.userId })
        .toArray();

      res.json(bookings);
    } catch (error) {
      console.error("Fetch bookings error:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.delete("/bookings/:userId", async (req, res) => {
    try {
      const result = await bookingsCollection.deleteOne({
        userId: req.params.userId,
      });

      res.json(result);
    } catch (error) {
      console.error("Delete booking error:", error);
      res.status(500).json({ message: "Failed to delete booking" });
    }
  });

  app.post("/bookings", verifyToken, async (req, res) => {
    try {
      const result = await bookingsCollection.insertOne(req.body);
      res.json(result);
    } catch (error) {
      console.error("Create booking error:", error);
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  app.get("/", (req, res) => {
    res.send("Hello, World!");
  });

  // Connect once for this server instance.
  const connectPromise = client.connect();

  app.use(async (req, res, next) => {
    try {
      await connectPromise;
      next();
    } catch (error) {
      console.error("MongoDB connection error:", error);
      res.status(500).json({ message: "Database connection failed" });
    }
  });

  if (require.main === module) {
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  }

  module.exports = app;
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
