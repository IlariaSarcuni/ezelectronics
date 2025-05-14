import { Product, Category } from "../../src/components/product"
import { test, expect, jest, describe, beforeEach } from "@jest/globals"
import ProductController from "../../src/controllers/productController"
import ProductDAO from "../../src/dao/productDAO"
import { ProductNotFoundError, ProductAlreadyExistsError, ProductSoldError, EmptyProductStockError, LowProductStockError } from "../../src/errors/productError"
jest.mock("../../src/dao/productDAO")
import {DateError, CustomError} from "../../src/utilities"


describe("registerProducts", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should successfully register a new product", async () => {
        const model = "ModelX";
        const category = "Smartphone";
        const quantity = 100;
        const details = "High-end smartphone";
        const sellingPrice = 999.99;
        const arrivalDate = "2023-01-01";

        jest.spyOn(ProductDAO.prototype, "registerProducts").mockResolvedValue();
        const controller = new ProductController();

        await controller.registerProducts(model, category, quantity, details, sellingPrice, arrivalDate);
        expect(ProductDAO.prototype.registerProducts).toHaveBeenCalledTimes(1);
        expect(ProductDAO.prototype.registerProducts).toHaveBeenCalledWith(model, category, quantity, details, sellingPrice, arrivalDate);
    });

    test("should throw an error for invalid category", async () => {
        const model = "ModelY";
        const invalidCategory = "Tablet"; 
        const quantity = 50;
        const details = "Mid-range tablet";
        const sellingPrice = 499;
        const arrivalDate = "2023-02-01";
        
        const controller = new ProductController();

        await expect(controller.registerProducts(model, invalidCategory, quantity, details, sellingPrice, arrivalDate))
            .rejects.toThrow(new CustomError("Invalid input parameters",422));
    });

    test("should throw ProductAlreadyExistsError if the model already exists", async () => {
        const model = "ModelZ";
        const category = "Laptop";
        const quantity = 30;
        const details = "Gaming laptop";
        const sellingPrice = 1499.99;
        const arrivalDate = "2023-03-01";

        jest.spyOn(ProductDAO.prototype, "registerProducts").mockRejectedValue(new ProductAlreadyExistsError());
        const controller = new ProductController();

        await expect(controller.registerProducts(model, category, quantity, details, sellingPrice, arrivalDate))
            .rejects.toThrow(ProductAlreadyExistsError);
    });

    test("should throw DateError for future arrival date", async () => {
        const model = "ModelA";
        const category = "Appliance";
        const quantity = 20;
        const details = "Smart refrigerator";
        const sellingPrice = 2099.99;
        const futureArrivalDate = "3023-04-01"; 

        jest.spyOn(ProductDAO.prototype, "registerProducts").mockRejectedValue(new DateError());
        const controller = new ProductController();

        await expect(controller.registerProducts(model, category, quantity, details, sellingPrice, futureArrivalDate))
            .rejects.toThrow(DateError);
    });
});

describe("changeProductQuantity", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should successfully update product quantity", async () => {
        const model = "ModelX";
        const newQuantity = 50;
        const changeDate = "2023-01-02";
        const existingProduct = { quantity: 100, arrivalDate: "2023-01-01" };

        jest.spyOn(ProductDAO.prototype, "changeProductQuantity").mockResolvedValue(existingProduct.quantity + newQuantity);
        const controller = new ProductController();

        const updatedQuantity = await controller.changeProductQuantity(model, newQuantity, changeDate);
        expect(ProductDAO.prototype.changeProductQuantity).toHaveBeenCalledTimes(1);
        expect(ProductDAO.prototype.changeProductQuantity).toHaveBeenCalledWith(model, newQuantity, changeDate);
        expect(updatedQuantity).toBe(existingProduct.quantity + newQuantity);
    });

    test("should throw DateError for future change date", async () => {
        const model = "ModelY";
        const newQuantity = 30;
        const futureChangeDate = "3023-04-01"; 

        const controller = new ProductController();

        await expect(controller.changeProductQuantity(model, newQuantity, futureChangeDate))
            .rejects.toThrow(DateError);
    });

    test("should throw ProductNotFoundError if the product does not exist", async () => {
        const model = "ModelZ";
        const newQuantity = 20;
        const changeDate = "2023-02-01";

        jest.spyOn(ProductDAO.prototype, "changeProductQuantity").mockRejectedValue(new ProductNotFoundError());
        const controller = new ProductController();

        await expect(controller.changeProductQuantity(model, newQuantity, changeDate))
            .rejects.toThrow(ProductNotFoundError);
    });

    test("should throw DateError if change date is before product arrival date", async () => {
        const model = "ModelA";
        const newQuantity = 15;
        const invalidChangeDate = "2022-12-31"; 

        jest.spyOn(ProductDAO.prototype, "changeProductQuantity").mockRejectedValue(new DateError());
        const controller = new ProductController();

        await expect(controller.changeProductQuantity(model, newQuantity, invalidChangeDate))
            .rejects.toThrow(DateError);
    });
});

