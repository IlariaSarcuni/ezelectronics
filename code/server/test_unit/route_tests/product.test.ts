import { test, expect, jest, describe, beforeEach } from "@jest/globals"
import request from 'supertest'
import { app } from "../../index"
import AuthService from "../../src/routers/auth"
import ProductController from "../../src/controllers/productController"
const baseURL = "/ezelectronics"
import { User, Role } from "../../src/components/user"
import {ProductAlreadyExistsError, ProductNotFoundError, LowProductStockError} from "../../src/errors/productError"
import { DateError, CustomError} from "../../src/utilities"






jest.mock('../../src/controllers/productController');
jest.mock('../../src/routers/auth');
describe("POST /products - Registering new product models", () => {
    const validProduct = {
        model: "iPhone 13 Pro",
        category: "Smartphone",
        quantity: 5,
        details: "",
        sellingPrice: 200,
        arrivalDate: "2024-01-01"
    };

    const invaliddatevalidProduct = {
        model: "iPhone 13 Proxxx",
        category: "Smartphone",
        quantity: 5,
        details: "",
        sellingPrice: 200,
        arrivalDate: "2029-01-01"
    };

  
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("Successful product registration by an authorized user", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => next());
        jest.spyOn(ProductController.prototype, "registerProducts").mockResolvedValue();

        const response = await request(app).post(`${baseURL}/products`).send(validProduct);
        expect(response.status).toBe(200);
    });

    test("Attempt to register a product with an existing model", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => next());
        jest.spyOn(ProductController.prototype, "registerProducts").mockRejectedValue(new ProductAlreadyExistsError());

        const response = await request(app).post(`${baseURL}/products`).send(validProduct);
        expect(response.status).toBe(409);
    });

    test("Attempt to register a product with invalid category", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => next());
        const invalidProduct = { ...validProduct, category: "Food" };

        const response = await request(app).post(`${baseURL}/products`).send(invalidProduct);
        expect(response.status).toBe(422);
    });

    test("Attempt to register a product with invalid quantity", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => next());
        const invalidProduct = { ...validProduct, quantity: 0 };

        const response = await request(app).post(`${baseURL}/products`).send(invalidProduct);
        expect(response.status).toBe(422);
    });

    test("Attempt to register a product with invalid selling price", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => next());
        const invalidProduct = { ...validProduct, sellingPrice: -10 };

        const response = await request(app).post(`${baseURL}/products`).send(invalidProduct);
        expect(response.status).toBe(422);
    });
    jest.clearAllMocks()
    test("Attempt to register a product with a future arrival date", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => next());
        jest.spyOn(ProductController.prototype, "registerProducts").mockRejectedValue(new DateError());

        const response = await request(app).post(`${baseURL}/products`).send(invaliddatevalidProduct);
        expect(response.status).toBe(400);
    });

    test("Unauthorized user attempting to register a product", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => {
            res.status(403).json({ error: "User is not authorized" });
        });

        const response = await request(app).post(`${baseURL}/products`).send(validProduct);
        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: "User is not authorized" });
    });
});

describe("PATCH /products/:model - Increasing product quantity", () => {
    const existingProduct = {
        model: "iPhone 13",
        quantity: 3,
        changeDate: "2024-01-01"
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("Successful increase in product quantity by an authorized user", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => next());
        jest.spyOn(ProductController.prototype, "changeProductQuantity").mockResolvedValue(8);

        const response = await request(app).patch(`${baseURL}/products/${existingProduct.model}`).send({ quantity: 3 });
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ quantity: 8 });
    });

    test("Attempt to increase quantity for a non-existent product model", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => next());
        jest.spyOn(ProductController.prototype, "changeProductQuantity").mockRejectedValue(new ProductNotFoundError());

        const response = await request(app).patch(`${baseURL}/products/nonexistentModel`).send({ quantity: 3 });
        expect(response.status).toBe(404);
    });

    test("Attempt to increase quantity with a future change date", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => next());
        jest.spyOn(ProductController.prototype, "changeProductQuantity").mockRejectedValue(new DateError());

        const response = await request(app).patch(`${baseURL}/products/${existingProduct.model}`).send({ quantity: 3, changeDate: "3000-01-01" });
        expect(response.status).toBe(400);
    });

    test("Attempt to increase quantity with a change date before the product's arrival date", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => next());
        jest.spyOn(ProductController.prototype, "changeProductQuantity").mockRejectedValue(new DateError());

        const response = await request(app).patch(`${baseURL}/products/${existingProduct.model}`).send({ quantity: 3, changeDate: "2023-01-01" });
        expect(response.status).toBe(400);
    });

    test("Unauthorized user attempting to increase product quantity", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => {
            res.status(403).json({ error: "User is not authorized" });
        });

        const response = await request(app).patch(`${baseURL}/products/${existingProduct.model}`).send({ quantity: 3 });
        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: "User is not authorized" });
    });
});

