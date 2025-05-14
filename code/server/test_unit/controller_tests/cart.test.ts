import { Product, Category } from "../../src/components/product"
import { test, expect, jest, describe, beforeEach } from "@jest/globals"
import CartController from "../../src/controllers/cartController"
import CartDAO from "../../src/dao/cartDAO"
import ProductDAO from "../../src/dao/productDAO"
import UserDAO from "../../src/dao/userDAO"
import { ProductNotFoundError, ProductAlreadyExistsError, ProductSoldError, EmptyProductStockError, LowProductStockError } from "../../src/errors/productError"
import {ProductNotInCartError} from "../../src/errors/cartError"
jest.mock("../../src/dao/cartDAO")
import {DateError} from "../../src/utilities"
import { Cart } from "../../src/components/cart"
import {User,Role} from "../../src/components/user"
import { CartNotFoundError, EmptyCartError } from "../../src/errors/cartError"
describe("addToCart", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should successfully add a new product to a new cart", async () => {
        const user = new User("user1", "Name1", "Surname1", Role.CUSTOMER, "Address1", "2000-01-01");
        const productModel = "ModelX";
        jest.spyOn(CartDAO.prototype, "addToCart").mockResolvedValue(true);

        const controller = new CartController();
        const result = await controller.addToCart(user, productModel);
        expect(CartDAO.prototype.addToCart).toHaveBeenCalledTimes(1);
        expect(CartDAO.prototype.addToCart).toHaveBeenCalledWith(user.username, productModel);
        expect(result).toBe(true);
    });

    test("should successfully add a product to an existing cart", async () => {
        const user = new User("user2", "Name2", "Surname2", Role.CUSTOMER, "Address2", "2000-02-02");
        const productModel = "ModelY";
        jest.spyOn(CartDAO.prototype, "addToCart").mockResolvedValue(true);

        const controller = new CartController();
        const result = await controller.addToCart(user, productModel);
        expect(CartDAO.prototype.addToCart).toHaveBeenCalledTimes(1);
        expect(CartDAO.prototype.addToCart).toHaveBeenCalledWith(user.username, productModel);
        expect(result).toBe(true);
    });

    test("should throw an error if the product is not available", async () => {
        const user = new User("user3", "Name3", "Surname3", Role.CUSTOMER, "Address3", "2000-03-03");
        const productModel = "ModelZ";
        jest.spyOn(CartDAO.prototype, "addToCart").mockRejectedValue(new LowProductStockError());

        const controller = new CartController();

        await expect(controller.addToCart(user, productModel)).rejects.toThrow(LowProductStockError);
    });
    test("should throw an error if the product does not exist", async () => {
        const user = new User("user3", "Name3", "Surname3", Role.CUSTOMER, "Address3", "2000-03-03");
        const productModel = "ModelZ";
        jest.spyOn(CartDAO.prototype, "addToCart").mockRejectedValue(new ProductNotFoundError());

        const controller = new CartController();

        await expect(controller.addToCart(user, productModel)).rejects.toThrow(ProductNotFoundError);
    })
    

    test("should throw an error if the user does not exist", async () => {
        const user = new User("user4", "Name4", "Surname4", Role.CUSTOMER, "Address4", "2000-04-04");
        const productModel = "ModelA";
        jest.spyOn(CartDAO.prototype, "addToCart").mockRejectedValue(new Error("User not found"));

        const controller = new CartController();

        await expect(controller.addToCart(user, productModel)).rejects.toThrow("User not found");
    });
    test("should throw an error if the user does not exist", async () => {
        const user = new User("user4", "Name4", "Surname4", Role.CUSTOMER, "Address4", "2000-04-04");
        const userNotFoundError = new Error("User not found");

        jest.spyOn(CartDAO.prototype, "getCart").mockRejectedValue(userNotFoundError);

        const controller = new CartController();

        await expect(controller.addToCart(user, "ModelX")).rejects.toThrow("User not found");
    });
});