describe("sellProduct", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should successfully decrease product quantity on sale", async () => {
        const model = "ModelX";
        const quantity = 10;
        const sellingDate = "2023-01-02";
        const existingProduct = { quantity: 100, arrivalDate: "2023-01-01" };

        jest.spyOn(ProductDAO.prototype, "sellProduct").mockResolvedValue(existingProduct.quantity - quantity);
        const controller = new ProductController();

        const updatedQuantity = await controller.sellProduct(model, quantity, sellingDate);
        expect(ProductDAO.prototype.sellProduct).toHaveBeenCalledTimes(1);
        expect(ProductDAO.prototype.sellProduct).toHaveBeenCalledWith(model, quantity, sellingDate);
        expect(updatedQuantity).toBe(existingProduct.quantity - quantity);
    });

    test("should throw DateError for future selling date", async () => {
        const model = "ModelY";
        const quantity = 5;
        const futureSellingDate = "3023-04-01"; 

        const controller = new ProductController();

        await expect(controller.sellProduct(model, quantity, futureSellingDate))
            .rejects.toThrow(DateError);
    });

    test("should throw ProductNotFoundError if the product does not exist", async () => {
        const model = "ModelZ";
        const quantity = 20;
        const sellingDate = "2023-02-01";

        jest.spyOn(ProductDAO.prototype, "sellProduct").mockRejectedValue(new ProductNotFoundError());
        const controller = new ProductController();

        await expect(controller.sellProduct(model, quantity, sellingDate))
            .rejects.toThrow(ProductNotFoundError);
    });

    test("should throw DateError if selling date is before product arrival date", async () => {
        const model = "ModelA";
        const quantity = 15;
        const invalidSellingDate = "2022-12-31"; 

        jest.spyOn(ProductDAO.prototype, "sellProduct").mockRejectedValue(new DateError());
        const controller = new ProductController();

        await expect(controller.sellProduct(model, quantity, invalidSellingDate))
            .rejects.toThrow(DateError);
    });

    test("should throw LowProductStockError if the quantity to sell exceeds available stock", async () => {
        const model = "ModelB";
        const quantity = 150; 
        const sellingDate = "2023-01-03";
        const existingProduct = { quantity: 100, arrivalDate: "2023-01-01" };

        jest.spyOn(ProductDAO.prototype, "sellProduct").mockRejectedValue(new LowProductStockError());
        const controller = new ProductController();

        await expect(controller.sellProduct(model, quantity, sellingDate))
            .rejects.toThrow(LowProductStockError);
    });
});

