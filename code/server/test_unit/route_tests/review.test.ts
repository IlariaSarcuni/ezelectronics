import { test, expect, jest, describe, beforeEach } from "@jest/globals"
import request from 'supertest'
import { app } from "../../index"
import AuthService from "../../src/routers/auth"
import ReviewController from "../../src/controllers/reviewController"
const baseURL = "/ezelectronics"
import { User, Role } from "../../src/components/user"
import {UnauthorizedUserError, UserNotFoundError, UserIsAdminError, BadRequestError} from "../../src/errors/userError"
import {ExistingReviewError, NoReviewProductError} from "../../src/errors/reviewError"
import {ProductNotFoundError} from "../../src/errors/productError"







jest.mock('../../src/controllers/reviewController');
jest.mock('../../src/routers/auth');

describe("POST /reviews/:model - Adding a review to a product", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("Successful addition of a review by an authorized user", async () => {
        jest.spyOn(AuthService.prototype, "isCustomer").mockImplementation((req, res, next) => next());
        jest.spyOn(ReviewController.prototype, "addReview").mockResolvedValue();

        const response = await request(app)
            .post(`${baseURL}/reviews/iPhone13`)
            .send({ score: 5, comment: "Great product!" });
        expect(response.status).toBe(200);
    });

    test("Unauthorized user attempting to add a review", async () => {
        jest.spyOn(AuthService.prototype, "isCustomer").mockImplementation((req, res, next) => {
            res.status(403).json({ error: "User is not authorized" });
        });

        const response = await request(app)
            .post(`${baseURL}/reviews/iPhone13`)
            .send({ score: 5, comment: "Great product!" });
        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: "User is not authorized" });
    });

    test("Attempt to add a review for a non-existent product", async () => {
        jest.spyOn(AuthService.prototype, "isCustomer").mockImplementation((req, res, next) => next());
        jest.spyOn(ReviewController.prototype, "addReview").mockRejectedValue(new ProductNotFoundError());

        const response = await request(app)
            .post(`${baseURL}/reviews/NonexistentModel`)
            .send({ score: 5, comment: "Great product!" });
        expect(response.status).toBe(404);
    });

    test("Attempt to add a review for a product not purchased by the user", async () => {
        jest.spyOn(AuthService.prototype, "isCustomer").mockImplementation((req, res, next) => next());
        jest.spyOn(ReviewController.prototype, "addReview").mockRejectedValue(new Error("Customer has not purchased this product"));

        const response = await request(app)
            .post(`${baseURL}/reviews/iPhone13`)
            .send({ score: 5, comment: "Great product!" });
        expect(response.status).toBe(503);
    });

    test("Attempt to add a review when a review already exists", async () => {
        jest.spyOn(AuthService.prototype, "isCustomer").mockImplementation((req, res, next) => next());
        jest.spyOn(ReviewController.prototype, "addReview").mockRejectedValue(new ExistingReviewError());

        const response = await request(app)
            .post(`${baseURL}/reviews/iPhone13`)
            .send({ score: 5, comment: "Great product!" });
        expect(response.status).toBe(409);
    });

    test("Validation errors for score and comment", async () => {
        jest.spyOn(AuthService.prototype, "isCustomer").mockImplementation((req, res, next) => next());

        const response = await request(app)
            .post(`${baseURL}/reviews/iPhone13`)
            .send({ score: 6, comment: "" }); 
        expect(response.status).toBe(422);
    });
});

