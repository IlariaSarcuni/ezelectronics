import { describe, test, expect, beforeEach, jest } from "@jest/globals"

import ProductController from "../../src/controllers/productController"
import C from "../../src/dao/productDAO"
import db from "../../src/db/db"
import { Database } from "sqlite3"
import {User, Role} from "../../src/components/user"
import {Cart, ProductInCart} from "../../src/components/cart"
import { Product, Category} from "../../src/components/product"
import { UserNotFoundError, UserIsAdminError } from "../../src/errors/userError";
import { ProductAlreadyExistsError, ProductNotFoundError, LowProductStockError } from "../../src/errors/productError";
import { DateError } from "../../src/utilities";
import { CustomError } from "../../src/utilities";
import CartDAO from "../../src/dao/cartDAO"
import { CartNotFoundError, EmptyCartError,ProductNotInCartError } from "../../src/errors/cartError";
jest.mock("../../src/db/db.ts")

describe("addToCart tests", () => {
    const cartDAO = new CartDAO();

    test("should resolve true when adding a product to a new cart", async () => {
        jest.spyOn(db, "get")
            .mockImplementationOnce((sql, params, callback) => callback(null, { quantity: 10, sellingPrice: 100 })) 
            .mockImplementationOnce((sql, params, callback) => callback(null, null)); 

        jest.spyOn(db, "run")
            .mockImplementationOnce((sql, params, callback) => callback.call({ lastID: 1 }, null)) 
            .mockImplementationOnce((sql, params, callback) => callback(null)); 

        await expect(cartDAO.addToCart("user1", "ModelX")).resolves.toBe(true);
    });

    test("should resolve true when adding a product to an existing cart", async () => {
        jest.spyOn(db, "get")
            .mockImplementationOnce((sql, params, callback) => callback(null, { quantity: 10, sellingPrice: 100 })) 
            .mockImplementationOnce((sql, params, callback) => callback(null, { cart_id: 1, total: 200 })) 
            .mockImplementationOnce((sql, params, callback) => callback(null, { quantity: 1 })); 

        jest.spyOn(db, "run")
            .mockImplementationOnce((sql, params, callback) => callback(null)) 
            .mockImplementationOnce((sql, params, callback) => callback(null)); 

        await expect(cartDAO.addToCart("user1", "ModelX")).resolves.toBe(true);
    });

    test("should reject with ProductNotFoundError if the product does not exist", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => callback(null, null)); 

        await expect(cartDAO.addToCart("user1", "ModelY")).rejects.toThrow(ProductNotFoundError);
    });

    test("should reject with LowProductStockError if the product has no stock", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => callback(null, { quantity: 0 })); 

        await expect(cartDAO.addToCart("user1", "ModelZ")).rejects.toThrow(LowProductStockError);
    });

    test("should reject with an error if the database operation fails during product check", async () => {
        const error = new Error("Database error");
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => callback(error, null));

        await expect(cartDAO.addToCart("user1", "ModelA")).rejects.toThrow("Database error");
    });

});

describe("getCart tests", () => {
    const cartDAO = new CartDAO();

    test("should resolve with a cart object when a cart is found", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, { cart_id: 1, customer_username: "user1", total: 200 }); 
            return {} as Database;
        });
        jest.spyOn(db, "all").mockImplementationOnce((sql, params, callback) => {
            callback(null, [
                { model: "ModelX", category: Category.SMARTPHONE, quantity: 2, price: 100 }
            ]); 
            return {} as Database;
        });

        const expectedCart = new Cart("user1", false, null, 200, [
            { model: "ModelX", category: Category.SMARTPHONE, quantity: 2, price: 100 }
        ]);
        await expect(cartDAO.getCart("user1")).resolves.toEqual(expectedCart);
    });

    test("should resolve with an empty cart object when no cart is found", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, null); 
            return {} as Database;
        });

        const expectedCart = new Cart("user1", false, null, 0, []);
        await expect(cartDAO.getCart("user1")).resolves.toEqual(expectedCart);
    });

    test("should reject with an error if the database operation fails during cart retrieval", async () => {
        const error = new Error("Database error");
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(error, null);
            return {} as Database;
        });

        await expect(cartDAO.getCart("user1")).rejects.toThrow("Database error");
    });

    test("should reject with an error if the database operation fails during product retrieval in the cart", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, { cart_id: 1, customer_username: "user1", total: 200 }); 
            return {} as Database;
        });
        const productsError = new Error("Products retrieval error");
        jest.spyOn(db, "all").mockImplementationOnce((sql, params, callback) => {
            callback(productsError, null);
            return {} as Database;
        });

        await expect(cartDAO.getCart("user1")).rejects.toThrow("Products retrieval error");
    });
    test("should reject with an error if the database operation fails during cart retrieval", async () => {
        const error = new Error("Database error");
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(error, null);
            return {} as Database;
        });

        await expect(cartDAO.getCart("user1")).rejects.toThrow("Database error");
    });

    test("should reject with an error if the database operation fails during product retrieval in the cart", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, { cart_id: 1, customer_username: "user1", total: 200 }); 
            return {} as Database;
        });
        const productsError = new Error("Products retrieval error");
        jest.spyOn(db, "all").mockImplementationOnce((sql, params, callback) => {
            callback(productsError, null);
            return {} as Database;
        });

        await expect(cartDAO.getCart("user1")).rejects.toThrow("Products retrieval error");
    });
});


