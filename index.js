const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// User : geniusDbUser
// Pass : NUcEztlCFjfJ8Zmx

// Middlewares
app.use(cors());
app.use(express.json());

// Mongo db User & Pass
// console.log(process.env.DB_USER);
// console.log(process.env.DB_PASSWORD);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.athiem3.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri);
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

//Verify JWT
// function verifyJWT(req, res, next) {
//   const authHeader = req.headers.authorization;
//   if (!authorization) {
//     res.status(401).send({ message: "unAuthorize Access" });
//   }
//   const token = authHeader.split("")[1];
//   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
//     if (err) {
//       res.status(401).send({ message: "unAuthorize Access" });
//     }
//     req.decoded = decoded;
//     next();
//   });
//   // console.log(req.headers.authorization);
// }

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "unauthorizetion access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (error, decoded) {
    if (error) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next;
  });
}

// cONNECT MONGO TO DATABASE
async function run() {
  try {
    const serviceCollection = client.db("grniusCar").collection("services");
    const orderCollection = client.db("grniusCar").collection("orders");

    app.post("/jwt", (req, res) => {
      const user = req.body;
      // console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1d",
      });
      res.send({ token });
    });

    app.get("/services", async (req, res) => {
      const search = req.query.search;
      console.log(search);
      let query = {};
      if (search.length) {
        query = {
          $text: {
            $search: search,
          },
        };
      }
      // const query = { price: { $gt: 100, $lt: 200 } };
      // Price assending and Desending
      const order = req.query.order === "asc" ? 1 : -1;
      const cursor = serviceCollection.find(query).sort({ price: order });
      const services = await cursor.toArray();
      res.send(services);
    });

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const service = await serviceCollection.findOne(query);
      res.send(service);
    });

    // orders API here
    app.get("/orders", verifyJWT, async (req, res) => {
      const decoded = req.decoded;
      // console.log("Inside orders api", decoded);
      if (decoded.email !== req.query.email) {
        res.status(403).send.message({ message: "unauthorizetion access" });
      }
      // console.log(req.headers.authorization);
      let query = {};
      if (req.query.email) {
        query = {
          email: req.query.email,
        };
      }
      const cursor = orderCollection.find(query);
      const orders = await cursor.toArray();
      res.send(orders);
    });
    app.post("/orders", verifyJWT, async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.send(result);
    });

    //Update & Approval Pending Orders
    app.patch("/orders:/id", async (req, res) => {
      const id = req.params.id;
      const status = req.body.status;
      const query = { _id: ObjectId(id) };
      const updatecDoc = {
        $set: {
          status: status,
        },
      };
      const result = await orderCollection.updateOne(query, updatecDoc);
      res.send(result);
    });

    app.delete("/orders/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });
  } finally {
  }
}
run().catch((error) => console.log(error));

app.get("/", (req, res) => {
  res.send("genios car server is running");
});

app.listen(port, () => {
  console.log(`Geniors car surver running on ${port}`);
});