describe("getProducts", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should return all products without any filters", async () => {
        const mockProducts = [
            new Product(999.99, "ModelX", Category.SMARTPHONE, "2023-01-01", "High-end smartphone", 100),
            new Product(1499.99, "ModelZ", Category.LAPTOP, "2023-03-01", "Gaming laptop", 30)
        ];

        jest.spyOn(ProductDAO.prototype, "getProducts").mockResolvedValue(mockProducts);
        const controller = new ProductController();

        const products = await controller.getProducts(null, null, null);
        expect(ProductDAO.prototype.getProducts).toHaveBeenCalledTimes(1);
        expect(ProductDAO.prototype.getProducts).toHaveBeenCalledWith(null, null, null);
        expect(products).toEqual(mockProducts);
    });

    test("should return products filtered by category", async () => {
        const category = "Smartphone";
        const mockProducts = [
            new Product(999.99, "ModelX", Category.SMARTPHONE, "2023-01-01", "High-end smartphone", 100)
        ];

        jest.spyOn(ProductDAO.prototype, "getProducts").mockResolvedValue(mockProducts);
        const controller = new ProductController();

        const products = await controller.getProducts("category", category, null);
        expect(ProductDAO.prototype.getProducts).toHaveBeenCalledTimes(1);
        expect(ProductDAO.prototype.getProducts).toHaveBeenCalledWith("category", category, null);
        expect(products).toEqual(mockProducts);
    });

    test("should return products filtered by model", async () => {
        const model = "ModelX";
        const mockProducts = [
            new Product(999.99, model, Category.SMARTPHONE, "2023-01-01", "High-end smartphone", 100)
        ];

        jest.spyOn(ProductDAO.prototype, "getProducts").mockResolvedValue(mockProducts);
        const controller = new ProductController();

        const products = await controller.getProducts("model", null, model);
        expect(ProductDAO.prototype.getProducts).toHaveBeenCalledTimes(1);
        expect(ProductDAO.prototype.getProducts).toHaveBeenCalledWith("model", null, model);
        expect(products).toEqual(mockProducts);
    });

    test("should throw an error for invalid category", async () => {
        const invalidCategory = "Tablet";

        const controller = new ProductController();

        await expect(controller.getProducts("category", invalidCategory, null))
            .rejects.toThrow(Error);
    });

    test("should throw an error for invalid grouping", async () => {
        const invalidGrouping = "color";

        const controller = new ProductController();

        await expect(controller.getProducts(invalidGrouping, null, "ModelX"))
            .rejects.toThrow(Error);
    });

    test("should throw an error if category and model are both specified", async () => {
        const controller = new ProductController();

        await expect(controller.getProducts("category", "Smartphone", "ModelX"))
            .rejects.toThrow(Error);
    });

    test("should throw ProductNotFoundError if no products found", async () => {
        jest.spyOn(ProductDAO.prototype, "getProducts").mockRejectedValue(new ProductNotFoundError());
        const controller = new ProductController();

        await expect(controller.getProducts("category", "Smartphone", null))
            .rejects.toThrow(ProductNotFoundError);
    });
});