describe("PATCH /products/:model/sell - Selling product units", () => {
    const existingProduct = {
        model: "iPhone 13",
        quantity: 5,
        arrivalDate: "2024-01-01"
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("Successful sale of a product by an authorized user", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => next());
        jest.spyOn(ProductController.prototype, "sellProduct").mockResolvedValue(3);

        const response = await request(app).patch(`${baseURL}/products/${existingProduct.model}/sell`).send({ quantity: 2 });
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ quantity: 3 });
    });

    test("Attempt to sell a non-existent product model", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => next());
        jest.spyOn(ProductController.prototype, "sellProduct").mockRejectedValue(new ProductNotFoundError());

        const response = await request(app).patch(`${baseURL}/products/nonexistentModel/sell`).send({ quantity: 1 });
        expect(response.status).toBe(404);
    });

    test("Attempt to sell with a future selling date", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => next());
        jest.spyOn(ProductController.prototype, "sellProduct").mockRejectedValue(new DateError());

        const response = await request(app).patch(`${baseURL}/products/${existingProduct.model}/sell`).send({ quantity: 1, sellingDate: "3000-01-01" });
        expect(response.status).toBe(400);
    });

    test("Attempt to sell with a selling date before the product's arrival date", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => next());
        jest.spyOn(ProductController.prototype, "sellProduct").mockRejectedValue(new DateError());

        const response = await request(app).patch(`${baseURL}/products/${existingProduct.model}/sell`).send({ quantity: 1, sellingDate: "2023-12-31" });
        expect(response.status).toBe(400);
    });

    test("Attempt to sell more units than are available in stock", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => next());
        jest.spyOn(ProductController.prototype, "sellProduct").mockRejectedValue(new LowProductStockError());

        const response = await request(app).patch(`${baseURL}/products/${existingProduct.model}/sell`).send({ quantity: 10 });
        expect(response.status).toBe(409);
    });

    test("Unauthorized user attempting to sell a product", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => {
            res.status(403).json({ error: "User is not authorized" });
        });

        const response = await request(app).patch(`${baseURL}/products/${existingProduct.model}/sell`).send({ quantity: 1 });
        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: "User is not authorized" });
    });
});

describe("GET /products - Retrieving all products", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("Retrieve all products without any filters", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => next());
        jest.spyOn(ProductController.prototype, "getProducts").mockResolvedValue([]);

        const response = await request(app).get(`${baseURL}/products`);
        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
    });

    test("Retrieve products filtered by category", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => next());
        jest.spyOn(ProductController.prototype, "getProducts").mockResolvedValue([]);

        const response = await request(app).get(`${baseURL}/products?grouping=category&category=Smartphone`);
        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
    });

    test("Retrieve products filtered by model", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => next());
        jest.spyOn(ProductController.prototype, "getProducts").mockResolvedValue([]);

        const response = await request(app).get(`${baseURL}/products?grouping=model&model=iPhone 13`);
        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
    });

    test("Attempt to retrieve products with invalid category", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => next());
        jest.spyOn(ProductController.prototype, "getProducts").mockRejectedValue(new Error("Invalid input parameters"));

        const response = await request(app).get(`${baseURL}/products?grouping=category&category=InvalidCategory`);
        expect(response.status).toBe(422);
    });

    test("Attempt to retrieve products with invalid model", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => next());
        jest.spyOn(ProductController.prototype, "getProducts").mockRejectedValue(new ProductNotFoundError());

        const response = await request(app).get(`${baseURL}/products?grouping=model&model=NonexistentModel`);
        expect(response.status).toBe(404);
    });

    test("Unauthorized user attempting to retrieve products", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => {
            res.status(403).json({ error: "User is not authorized" });
        });

        const response = await request(app).get(`${baseURL}/products`);
        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: "User is not authorized" });
    });

    test("Invalid query parameter combinations", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => next());
        jest.spyOn(ProductController.prototype, "getProducts").mockRejectedValue(new CustomError("Invalid input parameters",422));

        const response = await request(app).get(`${baseURL}/products?grouping=category&model=iPhone 13`);
        expect(response.status).toBe(422);
    });
});

