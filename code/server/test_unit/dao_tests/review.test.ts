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
import ReviewDAO from "../../src/dao/reviewDAO";
import { ExistingReviewError, NoReviewProductError } from "../../src/errors/reviewError";
import { ProductReview } from "../../src/components/review";


jest.mock("../../src/db/db.ts");

describe("addReview tests", () => {
    const reviewDAO = new ReviewDAO();

    test("should resolve when a review is successfully added", async () => {
        jest.spyOn(db, "get")
            .mockImplementationOnce((sql, params, callback) => callback(null, { username: "user1" })) 
            .mockImplementationOnce((sql, params, callback) => callback(null, { model: "ModelX" })) 
            .mockImplementationOnce((sql, params, callback) => callback(null, null)); 

        jest.spyOn(db, "run").mockImplementationOnce((sql, params, callback) => callback(null)); 

        await expect(reviewDAO.addReview("user1", "ModelX", 5, "Great product")).resolves.toBeUndefined();
    });

    test("should reject with UserNotFoundError if the user does not exist", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => callback(null, null)); 

        await expect(reviewDAO.addReview("user2", "ModelX", 4, "Good product")).rejects.toThrow(UserNotFoundError);
    });

    test("should reject with ProductNotFoundError if the product does not exist", async () => {
        jest.spyOn(db, "get")
            .mockImplementationOnce((sql, params, callback) => callback(null, { username: "user1" })) 
            .mockImplementationOnce((sql, params, callback) => callback(null, null)); 

        await expect(reviewDAO.addReview("user1", "ModelY", 4, "Good product")).rejects.toThrow(ProductNotFoundError);
    });

    
    test("should reject with ExistingReviewError if the review already exists", async () => {
        jest.spyOn(db, "get")
            .mockImplementationOnce((sql, params, callback) => callback(null, { username: "user1" })) 
            .mockImplementationOnce((sql, params, callback) => callback(null, { model: "ModelX" })) 
            .mockImplementationOnce((sql, params, callback) => callback(null, { purchase_id: 1 })) 
            .mockImplementationOnce((sql, params, callback) => callback(null, { review_id: 1 })); 

        await expect(reviewDAO.addReview("user1", "ModelX", 5, "Great product")).rejects.toThrow(ExistingReviewError);
    });

    test("should reject with an error if the database operation fails during user check", async () => {
        const error = new Error("Database error");
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => callback(error, null));

        await expect(reviewDAO.addReview("user1", "ModelX", 5, "Great product")).rejects.toThrow("Database error");
    });

    
});

describe("getProductReviews tests", () => {
    const reviewDAO = new ReviewDAO();

    test("should resolve with all reviews for a product when reviews are found", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, { model: "ModelX" }); 
            return {} as Database;
        });
        jest.spyOn(db, "all").mockImplementationOnce((sql, params, callback) => {
            callback(null, [
                { username: "user1", model: "ModelX", comment: "Great product", rating: 5, review_date: "2023-01-01" }
            ]);
            return {} as Database;
        });

        const expectedReviews = [
            new ProductReview("ModelX", "user1", 5, "2023-01-01", "Great product")
        ];
        await expect(reviewDAO.getProductReviews("ModelX")).resolves.toEqual(expectedReviews);
    });

    test("should resolve with an empty array when no reviews are found for the product", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, { model: "ModelX" }); 
            return {} as Database;
        });
        jest.spyOn(db, "all").mockImplementationOnce((sql, params, callback) => {
            callback(null, []);
            return {} as Database;
        });

        await expect(reviewDAO.getProductReviews("ModelX")).resolves.toEqual([]);
    });

    test("should reject with ProductNotFoundError if the product does not exist", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, null); 
            return {} as Database;
        });

        await expect(reviewDAO.getProductReviews("ModelY")).rejects.toThrow(ProductNotFoundError);
    });

    test("should reject with an error if the database operation fails during product check", async () => {
        const error = new Error("Database error");
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(error, null);
            return {} as Database;
        });

        await expect(reviewDAO.getProductReviews("ModelX")).rejects.toThrow("Database error");
    });

    test("should reject with an error if the database operation fails during review retrieval", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, { model: "ModelX" }); 
            return {} as Database;
        });
        const reviewError = new Error("Review retrieval error");
        jest.spyOn(db, "all").mockImplementationOnce((sql, params, callback) => {
            callback(reviewError, null);
            return {} as Database;
        });

        await expect(reviewDAO.getProductReviews("ModelX")).rejects.toThrow("Review retrieval error");
    });
});