describe("getAvailableProducts", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should return all available products without any filters", async () => {
        const mockProducts = [
            new Product(999.99, "ModelX", Category.SMARTPHONE, "2023-01-01", "High-end smartphone", 100),
            new Product(1499.99, "ModelZ", Category.LAPTOP, "2023-03-01", "Gaming laptop", 30)
        ];

        jest.spyOn(ProductDAO.prototype, "getAvailableProducts").mockResolvedValue(mockProducts);
        const controller = new ProductController();

        const products = await controller.getAvailableProducts(null, null, null);
        expect(ProductDAO.prototype.getAvailableProducts).toHaveBeenCalledTimes(1);
        expect(ProductDAO.prototype.getAvailableProducts).toHaveBeenCalledWith(null, null, null);
        expect(products).toEqual(mockProducts);
    });

    test("should return available products filtered by category", async () => {
        const category = "Smartphone";
        const mockProducts = [
            new Product(999.99, "ModelX", Category.SMARTPHONE, "2023-01-01", "High-end smartphone", 100)
        ];

        jest.spyOn(ProductDAO.prototype, "getAvailableProducts").mockResolvedValue(mockProducts);
        const controller = new ProductController();

        const products = await controller.getAvailableProducts("category", category, null);
        expect(ProductDAO.prototype.getAvailableProducts).toHaveBeenCalledTimes(1);

        expect(ProductDAO.prototype.getAvailableProducts).toHaveBeenCalledWith("category", category, null);
        expect(products).toEqual(mockProducts);
    });

    test("should return available products filtered by model", async () => {
        const model = "ModelX";
        const mockProducts = [
            new Product(999.99, model, Category.SMARTPHONE, "2023-01-01", "High-end smartphone", 100)
        ];

        jest.spyOn(ProductDAO.prototype, "getAvailableProducts").mockResolvedValue(mockProducts);
        const controller = new ProductController();

        const products = await controller.getAvailableProducts("model", null, model);
        expect(ProductDAO.prototype.getAvailableProducts).toHaveBeenCalledTimes(1);

        expect(ProductDAO.prototype.getAvailableProducts).toHaveBeenCalledWith("model", null, model);
        expect(products).toEqual(mockProducts);
    });

    test("should throw an error for invalid category", async () => {
        const invalidCategory = "Tablet";

        const controller = new ProductController();

        await expect(controller.getAvailableProducts("category", invalidCategory, null))
            .rejects.toThrow(Error);
    });

    test("should throw an error for invalid grouping", async () => {
        const invalidGrouping = "color";

        const controller = new ProductController();

        await expect(controller.getAvailableProducts(invalidGrouping, null, "ModelX"))
            .rejects.toThrow(Error);
    });

    test("should throw an error if category and model are both specified", async () => {
        const controller = new ProductController();

        await expect(controller.getAvailableProducts("category", "Smartphone", "ModelX"))
            .rejects.toThrow(Error);
    });

    test("should throw ProductNotFoundError if no available products found", async () => {
        jest.spyOn(ProductDAO.prototype, "getAvailableProducts").mockRejectedValue(new ProductNotFoundError());
        const controller = new ProductController();

        await expect(controller.getAvailableProducts("category", "Smartphone", null))
            .rejects.toThrow(ProductNotFoundError);
    });
});

describe("deleteAllProducts", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should successfully delete all products", async () => {
        jest.spyOn(ProductDAO.prototype, "deleteAllProducts").mockResolvedValue(true);

        const controller = new ProductController();
        const result = await controller.deleteAllProducts();
        expect(ProductDAO.prototype.deleteAllProducts).toHaveBeenCalledTimes(1);

        expect(ProductDAO.prototype.deleteAllProducts).toHaveBeenCalled();
        expect(result).toBe(true); 
    });

    test("should throw an error if the delete operation fails", async () => {
        const error = new Error("Database error");
        jest.spyOn(ProductDAO.prototype, "deleteAllProducts").mockRejectedValue(error);

        const controller = new ProductController();

        await expect(controller.deleteAllProducts()).rejects.toThrow("Database error");
    });
});

describe("deleteProduct", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should successfully delete a product by model", async () => {
        const model = "ModelX";
        jest.spyOn(ProductDAO.prototype, "deleteProduct").mockResolvedValue(true);

        const controller = new ProductController();
        const result = await controller.deleteProduct(model);
        expect(ProductDAO.prototype.deleteProduct).toHaveBeenCalledTimes(1);

        expect(ProductDAO.prototype.deleteProduct).toHaveBeenCalledWith(model);
        expect(result).toBe(true);
    });

    test("should throw ProductNotFoundError if the product does not exist", async () => {
        const model = "ModelY";
        jest.spyOn(ProductDAO.prototype, "deleteProduct").mockRejectedValue(new ProductNotFoundError());

        const controller = new ProductController();

        await expect(controller.deleteProduct(model)).rejects.toThrow(ProductNotFoundError);
    });

    test("should throw an error if the delete operation fails due to a database error", async () => {
        const model = "ModelZ";
        const error = new Error("Database error");
        jest.spyOn(ProductDAO.prototype, "deleteProduct").mockRejectedValue(error);

        const controller = new ProductController();

        await expect(controller.deleteProduct(model)).rejects.toThrow("Database error");
    });
});

