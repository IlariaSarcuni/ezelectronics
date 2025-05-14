import { describe, test, expect, beforeAll, afterAll, afterEach } from "@jest/globals"
import request from 'supertest'
import { app } from "../index"
import db from "../src/db/db"
import sqlite3 from 'sqlite3';
import { beforeEach } from "node:test";

export function cleanup(db: sqlite3.Database) {
    db.serialize(() => {
      
      db.run("DELETE FROM users");
      db.run("DELETE FROM products");
      db.run("DELETE FROM carts");
      db.run("DELETE FROM reviews");
      db.run("DELETE FROM cart_items");
    });
  }

describe('GET /ezelectronics/users', () => {
    const adminCredentials = {
        username: "AdminUser",
        password: "AdminPassword"
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
    });

    afterAll(() => {
        cleanup(db);
    });

    test('should retrieve all users if logged in as admin', async () => {
        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const response = await request(app)
            .get('/ezelectronics/users')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBeTruthy();
        expect(response.body.length).toBeGreaterThan(0);
    });

    test('should return 401 if not logged in', async () => {
        const response = await request(app)
            .get('/ezelectronics/users');

        expect(response.status).toBe(401);
    });

    test('should return 401 if logged in but not as admin', async () => {
        
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
            .get('/ezelectronics/users')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response.status).toBe(401);
    });
});

describe('GET /ezelectronics/users/roles/:role', () => {
    const adminCredentials = {
        username: "AdminUser",
        password: "AdminPassword"
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
    });

    afterAll(() => {
        cleanup(db);
    });

    test('should retrieve all users with a specific role if logged in as admin', async () => {
        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const roles = ["Customer", "Manager", "Admin"];
        roles.forEach(async (role) => {
            const response = await request(app)
                .get(`/ezelectronics/users/roles/${role}`)
                .set('Cookie', loginResponse.headers['set-cookie']);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBeTruthy();
            response.body.forEach((user:any) => {
                expect(user.role).toBe(role);
            });
        });
    });

    test('should return 401 if not logged in', async () => {
        const response = await request(app)
            .get('/ezelectronics/users/roles/Customer');

        expect(response.status).toBe(401);
    });

    test('should return 401 if logged in but not as admin', async () => {
        
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
            .get('/ezelectronics/users/roles/Customer')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response.status).toBe(401);
    });
});

describe('GET /ezelectronics/users/:username', () => {
    const adminCredentials = {
        username: "AdminUser",
        password: "AdminPassword"
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
    });

    afterAll(() => {
        cleanup(db);
    });

    test('should allow admin to retrieve any user', async () => {
        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const response = await request(app)
            .get('/ezelectronics/users/AdminUser')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response.status).toBe(200);
        expect(response.body.username).toBe("AdminUser");
    });

    test('should allow user to retrieve their own information', async () => {
        
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
            .get('/ezelectronics/users/RegularUser')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response.status).toBe(200);
        expect(response.body.username).toBe("RegularUser");
    });

    test('should return 401 if user tries to access another user\'s information', async () => {
        
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
            .get('/ezelectronics/users/AdminUser')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response.status).toBe(401);
    });

    test('should return 404 if user does not exist', async () => {
        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const response = await request(app)
            .get('/ezelectronics/users/NonExistentUser')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response.status).toBe(404);
    });
});

describe('DELETE /ezelectronics/users/:username', () => {
    const adminCredentials = {
        username: "AdminUser",
        password: "AdminPassword"
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
    });

    afterAll(() => {
        cleanup(db);
    });

    test('should allow admin to delete a non-admin user', async () => {
        
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
            .send(adminCredentials);

        const response = await request(app)
            .delete('/ezelectronics/users/RegularUser')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response.status).toBe(200);
    });

    test('should allow user to delete their own account', async () => {
        
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
            .delete('/ezelectronics/users/RegularUser')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response.status).toBe(200);
    });

    test('should return 401 if user tries to delete another user\'s account', async () => {
        
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
            .delete('/ezelectronics/users/AdminUser')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response.status).toBe(401);
    });

    test('should return 401 if admin tries to delete another admin', async () => {
        
        await request(app)
            .post('/ezelectronics/users')
            .send({
                username: "AnotherAdmin",
                name: "Another",
                surname: "Admin",
                password: "AnotherAdminPassword",
                role: "Admin"
            });

        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const response = await request(app)
            .delete('/ezelectronics/users/AnotherAdmin')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response.status).toBe(401);
    });

    test('should return 404 if user does not exist', async () => {
        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const response = await request(app)
            .delete('/ezelectronics/users/NonExistentUser')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response.status).toBe(404);
    });
});

describe('DELETE /ezelectronics/users', () => {
    const adminCredentials = {
        username: "AdminUser",
        password: "AdminPassword"
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
    });

    afterAll(() => {
        cleanup(db);
    });

    test('should delete all non-Admin users if logged in as admin', async () => {
        
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
            .send(adminCredentials);

        const response = await request(app)
            .delete('/ezelectronics/users')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response.status).toBe(200);
    });

    test('should return 401 if not logged in', async () => {
        const response = await request(app)
            .delete('/ezelectronics/users');

        expect(response.status).toBe(401);
    });

    test('should return 401 if logged in but not as admin', async () => {
        
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
            .delete('/ezelectronics/users')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(response.status).toBe(401);
    });
});

describe('PATCH /ezelectronics/users/:username', () => {
    const adminCredentials = {
        username: "AdminUser",
        password: "AdminPassword"
    };

    const updateData = {
        name: "UpdatedName",
        surname: "UpdatedSurname",
        address: "UpdatedAddress",
        birthdate: "1985-01-01"
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
    });

    afterAll(() => {
        cleanup(db);
    });

    test('should allow admin to update any non-admin user\'s information', async () => {
        
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
            .send(adminCredentials);

        const response = await request(app)
            .patch('/ezelectronics/users/RegularUser')
            .set('Cookie', loginResponse.headers['set-cookie'])
            .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.name).toBe(updateData.name);
    });

    test('should allow user to update their own information', async () => {
        
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
            .patch('/ezelectronics/users/RegularUser')
            .set('Cookie', loginResponse.headers['set-cookie'])
            .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.name).toBe(updateData.name);
    });

    test('should return 401 if user tries to update another user\'s information', async () => {
        
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
            .patch('/ezelectronics/users/AdminUser')
            .set('Cookie', loginResponse.headers['set-cookie'])
            .send(updateData);

        expect(response.status).toBe(401);
    });

    test('should return 404 if user does not exist', async () => {
        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const response = await request(app)
            .patch('/ezelectronics/users/NonExistentUser')
            .set('Cookie', loginResponse.headers['set-cookie'])
            .send(updateData);

        expect(response.status).toBe(404);
    });

    test('should return 400 if birthdate is in the future', async () => {
        
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(adminCredentials);

        const futureDateData = { ...updateData, birthdate: "3000-01-01" };

        const response = await request(app)
            .patch('/ezelectronics/users/AdminUser')
            .set('Cookie', loginResponse.headers['set-cookie'])
            .send(futureDateData);

        expect(response.status).toBe(400);
    });
});
