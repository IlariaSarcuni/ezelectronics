import ProductDAO from "./productDAO";
import UserDAO from "./userDAO";
import db from "../db/db";
import { ProductNotFoundError, LowProductStockError } from "../errors/productError";
import { UserNotFoundError } from "../errors/userError";
import {ProductReview} from "../components/review";
import { ExistingReviewError, NoReviewProductError } from "../errors/reviewError";


/**
 * A class that implements the interaction with the database for all review-related operations.
 * You are free to implement any method you need here, as long as the requirements are satisfied.
 */
class CustomError extends Error {
    customCode: number;
    customMessage: string;
    constructor(message: string, customCode: number) {
        super();
        this.customMessage = message;
        this.customCode = customCode;
        Object.setPrototypeOf(this, CustomError.prototype);
    }
}
class ReviewDAO {
    private productDAO= new ProductDAO();
    private userDAO=new UserDAO();


    addReview(username: string, model: string, score: number, comment: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // Check if the product exists
            const checkUserExistsSQL = "SELECT * FROM users WHERE username = ?";
            db.get(checkUserExistsSQL, [username], (userErr, userRow) => {
                if (userErr) {
                    reject(userErr);
                    return;
                }
                if (!userRow) {
                    reject(new UserNotFoundError());
                    return;
                }
            

            const checkProductExistsSQL = "SELECT * FROM products WHERE model = ?";
            db.get(checkProductExistsSQL, [model], (productErr, productRow) => {
                if (productErr) {
                    reject(productErr);
                    return;
                }
                if (!productRow) {
                    reject(new ProductNotFoundError());
                    return;
                }
            
    
            // // Check if the customer has bought the product
            // const purchaseCheckSql = "SELECT * FROM carts JOIN cart_items ON carts.cart_id = cart_items.cart_id WHERE customer_username = ? AND product_model = ?";
            // db.get(purchaseCheckSql, [username, model], (purchaseErr, purchaseRow) => {
            //     if (purchaseErr) {
            //         reject(purchaseErr);
            //         return;
            //     }
            //     if (!purchaseRow) {
            //         reject(new Error("Customer has not purchased this product"));
            //         return;
            //     }
            //     // Proceed with adding the review
            // });
            // Check if the review already exists
            const reviewCheckSql = "SELECT review_id FROM reviews WHERE username = ? AND model = ?";
            db.get(reviewCheckSql, [username, model], (reviewErr, reviewRow) => {
                if (reviewErr) {
                    reject(reviewErr);
                    return;
                }
                if (reviewRow) {
                    reject(new ExistingReviewError());
                    return;
                }

                // Insert the new review
                const insertReviewSql = "INSERT INTO reviews (model, username, comment, rating) VALUES (?, ?, ?, ?)";
                db.run(insertReviewSql, [model, username, comment, score], (insertErr) => {
                    if (insertErr) {
                        reject(insertErr);
                        return;
                    }
                    resolve();
                });
            });
        });
            });
        });
            
        
    }

     getProductReviews(model: string): Promise<any[]> {
        return new Promise<any[]>((resolve, reject) => {
            // First, check if the product exists
            const checkProductExistsSQL = "SELECT * FROM products WHERE model = ?";
            db.get(checkProductExistsSQL, [model], (productErr, productRow) => {
                if (productErr) {
                    reject(productErr);
                    return;
                }
                if (!productRow) {
                    reject(new ProductNotFoundError());
                    return;
                }

            const reviewsSql = "SELECT username, model, comment, rating, review_date FROM reviews WHERE model = ?";
            db.all(reviewsSql, [model], (reviewErr: Error | any, reviews: any) => {
                if (reviewErr) {
                    reject(reviewErr);
                    return;
                }
                // Format the reviews to match the expected output
                const products = reviews.map((review: any) => new ProductReview(review.model, review.username, review.rating, review.review_date, review.comment));
                resolve(products);

            });
        });
    });
        
    }
    deleteReview(username: string, model: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            
            const checkUserExistsSQL = "SELECT * FROM users WHERE username = ?";
            db.get(checkUserExistsSQL, [username], (userErr, userRow) => {
                if (userErr) {
                    reject(userErr);
                    return;
                }
                if (!userRow) {
                    reject(new UserNotFoundError());
                    return;
                }
            
                const checkProductExistsSQL = "SELECT * FROM products WHERE model = ?";
                db.get(checkProductExistsSQL, [model], (productErr, productRow) => {
                    if (productErr) {
                        reject(productErr);
                        return;
                    }
                    if (!productRow) {
                        reject(new ProductNotFoundError());
                        return;
                    }
            // Check if the customer has bought the product
            const purchaseCheckSql = "SELECT * FROM carts JOIN cart_items ON carts.cart_id = cart_items.cart_id WHERE customer_username = ? AND product_model = ?";
            db.get(purchaseCheckSql, [username, model], (purchaseErr, purchaseRow) => {
                if (purchaseErr) {
                    reject(purchaseErr);
                    return;
                }
                if (!purchaseRow) {
                    reject(new Error("Customer has not purchased this product"));
                    return;
                }
                // Proceed with adding the review
            
            // Check if the product exists
        
    
                // Check if the review exists
                const reviewCheckSql = "SELECT review_id FROM reviews WHERE username = ? AND model = ?";
                db.get(reviewCheckSql, [username, model], (reviewErr, reviewRow:any) => {
                    if (reviewErr) {
                        reject(reviewErr);
                        return;
                    }
                    if (!reviewRow) {
                        reject(new NoReviewProductError());
                        return;
                    }
                    
    
                    // Delete the review
                    const deleteReviewSql = "DELETE FROM reviews WHERE review_id = ?";
                    db.run(deleteReviewSql, [reviewRow.review_id], (deleteErr) => {
                        if (deleteErr) {
                            reject(deleteErr);
                            return;
                        }
                        resolve();
                    });
                });
            });
        });
            });
        });

    }
    deleteReviewsOfProduct(model: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // Check if the product exists
           const checkProductExistsSQL = "SELECT * FROM products WHERE model = ?";
           db.get(checkProductExistsSQL, [model], (productErr, productRow) => {
                if (productErr) {
                    reject(productErr);
                    return;
                }
                if (!productRow) {
                    reject(new ProductNotFoundError());
                    return;
                }
    
                // Check if there are any reviews for the product
                const reviewExistenceCheckSql = "SELECT review_id FROM reviews WHERE model = ?";
                db.get(reviewExistenceCheckSql, [model], (reviewErr, reviewRow) => {
                    if (reviewErr) {
                        reject(reviewErr);
                        return;
                    }
                    if (!reviewRow) {
                        reject(new NoReviewProductError());
                        return;
                    }
    
                    // Delete all reviews for the product
                    const deleteReviewsSql = "DELETE FROM reviews WHERE model = ?";
                    db.run(deleteReviewsSql, [model], (deleteErr) => {
                        if (deleteErr) {
                            reject(deleteErr);
                            return;
                        }
                        resolve();
                    });
                });
            });
        });
    }

    deleteAllReviews(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const deleteAllReviewsSql = "DELETE FROM reviews";
            db.run(deleteAllReviewsSql, (deleteErr) => {
                if (deleteErr) {
                    reject(deleteErr);
                    return;
                }
                resolve();
            });
        });
    }
}
    
export default ReviewDAO;