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

  export function cleanuptable(db: sqlite3.Database, table: string) {
    db.serialize(() => {
      db.run("DELETE FROM " + table);
    });
  }

  describe('POST /ezelectronics/products', () => {
    const adminCredentials = {
        username: "AdminUser",
        password: "AdminPassword"
    };

    const managerCredentials = {
        username: "ManagerUser",
        password: "ManagerPassword"
    };

    const validProduct = {
        model: "iPhone 13",
        category: "Smartphone",
        quantity: 5,
        details: "",
        sellingPrice: 200,
        arrivalDate: "2024-01-01"
    };

    beforeAll(async () => {
        await db.run("PRAGMA foreign_keys = ON");
        await request(app)
            .post('/ezelectronics/users')
            .send({
                username: "AdminUser",
                name: "Admin",
                surname: "User",
                password: "AdminPassword",
                role: "Admin"
            });

        await request(app)
            .post('/ezelectronics/users')
            .send({
                username: "ManagerUser",
                name: "Manager",
                surname: "User",
                password: "ManagerPassword",
                role: "Manager"
            });
    });

    afterAll(() => {
        cleanup(db);
    });

    test('should allow admin to register a new product', async () => {
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const response = await request(app)
            .post('/ezelectronics/products')
            .set('Cookie', loginResponse.headers['set-cookie'])
            .send(validProduct);
        expect(response.status).toBe(200);
        cleanuptable(db, "products");
    });

    test('should allow manager to register a new product', async () => {
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(managerCredentials);

        const response = await request(app)
            .post('/ezelectronics/products')
            .set('Cookie', loginResponse.headers['set-cookie'])
            .send(validProduct);
        console.log(response.body)
        expect(response.status).toBe(200);
    });

    test('should return 401 if not logged in', async () => {
        const response = await request(app)
            .post('/ezelectronics/products')
            .send(validProduct);

        expect(response.status).toBe(401);
    });

    test('should return 401 if logged in but not as admin or manager', async () => {
        await request(app)
            .post('/ezelectronics/users')
            .send({
                username: "RegularUser",
                name: "Regular",
                surname: "User",
                password: "RegularPassword",
                role: "Customer"
            });

        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send({
                username: "RegularUser",
                password: "RegularPassword"
            });

        const response = await request(app)
            .post('/ezelectronics/products')
            .set('Cookie', loginResponse.headers['set-cookie'])
            .send(validProduct);

        expect(response.status).toBe(401);
    });

    test('should return 409 if model already exists', async () => {
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        await request(app)
            .post('/ezelectronics/products')
            .set('Cookie', loginResponse.headers['set-cookie'])
            .send(validProduct);

        const response = await request(app)
            .post('/ezelectronics/products')
            .set('Cookie', loginResponse.headers['set-cookie'])
            .send(validProduct);

        expect(response.status).toBe(409);
    });

    test('should return 400 if arrivalDate is in the future', async () => {
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const futureDateProduct = { ...validProduct, arrivalDate: "3000-01-01" };

        const response = await request(app)
            .post('/ezelectronics/products')
            .set('Cookie', loginResponse.headers['set-cookie'])
            .send(futureDateProduct);

        expect(response.status).toBe(400);
    });
});