describe("checkoutCart tests", () => {
    const cartDAO = new CartDAO();

    test("should resolve true when checkout is successful", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, { cart_id: 1, customer_username: "user1" }); 
            return {} as Database;
        });
        jest.spyOn(db, "all")
            .mockImplementationOnce((sql, params, callback) => {
                callback(null, [{ product_model: "ModelX", quantity: 2 }]); 
                return {} as Database;
            })
            .mockImplementationOnce((sql, params, callback) => {
                callback(null, []); 
                return {} as Database;
            });
        jest.spyOn(db, "run").mockImplementation((sql, params, callback) => {
            callback(null); 
            return {} as Database;
        });

        await expect(cartDAO.checkoutCart("user1")).resolves.toBe(true);
    });

    test("should reject with CartNotFoundError if the cart does not exist", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, null); 
            return {} as Database;
        });

        await expect(cartDAO.checkoutCart("user1")).rejects.toThrow(CartNotFoundError);
    });

    test("should reject with EmptyCartError if the cart is empty", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, { cart_id: 1, customer_username: "user1" }); 
            return {} as Database;
        });
        jest.spyOn(db, "all").mockImplementationOnce((sql, params, callback) => {
            callback(null, []); 
            return {} as Database;
        });

        await expect(cartDAO.checkoutCart("user1")).rejects.toThrow(EmptyCartError);
    });

    test("should reject with LowProductStockError if there is insufficient stock", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, { cart_id: 1, customer_username: "user1" }); 
            return {} as Database;
        });
        jest.spyOn(db, "all")
            .mockImplementationOnce((sql, params, callback) => {
                callback(null, [{ product_model: "ModelX", quantity: 2 }]); 
                return {} as Database;
            })
            .mockImplementationOnce((sql, params, callback) => {
                callback(null, [{ model: "ModelX", stock: 1, required: 2 }]); 
                return {} as Database;
            });

        await expect(cartDAO.checkoutCart("user1")).rejects.toThrow(LowProductStockError);
    });

    test("should reject with an error if the database operation fails during cart retrieval", async () => {
        const error = new Error("Database error");
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(error, null);
            return {} as Database;
        });

        await expect(cartDAO.checkoutCart("user1")).rejects.toThrow("Database error");
    });
    test("should reject with an error if the database operation fails during cart retrieval", async () => {
        const error = new Error("Database error");
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(error, null);
            return {} as Database;
        });

        await expect(cartDAO.checkoutCart("user1")).rejects.toThrow("Database error");
    });

});

describe("getAllCarts tests", () => {
    const cartDAO = new CartDAO();

    test("should resolve with all carts when carts are found", async () => {
        jest.spyOn(db, "all").mockImplementationOnce((sql, params, callback) => {
            callback(null, [
                { cart_id: 1, customer: "user1", paid: false, payment_date: null, total: 300, model: "ModelX", category: Category.SMARTPHONE, quantity: 2, price: 150 },
                { cart_id: 2, customer: "user2", paid: true, payment_date: "2023-01-01", total: 200, model: "ModelZ", category: Category.SMARTPHONE, quantity: 1, price: 200 }
            ]);
            return {} as Database;
        });
    
        const expectedCarts = [
            new Cart("user1", false, null, 300, [
                new ProductInCart("ModelX", 2, Category.SMARTPHONE, 150),
            ]),
            new Cart("user2", true, "2023-01-01", 200, [
                new ProductInCart("ModelZ", 1, Category.SMARTPHONE, 200)
            ])
        ];
        await expect(cartDAO.getAllCarts()).resolves.toEqual(expectedCarts);
    });

    test("should resolve with an empty array when no carts are found", async () => {
        jest.spyOn(db, "all").mockImplementationOnce((sql, params, callback) => {
            callback(null, []);
            return {} as Database;
        });

        await expect(cartDAO.getAllCarts()).resolves.toEqual([]);
    });

    test("should reject with an error if the database operation fails", async () => {
        const error = new Error("Database error");
        jest.spyOn(db, "all").mockImplementationOnce((sql, params, callback) => {
            callback(error, null);
            return {} as Database;
        });

        await expect(cartDAO.getAllCarts()).rejects.toThrow("Database error");
    });
    
});


