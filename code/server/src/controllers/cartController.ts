import { User } from "../components/user";
import CartDAO from "../dao/cartDAO";
import UserDAO from "../dao/userDAO";
import ProductDAO from "../dao/productDAO";


import { ProductNotFoundError } from "../errors/productError";
import { UserNotFoundError } from "../errors/userError";
import { CustomError } from "../utilities";
// 0|cart_id|INT|1||1
// 1|product_model|VARCHAR(255)|1||2
// 2|quantity|INT|1||0
// 3|price|DECIMAL(10, 2)|1||0


// carts:
// 0|cart_id|SERIAL|0||1
// 1|customer_username|VARCHAR(255)|1||0
// 2|paid|BOOLEAN|1||0
// 3|payment_date|DATE|0||0
// 4|total|DECIMAL(10, 2)|1||0

/**
 * Represents a controller for managing shopping carts.
 * All methods of this class must interact with the corresponding DAO class to retrieve or store data.
 */
class CartController {
    private dao: CartDAO
    private userdao: UserDAO
    private productdao: ProductDAO
    constructor() {
        this.dao = new CartDAO
        this.userdao = new UserDAO
        this.productdao = new ProductDAO
    }

    /**
     * Adds a product to the user's cart. If the product is already in the cart, the quantity should be increased by 1.
     * If the product is not in the cart, it should be added with a quantity of 1.
     * If there is no current unpaid cart in the database, then a new cart should be created.
     * @param user - The user to whom the product should be added.
     * @param productId - The model of the product to add.
     * @returns A Promise that resolves to `true` if the product was successfully added.
     */
    async addToCart(user: User, product: string)/*: Promise<Boolean>*/ { 
        
        return this.dao.addToCart(user.username, product)
    }


    /**
     * Retrieves the current cart for a specific user.
     * @param user - The user for whom to retrieve the cart.
     * @returns A Promise that resolves to the user's cart or an empty one if there is no current cart.
     */
    async getCart(user: User)/*: Cart*/ { 
        return this.dao.getCart(user.username)
    }

    /**
     * Checks out the user's cart. We assume that payment is always successful, there is no need to implement anything related to payment.
     * @param user - The user whose cart should be checked out.
     * @returns A Promise that resolves to `true` if the cart was successfully checked out.
     * 
     */
    async checkoutCart(user: User) /**Promise<Boolean> */ { 
        return this.dao.checkoutCart(user.username)
    }

    /**
     * Retrieves all paid carts for a specific customer.
     * @param user - The customer for whom to retrieve the carts.
     * @returns A Promise that resolves to an array of carts belonging to the customer.
     * Only the carts that have been checked out should be returned, the current cart should not be included in the result.
     */
    async getCustomerCarts(user: User) { 
        return this.dao.getCustomerCarts(user.username)
    } /**Promise<Cart[]> */

    /**
     * Removes one product unit from the current cart. In case there is more than one unit in the cart, only one should be removed.
     * @param user The user who owns the cart.
     * @param product The model of the product to remove.
     * @returns A Promise that resolves to `true` if the product was successfully removed.
     */
    async removeProductFromCart(user: User, product: string) { 

        return this.dao.removeProductFromCart(user.username, product)
    }


    /**
     * Removes all products from the current cart.
     * @param user - The user who owns the cart.
     * @returns A Promise that resolves to `true` if the cart was successfully cleared.
     */
    async clearCart(user: User) { 
        return this.dao.clearCart(user.username)
    }

    /**
     * Deletes all carts of all users.
     * @returns A Promise that resolves to `true` if all carts were successfully deleted.
     */
    async deleteAllCarts() { 
        return this.dao.deleteAllCarts()
    }

    /**
     * Retrieves all carts in the database.
     * @returns A Promise that resolves to an array of carts.
     */
    async getAllCarts() /*:Promise<Cart[]> */ { 
        return this.dao.getAllCarts()
    }
}

export default CartController