describe("getCart", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should retrieve the current cart for a user", async () => {
        const user = new User("user1", "Name1", "Surname1", Role.CUSTOMER, "Address1", "2000-01-01");
        const mockCart = new Cart(user.username, false, null, 100, [
            { model: "ModelX", category: Category.SMARTPHONE, quantity: 1, price: 100 }
        ]);

        jest.spyOn(CartDAO.prototype, "getCart").mockResolvedValue(mockCart);

        const controller = new CartController();
        const result = await controller.getCart(user);
        expect(CartDAO.prototype.getCart).toHaveBeenCalledTimes(1);

        expect(CartDAO.prototype.getCart).toHaveBeenCalledWith(user.username);
        expect(result).toEqual(mockCart);
    });

    test("should return an empty cart if no cart exists for the user", async () => {
        const user = new User("user2", "Name2", "Surname2", Role.CUSTOMER, "Address2", "2000-02-02");
        const emptyCart = new Cart( user.username, false, null, 0, []);

        jest.spyOn(CartDAO.prototype, "getCart").mockResolvedValue(emptyCart);

        const controller = new CartController();
        const result = await controller.getCart(user);
        expect(CartDAO.prototype.getCart).toHaveBeenCalledTimes(1);

        expect(CartDAO.prototype.getCart).toHaveBeenCalledWith(user.username);
        expect(result).toEqual(emptyCart);
    });


    test("should throw an error if the user does not exist", async () => {
        const user = new User("user4", "Name4", "Surname4", Role.CUSTOMER, "Address4", "2000-04-04");
        const userNotFoundError = new Error("User not found");

        jest.spyOn(CartDAO.prototype, "getCart").mockRejectedValue(userNotFoundError);

        const controller = new CartController();

        await expect(controller.getCart(user)).rejects.toThrow("User not found");
    });
});

describe("checkoutCart", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should successfully checkout a user's cart", async () => {
        const user = new User("user1", "Name1", "Surname1", Role.CUSTOMER, "Address1", "2000-01-01");

        jest.spyOn(CartDAO.prototype, "checkoutCart").mockResolvedValue(true);
        const controller = new CartController();

        const result = await controller.checkoutCart(user);
        expect(CartDAO.prototype.checkoutCart).toHaveBeenCalledTimes(1);

        expect(CartDAO.prototype.checkoutCart).toHaveBeenCalledWith(user.username);
        expect(result).toBe(true); 
    });

    test("should throw an error if the user does not exist", async () => {
        const user = new User("user2", "Name2", "Surname2", Role.CUSTOMER, "Address2", "2000-02-02");

        jest.spyOn(CartDAO.prototype, "checkoutCart").mockRejectedValue(new Error("User not found"));
        const controller = new CartController();

        await expect(controller.checkoutCart(user)).rejects.toThrow("User not found");
    });

    test("should throw CartNotFoundError if the cart does not exist", async () => {
        const user = new User("user3", "Name3", "Surname3", Role.CUSTOMER, "Address3", "2000-03-03");

        jest.spyOn(CartDAO.prototype, "checkoutCart").mockRejectedValue(new CartNotFoundError());
        const controller = new CartController();

        await expect(controller.checkoutCart(user)).rejects.toThrow(CartNotFoundError);
    });

    test("should throw EmptyCartError if the cart is empty", async () => {
        const user = new User("user4", "Name4", "Surname4", Role.CUSTOMER, "Address4", "2000-04-04");

        jest.spyOn(CartDAO.prototype, "checkoutCart").mockRejectedValue(new EmptyCartError());
        const controller = new CartController();

        await expect(controller.checkoutCart(user)).rejects.toThrow(EmptyCartError);
    });

    test("should throw LowProductStockError if there is insufficient stock for any product", async () => {
        const user = new User("user5", "Name5", "Surname5", Role.CUSTOMER, "Address5", "2000-05-05");

        jest.spyOn(CartDAO.prototype, "checkoutCart").mockRejectedValue(new LowProductStockError());
        const controller = new CartController();

        await expect(controller.checkoutCart(user)).rejects.toThrow(LowProductStockError);
    });
});