describe("deleteReviewsOfProduct tests", () => {
    const reviewDAO = new ReviewDAO();

    test("should resolve when all reviews for a product are successfully deleted", async () => {
        jest.spyOn(db, "get")
            .mockImplementationOnce((sql, params, callback) => callback(null, { model: "ModelX" })) 
            .mockImplementationOnce((sql, params, callback) => callback(null, { review_id: 1 })); 

        jest.spyOn(db, "run").mockImplementationOnce((sql, params, callback) => callback(null)); 

        await expect(reviewDAO.deleteReviewsOfProduct("ModelX")).resolves.toBeUndefined();
    });

    test("should reject with ProductNotFoundError if the product does not exist", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => callback(null, null)); 

        await expect(reviewDAO.deleteReviewsOfProduct("ModelY")).rejects.toThrow(ProductNotFoundError);
    });

    test("should reject with NoReviewProductError if no reviews are found for the product", async () => {
        jest.spyOn(db, "get")
            .mockImplementationOnce((sql, params, callback) => callback(null, { model: "ModelX" })) 
            .mockImplementationOnce((sql, params, callback) => callback(null, null)); 

        await expect(reviewDAO.deleteReviewsOfProduct("ModelX")).rejects.toThrow(NoReviewProductError);
    });

    test("should reject with an error if the database operation fails during product check", async () => {
        const error = new Error("Database error");
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => callback(error, null));

        await expect(reviewDAO.deleteReviewsOfProduct("ModelX")).rejects.toThrow("Database error");
    });

    test("should reject with an error if the database operation fails during review deletion", async () => {
        jest.spyOn(db, "get")
            .mockImplementationOnce((sql, params, callback) => callback(null, { model: "ModelX" })) 
            .mockImplementationOnce((sql, params, callback) => callback(null, { review_id: 1 })); 

        const deleteError = new Error("Delete error");
        jest.spyOn(db, "run").mockImplementationOnce((sql, params, callback) => callback(deleteError));

        await expect(reviewDAO.deleteReviewsOfProduct("ModelX")).rejects.toThrow("Delete error");
    });
    test("should handle database errors during review retrieval", async () => {
        const error = new Error("Database error");
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => callback(error, null));
    
        await expect(reviewDAO.deleteReviewsOfProduct("ModelX")).rejects.toThrow("Database error");
    });
});

describe("deleteAllReviews tests", () => {
    const reviewDAO = new ReviewDAO();

    test("should resolve when all reviews are successfully deleted", async () => {
        jest.spyOn(db, "run").mockImplementationOnce((sql, callback) => callback(null)); 

        await expect(reviewDAO.deleteAllReviews()).resolves.toBeUndefined();
    });

    test("should reject with an error if the database operation fails during review deletion", async () => {
        const deleteError = new Error("Delete error");
        jest.spyOn(db, "run").mockImplementationOnce((sql, callback) => callback(deleteError));

        await expect(reviewDAO.deleteAllReviews()).rejects.toThrow("Delete error");
    });
});




describe("deleteReview tests", () => {
    const reviewDAO = new ReviewDAO();

    test("should resolve when a review is successfully deleted", async () => {
        jest.spyOn(db, "get")
            .mockImplementationOnce((sql, params, callback) => callback(null, { username: "user1" })) 
            .mockImplementationOnce((sql, params, callback) => callback(null, { model: "ModelX" })) 
            .mockImplementationOnce((sql, params, callback) => callback(null, { purchase_id: 1 }))
            .mockImplementationOnce((sql, params, callback) => callback(null, { review_id: 1 }));

        jest.spyOn(db, "run").mockImplementationOnce((sql, params, callback) => callback(null)); 

        await expect(reviewDAO.deleteReview("user1", "ModelX")).resolves.toBeUndefined();
    });

    test("should reject with UserNotFoundError if the user does not exist", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => callback(null, null));

        await expect(reviewDAO.deleteReview("user2", "ModelX")).rejects.toThrow(UserNotFoundError);
    });

    test("should reject with ProductNotFoundError if the product does not exist", async () => {
        jest.spyOn(db, "get")
            .mockImplementationOnce((sql, params, callback) => callback(null, { username: "user1" }))
            .mockImplementationOnce((sql, params, callback) => callback(null, null)); 

        await expect(reviewDAO.deleteReview("user1", "ModelY")).rejects.toThrow(ProductNotFoundError);
    });

    test("should reject if the customer has not purchased the product", async () => {
        jest.spyOn(db, "get")
            .mockImplementationOnce((sql, params, callback) => callback(null, { username: "user1" }))
            .mockImplementationOnce((sql, params, callback) => callback(null, { model: "ModelX" })) 
            .mockImplementationOnce((sql, params, callback) => callback(null, null));

        await expect(reviewDAO.deleteReview("user1", "ModelX")).rejects.toThrow("Customer has not purchased this product");
    });

    test("should reject with NoReviewProductError if the review does not exist", async () => {
        jest.spyOn(db, "get")
            .mockImplementationOnce((sql, params, callback) => callback(null, { username: "user1" })) 
            .mockImplementationOnce((sql, params, callback) => callback(null, { model: "ModelX" })) 
            .mockImplementationOnce((sql, params, callback) => callback(null, { purchase_id: 1 })) 
            .mockImplementationOnce((sql, params, callback) => callback(null, null)); 

        await expect(reviewDAO.deleteReview("user1", "ModelX")).rejects.toThrow(NoReviewProductError);
    });
});