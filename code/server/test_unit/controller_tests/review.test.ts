import { Product, Category } from "../../src/components/product"
import { test, expect, jest, describe, beforeEach } from "@jest/globals"
import ProductController from "../../src/controllers/productController"
import ProductDAO from "../../src/dao/productDAO"
import ReviewController from "../../src/controllers/reviewController"
import ReviewDAO from "../../src/dao/reviewDAO"
import { ProductNotFoundError, ProductAlreadyExistsError, ProductSoldError, EmptyProductStockError, LowProductStockError } from "../../src/errors/productError"
import {User, Role} from "../../src/components/user"
import {UserNotFoundError} from "../../src/errors/userError"
import {ExistingReviewError,NoReviewProductError} from "../../src/errors/reviewError"
jest.mock("../../src/dao/reviewDAO")
import {DateError, CustomError} from "../../src/utilities"
import {ProductReview} from "../../src/components/review"
describe("addReview", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should successfully add a review for a product", async () => {
        const user = new User("user1", "Name1", "Surname1", Role.CUSTOMER, "Address1", "2000-01-01");
        const model = "ModelX";
        const score = 5;
        const comment = "Great product";

        jest.spyOn(ReviewDAO.prototype, "addReview").mockResolvedValue();
        const controller = new ReviewController();

        await controller.addReview(model, user, score, comment);
        expect(ReviewDAO.prototype.addReview).toHaveBeenCalledTimes(1);
        expect(ReviewDAO.prototype.addReview).toHaveBeenCalledWith(user.username, model, score, comment);
    });

    test("should throw ProductNotFoundError if the product does not exist", async () => {
        const user = new User("user2", "Name2", "Surname2", Role.CUSTOMER, "Address2", "2000-02-02");
        const model = "ModelY";
        const score = 4;
        const comment = "Good product";

        jest.spyOn(ReviewDAO.prototype, "addReview").mockRejectedValue(new ProductNotFoundError());
        const controller = new ReviewController();
        
        await expect(controller.addReview(model, user, score, comment)).rejects.toThrow(ProductNotFoundError);
    });

    test("should throw UserNotFoundError if the user does not exist", async () => {
        const user = new User("user3", "Name3", "Surname3", Role.CUSTOMER, "Address3", "2000-03-03");
        const model = "ModelZ";
        const score = 3;
        const comment = "Average product";

        jest.spyOn(ReviewDAO.prototype, "addReview").mockRejectedValue(new UserNotFoundError());
        const controller = new ReviewController();

        await expect(controller.addReview(model, user, score, comment)).rejects.toThrow(UserNotFoundError);
    });


    test("should throw an error if the user has not purchased the product", async () => {
        const user = new User("user5", "Name5", "Surname5", Role.CUSTOMER, "Address5", "2000-05-05");
        const model = "ModelB";
        const score = 2;
        const comment = "Not purchased";

        jest.spyOn(ReviewDAO.prototype, "addReview").mockRejectedValue(new Error("Customer has not purchased this product"));
        const controller = new ReviewController();

        await expect(controller.addReview(model, user, score, comment)).rejects.toThrow("Customer has not purchased this product");
    });

    test("should throw ExistingReviewError if the review already exists", async () => {
        const user = new User("user6", "Name6", "Surname6", Role.CUSTOMER, "Address6", "2000-06-06");
        const model = "ModelC";
        const score = 5;
        const comment = "Already reviewed";

        jest.spyOn(ReviewDAO.prototype, "addReview").mockRejectedValue(new ExistingReviewError());
        const controller = new ReviewController();

        await expect(controller.addReview(model, user, score, comment)).rejects.toThrow(ExistingReviewError);
    });
});

describe("getProductReviews", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should retrieve all reviews for a product", async () => {
        const model = "ModelX";
        const mockReviews = [
            new ProductReview(model, "user1", 5, "Great product", "2023-01-01"),
            new ProductReview(model, "user2", 4, "Good product", "2023-01-02")
        ];

        jest.spyOn(ReviewDAO.prototype, "getProductReviews").mockResolvedValue(mockReviews);
        const controller = new ReviewController();

        const result = await controller.getProductReviews(model);
        expect(ReviewDAO.prototype.getProductReviews).toHaveBeenCalledTimes(1);
        expect(ReviewDAO.prototype.getProductReviews).toHaveBeenCalledWith(model);
        expect(result).toEqual(mockReviews);
    });

    test("should handle errors when retrieving reviews from the database", async () => {
        const model = "ModelY";
        const error = new Error("Database error");

        jest.spyOn(ReviewDAO.prototype, "getProductReviews").mockRejectedValue(error);
        const controller = new ReviewController();

        await expect(controller.getProductReviews(model)).rejects.toThrow("Database error");
    });

    test("should return an empty array if no reviews are found for the product", async () => {
        const model = "ModelZ";
        const emptyReviews: ProductReview[] = [];

        jest.spyOn(ReviewDAO.prototype, "getProductReviews").mockResolvedValue(emptyReviews);
        const controller = new ReviewController();

        const result = await controller.getProductReviews(model);
        expect(ReviewDAO.prototype.getProductReviews).toHaveBeenCalledTimes(1);
        expect(ReviewDAO.prototype.getProductReviews).toHaveBeenCalledWith(model);
        expect(result).toEqual(emptyReviews);
    });
});