describe("GET /products/available - Retrieving all available products", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("Retrieve all available products without any filters", async () => {
        jest.spyOn(AuthService.prototype, "isLoggedIn").mockImplementation((req, res, next) => next());
        jest.spyOn(ProductController.prototype, "getAvailableProducts").mockResolvedValue([]);

        const response = await request(app).get(`${baseURL}/products/available`);
        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
    });

    test("Retrieve available products filtered by category", async () => {
        jest.spyOn(AuthService.prototype, "isLoggedIn").mockImplementation((req, res, next) => next());
        jest.spyOn(ProductController.prototype, "getAvailableProducts").mockResolvedValue([]);

        const response = await request(app).get(`${baseURL}/products/available?grouping=category&category=Smartphone`);
        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
    });

    test("Retrieve available products filtered by model", async () => {
        jest.spyOn(AuthService.prototype, "isLoggedIn").mockImplementation((req, res, next) => next());
        jest.spyOn(ProductController.prototype, "getAvailableProducts").mockResolvedValue([]);

        const response = await request(app).get(`${baseURL}/products/available?grouping=model&model=iPhone 13`);
        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
    });

    test("Attempt to retrieve available products with invalid category", async () => {
        jest.spyOn(AuthService.prototype, "isLoggedIn").mockImplementation((req, res, next) => next());
        jest.spyOn(ProductController.prototype, "getAvailableProducts").mockRejectedValue(new Error("Invalid input parameters"));

        const response = await request(app).get(`${baseURL}/products/available?grouping=category&category=InvalidCategory`);
        expect(response.status).toBe(422);
    });

    test("Attempt to retrieve available products with invalid model", async () => {
        jest.spyOn(AuthService.prototype, "isLoggedIn").mockImplementation((req, res, next) => next());
        jest.spyOn(ProductController.prototype, "getAvailableProducts").mockRejectedValue(new ProductNotFoundError());

        const response = await request(app).get(`${baseURL}/products/available?grouping=model&model=NonexistentModel`);
        expect(response.status).toBe(404);
    });

    test("Unauthorized user attempting to retrieve available products", async () => {
        jest.spyOn(AuthService.prototype, "isLoggedIn").mockImplementation((req, res, next) => {
            res.status(403).json({ error: "User is not logged in" });
        });

        const response = await request(app).get(`${baseURL}/products/available`);
        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: "User is not logged in" });
    });

    test("Invalid query parameter combinations", async () => {
        jest.spyOn(AuthService.prototype, "isLoggedIn").mockImplementation((req, res, next) => next());
        jest.spyOn(ProductController.prototype, "getAvailableProducts").mockRejectedValue(new CustomError("Invalid input parameters",422));

        const response = await request(app).get(`${baseURL}/products/available?grouping=category&model=iPhone 13`);
        expect(response.status).toBe(422);
    });
});
describe("DELETE /products - Deleting all products", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("Successful deletion of all products by an authorized user", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => next());
        jest.spyOn(ProductController.prototype, "deleteAllProducts").mockResolvedValue(true);

        const response = await request(app).delete(`${baseURL}/products`);
        expect(response.status).toBe(200);
    });

    test("Unauthorized user attempting to delete all products", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => {
            res.status(403).json({ error: "User is not authorized" });
        });

        const response = await request(app).delete(`${baseURL}/products`);
        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: "User is not authorized" });
    });
});

