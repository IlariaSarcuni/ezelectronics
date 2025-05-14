import { describe, test, expect, beforeEach, jest } from "@jest/globals"

import ProductController from "../../src/controllers/productController"
import ProductDAO from "../../src/dao/productDAO"
import db from "../../src/db/db"
import { Database } from "sqlite3"
import {User, Role} from "../../src/components/user"
import { UserNotFoundError, UserIsAdminError } from "../../src/errors/userError";
import { ProductAlreadyExistsError, ProductNotFoundError, LowProductStockError } from "../../src/errors/productError";
import { DateError } from "../../src/utilities";
import { CustomError } from "../../src/utilities";
jest.mock("../../src/db/db.ts")

describe("registerProducts tests", () => {
    const productDAO = new ProductDAO();

    test("should resolve if product registration is successful", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, undefined); 
            return {} as Database
        });
        jest.spyOn(db, "run").mockImplementationOnce((sql, params, callback) => {
            callback(null, null);
            return {} as Database
        });

        await expect(productDAO.registerProducts("ModelX", "Smartphone", 100, "Details", 999.99, "2023-01-01")).resolves.toBeUndefined();
    });

    test("should reject with ProductAlreadyExistsError if product model already exists", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, { model: "ModelX" }, null); 
            return {} as Database
        });

        await expect(productDAO.registerProducts("ModelX", "Smartphone", 100, "Details", 999.99, "2023-01-01")).rejects.toThrow(ProductAlreadyExistsError);
    });

    test("should reject with DateError if arrival date is in the future", async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1); 

        await expect(productDAO.registerProducts("ModelY", "Laptop", 50, "New laptop", 1200.00, futureDate.toISOString().slice(0, 10))).rejects.toThrow(CustomError);
    });


    test("should reject with an error if the database operation fails during product insertion", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, undefined, null); 
            return {} as Database
        });
        const insertError = new Error("Insert operation failed");
        jest.spyOn(db, "run").mockImplementationOnce((sql, params, callback) => {
            callback(insertError, null, null);
            return {} as Database
        });

        await expect(productDAO.registerProducts("ModelA", "Smartphone", 20, "Budget phone", 299.99, "2023-01-01")).rejects.toThrow("Insert operation failed");
    });
});

describe("changeProductQuantity tests", () => {
    const productDAO = new ProductDAO();

    test("should resolve with new quantity if quantity update is successful", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, { quantity: 50, arrivalDate: "2023-01-01" }, null); 
            return {} as Database
        });
        jest.spyOn(db, "run").mockImplementationOnce((sql, params, callback) => {
            callback(null, null);
            return {} as Database
        });

        await expect(productDAO.changeProductQuantity("ModelX", 20, "2023-01-02")).resolves.toBe(70);
    });

    test("should reject with ProductNotFoundError if product does not exist", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, undefined, null); 
            return {} as Database
        });

        await expect(productDAO.changeProductQuantity("ModelY", 10, "2023-01-02")).rejects.toThrow(ProductNotFoundError);
    });

    test("should reject with DateError if change date is before the product's arrival date", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, { quantity: 50, arrivalDate: "2023-01-05" }, null); 
            return {} as Database
        });

        await expect(productDAO.changeProductQuantity("ModelX", 20, "2023-01-01")).rejects.toThrow(DateError);
    });


    test("should reject with an error if the database operation fails during quantity update", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, { quantity: 50, arrivalDate: "2023-01-01" }, null); 
            return {} as Database
        });
        const updateError = new Error("Update operation failed");
        jest.spyOn(db, "run").mockImplementationOnce((sql, params, callback) => {
            callback(updateError, null, null);
            return {} as Database
        });

        await expect(productDAO.changeProductQuantity("ModelA", 20, "2023-01-02")).rejects.toThrow("Update operation failed");
    });
});


