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




  describe('POST /ezelectronics/users', () => {
    const validUser = {
        username: "testuser",
        name: "Test",
        surname: "User",
        password: "password123",
        role: "Customer"
    };
    afterAll(() => {
        cleanup(db);
      });
    
    test('should create a new user successfully', async () => {
        const response = await request(app)
            .post('/ezelectronics/users')
            .send(validUser);

        expect(response.status).toBe(200);
    });

    test('should return 409 if username already exists', async () => {

        const second = await request(app)
            .post('/ezelectronics/users')
            .send(validUser);

        expect(second.status).toBe(409);
    });

    test('should return 422 if username is empty', async () => {
        const response = await request(app)
            .post('/ezelectronics/users')
            .send({ ...validUser, username: "" });

        expect(response.status).toBe(422);
    });

    test('should return 422 if name is empty', async () => {
        const response = await request(app)
            .post('/ezelectronics/users')
            .send({ ...validUser, name: "" });

        expect(response.status).toBe(422);
    });

    test('should return 422 if surname is empty', async () => {
        const response = await request(app)
            .post('/ezelectronics/users')
            .send({ ...validUser, surname: "" });

        expect(response.status).toBe(422);
    });

    test('should return 422 if password is empty', async () => {
        const response = await request(app)
            .post('/ezelectronics/users')
            .send({ ...validUser, password: "" });

        expect(response.status).toBe(422);
    });

    test('should return 422 if role is invalid', async () => {
        const response = await request(app)
            .post('/ezelectronics/users')
            .send({ ...validUser, role: "InvalidRole" });

        expect(response.status).toBe(422);
    });
});

describe('POST /ezelectronics/sessions', () => {
    const validCredentials = {
        username: "MarioRossi",
        password: "MarioRossi"
    };

    beforeAll(async () => {
        await request(app)
            .post('/ezelectronics/users')
            .send({
                username: "MarioRossi",
                name: "Mario",
                surname: "Rossi",
                password: "MarioRossi",
                role: "Customer"
            });
    });

    afterAll(() => {
        cleanup(db);
      });

    test('should log in successfully with valid credentials', async () => {
        const response = await request(app)
            .post('/ezelectronics/sessions')
            .send(validCredentials);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            username: "MarioRossi",
            name: "Mario",
            surname: "Rossi",
            role: "Customer",
            address: null,
            birthdate: null
        });
    });

    test('should return 401 if username does not exist', async () => {
        const response = await request(app)
            .post('/ezelectronics/sessions')
            .send({ ...validCredentials, username: "NonExistentUser" });

        expect(response.status).toBe(401);
    });

    test('should return 401 if password is incorrect', async () => {
        const response = await request(app)
            .post('/ezelectronics/sessions')
            .send({ ...validCredentials, password: "WrongPassword" });

        expect(response.status).toBe(401);
    });

    test('should return 422 if username is empty', async () => {
        const response = await request(app)
            .post('/ezelectronics/sessions')
            .send({ ...validCredentials, username: "" });

        expect(response.status).toBe(422);
    });

    test('should return 422 if password is empty', async () => {
        const response = await request(app)
            .post('/ezelectronics/sessions')
            .send({ ...validCredentials, password: "" });

        expect(response.status).toBe(422);
    });
});


describe('DELETE /ezelectronics/sessions/current', () => {
    const validCredentials = {
        username: "MarioRossi",
        password: "MarioRossi"
    };

    beforeAll(async () => {
        await request(app)
            .post('/ezelectronics/users')
            .send({
                username: "MarioRossi",
                name: "Mario",
                surname: "Rossi",
                password: "MarioRossi",
                role: "Customer"
            });
    });

    afterAll(() => {
        cleanup(db);
      });

    test('should log in and then log out successfully', async () => {
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(validCredentials);

        expect(loginResponse.status).toBe(200);

        const logoutResponse = await request(app)
            .delete('/ezelectronics/sessions/current')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(logoutResponse.status).toBe(200);
    });

    test('should return 401 if not logged in', async () => {
        const response = await request(app)
            .delete('/ezelectronics/sessions/current');

        expect(response.status).toBe(401);
    });
});

describe('GET /ezelectronics/sessions/current', () => {
    const validCredentials = {
        username: "MarioRossi",
        password: "MarioRossi"
    };

    beforeAll(async () => {
        await request(app)
            .post('/ezelectronics/users')
            .send({
                username: "MarioRossi",
                name: "Mario",
                surname: "Rossi",
                password: "MarioRossi",
                role: "Customer"
            });
    });

    afterAll(() => {
        cleanup(db);
      });

    test('should retrieve the currently logged in user', async () => {
        const loginResponse = await request(app)
            .post('/ezelectronics/sessions')
            .send(validCredentials);

        expect(loginResponse.status).toBe(200);

        const currentSessionResponse = await request(app)
            .get('/ezelectronics/sessions/current')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(currentSessionResponse.status).toBe(200);
        expect(currentSessionResponse.body).toEqual({
            username: "MarioRossi",
            name: "Mario",
            surname: "Rossi",
            role: "Customer",
            address: null,
            birthdate: null
        });
    });

    test('should return 401 if not logged in', async () => {
        const response = await request(app)
            .get('/ezelectronics/sessions/current');

        expect(response.status).toBe(401);
    });
});