describe("GET /reviews/:model - Retrieving all reviews for a product", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("Successful retrieval of all reviews for a product by an authenticated user", async () => {
        jest.spyOn(AuthService.prototype, "isLoggedIn").mockImplementation((req, res, next) => next());
        const mockReviews = [{
            model: "iPhone13",
            user: "Mario Rossi",
            score: 5,
            date: "2024-05-02",
            comment: "A very cool smartphone!"
        }];
        jest.spyOn(ReviewController.prototype, "getProductReviews").mockResolvedValue(mockReviews);

        const response = await request(app)
            .get(`${baseURL}/reviews/iPhone13`);
        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockReviews);
    });

    test("Unauthorized user attempting to retrieve reviews", async () => {
        jest.spyOn(AuthService.prototype, "isLoggedIn").mockImplementation((req, res, next) => {
            res.status(403).json({ error: "User is not authenticated" });
        });

        const response = await request(app)
            .get(`${baseURL}/reviews/iPhone13`);
        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: "User is not authenticated" });
    });

    test("Attempt to retrieve reviews for a non-existent product", async () => {
        jest.spyOn(AuthService.prototype, "isLoggedIn").mockImplementation((req, res, next) => next());
        jest.spyOn(ReviewController.prototype, "getProductReviews").mockRejectedValue(new ProductNotFoundError);

        const response = await request(app)
            .get(`${baseURL}/reviews/NonexistentModel`);
        expect(response.status).toBe(404);
    });

});

describe("DELETE /reviews/:model - Deleting a review for a product", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("Successful deletion of a review by an authorized user", async () => {
        jest.spyOn(AuthService.prototype, "isCustomer").mockImplementation((req, res, next) => next());
        jest.spyOn(ReviewController.prototype, "deleteReview").mockResolvedValue();

        const response = await request(app)
            .delete(`${baseURL}/reviews/iPhone13`);
        expect(response.status).toBe(200);
    });

    test("Unauthorized user attempting to delete a review", async () => {
        jest.spyOn(AuthService.prototype, "isCustomer").mockImplementation((req, res, next) => {
            res.status(403).json({ error: "User is not authorized" });
        });

        const response = await request(app)
            .delete(`${baseURL}/reviews/iPhone13`);
        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: "User is not authorized" });
    });

    test("Attempt to delete a review for a non-existent product", async () => {
        jest.spyOn(AuthService.prototype, "isCustomer").mockImplementation((req, res, next) => next());
        jest.spyOn(ReviewController.prototype, "deleteReview").mockRejectedValue(new ProductNotFoundError());

        const response = await request(app)
            .delete(`${baseURL}/reviews/NonexistentModel`);
        expect(response.status).toBe(404);
    });

    test("Attempt to delete a review that does not exist for the user", async () => {
        jest.spyOn(AuthService.prototype, "isCustomer").mockImplementation((req, res, next) => next());
        jest.spyOn(ReviewController.prototype, "deleteReview").mockRejectedValue(new NoReviewProductError());

        const response = await request(app)
            .delete(`${baseURL}/reviews/iPhone13`);
        expect(response.status).toBe(404);
    });

});

describe("DELETE /reviews/:model/all - Deleting all reviews for a product", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("Successful deletion of all reviews for a product by an authorized user", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => next());
        jest.spyOn(ReviewController.prototype, "deleteReviewsOfProduct").mockResolvedValue();

        const response = await request(app)
            .delete(`${baseURL}/reviews/iPhone13/all`);
        expect(response.status).toBe(200);
    });

    test("Unauthorized user attempting to delete all reviews", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => {
            res.status(403).json({ error: "User is not authorized" });
        });

        const response = await request(app)
            .delete(`${baseURL}/reviews/iPhone13/all`);
        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: "User is not authorized" });
    });

    test("Attempt to delete reviews for a non-existent product", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => next());
        jest.spyOn(ReviewController.prototype, "deleteReviewsOfProduct").mockRejectedValue(new ProductNotFoundError());

        const response = await request(app)
            .delete(`${baseURL}/reviews/NonexistentModel/all`);
        expect(response.status).toBe(404);
    });


});
describe("DELETE /reviews - Deleting all reviews of all products", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("Successful deletion of all reviews by an authorized user", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => next());
        jest.spyOn(ReviewController.prototype, "deleteAllReviews").mockResolvedValue();

        const response = await request(app)
            .delete(`${baseURL}/reviews`);
        expect(response.status).toBe(200);
    });

    test("Unauthorized user attempting to delete all reviews", async () => {
        jest.spyOn(AuthService.prototype, "isAdminOrManager").mockImplementation((req, res, next) => {
            res.status(403).json({ error: "User is not authorized" });
        });

        const response = await request(app)
            .delete(`${baseURL}/reviews`);
        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: "User is not authorized" });
    });

});