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

  describe('POST /ezelectronics/reviews/:model', () => {
    beforeAll(async () => {
      await seedDatabase();
    });
  
    afterAll(() => {
      cleanup(db);
    });
  
    test('should add a new review for a product by a logged-in customer', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(customer1Credentials);
      const response = await request(app).post('/ezelectronics/reviews/iPhone 13').set('Cookie', loginResponse.headers['set-cookie']).send({ score: 5, comment: "A very cool smartphone!" });
      
      expect(response.status).toBe(200);
    });
  
    test('should return 404 if the product model does not exist', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(customer1Credentials);
      const response = await request(app).post('/ezelectronics/reviews/NonExistentModel').set('Cookie', loginResponse.headers['set-cookie']).send({ score: 5, comment: "A very cool smartphone!" });
      
      expect(response.status).toBe(404);
    });
  
    test('should return 409 if there is an existing review for the product made by the customer', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(customer1Credentials);
      await request(app).post('/ezelectronics/reviews/iPhone 13').set('Cookie', loginResponse.headers['set-cookie']).send({ score: 5, comment: "A very cool smartphone!" });
      const response = await request(app).post('/ezelectronics/reviews/iPhone 13').set('Cookie', loginResponse.headers['set-cookie']).send({ score: 4, comment: "Still a great phone!" });
      
      expect(response.status).toBe(409);
    });
  
    test('should return 401 if the user is not logged in', async () => {
      const response = await request(app).post('/ezelectronics/reviews/iPhone 13').send({ score: 5, comment: "A very cool smartphone!" });
      expect(response.status).toBe(401);
    });
  
    test('should return 401 if the logged-in user is not a customer', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(adminCredentials);
      const response = await request(app).post('/ezelectronics/reviews/iPhone 13').set('Cookie', loginResponse.headers['set-cookie']).send({ score: 5, comment: "A very cool smartphone!" });
      
      expect(response.status).toBe(401);
    });
  });

  describe('GET /ezelectronics/reviews/:model', () => {
    beforeAll(async () => {
      await seedDatabase();
    });
  
    afterAll(() => {
      cleanup(db);
    });
  
    test('should return all reviews for a specific product for a logged-in user', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(customer1Credentials);
      await request(app).post('/ezelectronics/reviews/iPhone 13').set('Cookie', loginResponse.headers['set-cookie']).send({ score: 5, comment: "A very cool smartphone!" });
      
      const response = await request(app).get('/ezelectronics/reviews/iPhone 13').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual(expect.arrayContaining([
        expect.objectContaining({ model: "iPhone 13", user: "Customer1", score: 5, date: expect.any(String), comment: "A very cool smartphone!" })
      ]));
    });
  
    test('should return 404 if the product model does not exist', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(customer1Credentials);
      const response = await request(app).get('/ezelectronics/reviews/NonExistentModel').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(404);
    });
  
    test('should return 401 if the user is not logged in', async () => {
      const response = await request(app).get('/ezelectronics/reviews/iPhone 13');
      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /ezelectronics/reviews/:model', () => {
    beforeAll(async () => {
      await seedDatabase();
    });
  
    afterAll(() => {
      cleanup(db);
    });
  
    test('should delete the review made by the current user for a specific product', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(customer1Credentials);
      await request(app).post('/ezelectronics/reviews/iPhone 13').set('Cookie', loginResponse.headers['set-cookie']).send({ score: 5, comment: "A very cool smartphone!" });
      const response = await request(app).delete('/ezelectronics/reviews/iPhone 13').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(200);
    });
  
    test('should return 404 if the product model does not exist', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(customer1Credentials);
      const response = await request(app).delete('/ezelectronics/reviews/NonExistentModel').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(404);
    });
  
    test('should return 404 if the current user does not have a review for the product', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(customer1Credentials);
      const response = await request(app).delete('/ezelectronics/reviews/iPhone 13').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(404);
    });
  
    test('should return 401 if the user is not logged in', async () => {
      const response = await request(app).delete('/ezelectronics/reviews/iPhone 13');
      expect(response.status).toBe(401);
    });
  
    test('should return 401 if the logged-in user is not a customer', async () => {
      const loginResponse = await request(app).post('/ezelectronics/sessions').send(adminCredentials);
      const response = await request(app).delete('/ezelectronics/reviews/iPhone 13').set('Cookie', loginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /ezelectronics/reviews/:model/all', () => {
    beforeAll(async () => {
      await seedDatabase();
    });
  
    afterAll(() => {
      cleanup(db);
    });
  
    test('should delete all reviews for a specific product when called by an admin', async () => {
      
      const customerLoginResponse = await request(app).post('/ezelectronics/sessions').send(customer1Credentials);
      await request(app).post('/ezelectronics/reviews/iPhone 13').set('Cookie', customerLoginResponse.headers['set-cookie']).send({ score: 5, comment: "A very cool smartphone!" });
  
      
      const adminLoginResponse = await request(app).post('/ezelectronics/sessions').send(adminCredentials);
      const response = await request(app).delete('/ezelectronics/reviews/iPhone 13/all').set('Cookie', adminLoginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(200);
  
      
      const reviewsResponse = await request(app).get('/ezelectronics/reviews/iPhone 13').set('Cookie', customerLoginResponse.headers['set-cookie']);
      expect(reviewsResponse.body).toEqual([]);
    });
  
    test('should delete all reviews for a specific product when called by a manager', async () => {
      
      const customerLoginResponse = await request(app).post('/ezelectronics/sessions').send(customer1Credentials);
      await request(app).post('/ezelectronics/reviews/iPhone 13').set('Cookie', customerLoginResponse.headers['set-cookie']).send({ score: 5, comment: "A very cool smartphone!" });
  
      
      const managerLoginResponse = await request(app).post('/ezelectronics/sessions').send(managerCredentials);
      const response = await request(app).delete('/ezelectronics/reviews/iPhone 13/all').set('Cookie', managerLoginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(200);
  
      
      const reviewsResponse = await request(app).get('/ezelectronics/reviews/iPhone 13').set('Cookie', customerLoginResponse.headers['set-cookie']);
      expect(reviewsResponse.body).toEqual([]);
    });
  
    test('should return 404 if the product model does not exist', async () => {
      const adminLoginResponse = await request(app).post('/ezelectronics/sessions').send(adminCredentials);
      const response = await request(app).delete('/ezelectronics/reviews/NonExistentModel/all').set('Cookie', adminLoginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(404);
    });
  
    test('should return 401 if the logged-in user is not an admin or manager', async () => {
      const customerLoginResponse = await request(app).post('/ezelectronics/sessions').send(customer1Credentials);
      const response = await request(app).delete('/ezelectronics/reviews/iPhone 13/all').set('Cookie', customerLoginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(401);
    });
  
    test('should return 401 if the user is not logged in', async () => {
      const response = await request(app).delete('/ezelectronics/reviews/iPhone 13/all');
      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /ezelectronics/reviews', () => {
    beforeAll(async () => {
      await seedDatabase();
    });
  
    afterAll(() => {
      cleanup(db);
    });
  
    test('should delete all reviews when called by an admin', async () => {
      
      const customerLoginResponse = await request(app).post('/ezelectronics/sessions').send(customer1Credentials);
      await request(app).post('/ezelectronics/reviews/iPhone 13').set('Cookie', customerLoginResponse.headers['set-cookie']).send({ score: 5, comment: "A very cool smartphone!" });
  
      
      const adminLoginResponse = await request(app).post('/ezelectronics/sessions').send(adminCredentials);
      const response = await request(app).delete('/ezelectronics/reviews').set('Cookie', adminLoginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(200);
  
      
      const reviewsResponse = await request(app).get('/ezelectronics/reviews/iPhone 13').set('Cookie', customerLoginResponse.headers['set-cookie']);
      expect(reviewsResponse.body).toEqual([]);
    });
  
    test('should delete all reviews when called by a manager', async () => {
      
      const customerLoginResponse = await request(app).post('/ezelectronics/sessions').send(customer1Credentials);
      await request(app).post('/ezelectronics/reviews/iPhone 13').set('Cookie', customerLoginResponse.headers['set-cookie']).send({ score: 5, comment: "A very cool smartphone!" });
  
      
      const managerLoginResponse = await request(app).post('/ezelectronics/sessions').send(managerCredentials);
      const response = await request(app).delete('/ezelectronics/reviews').set('Cookie', managerLoginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(200);
  
      
      const reviewsResponse = await request(app).get('/ezelectronics/reviews/iPhone 13').set('Cookie', customerLoginResponse.headers['set-cookie']);
      expect(reviewsResponse.body).toEqual([]);
    });
  
    test('should return 401 if the logged-in user is not an admin or manager', async () => {
      const customerLoginResponse = await request(app).post('/ezelectronics/sessions').send(customer1Credentials);
      const response = await request(app).delete('/ezelectronics/reviews').set('Cookie', customerLoginResponse.headers['set-cookie']);
      
      expect(response.status).toBe(401);
    });
  
    test('should return 401 if the user is not logged in', async () => {
      const response = await request(app).delete('/ezelectronics/reviews');
      expect(response.status).toBe(401);
    });
  });