describe("getCustomerCarts", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should retrieve all paid carts for a user", async () => {
        const user = new User("user1", "Name1", "Surname1", Role.CUSTOMER, "Address1", "2000-01-01");
        const mockCarts = [
            {
                
                customer: user.username,
                paid: true,
                paymentDate: "2023-01-02",
                total: 500,
                products: [
                    { model: "ModelX", category: Category.SMARTPHONE, quantity: 2, price: 250 }
                ]
            }
        ];

        jest.spyOn(CartDAO.prototype, "getCustomerCarts").mockResolvedValue(mockCarts);
        const controller = new CartController();

        const carts = await controller.getCustomerCarts(user);
        expect(CartDAO.prototype.getCustomerCarts).toHaveBeenCalledTimes(1);

        expect(CartDAO.prototype.getCustomerCarts).toHaveBeenCalledWith(user.username);
        expect(carts).toEqual(mockCarts);
    });

    test("should throw an error if the user does not exist", async () => {
        const user = new User("user2", "Name2", "Surname2", Role.CUSTOMER, "Address2", "2000-02-02");

        jest.spyOn(CartDAO.prototype, "getCustomerCarts").mockRejectedValue(new Error("User not found"));
        const controller = new CartController();

        await expect(controller.getCustomerCarts(user)).rejects.toThrow("User not found");
    });

    test("should return an empty array if no carts are found for the user", async () => {
        const user = new User("user3", "Name3", "Surname3", Role.CUSTOMER, "Address3", "2000-03-03");
        const emptyCarts: any[] = [];

        jest.spyOn(CartDAO.prototype, "getCustomerCarts").mockResolvedValue(emptyCarts);
        const controller = new CartController();

        const carts = await controller.getCustomerCarts(user);
        expect(CartDAO.prototype.getCustomerCarts).toHaveBeenCalledTimes(1);

        expect(CartDAO.prototype.getCustomerCarts).toHaveBeenCalledWith(user.username);
        expect(carts).toEqual(emptyCarts);
    });
});

describe("removeProductFromCart", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should successfully remove one unit of a product from the cart", async () => {
        const user = new User("user1", "Name1", "Surname1", Role.CUSTOMER, "Address1", "2000-01-01");
        const productModel = "ModelX";

        jest.spyOn(CartDAO.prototype, "removeProductFromCart").mockResolvedValue(true);
        const controller = new CartController();

        const result = await controller.removeProductFromCart(user, productModel);
        expect(CartDAO.prototype.removeProductFromCart).toHaveBeenCalledTimes(1);

        expect(CartDAO.prototype.removeProductFromCart).toHaveBeenCalledWith(user.username, productModel);
        expect(result).toBe(true); 
    });

    test("should throw an error if the user does not exist", async () => {
        const user = new User("user2", "Name2", "Surname2", Role.CUSTOMER, "Address2", "2000-02-02");
        const productModel = "ModelY";

        jest.spyOn(CartDAO.prototype, "removeProductFromCart").mockRejectedValue(new Error("User not found"));
        const controller = new CartController();

        await expect(controller.removeProductFromCart(user, productModel)).rejects.toThrow("User not found");
    });

    test("should throw CartNotFoundError if the cart does not exist", async () => {
        const user = new User("user3", "Name3", "Surname3", Role.CUSTOMER, "Address3", "2000-03-03");
        const productModel = "ModelZ";

        jest.spyOn(CartDAO.prototype, "removeProductFromCart").mockRejectedValue(new CartNotFoundError());
        const controller = new CartController();

        await expect(controller.removeProductFromCart(user, productModel)).rejects.toThrow(CartNotFoundError);
    });

    test("should throw ProductNotInCartError if the product is not in the cart", async () => {
        const user = new User("user4", "Name4", "Surname4", Role.CUSTOMER, "Address4", "2000-04-04");
        const productModel = "ModelA";

        jest.spyOn(CartDAO.prototype, "removeProductFromCart").mockRejectedValue(new ProductNotInCartError());
        const controller = new CartController();

        await expect(controller.removeProductFromCart(user, productModel)).rejects.toThrow(ProductNotInCartError);
    });

    test("should throw ProductNotFoundError if the product does not exist", async () => {
        const user = new User("user5", "Name5", "Surname5", Role.CUSTOMER, "Address5", "2000-05-05");
        const productModel = "ModelB";

        jest.spyOn(CartDAO.prototype, "removeProductFromCart").mockRejectedValue(new ProductNotFoundError());
        const controller = new CartController();

        await expect(controller.removeProductFromCart(user, productModel)).rejects.toThrow(ProductNotFoundError);
    });
});

