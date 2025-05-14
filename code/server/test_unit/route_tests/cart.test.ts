import { test, expect, jest, describe, beforeEach } from "@jest/globals"
import request from 'supertest'
import { app } from "../../index"
import AuthService from "../../src/routers/auth"
import CartController from "../../src/controllers/cartController"
const baseURL = "/ezelectronics"
import { User, Role } from "../../src/components/user"
import {Product, Category} from "../../src/components/product"
import {ProductAlreadyExistsError, ProductNotFoundError, LowProductStockError} from "../../src/errors/productError"
import {CartNotFoundError, EmptyCartError, ProductNotInCartError} from "../../src/errors/cartError"
import { DateError, CustomError} from "../../src/utilities"

import {Cart} from "../../src/components/cart"
jest.mock("../../src/dao/cartDAO")
jest.mock('../../src/routers/auth');
jest.mock('../../src/controllers/cartController');


describe("POST /carts - Adding a product to the cart", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("Successful addition of a product to the cart by an authorized user", async () => {
        jest.spyOn(AuthService.prototype, "isCustomer").mockImplementation((req, res, next) => next());
        jest.spyOn(CartController.prototype, "addToCart").mockResolvedValue(true);

        const response = await request(app).post(`${baseURL}/carts`).send({ model: "iPhone13" });
        expect(response.status).toBe(200);
    });

    test("Unauthorized user attempting to add a product to the cart", async () => {
        jest.spyOn(AuthService.prototype, "isCustomer").mockImplementation((req, res, next) => {
            res.status(403).json({ error: "User is not authorized" });
        });

        const response = await request(app).post(`${baseURL}/carts`).send({ model: "iPhone13" });
        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: "User is not authorized" });
    });

    test("Attempt to add a non-existent product model", async () => {
        jest.spyOn(AuthService.prototype, "isCustomer").mockImplementation((req, res, next) => next());
        jest.spyOn(CartController.prototype, "addToCart").mockRejectedValue(new ProductNotFoundError());

        const response = await request(app).post(`${baseURL}/carts`).send({ model: "NonexistentModel" });
        expect(response.status).toBe(404);
    });

    test("Attempt to add a product with zero available quantity", async () => {
        jest.spyOn(AuthService.prototype, "isCustomer").mockImplementation((req, res, next) => next());
        jest.spyOn(CartController.prototype, "addToCart").mockRejectedValue(new LowProductStockError());

        const response = await request(app).post(`${baseURL}/carts`).send({ model: "iPhone13" });
        expect(response.status).toBe(409);
    });

    test("Attempt to add a product with an empty model parameter", async () => {
        jest.spyOn(AuthService.prototype, "isCustomer").mockImplementation((req, res, next) => next());

        const response = await request(app).post(`${baseURL}/carts`).send({ model: "" });
        expect(response.status).toBe(422); 
    });
});

describe("GET /carts - Retrieving the current cart for a user", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("Retrieve the current cart for an authorized user with products", async () => {
        jest.spyOn(AuthService.prototype, "isCustomer").mockImplementation((req, res, next) => next());
        type Product = {
            model: string;
            category: Category;
            quantity: number;
            price: number;
        };  
        const mockCart = {
            customer: "Mario Rossi",
            paid: false,
            paymentDate: '2020-02-02',
            total: 200,
            products: [{ model: "iPhone 13", category: Category.SMARTPHONE, quantity: 1, price: 200 }]
        };
        jest.spyOn(CartController.prototype, "getCart").mockResolvedValue(mockCart);

        const response = await request(app).get(`${baseURL}/carts`);
        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockCart);
    });

    test("Retrieve an empty cart for an authorized user when no cart exists", async () => {
        jest.spyOn(AuthService.prototype, "isCustomer").mockImplementation((req, res, next) => next());
        const emptyCart = {
            customer: "Mario Rossi",
            paid: false,
            paymentDate: '2020-02-02',
            total: 0,
            products: [] as any[]
        };
        jest.spyOn(CartController.prototype, "getCart").mockResolvedValue(emptyCart);

        const response = await request(app).get(`${baseURL}/carts`);
        expect(response.status).toBe(200);
        expect(response.body).toEqual(emptyCart);
    });

    test("Unauthorized user attempting to retrieve a cart", async () => {
        jest.spyOn(AuthService.prototype, "isCustomer").mockImplementation((req, res, next) => {
            res.status(403).json({ error: "User is not authorized" });
        });

        const response = await request(app).get(`${baseURL}/carts`);
        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: "User is not authorized" });
    });

});

