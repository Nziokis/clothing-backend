
# Clothing Backend

## Introduction

This is the backend server for a clothing store application. It provides APIs for managing products, cart items, and other functionalities related to the clothing store.

## Prerequisites

- Node.js 18 or higher installed on your machine.

## Installation

1. Clone the repository to your local machine:

   ```bash
   git clone <repository-url>
   ```

2. Navigate to the project directory:

   ```bash
   cd clothing-backend
   ```

3. Install dependencies using npm:

   ```bash
   npm install
   ```

## Usage

1. Start the server by running the following command:

   ```bash
   node index.js
   ```

   This will start the server on port 4000 by default.

## APIs

- `/api/cartitems`: Endpoint to retrieve cart items.
- `/api/addtocart`: Endpoint to add items to the cart.
- `/api/newcollections`: Endpoint to retrieve new collection items.

## admin user

`{ "email":"admin@app.com",
"name":"admin",
"password":"password"
}`
