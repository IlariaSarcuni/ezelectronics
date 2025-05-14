import { describe, test, expect, beforeAll, afterAll, afterEach } from "@jest/globals"
import request from 'supertest'
import { app } from "../index"
import db from "../src/db/db"
import sqlite3 from 'sqlite3';

export function cleanup(db: sqlite3.Database) {
    db.serialize(() => {
      
      db.run("DELETE FROM users"); 
      db.run("DELETE FROM products"); 
      db.run("DELETE FROM carts"); 
      db.run("DELETE FROM reviews");
      db.run("DELETE FROM cart_items"); 
    });
  }

  const adminCredentials = { username: "AdminUser", password: "AdminPassword" };
  const managerCredentials = { username: "ManagerUser", password: "ManagerPassword" };
  const customer1Credentials = { username: "Customer1", password: "CustomerPassword1" };
  const customer2Credentials = { username: "Customer2", password: "CustomerPassword2" };
  const customer3Credentials = { username: "Customer3", password: "CustomerPassword3" };
  
  const products = [
    { model: "iPhone 13", category: "Smartphone", quantity: 10, details: "", sellingPrice: 200, arrivalDate: "2024-01-01" },
    { model: "MacBook Pro", category: "Laptop", quantity: 5, details: "", sellingPrice: 1500, arrivalDate: "2024-01-01" },
    { model: "Samsung TV", category: "Appliance", quantity: 7, details: "", sellingPrice: 800, arrivalDate: "2024-01-01" }
  ];
  
  async function seedDatabase() {  
    await db.run("PRAGMA foreign_keys = ON");
    
    await request(app).post('/ezelectronics/users').send({ ...adminCredentials, name: "Admin", surname: "User", role: "Admin" });
    await request(app).post('/ezelectronics/users').send({ ...managerCredentials, name: "Manager", surname: "User", role: "Manager" });
    await request(app).post('/ezelectronics/users').send({ ...customer1Credentials, name: "Customer1", surname: "User", role: "Customer" });
    await request(app).post('/ezelectronics/users').send({ ...customer2Credentials, name: "Customer2", surname: "User", role: "Customer" });
    await request(app).post('/ezelectronics/users').send({ ...customer3Credentials, name: "Customer3", surname: "User", role: "Customer" });
  
    
    const loginResponse = await request(app).post('/ezelectronics/sessions').send(adminCredentials);
    for (const product of products) {
      await request(app).post('/ezelectronics/products').set('Cookie', loginResponse.headers['set-cookie']).send(product);
    }
  
    
    const customers = [customer1Credentials, customer2Credentials, customer3Credentials];
    for (const customer of customers) {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(customer);
      await request(app).post('/ezelectronics/carts').set('Cookie', loginResponse.headers['set-cookie']).send({ model: "iPhone 13" });
      await request(app).patch('/ezelectronics/carts').set('Cookie', loginResponse.headers['set-cookie']);
    }
  
    
    const loginResponseUnpaid = await request(app).post('/ezelectronics/sessions').send(customer1Credentials);
    await request(app).post('/ezelectronics/carts').set('Cookie', loginResponseUnpaid.headers['set-cookie']).send({ model: "MacBook Pro" });
  }
  
  describe('GET /ezelectronics/carts', () => {
    beforeAll(async () => {
      await seedDatabase();
    });
  
    afterAll(() => {
      cleanup(db);
    });
  
    test('should return the current cart for a logged-in customer with products', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(customer1Credentials);
      const response = await request(app).get('/ezelectronics/carts').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        customer: "Customer1",
        paid: false,
        paymentDate: null,
        total: 1500,
        products: [{ model: "MacBook Pro", category: "Laptop", quantity: 1, price: 1500 }]
      });
    });
  
    test('should return an empty cart for a logged-in customer with no unpaid cart', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(customer2Credentials);
      const response = await request(app).get('/ezelectronics/carts').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        customer: "Customer2",
        paid: false,
        paymentDate: null,
        total: 0,
        products: []
      });
    });
  
    test('should return 401 if the user is not logged in', async () => {
      const response = await request(app).get('/ezelectronics/carts');
      expect(response.status).toBe(401);
    });
  
    test('should return 401 if the logged-in user is not a customer', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(adminCredentials);
      const response = await request(app).get('/ezelectronics/carts').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(401);
    });
  });

  describe('POST /ezelectronics/carts', () => {
    beforeAll(async () => {
      await seedDatabase();
    });
  
    afterAll(() => {
      cleanup(db);
    });
  
    test('should add a product to the current cart for a logged-in customer', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(customer1Credentials);
      const response = await request(app).post('/ezelectronics/carts').set('Cookie', loginResponse.headers['set-cookie']).send({ model: "iPhone 13" });
      
      expect(response.status).toBe(200);
    });
  
    test('should increase the quantity of an existing product in the cart', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(customer1Credentials);
      await request(app).post('/ezelectronics/carts').set('Cookie', loginResponse.headers['set-cookie']).send({ model: "iPhone 13" });
      const response = await request(app).get('/ezelectronics/carts').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(200);
      expect(response.body.products.find((p:any) => p.model === "iPhone 13").quantity).toBe(2);
    });
  
    test('should return 404 if the product model does not exist', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(customer1Credentials);
      const response = await request(app).post('/ezelectronics/carts').set('Cookie', loginResponse.headers['set-cookie']).send({ model: "NonExistentModel" });
      
      expect(response.status).toBe(404);
    });
  
    test('should return 409 if the product quantity is 0', async () => {
      
      const loginResponseAdmin = await request(app).post('/ezelectronics/sessions').send(adminCredentials);
      
      await request(app).patch('/ezelectronics/products/iPhone 13/sell').set('Cookie', loginResponseAdmin.headers['set-cookie']).send({ quantity: 7 });
      
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(customer1Credentials);
      const response = await request(app).post('/ezelectronics/carts').set('Cookie', loginResponse.headers['set-cookie']).send({ model: "iPhone 13" });
      expect(response.status).toBe(409);
    });
  
    test('should return 401 if the user is not logged in', async () => {
      const response = await request(app).post('/ezelectronics/carts').send({ model: "iPhone 13" });
      expect(response.status).toBe(401);
    });
  
    test('should return 401 if the logged-in user is not a customer', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(adminCredentials);
      const response = await request(app).post('/ezelectronics/carts').set('Cookie', loginResponse.headers['set-cookie']).send({ model: "iPhone 13" });
      
      expect(response.status).toBe(401);
    });
  });
  describe('PATCH /ezelectronics/carts', () => {
    beforeAll(async () => {
      await seedDatabase();
    });
  
    afterAll(() => {
      cleanup(db);
    });
  
    test('should successfully simulate payment for the current cart', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(customer1Credentials);
      const response = await request(app).patch('/ezelectronics/carts').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(200);
    });
  
    test('should return 404 if there is no information about an unpaid cart', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(customer2Credentials);
      const response = await request(app).patch('/ezelectronics/carts').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(404);
    });
  
    test('should return 400 if the cart contains no product', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(customer3Credentials);
      await request(app).post('/ezelectronics/carts').set('Cookie', loginResponse.headers['set-cookie']).send({ model: "iPhone 13" });
      await request(app).delete('/ezelectronics/carts/products/iPhone 13').set('Cookie', loginResponse.headers['set-cookie']);
      const response = await request(app).patch('/ezelectronics/carts').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(400);
    });
  
    test('should return 409 if there is at least one product in the cart whose available quantity in the stock is 0', async () => {

      const loginResponse = await request(app).post('/ezelectronics/sessions').send(customer1Credentials);
      const addtocart =await request(app).post('/ezelectronics/carts').set('Cookie', loginResponse.headers['set-cookie']).send({ model: "iPhone 13" });

      const loginResponseAdmin = await request(app).post('/ezelectronics/sessions').send(adminCredentials);
      await request(app).patch('/ezelectronics/products/iPhone 13/sell').set('Cookie', loginResponseAdmin.headers['set-cookie']).send({ quantity: 7 });

      const response = await request(app).patch('/ezelectronics/carts').set('Cookie', loginResponse.headers['set-cookie']);
      
      console.log(addtocart.body);
      expect(response.status).toBe(409);
    });
  
    test('should return 409 if there is at least one product in the cart whose quantity is higher than the available quantity in the stock', async () => {
  
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(customer1Credentials);
      await request(app).post('/ezelectronics/carts').set('Cookie', loginResponse.headers['set-cookie']).send({ model: "iPhone 13" });
      const response = await request(app).patch('/ezelectronics/carts').set('Cookie', loginResponse.headers['set-cookie']);
      
      console.log(response.body);
      expect(response.status).toBe(409);
    });
  
    test('should return 401 if the user is not logged in', async () => {
      const response = await request(app).patch('/ezelectronics/carts');
      expect(response.status).toBe(401);
    });
  
    test('should return 401 if the logged-in user is not a customer', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(adminCredentials);
      const response = await request(app).patch('/ezelectronics/carts').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(401);
    });
  });

  describe('GET /ezelectronics/carts/history', () => {
    beforeAll(async () => {
      await seedDatabase();
    });
  
    afterAll(() => {
      cleanup(db);
    });
  
    test('should return the history of paid carts for a logged-in customer', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(customer1Credentials);
      await request(app).patch('/ezelectronics/carts').set('Cookie', loginResponse.headers['set-cookie']); 
  
      const response = await request(app).get('/ezelectronics/carts/history').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        {
          customer: "Customer1",
          paid: true,
          paymentDate: expect.any(String),
          total: 200,
          products: [{ model: "iPhone 13", category: "Smartphone", quantity: 1, price: 200 }]
        },
        {
          customer: "Customer1",
          paid: true,
          paymentDate: expect.any(String),
          total: 1500,
          products: [{ model: "MacBook Pro", category: "Laptop", quantity: 1, price: 1500 }]
        }
      ]);
    });
  
    test('should return an empty array if there is no history of paid carts for the customer', async () => {
      const deleteSQL = "DELETE FROM carts WHERE customer_username = 'Customer2'";
      db.run(deleteSQL);

      const loginResponse = await request(app).post('/ezelectronics/sessions').send(customer2Credentials);
      const response = await request(app).get('/ezelectronics/carts/history').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  
    test('should return 401 if the user is not logged in', async () => {
      const response = await request(app).get('/ezelectronics/carts/history');
      expect(response.status).toBe(401);
    });
  
    test('should return 401 if the logged-in user is not a customer', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(adminCredentials);
      const response = await request(app).get('/ezelectronics/carts/history').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /ezelectronics/carts/products/:model', () => {
    beforeAll(async () => {
      await seedDatabase();
    });
  
    afterAll(() => {
      cleanup(db);
    });
  
    test('should remove a product from the current cart of a logged-in customer', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(customer1Credentials);
      await request(app).post('/ezelectronics/carts').set('Cookie', loginResponse.headers['set-cookie']).send({ model: "iPhone 13" });
      const response = await request(app).delete('/ezelectronics/carts/products/iPhone 13').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(200);
    });
  
    test('should return 404 if the product is not in the cart', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(customer1Credentials);
      const response = await request(app).delete('/ezelectronics/carts/products/NonExistentModel').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(404);
    });
  
    test('should return 404 if there is no information about an unpaid cart', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(customer2Credentials);
      const response = await request(app).delete('/ezelectronics/carts/products/iPhone 13').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(404);
    });
  
    test('should return 404 if the product model does not exist', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(customer1Credentials);
      const response = await request(app).delete('/ezelectronics/carts/products/NonExistentModel').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(404);
    });
  
    test('should return 401 if the user is not logged in', async () => {
      const response = await request(app).delete('/ezelectronics/carts/products/iPhone 13');
      expect(response.status).toBe(401);
    });
  
    test('should return 401 if the logged-in user is not a customer', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(adminCredentials);
      const response = await request(app).delete('/ezelectronics/carts/products/iPhone 13').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /ezelectronics/carts/current', () => {
    beforeAll(async () => {
      await seedDatabase();
    });
  
    afterAll(() => {
      cleanup(db);
    });
  
    test('should empty the current cart for a logged-in customer', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(customer1Credentials);
      await request(app).post('/ezelectronics/carts').set('Cookie', loginResponse.headers['set-cookie']).send({ model: "iPhone 13" });
      const response = await request(app).delete('/ezelectronics/carts/current').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(200);
    });
  
    test('should return 404 if there is no information about an unpaid cart', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(customer2Credentials);
      const response = await request(app).delete('/ezelectronics/carts/current').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(404);
    });
  
    test('should return 401 if the user is not logged in', async () => {
      const response = await request(app).delete('/ezelectronics/carts/current');
      expect(response.status).toBe(401);
    });
  
    test('should return 401 if the logged-in user is not a customer', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(adminCredentials);
      const response = await request(app).delete('/ezelectronics/carts/current').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /ezelectronics/carts/current', () => {
    beforeAll(async () => {
      await seedDatabase();
    });
  
    afterAll(() => {
      cleanup(db);
    });
  
    test('should empty the current cart for a logged-in customer', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(customer1Credentials);
      await request(app).post('/ezelectronics/carts').set('Cookie', loginResponse.headers['set-cookie']).send({ model: "iPhone 13" });
      const response = await request(app).delete('/ezelectronics/carts/current').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(200);
    });
  
    test('should return 404 if there is no information about an unpaid cart', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(customer2Credentials);
      const response = await request(app).delete('/ezelectronics/carts/current').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(404);
    });
  
    test('should return 401 if the user is not logged in', async () => {
      const response = await request(app).delete('/ezelectronics/carts/current');
      expect(response.status).toBe(401);
    });
  
    test('should return 401 if the logged-in user is not a customer', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(adminCredentials);
      const response = await request(app).delete('/ezelectronics/carts/current').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(401);
    });


  });
  describe('DELETE /ezelectronics/carts', () => {
    beforeAll(async () => {
      await seedDatabase();
    });
  
    afterAll(() => {
      cleanup(db);
    });
  
    test('should delete all existing carts when called by an admin', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(adminCredentials);
      const response = await request(app).delete('/ezelectronics/carts').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(200);
  
      
      const cartsResponse = await request(app).get('/ezelectronics/carts/all').set('Cookie', loginResponse.headers['set-cookie']);
      expect(cartsResponse.body).toEqual([]);
    });
  
    test('should delete all existing carts when called by a manager', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(managerCredentials);
      const response = await request(app).delete('/ezelectronics/carts').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(200);
  
      
      const cartsResponse = await request(app).get('/ezelectronics/carts/all').set('Cookie', loginResponse.headers['set-cookie']);
      expect(cartsResponse.body).toEqual([]);
    });
  
    test('should return 401 if the logged-in user is not an admin or manager', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(customer1Credentials);
      const response = await request(app).delete('/ezelectronics/carts').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(401);
    });
  
    test('should return 401 if the user is not logged in', async () => {
      const response = await request(app).delete('/ezelectronics/carts');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /ezelectronics/carts/all', () => {
    beforeAll(async () => {
      await seedDatabase();
    });
  
    afterAll(() => {
      cleanup(db);
    });
  
    test('should return all carts for an admin', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(adminCredentials);
      const response = await request(app).get('/ezelectronics/carts/all').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual(expect.arrayContaining([
        expect.objectContaining({ customer: "Customer1" }),
        expect.objectContaining({ customer: "Customer2" }),
        expect.objectContaining({ customer: "Customer3" })
      ]));
    });
  
    test('should return all carts for a manager', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(managerCredentials);
      const response = await request(app).get('/ezelectronics/carts/all').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual(expect.arrayContaining([
        expect.objectContaining({ customer: "Customer1" }),
        expect.objectContaining({ customer: "Customer2" }),
        expect.objectContaining({ customer: "Customer3" })
      ]));
    });
  
    test('should return 401 if the logged-in user is not an admin or manager', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(customer1Credentials);
      const response = await request(app).get('/ezelectronics/carts/all').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(401);
    });
  
    test('should return 401 if the user is not logged in', async () => {
      const response = await request(app).get('/ezelectronics/carts/all');
      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /ezelectronics/products', () => {
    beforeAll(async () => {
      await seedDatabase();
    });
  
    afterAll(() => {
      cleanup(db);
    });
  
    test('should delete all products when called by an admin', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(adminCredentials);
      const response = await request(app).delete('/ezelectronics/products').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(200);
  
      
      const productsResponse = await request(app).get('/ezelectronics/products').set('Cookie', loginResponse.headers['set-cookie']);
      expect(productsResponse.body).toEqual([]);
    });
  
    test('should delete all products when called by a manager', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(managerCredentials);
      const response = await request(app).delete('/ezelectronics/products').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(200);
  
      
      const productsResponse = await request(app).get('/ezelectronics/products').set('Cookie', loginResponse.headers['set-cookie']);
      expect(productsResponse.body).toEqual([]);
    });
  
    test('should return 401 if the logged-in user is not an admin or manager', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(customer1Credentials);
      const response = await request(app).delete('/ezelectronics/products').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(401);
    });
  
    test('should return 401 if the user is not logged in', async () => {
      const response = await request(app).delete('/ezelectronics/products');
      expect(response.status).toBe(401);
    });
  });