describe('PATCH /ezelectronics/products/:model', () => {
    const adminCredentials = {
        username: "AdminUser",
        password: "AdminPassword"
    };

    const validProduct = {
        model: "iPhone 13",
        category: "Smartphone",
        quantity: 5,
        details: "",
        sellingPrice: 200,
        arrivalDate: "2024-01-01"
    };

    const updateData = {
        quantity: 3,
        changeDate: "2024-01-02"
    };

    beforeAll(async () => {
        await request(app)
            .post('/ezelectronics/users')
            .send({
                username: "AdminUser",
                name: "Admin",
                surname: "User",
                password: "AdminPassword",
                role: "Admin"
            });

        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        await request(app)
            .post('/ezelectronics/products')
            .set('Cookie', loginResponse.headers['set-cookie'])
            .send(validProduct);
    });

    afterAll(() => {
        cleanup(db);
    });

    test('should increase the quantity of an existing product by an authorized user', async () => {
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const response = await request(app)
            .patch(`/ezelectronics/products/${validProduct.model}`)
            .set('Cookie', loginResponse.headers['set-cookie'])
            .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.quantity).toBe(validProduct.quantity + updateData.quantity);
    });

    test('should return 404 if product model does not exist', async () => {
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const response = await request(app)
            .patch('/ezelectronics/products/NonExistentModel')
            .set('Cookie', loginResponse.headers['set-cookie'])
            .send(updateData);

        expect(response.status).toBe(404);
    });

    test('should return 400 if changeDate is in the future', async () => {
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const futureDateData = { ...updateData, changeDate: "3000-01-01" };

        const response = await request(app)
            .patch(`/ezelectronics/products/${validProduct.model}`)
            .set('Cookie', loginResponse.headers['set-cookie'])
            .send(futureDateData);

        expect(response.status).toBe(400);
    });

    test('should return 400 if changeDate is before the product\'s arrivalDate', async () => {
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const invalidDateData = { ...updateData, changeDate: "2023-12-31" };

        const response = await request(app)
            .patch(`/ezelectronics/products/${validProduct.model}`)
            .set('Cookie', loginResponse.headers['set-cookie'])
            .send(invalidDateData);

        expect(response.status).toBe(400);
    });

    test('should return 401 if user is not authorized', async () => {
        await request(app)
            .post('/ezelectronics/users')
            .send({
                username: "RegularUser",
                name: "Regular",
                surname: "User",
                password: "RegularPassword",
                role: "Customer"
            });

        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send({
                username: "RegularUser",
                password: "RegularPassword"
            });

        const response = await request(app)
            .patch(`/ezelectronics/products/${validProduct.model}`)
            .set('Cookie', loginResponse.headers['set-cookie'])
            .send(updateData);

        expect(response.status).toBe(401);
    });
});

describe('PATCH /ezelectronics/products/:model/sell', () => {
    const adminCredentials = {
        username: "AdminUser",
        password: "AdminPassword"
    };

    const validProduct = {
        model: "iPhone 13",
        category: "Smartphone",
        quantity: 5,
        details: "",
        sellingPrice: 200,
        arrivalDate: "2024-01-01"
    };

    const sellData = {
        quantity: 5,
        sellingDate: "2024-01-02"
    };

    beforeAll(async () => {
        
        await request(app)
            .post('/ezelectronics/users')
            .send({
                username: "AdminUser",
                name: "Admin",
                surname: "User",
                password: "AdminPassword",
                role: "Admin"
            });

        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        await request(app)
            .post('/ezelectronics/products')
            .set('Cookie', loginResponse.headers['set-cookie'])
            .send(validProduct);
    });

    afterAll(() => {
        cleanup(db);
    });

    test('should record a sale and reduce the quantity of an existing product by an authorized user', async () => {
        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const response = await request(app)
            .patch(`/ezelectronics/products/${validProduct.model}/sell`)
            .set('Cookie', loginResponse.headers['set-cookie'])
            .send(sellData);

        expect(response.status).toBe(200);
    });

    test('should return 404 if product model does not exist', async () => {
        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const response = await request(app)
            .patch('/ezelectronics/products/NonExistentModel/sell')
            .set('Cookie', loginResponse.headers['set-cookie'])
            .send(sellData);

        expect(response.status).toBe(404);
    });

    test('should return 400 if sellingDate is in the future', async () => {
        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const futureDateData = { ...sellData, sellingDate: "3000-01-01" };

        const response = await request(app)
            .patch(`/ezelectronics/products/${validProduct.model}/sell`)
            .set('Cookie', loginResponse.headers['set-cookie'])
            .send(futureDateData);

        expect(response.status).toBe(400);
    });

    test('should return 400 if sellingDate is before the product\'s arrivalDate', async () => {
        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const invalidDateData = { ...sellData, sellingDate: "2023-12-31" };

        const response = await request(app)
            .patch(`/ezelectronics/products/${validProduct.model}/sell`)
            .set('Cookie', loginResponse.headers['set-cookie'])
            .send(invalidDateData);

        expect(response.status).toBe(400);
    });

    test('should return 409 if product quantity is 0', async () => {
        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);


        const response = await request(app)
            .patch(`/ezelectronics/products/iPhone 13/sell`)
            .set('Cookie', loginResponse.headers['set-cookie'])
            .send(sellData);

        expect(response.status).toBe(409);
    });

    test('should return 409 if selling quantity is greater than available quantity', async () => {
        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const excessiveQuantityData = { ...sellData, quantity: 10 };

        const response = await request(app)
            .patch(`/ezelectronics/products/${validProduct.model}/sell`)
            .set('Cookie', loginResponse.headers['set-cookie'])
            .send(excessiveQuantityData);

        expect(response.status).toBe(409);
    });

    test('should return 401 if user is not authorized', async () => {
        
        await request(app)
            .post('/ezelectronics/users')
            .send({
                username: "RegularUser",
                name: "Regular",
                surname: "User",
                password: "RegularPassword",
                role: "Customer"
            });

        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send({
                username: "RegularUser",
                password: "RegularPassword"
            });

        const response = await request(app)
            .patch(`/ezelectronics/products/${validProduct.model}/sell`)
            .set('Cookie', loginResponse.headers['set-cookie'])
            .send(sellData);

        expect(response.status).toBe(401);
    });
});