describe("getCustomerCarts tests", () => {
    const cartDAO = new CartDAO();

    test("should resolve with all paid carts for a specific customer when carts are found", async () => {
        jest.spyOn(db, "all").mockImplementationOnce((sql, [username], callback) => {
            callback(null, [
                { cart_id: 1, customer: "user1", paid: true, payment_date: "2023-01-01", total: 300, model: "ModelX", category: Category.SMARTPHONE, quantity: 2, price: 150 },
                { cart_id: 1, customer: "user1", paid: true, payment_date: "2023-01-01", total: 300, model: "ModelY", category: Category.SMARTPHONE, quantity: 1, price: 150 }
            ]);
            return {} as Database;
        });
    
        const expectedCarts = [
            new Cart("user1", true, "2023-01-01", 300, [
                new ProductInCart("ModelX", 2, Category.SMARTPHONE, 150),
                new ProductInCart("ModelY", 1, Category.SMARTPHONE, 150)
            ])
        ];
        await expect(cartDAO.getCustomerCarts("user1")).resolves.toEqual(expectedCarts);
    });

    test("should resolve with an empty array when no paid carts are found for the customer", async () => {
        jest.spyOn(db, "all").mockImplementationOnce((sql, [username], callback) => {
            callback(null, []);
            return {} as Database;
        });

        await expect(cartDAO.getCustomerCarts("user1")).resolves.toEqual([]);
    });

    test("should reject with an error if the database operation fails", async () => {
        const error = new Error("Database error");
        jest.spyOn(db, "all").mockImplementationOnce((sql, [username], callback) => {
            callback(error, null);
            return {} as Database;
        });

        await expect(cartDAO.getCustomerCarts("user1")).rejects.toThrow("Database error");
    });
});

describe("removeProductFromCart tests", () => {
    const cartDAO = new CartDAO();

    test("should resolve true when a product is successfully removed from the cart", async () => {
        jest.spyOn(db, "get")
            .mockImplementationOnce((sql, params, callback) => callback(null, { model: "ModelX" })) 
            .mockImplementationOnce((sql, params, callback) => callback(null, { cart_id: 1, total: 200 })) 
            .mockImplementationOnce((sql, params, callback) => callback(null, { quantity: 2, price: 100 })); 

        jest.spyOn(db, "run")
            .mockImplementationOnce((sql, params, callback) => callback(null)) 
            .mockImplementationOnce((sql, params, callback) => callback(null)); 

        await expect(cartDAO.removeProductFromCart("user1", "ModelX")).resolves.toBe(true);
    });

    test("should reject with ProductNotFoundError if the product does not exist", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => callback(null, null)); 

        await expect(cartDAO.removeProductFromCart("user1", "ModelY")).rejects.toThrow(ProductNotFoundError);
    });

    test("should reject with CartNotFoundError if no unpaid cart is found", async () => {
        jest.spyOn(db, "get")
            .mockImplementationOnce((sql, params, callback) => callback(null, { model: "ModelX" })) 
            .mockImplementationOnce((sql, params, callback) => callback(null, null)); 

        await expect(cartDAO.removeProductFromCart("user1", "ModelX")).rejects.toThrow(CartNotFoundError);
    });

    test("should reject with ProductNotInCartError if the product is not in the cart", async () => {
        jest.spyOn(db, "get")
            .mockImplementationOnce((sql, params, callback) => callback(null, { model: "ModelX" })) 
            .mockImplementationOnce((sql, params, callback) => callback(null, { cart_id: 1, total: 200 })) 
            .mockImplementationOnce((sql, params, callback) => callback(null, null)); 

        await expect(cartDAO.removeProductFromCart("user1", "ModelX")).rejects.toThrow(ProductNotInCartError);
    });

    test("should reject with an error if the database operation fails during product check", async () => {
        const error = new Error("Database error");
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => callback(error, null));

        await expect(cartDAO.removeProductFromCart("user1", "ModelA")).rejects.toThrow("Database error");
    });

    
});

