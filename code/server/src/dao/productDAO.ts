import { ProductNotFoundError, ProductAlreadyExistsError, ProductSoldError, EmptyProductStockError, LowProductStockError } from "../errors/productError";
import db from "../db/db"
import { Product } from "../components/product"
import {DateError} from "../utilities"
import { CustomError } from "../utilities";

/**
 * A class that implements the interaction with the database for all product-related operations.
 * You are free to implement any method you need here, as long as the requirements are satisfied.
 */
class ProductDAO {
    registerProducts(model: string, category: string, quantity: number, details: string | null, sellingPrice: number, arrivalDate: string | null): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // Validate input parameters
            const isValidDate = (dateString: string) => {
                const date = new Date(dateString);
                return date instanceof Date && !isNaN(date.getTime()) && dateString === date.toISOString().split('T')[0];
            };
    
            if (!model || !category || quantity <= 0 || sellingPrice <= 0 || isNaN(quantity) || isNaN(sellingPrice) || (arrivalDate && !isValidDate(arrivalDate)) || (arrivalDate && new Date(arrivalDate) > new Date())) {
                reject(new CustomError("Invalid input parameters", 422));
                return;
            }
    
            // Check if the model already exists
            const checkSql = "SELECT model FROM products WHERE model = ?";
            db.get(checkSql, [model], (err: Error | null, row: any) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (row) {
                    reject(new ProductAlreadyExistsError());
                    return;
                }
    
                // Insert the new product
                const insertSql = "INSERT INTO products (model, category, quantity, details, sellingPrice, arrivalDate) VALUES (?, ?, ?, ?, ?, ?)";
                db.run(insertSql, [model, category, quantity, details, sellingPrice, arrivalDate || new Date().toISOString().slice(0, 10)], (insertErr: Error | null) => {
                    if (insertErr) {
                        reject(insertErr);
                        return;
                    }
                    resolve();
                });
            });
        });
    }
    /**
     * Increases the available quantity of a product.
     * @param model The model of the product to update.
     * @param newQuantity The additional quantity to add to the existing stock.
     * @param changeDate The date when the change occurred, or the current date if not specified.
     * @returns A Promise that resolves to the new available quantity of the product.
     */
    changeProductQuantity(model: string, newQuantity: number, changeDate: string | null): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            


            const checkSql = "SELECT quantity, arrivalDate FROM products WHERE model = ?";
            db.get(checkSql, [model], (err: Error | null, row: any) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (!row) {
                    reject(new ProductNotFoundError());
                    return;
                }
                if (changeDate && new Date(changeDate) < new Date(row.arrivalDate)) {
                    reject(new DateError());
                    return;
                }

                const newTotalQuantity = row.quantity + newQuantity;
                const updateSql = "UPDATE products SET quantity = ? WHERE model = ?";
                db.run(updateSql, [newTotalQuantity, model], (updateErr: Error | null) => {
                    if (updateErr) {
                        reject(updateErr);
                        return;
                    }
                    resolve(newTotalQuantity);
                });
            });
        });

    }
    /**
     * Sells a product by reducing its available quantity.
     * @param model The model of the product to sell.
     * @param quantity The quantity to reduce from the stock.
     * @param sellingDate The date when the sale occurred, or the current date if not specified.
     * @returns A Promise that resolves to the new available quantity of the product.
     */
    sellProduct(model: string, quantity: number, sellingDate: string | null): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            

            const checkSql = "SELECT quantity, arrivalDate FROM products WHERE model = ?";
            db.get(checkSql, [model], (err: Error | null, row: any) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (!row) {
                    reject(new ProductNotFoundError());
                    return;
                }
                if (sellingDate && new Date(sellingDate) < new Date(row.arrivalDate)) {
                    reject(new DateError());
                    return;
                }
                if (row.quantity < quantity) {
                    reject(new LowProductStockError());
                    return;
                }

                const newTotalQuantity = row.quantity - quantity;
                const updateSql = "UPDATE products SET quantity = ? WHERE model = ?";
                db.run(updateSql, [newTotalQuantity, model], (updateErr: Error | null) => {
                    if (updateErr) {
                        reject(updateErr);
                        return;
                    }
                    resolve(newTotalQuantity);
                });
            });
        });
    }
    /**
     * Retrieves products from the database with optional filtering.
     * @param grouping Optional grouping parameter: 'category', 'model', or null.
     * @param category Optional category filter, used when grouping by category.
     * @param model Optional model filter, used when grouping by model.
     * @returns A Promise that resolves to an array of products.
     */
    getProducts(grouping: string | null, category: string | null, model: string | null): Promise<Product[]> {
        return new Promise<Product[]>((resolve, reject) => {

            
            let sql = "SELECT * FROM products";
            const params = [];

            if (grouping === 'category') {
                if (!category) {
                    reject(new CustomError("Category must be specified when grouping by category", 422));
                    return;
                }
                if (model) {
                    reject(new CustomError("Model must be null when grouping by category", 422));
                    return;
                }
                
                sql += " WHERE category = ?";
                params.push(category);
            } else if (grouping === 'model') {
                // Check if the model exists in the database
                
                if (!model) {
                    reject(new CustomError("Model must be specified when grouping by model", 422));
                    return;
                }
                if (category) {
                    reject(new CustomError("Category must be null when grouping by model", 422));
                    return;
                }
                const checkModelSql = "SELECT model FROM products WHERE model = ?";
                db.get(checkModelSql, [model], (modelErr: Error | null, modelRow: any) => {
                    if (modelErr) {
                        reject(modelErr);
                        return;
                    }
                    if (!modelRow) {
                        reject(new ProductNotFoundError());
                        return;
                    }
                });
                sql += " WHERE model = ?";
                params.push(model);
            } else if (grouping === null) {
                if (category || model) {
                    reject(new CustomError("Category and model must be null when grouping is null", 422));
                    return;
                }
                // No filters applied
            }

            db.all(sql, params, (err: Error | null, rows: any[]) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (rows.length === 0) {
                    const products: Product[] = [];
                    resolve(products);
                    return;
                }
                const products = rows.map(row => new Product(row.sellingPrice, row.model, row.category, row.arrivalDate, row.details, row.quantity));
                resolve(products);
            });
        });
    }
     /**
     * Retrieves available products from the database with optional filtering.
     * Available products are those with a quantity greater than 0.
     * @param grouping Optional grouping parameter: 'category', 'model', or null.
     * @param category Optional category filter, used when grouping by category.
     * @param model Optional model filter, used when grouping by model.
     * @returns A Promise that resolves to an array of products.
     */
     getAvailableProducts(grouping: string | null, category: string | null, model: string | null): Promise<Product[]> {
        return new Promise<Product[]>((resolve, reject) => {

            
            let sql = "SELECT * FROM products WHERE quantity > 0";
            const params = [];

            if (grouping === 'category') {
                if (!category) {
                    reject(new CustomError("Category must be specified when grouping by category", 422));
                    return;
                }
                if (model) {
                    reject(new CustomError("Model must be null when grouping by category", 422));
                    return;
                }
                sql += " AND category = ?";
                params.push(category);
            } else if (grouping === 'model') {
                // Check if the model exists in the database
                
                if (!model) {
                    reject(new CustomError("Model must be specified when grouping by model", 422));
                    return;
                }
                if (category) {
                    reject(new CustomError("Category must be null when grouping by model", 422));
                    return;
                }
                const checkModelSql = "SELECT model FROM products WHERE model = ?";
                db.get(checkModelSql, [model], (modelErr: Error | null, modelRow: any) => {
                    if (modelErr) {
                        reject(modelErr);
                        return;
                    }
                    if (!modelRow) {
                        reject(new ProductNotFoundError());
                        return;
                    }
                });
                sql += " AND model = ?";
                params.push(model);
            } else if (grouping === null) {
                if (category || model) {
                    reject(new CustomError("Category and model must be null when grouping is null", 422));
                    return;
                }
                // No filters applied
            } 

            db.all(sql, params, (err: Error | null, rows: any[]) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (rows.length === 0) {
                    const products: Product[] = [];
                    resolve(products);
                    return;
                }
                

                const products = rows.map(row => new Product(row.sellingPrice, row.model, row.category, row.arrivalDate, row.details, row.quantity));
                resolve(products);
            });
        });
        
    }
 
    /**
     * Deletes a single product from the database.
     * @param model The model of the product to delete.
     * @returns A Promise that resolves when the product is deleted.
     */
    deleteProduct(model: string): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            const checkSql = "SELECT * FROM products WHERE model = ?";
            db.get(checkSql, [model], (err: Error | null, row: any) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (!row) {
                    reject(new ProductNotFoundError());
                    return;
                }

                const deleteSql = "DELETE FROM products WHERE model = ?";
                db.run(deleteSql, [model], function(deleteErr: Error | null) {
                    if (deleteErr) {
                        reject(deleteErr);
                        return;
                    }
                    resolve(true);
                });
            });
        });
    }

    /**
     * Deletes all products from the database.
     * @returns A Promise that resolves when all products are deleted.
     */
    deleteAllProducts(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            const deleteSql = "DELETE FROM products";
            db.run(deleteSql, (deleteErr: Error | null) => {
                if (deleteErr) {
                    reject(deleteErr);
                    return;
                }
                resolve(true);
            });
        });
    }


}
export default ProductDAO