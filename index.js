require("dotenv").config();

const express = require("express");
const app = express();
const { Client } = require("pg");
const jwt = require("jsonwebtoken");
const path = require("path");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
app.use(express.json());

app.use(cors());

// Database connection
const client = new Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT || 5432,
});

client
  .connect()
  .then(() => console.log("PostgreSQL connected"))
  .catch((err) => console.error("PostgreSQL connection error:", err));

app.get("/", (req, res) => {
  res.send("Welcome to the home page!");
});

// Schema for creating products
const createProductsTableQuery = `
  CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    image VARCHAR(255),
    category VARCHAR(255),
    new_price NUMERIC DEFAULT 0,
    old_price NUMERIC DEFAULT 0,
    date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    available BOOLEAN DEFAULT true
  );
`;

client.query(createProductsTableQuery);

// Add product endpoint
app.post("/api/addproduct", async (req, res) => {
  const { name, image, category, new_price, old_price } = req.body;
  const insertProductQuery = `
    INSERT INTO products (id, name, image, category, new_price, old_price)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;
  const values = [uuidv4(), name, image, category, new_price, old_price];

  try {
    const result = await client.query(insertProductQuery, values);
    res.json({
      success: true,
      name: result.rows[0].name,
    });
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

//product by ID
app.get("/api/product/:id", async (req, res) => {
  const productId = req.params.id;

  // Assuming the ID is a string, no need for UUID validation
  const getProductByIdQuery = "SELECT * FROM products WHERE id = $1";
  try {
    const result = await client.query(getProductByIdQuery, [productId]);

    if (result.rows.length === 0) {
      // If no product is found with the given ID
      res.status(404).json({ success: false, error: "Product not found" });
    } else {
      console.log(`Product with ID ${productId} fetched`);
      res.send(result.rows[0]); // Assuming there's only one product with a given ID
    }
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// Creating API for deleting products
app.post("/api/removeproduct", async (req, res) => {
  console.log(req.body.id);
  const deleteProductQuery = "DELETE FROM products WHERE id = $1";
  const values = [req.body.id];

  try {
    await client.query(deleteProductQuery, values);
    console.log("Product deleted");
    res.json({
      success: true,
      name: req.body.name,
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// Creating API for getting all products
app.get("/api/allproducts", async (req, res) => {
  const getAllProductsQuery = "SELECT * FROM products";
  try {
    const result = await client.query(getAllProductsQuery);
    console.log("All products fetched");
    res.send(result.rows);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// Use model schema
const createUsersTableQuery = `
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    cart_data JSON,
    date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );
`;

client.query(createUsersTableQuery);

// Endpoint for user registration
app.post("/api/signup", async (req, res) => {
  let check = await client.query("SELECT * FROM users WHERE email = $1", [
    req.body.email,
  ]);
  if (check.rows.length > 0) {
    return res.status(400).json({
      success: false,
      errors: "Existing user found with the same email",
    });
  }

  let cart = {};
  for (let i = 0; i < 300; i++) {
    cart[i] = 0;
  }

  const insertUserQuery = `
    INSERT INTO users (id, name, email, password, cart_data)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;

  const userValues = [
    uuidv4(),
    req.body.name,
    req.body.email,
    req.body.password,
    cart,
  ];

  try {
    const userResult = await client.query(insertUserQuery, userValues);
    const data = {
      user: {
        id: userResult.rows[0].id,
      },
    };
    const token = jwt.sign(data, "secret_ecom");
    res.json({ success: true, token: token });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// Endpoint for user login
app.post("/api/login", async (req, res) => {
  let user = await client.query("SELECT * FROM users WHERE email = $1", [
    req.body.email,
  ]);
  if (user.rows.length > 0) {
    const passCompare = req.body.password === user.rows[0].password;

    if (passCompare) {
      const data = {
        user: {
          id: user.rows[0].id,
        },
      };
      const token = jwt.sign(data, "secret_ecom");
      res.json({ success: true, token });
    } else {
      res.json({ success: false, errors: "Invalid Password" });
    }
  } else {
    res.json({ success: false, errors: "Wrong Email ID" });
  }
});

// Endpoint for new collections
app.get("/api/newcollections", async (req, res) => {
  const getAllProductsQuery = "SELECT * FROM products";
  try {
    const result = await client.query(getAllProductsQuery);
    let newcollection = result.rows.slice(1).slice(-8);
    console.log("New collection fetched");
    res.send(newcollection);
  } catch (error) {
    console.error("Error fetching new collections:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// Endpoint for popular with women
app.get("/api/popularinwomen", async (req, res) => {
  const getWomenProductsQuery = "SELECT * FROM products WHERE category = $1";
  const values = ["laptops"];

  try {
    const result = await client.query(getWomenProductsQuery, values);
    let popular_in_women = result.rows.slice(0, 4);
    console.log("Popular in women fetched");
    res.send(popular_in_women);
  } catch (error) {
    console.error("Error fetching popular in women:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// Define a new table for cart items
const createCartTableQuery = `
  CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY,
    product_id UUID NOT NULL,
    quantity INTEGER NOT NULL
  );
`;

// Execute the query to create the cart_items table
client.query(createCartTableQuery);

// Endpoint to add a product to the cart
app.post("/api/addtocart", async (req, res) => {
  const { productId, quantity } = req.body;

  // Validate productId, userId, and quantity
  if (!productId || !quantity || isNaN(quantity) || quantity <= 0) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid request data" });
  }

  // Check if the product exists
  const getProductQuery = "SELECT * FROM products WHERE id = $1";
  try {
    const productResult = await client.query(getProductQuery, [productId]);
    if (productResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Product not found" });
    }
  } catch (error) {
    console.error("Error checking product:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal Server Error" });
  }

  // Insert the product into the cart_items table
  const insertCartItemQuery = `
    INSERT INTO cart_items (id,  product_id, quantity)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const cartItemId = uuidv4(); // Generate a UUID for the cart item
  const values = [cartItemId, productId, quantity];

  try {
    console.log("Executing insert query:", insertCartItemQuery, values); // Add this line for logging
    const result = await client.query(insertCartItemQuery, values);
    console.log("Cart item inserted:", result.rows[0]); // Add this line for logging
    res.json({ success: true, message: "Item added to cart successfully" });
  } catch (error) {
    console.error("Error adding product to cart:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// Endpoint to retrieve cart items
app.get("/api/cartitems", async (req, res) => {
  // Fetch cart items for the specified user from the cart_items table

  const getCartItemsQuery = "SELECT * FROM cart_items";
  try {
    const result = await client.query(getCartItemsQuery);
    res.json({ success: true, cartItems: result.rows });
  } catch (error) {
    console.error("Error fetching cart items:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// Use the provided port or default to 4000
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