describe('GET /ezelectronics/products', () => {
    const adminCredentials = {
        username: "AdminUser",
        password: "AdminPassword"
    };

    const validProduct1 = {
        model: "iPhone 13",
        category: "Smartphone",
        quantity: 5,
        details: "",
        sellingPrice: 200,
        arrivalDate: "2024-01-01"
    };

    const validProduct2 = {
        model: "MacBook Pro",
        category: "Laptop",
        quantity: 3,
        details: "",
        sellingPrice: 1500,
        arrivalDate: "2024-01-01"
    };

    beforeAll(async () => {
        
        await request(app)
            .post('/ezelectronics/users')
            .send({
                username: "AdminUser",
                name: "Admin",
                surname: "User",
                password: "AdminPassword",
                role: "Admin"
            });

        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        await request(app)
            .post('/ezelectronics/products')
            .set('Cookie', loginResponse.headers['set-cookie'])
            .send(validProduct1);

        await request(app)
            .post('/ezelectronics/products')
            .set('Cookie', loginResponse.headers['set-cookie'])
            .send(validProduct2);
    });

    afterAll(() => {
        cleanup(db);
    });

    test('should return all products if no filters are applied', async () => {
        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const response = await request(app)
            .get('/ezelectronics/products')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBeTruthy();
        expect(response.body.length).toBeGreaterThan(0);
    });

    test('should return products filtered by category', async () => {
        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const response = await request(app)
            .get('/ezelectronics/products?grouping=category&category=Smartphone')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBeTruthy();
        response.body.forEach((product: any) => {
            expect(product.category).toBe("Smartphone");
        });
    });

    test('should return product filtered by model', async () => {
        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const response = await request(app)
            .get('/ezelectronics/products?grouping=model&model=iPhone 13')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBeTruthy();
        response.body.forEach((product: any) => {
            expect(product.model).toBe("iPhone 13");
        });
    });

    test('should return 422 if grouping is null and category or model is not null', async () => {
        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const response = await request(app)
            .get('/ezelectronics/products?category=Smartphone')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response.status).toBe(422);
    });

    test('should return 422 if grouping is category and category is null or model is not null', async () => {
        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const response1 = await request(app)
            .get('/ezelectronics/products?grouping=category')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response1.status).toBe(422);

        const response2 = await request(app)
            .get('/ezelectronics/products?grouping=category&model=iPhone 13')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response2.status).toBe(422);
    });

    test('should return 422 if grouping is model and model is null or category is not null', async () => {
        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const response1 = await request(app)
            .get('/ezelectronics/products?grouping=model')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response1.status).toBe(422);

        const response2 = await request(app)
            .get('/ezelectronics/products?grouping=model&category=Smartphone')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response2.status).toBe(422);
    });

    test('should return 404 if model does not exist in the database', async () => {
        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const response = await request(app)
            .get('/ezelectronics/products?grouping=model&model=NonExistentModel')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response.status).toBe(404);
    });

    test('should return 401 if user is not authorized', async () => {
        
        await request(app)
            .post('/ezelectronics/users')
            .send({
                username: "RegularUser",
                name: "Regular",
                surname: "User",
                password: "RegularPassword",
                role: "Customer"
            });

        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send({
                username: "RegularUser",
                password: "RegularPassword"
            });

        const response = await request(app)
            .get('/ezelectronics/products')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response.status).toBe(401);
    });
});