describe("clearCart", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should successfully clear all products from the user's cart", async () => {
        const user = new User("user1", "Name1", "Surname1", Role.CUSTOMER, "Address1", "2000-01-01");

        jest.spyOn(CartDAO.prototype, "clearCart").mockResolvedValue(true);
        const controller = new CartController();

        const result = await controller.clearCart(user);
        expect(CartDAO.prototype.clearCart).toHaveBeenCalledTimes(1);

        expect(CartDAO.prototype.clearCart).toHaveBeenCalledWith(user.username);
        expect(result).toBe(true); 
    });

    test("should throw an error if the user does not exist", async () => {
        const user = new User("user2", "Name2", "Surname2", Role.CUSTOMER, "Address2", "2000-02-02");

        jest.spyOn(CartDAO.prototype, "clearCart").mockRejectedValue(new Error("User not found"));
        const controller = new CartController();

        await expect(controller.clearCart(user)).rejects.toThrow("User not found");
    });

    test("should throw CartNotFoundError if the cart does not exist", async () => {
        const user = new User("user3", "Name3", "Surname3", Role.CUSTOMER, "Address3", "2000-03-03");

        jest.spyOn(CartDAO.prototype, "clearCart").mockRejectedValue(new CartNotFoundError());
        const controller = new CartController();

        await expect(controller.clearCart(user)).rejects.toThrow(CartNotFoundError);
    });
});

describe("deleteAllCarts", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should successfully delete all carts and their items", async () => {
        jest.spyOn(CartDAO.prototype, "deleteAllCarts").mockResolvedValue(true);
        const controller = new CartController();

        const result = await controller.deleteAllCarts();
        expect(CartDAO.prototype.deleteAllCarts).toHaveBeenCalledTimes(1);

        expect(CartDAO.prototype.deleteAllCarts).toHaveBeenCalled();
        expect(result).toBe(true); 
    });

    test("should throw an error if there is a problem deleting cart items", async () => {
        const error = new Error("Error deleting cart items");
        jest.spyOn(CartDAO.prototype, "deleteAllCarts").mockRejectedValue(error);
        const controller = new CartController();

        await expect(controller.deleteAllCarts()).rejects.toThrow("Error deleting cart items");
    });

    test("should throw an error if there is a problem deleting carts", async () => {
        const error = new Error("Error deleting carts");
        jest.spyOn(CartDAO.prototype, "deleteAllCarts").mockImplementation(() => {
            return new Promise((resolve, reject) => {
                
                reject(error);
            });
        });
        const controller = new CartController();

        await expect(controller.deleteAllCarts()).rejects.toThrow("Error deleting carts");
    });
});

describe("getAllCarts", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should retrieve all carts from the database", async () => {
        const mockCarts = [
            {
                
                customer: "user1",
                paid: true,
                paymentDate: "2023-01-02",
                total: 500,
                products: [
                    { model: "ModelX", category: Category.SMARTPHONE, quantity: 2, price: 250 }
                ]
            }
        ];

        jest.spyOn(CartDAO.prototype, "getAllCarts").mockResolvedValue(mockCarts);
        const controller = new CartController();

        const result = await controller.getAllCarts();
        expect(CartDAO.prototype.getAllCarts).toHaveBeenCalledTimes(1);

        expect(CartDAO.prototype.getAllCarts).toHaveBeenCalled();
        expect(result).toEqual(mockCarts);
    });

    test("should handle errors when retrieving carts from the database", async () => {
        const error = new Error("Database error");
        jest.spyOn(CartDAO.prototype, "getAllCarts").mockRejectedValue(error);
        const controller = new CartController();

        await expect(controller.getAllCarts()).rejects.toThrow("Database error");
    });
});