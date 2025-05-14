import db from "../db/db";
import { ProductNotFoundError, LowProductStockError } from "../errors/productError";
import { CartNotFoundError, ProductInCartError, ProductNotInCartError, WrongUserCartError, EmptyCartError } from "../errors/cartError";
import {UserNotFoundError} from "../errors/userError"
import { User } from "../components/user";
import ProductDAO from "./productDAO";
import UserDAO from "./userDAO";
import { Product } from "../components/product";
import { Cart, ProductInCart } from "../components/cart";

class CartDAO {

    private productDAO = new ProductDAO();
    private userDAO = new UserDAO();

    addToCart(username: string, model: string): Promise<true> {
        return new Promise<true>((resolve, reject) => {
            const sqlGetProduct = "SELECT quantity, sellingPrice FROM products WHERE model = ?";
            db.get(sqlGetProduct, [model], (err, product:any) => {
                if (err) {
                    return reject(err);
                }
                if (!product) {
                    return reject(new ProductNotFoundError());
                }
                if (product.quantity <= 0) {
                    return reject(new LowProductStockError());
                }
    
                const cartSql = "SELECT cart_id, total FROM carts WHERE customer_username = ? AND paid = 0";
                db.get(cartSql, [username], (cartErr, cartRow:any) => {
                    if (cartErr) {
                        return reject(cartErr);
                    }
    
                    if (!cartRow) {
                        const newCartSql = "INSERT INTO carts (customer_username, paid, total) VALUES (?, 0, ?)";
                        db.run(newCartSql, [username, product.sellingPrice], function(newCartErr: Error|null) {
                            if (newCartErr) {
                                return reject(newCartErr);
                            }
                            const newCartId = this.lastID;
                            const newCartItemsSql = "INSERT INTO cart_items (cart_id, product_model, quantity, price) VALUES (?, ?, 1, ?)";
                            db.run(newCartItemsSql, [newCartId, model, product.sellingPrice], insertErr => {
                                if (insertErr) {
                                    return reject(insertErr);
                                }
                                resolve(true);
                            });
                        });
                    } else {
                        const checkProductInCartSql = "SELECT quantity FROM cart_items WHERE cart_id = ? AND product_model = ?";
                        db.get(checkProductInCartSql, [cartRow.cart_id, model], (checkErr, itemRow:any) => {
                            if (checkErr) {
                                return reject(checkErr);
                            }
    
                            if (itemRow) {
                                const updateQuantitySql = "UPDATE cart_items SET quantity = quantity + 1 WHERE cart_id = ? AND product_model = ?";
                                db.run(updateQuantitySql, [cartRow.cart_id, model], updateErr => {
                                    if (updateErr) {
                                        return reject(updateErr);
                                    }
                                    const updateTotalSql = "UPDATE carts SET total = total + ? WHERE cart_id = ?";
                                    db.run(updateTotalSql, [product.sellingPrice, cartRow.cart_id], totalErr => {
                                        if (totalErr) {
                                            return reject(totalErr);
                                        }
                                        resolve(true);
                                    });
                                });
                            } else {
                                const newCartItemsSql = "INSERT INTO cart_items (cart_id, product_model, quantity, price) VALUES (?, ?, 1, ?)";
                                db.run(newCartItemsSql, [cartRow.cart_id, model, product.sellingPrice], insertErr => {
                                    if (insertErr) {
                                        return reject(insertErr);
                                    }
                                    const updateTotalSql = "UPDATE carts SET total = total + ? WHERE cart_id = ?";
                                    db.run(updateTotalSql, [product.sellingPrice, cartRow.cart_id], totalErr => {
                                        if (totalErr) {
                                            return reject(totalErr);
                                        }
                                        resolve(true);
                                    });
                                });
                            }
                        });
                    }
                });
            });
        });
    }