describe('GET /ezelectronics/products/available', () => {
    const adminCredentials = {
        username: "AdminUser",
        password: "AdminPassword"
    };

    const validProduct1 = {
        model: "iPhone 13",
        category: "Smartphone",
        quantity: 5,
        details: "",
        sellingPrice: 200,
        arrivalDate: "2024-01-01"
    };

    const validProduct2 = {
        model: "MacBook Pro",
        category: "Laptop",
        quantity: 3,
        details: "",
        sellingPrice: 1500,
        arrivalDate: "2024-01-01"
    };

    beforeAll(async () => {
        
        await request(app)
            .post('/ezelectronics/users')
            .send({
                username: "AdminUser",
                name: "Admin",
                surname: "User",
                password: "AdminPassword",
                role: "Admin"
            });

        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        await request(app)
            .post('/ezelectronics/products')
            .set('Cookie', loginResponse.headers['set-cookie'])
            .send(validProduct1);

        await request(app)
            .post('/ezelectronics/products')
            .set('Cookie', loginResponse.headers['set-cookie'])
            .send(validProduct2);

        
        await request(app)
            .patch(`/ezelectronics/products/${validProduct2.model}/sell`)
            .set('Cookie', loginResponse.headers['set-cookie'])
            .send({ quantity: 3, sellingDate: "2024-01-02" });
    });

    afterAll(() => {
        cleanup(db);
    });

    test('should return all available products if no filters are applied', async () => {
        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const response = await request(app)
            .get('/ezelectronics/products/available')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBeTruthy();
        expect(response.body.length).toBe(1); 
        console.log(response.body);
    });

    test('should return available products filtered by category', async () => {
        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const response = await request(app)
            .get('/ezelectronics/products/available?grouping=category&category=Smartphone')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBeTruthy();
        response.body.forEach((product: any) => {
            expect(product.category).toBe("Smartphone");
        });
    });

    test('should return available product filtered by model', async () => {
        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const response = await request(app)
            .get('/ezelectronics/products/available?grouping=model&model=iPhone 13')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBeTruthy();
        response.body.forEach((product: any) => {
            expect(product.model).toBe("iPhone 13");
        });
    });

    test('should return 422 if grouping is null and category or model is not null', async () => {
        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const response = await request(app)
            .get('/ezelectronics/products/available?category=Smartphone')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response.status).toBe(422);
    });

    test('should return 422 if grouping is category and category is null or model is not null', async () => {
        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const response1 = await request(app)
            .get('/ezelectronics/products/available?grouping=category')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response1.status).toBe(422);

        const response2 = await request(app)
            .get('/ezelectronics/products/available?grouping=category&model=iPhone 13')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response2.status).toBe(422);
    });

    test('should return 422 if grouping is model and model is null or category is not null', async () => {
        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const response1 = await request(app)
            .get('/ezelectronics/products/available?grouping=model')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response1.status).toBe(422);

        const response2 = await request(app)
            .get('/ezelectronics/products/available?grouping=model&category=Smartphone')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response2.status).toBe(422);
    });

    test('should return 404 if model does not exist in the database', async () => {
        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const response = await request(app)
            .get('/ezelectronics/products/available?grouping=model&model=NonExistentModel')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response.status).toBe(404);
    });

    test('should return 401 if user is not logged in', async () => {
        const response = await request(app)
        .get('/ezelectronics/products/available');

    expect(response.status).toBe(401);
});
});