describe("PATCH /carts - Checking out the cart", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("Successful checkout of a cart by an authorized user", async () => {
        jest.spyOn(AuthService.prototype, "isCustomer").mockImplementation((req, res, next) => next());
        jest.spyOn(CartController.prototype, "checkoutCart").mockResolvedValue(true);

        const response = await request(app).patch(`${baseURL}/carts`);
        expect(response.status).toBe(200);
    });

    test("Unauthorized user attempting to checkout a cart", async () => {
        jest.spyOn(AuthService.prototype, "isCustomer").mockImplementation((req, res, next) => {
            res.status(403).json({ error: "User is not authorized" });
        });

        const response = await request(app).patch(`${baseURL}/carts`);
        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: "User is not authorized" });
    });

    test("Attempt to checkout with no existing cart", async () => {
        jest.spyOn(AuthService.prototype, "isCustomer").mockImplementation((req, res, next) => next());
        jest.spyOn(CartController.prototype, "checkoutCart").mockRejectedValue(new CartNotFoundError());

        const response = await request(app).patch(`${baseURL}/carts`);
        expect(response.status).toBe(404);
    });

    test("Attempt to checkout an empty cart", async () => {
        jest.spyOn(AuthService.prototype, "isCustomer").mockImplementation((req, res, next) => next());
        jest.spyOn(CartController.prototype, "checkoutCart").mockRejectedValue(new EmptyCartError());

        const response = await request(app).patch(`${baseURL}/carts`);
        expect(response.status).toBe(400);
    });

    test("Attempt to checkout a cart with insufficient product stock", async () => {
        jest.spyOn(AuthService.prototype, "isCustomer").mockImplementation((req, res, next) => next());
        jest.spyOn(CartController.prototype, "checkoutCart").mockRejectedValue(new LowProductStockError());

        const response = await request(app).patch(`${baseURL}/carts`);
        expect(response.status).toBe(409);
    });
});

describe("GET /carts/history - Retrieving the history of paid carts for a user", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("Retrieve the history of paid carts for an authorized user", async () => {
        jest.spyOn(AuthService.prototype, "isCustomer").mockImplementation((req, res, next) => next());
        const mockCarts = [{
            customer: "Mario Rossi",
            paid: true,
            paymentDate: '2024-05-02',
            total: 200,
            products: [{ model: "iPhone 13", category: Category.SMARTPHONE, quantity: 1, price: 200 }]
        }];
        jest.spyOn(CartController.prototype, "getCustomerCarts").mockResolvedValue(mockCarts);

        const response = await request(app).get(`${baseURL}/carts/history`);
        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockCarts);
    });

    test("Unauthorized user attempting to retrieve cart history", async () => {
        jest.spyOn(AuthService.prototype, "isCustomer").mockImplementation((req, res, next) => {
            res.status(403).json({ error: "User is not authorized" });
        });

        const response = await request(app).get(`${baseURL}/carts/history`);
        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: "User is not authorized" });
    });

    test("No history available for the user (empty result)", async () => {
        jest.spyOn(AuthService.prototype, "isCustomer").mockImplementation((req, res, next) => next());
        jest.spyOn(CartController.prototype, "getCustomerCarts").mockResolvedValue([]);

        const response = await request(app).get(`${baseURL}/carts/history`);
        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
    });
});