    getCart(username: string): Promise<Cart> {
        return new Promise<Cart>((resolve, reject) => {
            const cartSql = "SELECT * FROM carts WHERE customer_username = ? AND paid = 0";
            db.get(cartSql, [username], (cartErr: Error|null, cartRow: any) => {
                if (cartErr) {
                    reject(cartErr);
                    return;
                }
                if (!cartRow) {
                    // If no cart is found, return an empty cart object
                    resolve(new Cart(username, false, null, 0, []));
                    return;
                }

                const productsSql = "SELECT p.model, p.category, cp.quantity, cp.price FROM cart_items cp JOIN products p ON cp.product_model = p.model WHERE cp.cart_id = ?";
                db.all(productsSql, [cartRow.cart_id], (productsErr: Error|null, productsRows: any[]) => {
                    if (productsErr) {
                        reject(productsErr);
                        return;
                    }

                    // Map directly to product objects
                    const products = productsRows.map(row => new ProductInCart(
                        row.model,
                        row.quantity,
                        row.category,
                        row.price
                    ));

                    // Construct the final cart object using the Cart class
                    const cart = new Cart( username, false, null, cartRow.total, products);
                    resolve(cart);
                });
            });
        });
    }

    
    checkoutCart(username: string): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            const cartSql = "SELECT * FROM carts WHERE customer_username = ? AND paid = 0";
            db.get(cartSql, [username], async (cartErr: Error|null, cartRow: any) => {
                if (cartErr) {
                    reject(cartErr);
                    return;
                }
                if (!cartRow) {
                    reject(new CartNotFoundError());
                    return;
                }
    
                const productsSql = "SELECT product_model, quantity FROM cart_items WHERE cart_id = ?";
                db.all(productsSql, [cartRow.cart_id], async (productsErr: Error|null, productsRows: any) => {
                    if (productsErr) {
                        reject(productsErr);
                        return;
                    }
                    if (productsRows.length === 0) {
                        reject(new EmptyCartError());
                        return;
                    }
    
                    // Check product stock using SQL JOIN to compare required and available quantities
                    const stockCheckSql = `
                        SELECT p.model, p.quantity AS stock, ci.quantity AS required
                        FROM products p
                        JOIN cart_items ci ON p.model = ci.product_model
                        WHERE ci.cart_id = ? AND ci.quantity > p.quantity
                    `;
                    db.all(stockCheckSql, [cartRow.cart_id], (stockErr, stockRows) => {
                        if (stockErr) {
                            reject(stockErr);
                            return;
                        }
                        if (stockRows.length > 0) {
                            reject(new LowProductStockError());
                            return;
                        }
    
                        // Reduce product quantities in stock
                        const updateProductQuantities = productsRows.map((product: any) => {
                            return new Promise<void>((resolve, reject) => {
                                const updateProductSql = "UPDATE products SET quantity = quantity - ? WHERE model = ?";
                                db.run(updateProductSql, [product.quantity, product.product_model], (updateErr) => {
                                    if (updateErr) {
                                        reject(updateErr);
                                        return;
                                    }
                                    resolve();
                                });
                            });
                        });
    
                        Promise.all(updateProductQuantities).then(() => {
                            // Update cart to paid
                            const updateCartSql = "UPDATE carts SET paid = 1, payment_date = CURRENT_DATE WHERE cart_id = ?";
                            db.run(updateCartSql, [cartRow.cart_id], (updateErr) => {
                                if (updateErr) {
                                    reject(updateErr);
                                    return;
                                }
                                resolve(true);
                            });
                        }).catch(reject);
                    });
                });
            });
        });
    }

    getAllCarts(): Promise<Cart[]> {
        return new Promise<Cart[]>((resolve, reject) => {
            const allCartsSql = "SELECT carts.cart_id, carts.customer_username AS customer, carts.paid, carts.payment_date, carts.total, cart_items.product_model AS model, cart_items.quantity, cart_items.price, products.category FROM carts JOIN cart_items ON carts.cart_id = cart_items.cart_id JOIN products ON cart_items.product_model = products.model";
            db.all(allCartsSql, [], (err: Error|null, rows: any) => {
                if (err) {
                    reject(err);
                    return;
                }
                let carts = rows.reduce((acc: Cart[], row: any) => {
                    let cart = acc.find((c: Cart) => c.cart_id === row.cart_id);
                    if (!cart) {
                        cart = {
                            customer: row.customer,
                            paid: (row.paid === 1 || row.paid === true) ? true : false,
                            paymentDate: row.payment_date,
                            total: row.total,
                            products: []
                        };
                        cart['cart_id'] = row.cart_id;
                        acc.push(cart);
                    }
                    cart.products.push(new ProductInCart(
                        row.model,
                        row.quantity,
                        row.category,
                        row.price
                    ));
                    return acc;
                }, []);
                carts = carts.map((cart: any) => {
                    const { cart_id, ...cartWithoutId } = cart;
                    return new Cart(cart.customer, cart.paid, cart.paymentDate, cart.total, cart.products);
                });
                resolve(carts);
            });
        });
    }


    getCustomerCarts(username: string): Promise<Cart[]> {
        return new Promise<Cart[]>((resolve, reject) => {
            const customerCartsSql = "SELECT carts.cart_id, carts.customer_username AS customer, carts.paid, carts.payment_date, carts.total, cart_items.product_model AS model, cart_items.quantity, cart_items.price, products.category FROM carts JOIN cart_items ON carts.cart_id = cart_items.cart_id JOIN products ON cart_items.product_model = products.model WHERE carts.customer_username = ? AND carts.paid = 1";
            db.all(customerCartsSql, [username], (err: Error|null, rows: any) => {
                if (err) {
                    reject(err);
                    return;
                }
                let carts = rows.reduce((acc: Cart[], row: any) => {
                    // Use cart_id to uniquely identify the cart
                    let cart = acc.find((c: Cart) => c.cart_id === row.cart_id);
                    if (!cart) {
                        cart = {
                            customer: row.customer,
                            paid: (row.paid === 1 || row.paid === true) ? true : false,
                            paymentDate: row.payment_date,
                            total: row.total,
                            products: []
                        };
                        // Include cart_id for internal tracking within this method
                        cart['cart_id'] = row.cart_id;
                        acc.push(cart);
                    }
                    cart.products.push(new ProductInCart(
                        row.model,
                        row.quantity,
                        row.category,
                        row.price
                    ));
                    return acc;
                }, []);
                // Remove the internal cart_id before resolving
                carts = carts.map((cart: any) => {
                    const { cart_id, ...cartWithoutId } = cart;
                    return new Cart(cart.customer, cart.paid, cart.paymentDate, cart.total, cart.products);
                });
                resolve(carts);
            });
        });
    }
    removeProductFromCart(username: string, model: string): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {

            const modelSQL = "SELECT * FROM products WHERE model = ?";
            db.get(modelSQL, [model], (err: Error|null, row: any) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (!row) {
                    reject(new ProductNotFoundError());
                    return;
                }
            
        
    
                // Check if user has an unpaid cart
                const cartExistenceCheckSql = "SELECT cart_id, total FROM carts WHERE customer_username = ? AND paid = 0";
                db.get(cartExistenceCheckSql, [username], (cartErr: Error|null, cartRow: any) => {
                    if (cartErr) {
                        reject(cartErr);
                        return;
                    }
                    if (!cartRow) {
                        reject(new CartNotFoundError());
                        return;
                    }
    
                    // Check if product is in the cart
                    const productInCartCheckSql = "SELECT quantity, price FROM cart_items WHERE cart_id = ? AND product_model = ?";
                    db.get(productInCartCheckSql, [cartRow.cart_id, model], (itemErr: Error|null, itemRow: any) => {
                        if (itemErr) {
                            reject(itemErr);
                            return;
                        }
                        if (!itemRow || itemRow.quantity === 0) {
                            reject(new ProductNotInCartError());
                            return;
                        }
    
                        // Calculate the new total for the cart
                        const newTotal = cartRow.total - itemRow.price;
    
                        // Remove one instance of the product
                        if (itemRow.quantity > 1) {
                            const updateQuantitySql = "UPDATE cart_items SET quantity = quantity - 1 WHERE cart_id = ? AND product_model = ?";
                            db.run(updateQuantitySql, [cartRow.cart_id, model], (updateErr: Error|null) => {
                                if (updateErr) {
                                    reject(updateErr);
                                    return;
                                }
                                // Update the total in the cart
                                const updateTotalSql = "UPDATE carts SET total = ? WHERE cart_id = ?";
                                db.run(updateTotalSql, [newTotal, cartRow.cart_id], (totalErr: Error|null) => {
                                    if (totalErr) {
                                        reject(totalErr);
                                        return;
                                    }
                                    resolve(true);
                                });
                            });
                        } else {
                            const deleteProductSql = "DELETE FROM cart_items WHERE cart_id = ? AND product_model = ?";
                            db.run(deleteProductSql, [cartRow.cart_id, model], (deleteErr: Error|null) => {
                                if (deleteErr) {
                                    reject(deleteErr);
                                    return;
                                }
                                // Update the total in the cart
                                const updateTotalSql = "UPDATE carts SET total = ? WHERE cart_id = ?";
                                db.run(updateTotalSql, [newTotal, cartRow.cart_id], (totalErr: Error|null) => {
                                    if (totalErr) {
                                        reject(totalErr);
                                        return;
                                    }
                                    resolve(true);
                                });
                            });
                        }
                    });
                });
            });
        });
    }

    clearCart(username: string): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {

            const cartExistenceCheckSql = "SELECT cart_id FROM carts WHERE customer_username = ? AND paid = 0";
            db.get(cartExistenceCheckSql, [username], (cartErr: Error|null, cartRow: any) => {
                if (cartErr) {
                    reject(cartErr);
                    return;
                }
                if (!cartRow) {
                    reject(new CartNotFoundError());
                    return;
                }

                // Delete all products from the cart
                const deleteProductsSql = "DELETE FROM cart_items WHERE cart_id = ?";
                db.run(deleteProductsSql, [cartRow.cart_id], (deleteErr) => {
                    if (deleteErr) {
                        reject(deleteErr);
                        return;
                    }

                    // Set the total cost of the cart to 0
                    const updateCartTotalSql = "UPDATE carts SET total = 0 WHERE cart_id = ?";
                    db.run(updateCartTotalSql, [cartRow.cart_id], (updateErr) => {
                        if (updateErr) {
                            reject(updateErr);
                            return;
                        }
                        resolve(true);
                    });
                });
            });
        });
    }
    deleteAllCarts(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            // Delete all products from all carts
            const deleteCartItemsSql = "DELETE FROM cart_items";
            db.run(deleteCartItemsSql, [], (deleteItemsErr) => {
                if (deleteItemsErr) {
                    reject(deleteItemsErr);
                    return;
                }

                // Delete all carts
                const deleteCartsSql = "DELETE FROM carts";
                db.run(deleteCartsSql, [], (deleteCartsErr) => {
                    if (deleteCartsErr) {
                        reject(deleteCartsErr);
                        return;
                    }
                    resolve(true);
                });
            });
        });
    }

}

export default CartDAO;