describe("sellProduct tests", () => {
    const productDAO = new ProductDAO();

    test("should resolve with new quantity if product sale is successful", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, { quantity: 100, arrivalDate: "2023-01-01" }, null); 
            return {} as Database
        });
        jest.spyOn(db, "run").mockImplementationOnce((sql, params, callback) => {
            callback(null, null);
            return {} as Database
        });

        await expect(productDAO.sellProduct("ModelX", 20, "2023-01-02")).resolves.toBe(80);
    });

    test("should reject with ProductNotFoundError if product does not exist", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, undefined, null); 
            return {} as Database
        });

        await expect(productDAO.sellProduct("ModelY", 10, "2023-01-02")).rejects.toThrow(ProductNotFoundError);
    });

    test("should reject with DateError if selling date is before the product's arrival date", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, { quantity: 50, arrivalDate: "2023-01-05" }, null); 
            return {} as Database
        });

        await expect(productDAO.sellProduct("ModelX", 20, "2023-01-01")).rejects.toThrow(DateError);
    });

    test("should reject with LowProductStockError if the quantity to sell exceeds available stock", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, { quantity: 15, arrivalDate: "2023-01-01" }, null); 
            return {} as Database
        });

        await expect(productDAO.sellProduct("ModelX", 20, "2023-01-02")).rejects.toThrow(LowProductStockError);
    });

    test("should reject with an error if the database operation fails during quantity update", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, { quantity: 50, arrivalDate: "2023-01-01" }, null); 
            return {} as Database
        });
        const updateError = new Error("Update operation failed");
        jest.spyOn(db, "run").mockImplementationOnce((sql, params, callback) => {
            callback(updateError, null, null);
            return {} as Database
        });

        await expect(productDAO.sellProduct("ModelA", 20, "2023-01-02")).rejects.toThrow("Update operation failed");
    });
});

describe("getProducts tests", () => {
    const productDAO = new ProductDAO();

    test("should resolve with all products if no filters are applied", async () => {
        jest.spyOn(db, "all").mockImplementationOnce((sql, params, callback) => {
            callback(null, [{ model: "ModelX", category: "Smartphone", quantity: 100, details: "Details", sellingPrice: 999.99, arrivalDate: "2023-01-01" }]);
            return {} as Database
            });

        await expect(productDAO.getProducts(null, null, null)).resolves.toEqual([{ model: "ModelX", category: "Smartphone", quantity: 100, details: "Details", sellingPrice: 999.99, arrivalDate: "2023-01-01" }]);
    });

    test("should resolve with filtered products by category", async () => {
        jest.spyOn(db, "all").mockImplementationOnce((sql, params, callback) => {
            callback(null, [{ model: "ModelY", category: "Laptop", quantity: 50, details: "New laptop", sellingPrice: 1200.00, arrivalDate: "2023-01-01" }]);
            return {} as Database
        });

        await expect(productDAO.getProducts('category', 'Laptop', null)).resolves.toEqual([{ model: "ModelY", category: "Laptop", quantity: 50, details: "New laptop", sellingPrice: 1200.00, arrivalDate: "2023-01-01" }]);
    });

    test("should resolve with filtered products by model", async () => {
        jest.spyOn(db, "all").mockImplementationOnce((sql, params, callback) => {
            callback(null, [{ model: "ModelZ", category: "Appliance", quantity: 30, details: "New appliance", sellingPrice: 450.00, arrivalDate: "2023-01-01" }]);
            return {} as Database
        });

        await expect(productDAO.getProducts('model', null, 'ModelZ')).resolves.toEqual([{ model: "ModelZ", category: "Appliance", quantity: 30, details: "New appliance", sellingPrice: 450.00, arrivalDate: "2023-01-01" }]);
    });

    test("should reject with CustomError if invalid parameters are provided", async () => {
        await expect(productDAO.getProducts('category', null, 'ModelX')).rejects.toThrow(CustomError);
        await expect(productDAO.getProducts('model', 'Laptop', null)).rejects.toThrow(CustomError);
        await expect(productDAO.getProducts(null, 'Laptop', 'ModelX')).rejects.toThrow(CustomError);
    });

    test("should reject with ProductNotFoundError if model does not exist", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, undefined, null); 
            return {} as Database
        });

        await expect(productDAO.getProducts('model', null, 'NonExistentModel')).rejects.toThrow(ProductNotFoundError);
    });

});