describe("deleteReview", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should successfully delete a review made by a user for a product", async () => {
        const user = new User("user1", "Name1", "Surname1", Role.CUSTOMER, "Address1", "2000-01-01");
        const model = "ModelX";

        jest.spyOn(ReviewDAO.prototype, "deleteReview").mockResolvedValue();
        const controller = new ReviewController();

        await controller.deleteReview(model, user);
        expect(ReviewDAO.prototype.deleteReview).toHaveBeenCalledTimes(1);
        expect(ReviewDAO.prototype.deleteReview).toHaveBeenCalledWith(user.username, model);
    });

    test("should throw ProductNotFoundError if the product does not exist", async () => {
        const user = new User("user2", "Name2", "Surname2", Role.CUSTOMER, "Address2", "2000-02-02");
        const model = "ModelY";

        jest.spyOn(ReviewDAO.prototype, "deleteReview").mockRejectedValue(new ProductNotFoundError());
        const controller = new ReviewController();

        await expect(controller.deleteReview(model, user)).rejects.toThrow(ProductNotFoundError);
    });

    test("should throw UserNotFoundError if the user does not exist", async () => {
        const user = new User("user3", "Name3", "Surname3", Role.CUSTOMER, "Address3", "2000-03-03");
        const model = "ModelZ";

        jest.spyOn(ReviewDAO.prototype, "deleteReview").mockRejectedValue(new UserNotFoundError());
        const controller = new ReviewController();

        await expect(controller.deleteReview(model, user)).rejects.toThrow(UserNotFoundError);
    });

    test("should throw NoReviewProductError if the review does not exist", async () => {
        const user = new User("user4", "Name4", "Surname4", Role.CUSTOMER, "Address4", "2000-04-04");
        const model = "ModelA";

        jest.spyOn(ReviewDAO.prototype, "deleteReview").mockRejectedValue(new NoReviewProductError());
        const controller = new ReviewController();

        await expect(controller.deleteReview(model, user)).rejects.toThrow(NoReviewProductError);
    });
    
});

describe("deleteReviewsOfProduct", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should successfully delete all reviews for a product", async () => {
        const model = "ModelX";

        jest.spyOn(ReviewDAO.prototype, "deleteReviewsOfProduct").mockResolvedValue();
        const controller = new ReviewController();

        await controller.deleteReviewsOfProduct(model);

        expect(ReviewDAO.prototype.deleteReviewsOfProduct).toHaveBeenCalledWith(model);
    });

    test("should throw ProductNotFoundError if the product does not exist", async () => {
        const model = "ModelY";

        jest.spyOn(ReviewDAO.prototype, "deleteReviewsOfProduct").mockRejectedValue(new ProductNotFoundError());
        const controller = new ReviewController();

        await expect(controller.deleteReviewsOfProduct(model)).rejects.toThrow(ProductNotFoundError);
    });

    test("should throw NoReviewProductError if there are no reviews for the product", async () => {
        const model = "ModelZ";

        jest.spyOn(ReviewDAO.prototype, "deleteReviewsOfProduct").mockRejectedValue(new NoReviewProductError());
        const controller = new ReviewController();

        await expect(controller.deleteReviewsOfProduct(model)).rejects.toThrow(NoReviewProductError);
    });

    test("should handle database errors during the deletion process", async () => {
        const model = "ModelA";
        const error = new Error("Database error");

        jest.spyOn(ReviewDAO.prototype, "deleteReviewsOfProduct").mockRejectedValue(error);
        const controller = new ReviewController();

        await expect(controller.deleteReviewsOfProduct(model)).rejects.toThrow("Database error");
    });
});

describe("deleteAllReviews", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should successfully delete all reviews from the database", async () => {
        jest.spyOn(ReviewDAO.prototype, "deleteAllReviews").mockResolvedValue();
        const controller = new ReviewController();

        await controller.deleteAllReviews();
        
        expect(ReviewDAO.prototype.deleteAllReviews).toHaveBeenCalledTimes(1);
        expect(ReviewDAO.prototype.deleteAllReviews).toHaveBeenCalled();
    });

    test("should handle errors during the deletion process", async () => {
        const error = new Error("Database error");
        jest.spyOn(ReviewDAO.prototype, "deleteAllReviews").mockRejectedValue(error);
        const controller = new ReviewController();

        await expect(controller.deleteAllReviews()).rejects.toThrow("Database error");
    });
});