describe("clearCart tests", () => {
    const cartDAO = new CartDAO();

    test("should resolve true when the cart is successfully cleared", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, { cart_id: 1 }); 
            return {} as Database;
        });
        jest.spyOn(db, "run")
            .mockImplementationOnce((sql, params, callback) => callback(null)) 
            .mockImplementationOnce((sql, params, callback) => callback(null)); 

        await expect(cartDAO.clearCart("user1")).resolves.toBe(true);
    });

    test("should reject with CartNotFoundError if the cart does not exist", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, null); 
            return {} as Database;
        });

        await expect(cartDAO.clearCart("user1")).rejects.toThrow(CartNotFoundError);
    });

    test("should reject with an error if the database operation fails during cart existence check", async () => {
        const error = new Error("Database error");
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(error, null);
            return {} as Database;
        });

        await expect(cartDAO.clearCart("user1")).rejects.toThrow("Database error");
    });

    test("should reject with an error if the database operation fails during product deletion", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, { cart_id: 1 }); 
            return {} as Database;
        });
        const deleteError = new Error("Delete error");
        jest.spyOn(db, "run").mockImplementationOnce((sql, params, callback) => {
            callback(deleteError);
            return {} as Database;
        });

        await expect(cartDAO.clearCart("user1")).rejects.toThrow("Delete error");
    });

    test("should reject with an error if the database operation fails during cart total update", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, { cart_id: 1 }); 
            return {} as Database;
        });
        jest.spyOn(db, "run")
            .mockImplementationOnce((sql, params, callback) => callback(null)) 
            .mockImplementationOnce((sql, params, callback) => {
                const updateError = new Error("Update error");
                callback(updateError);
                return {} as Database;
            });

        await expect(cartDAO.clearCart("user1")).rejects.toThrow("Update error");
    });
    test("should reject with an error if the database operation fails during product deletion", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, { cart_id: 1 }); 
            return {} as Database;
        });
        const deleteError = new Error("Delete error");
        jest.spyOn(db, "run").mockImplementationOnce((sql, params, callback) => {
            callback(deleteError);
            return {} as Database;
        });

        await expect(cartDAO.clearCart("user1")).rejects.toThrow("Delete error");
    });

    test("should reject with an error if the database operation fails during cart total update", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, { cart_id: 1 }); 
            return {} as Database;
        });
        jest.spyOn(db, "run")
            .mockImplementationOnce((sql, params, callback) => callback(null)) 
            .mockImplementationOnce((sql, params, callback) => {
                const updateError = new Error("Update error");
                callback(updateError);
                return {} as Database;
            });

        await expect(cartDAO.clearCart("user1")).rejects.toThrow("Update error");
    });
});

describe("deleteAllCarts tests", () => {
    const cartDAO = new CartDAO();

    test("should resolve to true if all carts and cart items are successfully deleted", async () => {
        jest.spyOn(db, "run")
            .mockImplementationOnce((sql, params, callback) => callback(null)) 
            .mockImplementationOnce((sql, params, callback) => callback(null)); 

        await expect(cartDAO.deleteAllCarts()).resolves.toBe(true);
    });

    test("should reject with an error if the database operation fails during cart items deletion", async () => {
        const deleteItemsError = new Error("Delete cart items error");
        jest.spyOn(db, "run").mockImplementationOnce((sql, params, callback) => {
            callback(deleteItemsError);
            return {} as Database;
        });

        await expect(cartDAO.deleteAllCarts()).rejects.toThrow("Delete cart items error");
    });

    test("should reject with an error if the database operation fails during carts deletion", async () => {
        jest.spyOn(db, "run")
            .mockImplementationOnce((sql, params, callback) => callback(null)) 
            .mockImplementationOnce((sql, params, callback) => {
                const deleteCartsError = new Error("Delete carts error");
                callback(deleteCartsError);
                return {} as Database;
                });

        await expect(cartDAO.deleteAllCarts()).rejects.toThrow("Delete carts error");
    });
});