describe('DELETE /ezelectronics/products/:model', () => {
    const adminCredentials = {
        username: "AdminUser",
        password: "AdminPassword"
    };

    const validProduct = {
        model: "iPhone 13",
        category: "Smartphone",
        quantity: 5,
        details: "",
        sellingPrice: 200,
        arrivalDate: "2024-01-01"
    };

    beforeAll(async () => {
        
        await request(app)
            .post('/ezelectronics/users')
            .send({
                username: "AdminUser",
                name: "Admin",
                surname: "User",
                password: "AdminPassword",
                role: "Admin"
            });

        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        await request(app)
            .post('/ezelectronics/products')
            .set('Cookie', loginResponse.headers['set-cookie'])
            .send(validProduct);
    });

    afterAll(() => {
        cleanup(db);
    });

    test('should delete a product by an authorized user', async () => {
        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const response = await request(app)
            .delete(`/ezelectronics/products/${validProduct.model}`)
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response.status).toBe(200);
    });

    test('should return 404 if product model does not exist', async () => {
        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const response = await request(app)
            .delete('/ezelectronics/products/NonExistentModel')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response.status).toBe(404);
    });

    test('should return 401 if user is not authorized', async () => {
        
        await request(app)
            .post('/ezelectronics/users')
            .send({
                username: "RegularUser",
                name: "Regular",
                surname: "User",
                password: "RegularPassword",
                role: "Customer"
            });

        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send({
                username: "RegularUser",
                password: "RegularPassword"
            });

        const response = await request(app)
            .delete(`/ezelectronics/products/${validProduct.model}`)
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response.status).toBe(401);
    });
});

describe('DELETE /ezelectronics/products', () => {
    const adminCredentials = {
        username: "AdminUser",
        password: "AdminPassword"
    };

    const validProduct1 = {
        model: "iPhone 13",
        category: "Smartphone",
        quantity: 5,
        details: "",
        sellingPrice: 200,
        arrivalDate: "2024-01-01"
    };

    const validProduct2 = {
        model: "MacBook Pro",
        category: "Laptop",
        quantity: 3,
        details: "",
        sellingPrice: 1500,
        arrivalDate: "2024-01-01"
    };

    beforeAll(async () => {
        
        await request(app)
            .post('/ezelectronics/users')
            .send({
                username: "AdminUser",
                name: "Admin",
                surname: "User",
                password: "AdminPassword",
                role: "Admin"
            });

        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        await request(app)
            .post('/ezelectronics/products')
            .set('Cookie', loginResponse.headers['set-cookie'])
            .send(validProduct1);

        await request(app)
            .post('/ezelectronics/products')
            .set('Cookie', loginResponse.headers['set-cookie'])
            .send(validProduct2);
    });

    afterAll(() => {
        cleanup(db);
    });

    test('should delete all products by an authorized user', async () => {
        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const response = await request(app)
            .delete('/ezelectronics/products')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response.status).toBe(200);

        
        const getResponse = await request(app)
            .get('/ezelectronics/products')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(getResponse.status).toBe(200);
        expect(getResponse.body.length).toBe(0);
    });

    test('should return 401 if user is not authorized', async () => {
        
        await request(app)
            .post('/ezelectronics/users')
            .send({
                username: "RegularUser",
                name: "Regular",
                surname: "User",
                password: "RegularPassword",
                role: "Customer"
            });

        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send({
                username: "RegularUser",
                password: "RegularPassword"
            });

        const response = await request(app)
            .delete('/ezelectronics/products')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response.status).toBe(401);
    });
});