describe("DELETE /carts/products/:model - Removing a product from the cart", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("Successful removal of a product from the cart by an authorized user", async () => {
        jest.spyOn(AuthService.prototype, "isCustomer").mockImplementation((req, res, next) => next());
        jest.spyOn(CartController.prototype, "removeProductFromCart").mockResolvedValue(true);

        const response = await request(app).delete(`${baseURL}/carts/products/iPhone13`);
        expect(response.status).toBe(200);
    });

    test("Unauthorized user attempting to remove a product from the cart", async () => {
        jest.spyOn(AuthService.prototype, "isCustomer").mockImplementation((req, res, next) => {
            res.status(403).json({ error: "User is not authorized" });
        });

        const response = await request(app).delete(`${baseURL}/carts/products/iPhone13`);
        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: "User is not authorized" });
    });

    test("Attempt to remove a product from a cart when no cart exists", async () => {
        jest.spyOn(AuthService.prototype, "isCustomer").mockImplementation((req, res, next) => next());
        jest.spyOn(CartController.prototype, "removeProductFromCart").mockRejectedValue(new CartNotFoundError());

        const response = await request(app).delete(`${baseURL}/carts/products/iPhone13`);
        expect(response.status).toBe(404);
    });

    test("Attempt to remove a product that is not in the cart", async () => {
        jest.spyOn(AuthService.prototype, "isCustomer").mockImplementation((req, res, next) => next());
        jest.spyOn(CartController.prototype, "removeProductFromCart").mockRejectedValue(new ProductNotInCartError());

        const response = await request(app).delete(`${baseURL}/carts/products/iPhone13`);
        expect(response.status).toBe(404);
    });

    test("Attempt to remove a non-existent product model", async () => {
        jest.spyOn(AuthService.prototype, "isCustomer").mockImplementation((req, res, next) => next());
        jest.spyOn(CartController.prototype, "removeProductFromCart").mockRejectedValue(new ProductNotFoundError());

        const response = await request(app).delete(`${baseURL}/carts/products/NonexistentModel`);
        expect(response.status).toBe(404);
    });

});

describe("DELETE /carts/current - Clearing all products from the current cart", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("Successful clearing of the cart by an authorized user", async () => {
        jest.spyOn(AuthService.prototype, "isCustomer").mockImplementation((req, res, next) => next());
        jest.spyOn(CartController.prototype, "clearCart").mockResolvedValue(true);

        const response = await request(app).delete(`${baseURL}/carts/current`);
        expect(response.status).toBe(200);
    });

    test("Unauthorized user attempting to clear the cart", async () => {
        jest.spyOn(AuthService.prototype, "isCustomer").mockImplementation((req, res, next) => {
            res.status(403).json({ error: "User is not authorized" });
        });

        const response = await request(app).delete(`${baseURL}/carts/current`);
        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: "User is not authorized" });
    });

    test("Attempt to clear the cart when no cart exists", async () => {
        jest.spyOn(AuthService.prototype, "isCustomer").mockImplementation((req, res, next) => next());
        jest.spyOn(CartController.prototype, "clearCart").mockRejectedValue(new CartNotFoundError());

        const response = await request(app).delete(`${baseURL}/carts/current`);
        expect(response.status).toBe(404);
    });
});

describe("DELETE /carts - Deleting all carts", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("Successful deletion of all carts by an authorized user", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => next());
        jest.spyOn(CartController.prototype, "deleteAllCarts").mockResolvedValue(true);

        const response = await request(app).delete(`${baseURL}/carts`);
        expect(response.status).toBe(200);
    });

    test("Unauthorized user attempting to delete all carts", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => {
            res.status(403).json({ error: "User is not authorized" });
        });

        const response = await request(app).delete(`${baseURL}/carts`);
        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: "User is not authorized" });
    });

});

describe("GET /carts/all - Retrieving all carts of all users", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("Successful retrieval of all carts by an authorized user", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => next());
        const mockCarts = [{
            customer: "Mario Rossi",
            paid: true,
            paymentDate: '2024-05-02',
            total: 200,
            products: [{ model: "iPhone 13", category: "Smartphone", quantity: 1, price: 200 }]
        }];
        jest.spyOn(CartController.prototype, "getAllCarts").mockResolvedValue(mockCarts as Cart[]);

        const response = await request(app).get(`${baseURL}/carts/all`);
        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockCarts);
    });

    test("Unauthorized user attempting to retrieve all carts", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => {
            res.status(403).json({ error: "User is not authorized" });
        });

        const response = await request(app).get(`${baseURL}/carts/all`);
        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: "User is not authorized" });
    });

});