describe("getAvailableProducts tests", () => {
    const productDAO = new ProductDAO();

    test("should resolve with all available products if no filters are applied", async () => {
        jest.spyOn(db, "all").mockImplementationOnce((sql, params, callback) => {
            callback(null, [{ model: "ModelX", category: "Smartphone", quantity: 10, details: "Details", sellingPrice: 999.99, arrivalDate: "2023-01-01" }]);
            return {} as Database
        }); 

        await expect(productDAO.getAvailableProducts(null, null, null)).resolves.toEqual([{ model: "ModelX", category: "Smartphone", quantity: 10, details: "Details", sellingPrice: 999.99, arrivalDate: "2023-01-01" }]);
    });

    test("should resolve with available products filtered by category", async () => {
        jest.spyOn(db, "all").mockImplementationOnce((sql, params, callback) => {
            callback(null, [{ model: "ModelY", category: "Laptop", quantity: 5, details: "New laptop", sellingPrice: 1200.00, arrivalDate: "2023-01-01" }]);
            return {} as Database
        });

        await expect(productDAO.getAvailableProducts('category', 'Laptop', null)).resolves.toEqual([{ model: "ModelY", category: "Laptop", quantity: 5, details: "New laptop", sellingPrice: 1200.00, arrivalDate: "2023-01-01" }]);
    });

    test("should resolve with available products filtered by model", async () => {
        jest.spyOn(db, "all").mockImplementationOnce((sql, params, callback) => {
            callback(null, [{ model: "ModelZ", category: "Appliance", quantity: 3, details: "New appliance", sellingPrice: 450.00, arrivalDate: "2023-01-01" }]);
            return {} as Database
        });

        await expect(productDAO.getAvailableProducts('model', null, 'ModelZ')).resolves.toEqual([{ model: "ModelZ", category: "Appliance", quantity: 3, details: "New appliance", sellingPrice: 450.00, arrivalDate: "2023-01-01" }]);
    });

    test("should reject with CustomError if invalid parameters are provided", async () => {
        await expect(productDAO.getAvailableProducts('category', null, 'ModelX')).rejects.toThrow(CustomError);
        await expect(productDAO.getAvailableProducts('model', 'Laptop', null)).rejects.toThrow(CustomError);
        await expect(productDAO.getAvailableProducts(null, 'Laptop', 'ModelX')).rejects.toThrow(CustomError);
    });

    test("should reject with ProductNotFoundError if model does not exist", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, undefined, null); 
            return {} as Database
        });

        await expect(productDAO.getAvailableProducts('model', null, 'NonExistentModel')).rejects.toThrow(ProductNotFoundError);
    });

});

describe("deleteProduct tests", () => {
    const productDAO = new ProductDAO();

    test("should resolve to true if product deletion is successful", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, { model: "ModelX" }, null); 
            return {} as Database
        });
        jest.spyOn(db, "run").mockImplementationOnce((sql, params, callback) => {
            callback(null, null, null);
            return {} as Database
        });

        await expect(productDAO.deleteProduct("ModelX")).resolves.toBe(true);
    });

    test("should reject with ProductNotFoundError if the product does not exist", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, undefined, null); 
            return {} as Database
        });

        await expect(productDAO.deleteProduct("ModelY")).rejects.toThrow(ProductNotFoundError);
    });

});

describe("deleteAllProducts tests", () => {
    const productDAO = new ProductDAO();

    test("should resolve to true if all products are successfully deleted", async () => {
        jest.spyOn(db, "run").mockImplementation((sql, callback) => {
            callback(null);
            return {} as Database
        }); 

        await expect(productDAO.deleteAllProducts()).resolves.toBe(true);
    });

});



